import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/pool.js";
import { PRODUCT_COLUMNS, productToRowValues } from "../products/product.mapper.js";
import { validateProductPayload } from "../products/product.validation.js";

/**
 * Importe ou met a jour des produits depuis un fichier JSON.
 *
 * Usage :
 *   npm run db:seed
 *   npm run db:import -- ./data/products.json
 *
 * Le fichier peut contenir directement un tableau de produits, ou un objet
 * { "data": [...] }. Chaque produit doit suivre le type Product du frontend.
 * Sans argument, le script importe server/database/seed-products.json :
 * les produits actuels du site, a stocker dans MySQL pour commencer.
 */

const fileArgument = process.argv[2] ?? "database/seed-products.json";

const filePath = path.resolve(process.cwd(), fileArgument);
const rawContent = await fs.readFile(filePath, "utf8");
const parsed = JSON.parse(rawContent);
const entries = Array.isArray(parsed) ? parsed : parsed.data;

if (!Array.isArray(entries)) {
  console.error("Le fichier JSON doit contenir un tableau de produits ou un objet { data: [...] }.");
  process.exit(1);
}

const products = entries.map((entry) => validateProductPayload(entry));
const assignments = PRODUCT_COLUMNS.filter((column) => column !== "id")
  .map((column) => `${column} = VALUES(${column})`)
  .join(", ");
const placeholders = PRODUCT_COLUMNS.map(() => "?").join(", ");
const sql = `INSERT INTO products (${PRODUCT_COLUMNS.join(", ")}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${assignments}`;

const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  for (const product of products) {
    await connection.query(sql, productToRowValues(product));
  }
  await connection.commit();
  console.log(`${products.length} produit(s) importe(s) ou mis a jour.`);
} catch (error) {
  await connection.rollback();
  console.error("Import impossible :", error.message);
  process.exitCode = 1;
} finally {
  connection.release();
  await pool.end();
}
