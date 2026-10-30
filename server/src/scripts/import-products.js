import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../db/pool.js";
import { PRODUCT_COLUMNS, productToRowValues } from "../products/product.mapper.js";
import { validateProductPayload } from "../products/product.validation.js";

/**
 * Importe ou met a jour des produits depuis un fichier JSON.
 *
 * Usage :
 *   npm run db:import -- ./data/products.json
 *
 * Le fichier peut contenir directement un tableau de produits, ou un objet
 * { "data": [...] }. Chaque produit doit suivre le type Product du frontend.
 * Aucune donnee produit n'est fournie avec le serveur : cet import sert a
 * remplir MySQL a partir d'un export du catalogue, sans copier les fiches
 * dans le code.
 */

const fileArgument = process.argv[2];
if (!fileArgument) {
  console.error("Usage : npm run db:import -- ./data/products.json");
  process.exit(1);
}

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
