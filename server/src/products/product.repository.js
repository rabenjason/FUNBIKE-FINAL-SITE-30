import { pool } from "../db/pool.js";
import { PRODUCT_COLUMNS, productToRowValues, rowToProduct } from "./product.mapper.js";
import { HOME_SECTIONS } from "./product.validation.js";

const SELECT_PRODUCT = `SELECT ${PRODUCT_COLUMNS.join(", ")} FROM products`;

function buildProductFilters({ status, type, section, search }) {
  const conditions = [];
  const values = [];

  if (status) {
    conditions.push("status = ?");
    values.push(status);
  }

  if (type) {
    conditions.push("product_type = ?");
    values.push(type);
  }

  if (section) {
    conditions.push(`${HOME_SECTIONS[section].flag} = 1`);
  }

  if (search) {
    conditions.push("(name LIKE ? OR brand LIKE ? OR category LIKE ?)");
    const term = `%${search}%`;
    values.push(term, term, term);
  }

  return {
    where: conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

function orderClause(section) {
  if (!section) return " ORDER BY name ASC";
  const { order } = HOME_SECTIONS[section];
  return ` ORDER BY ${order} IS NULL, ${order} ASC, name ASC`;
}

export async function listProducts(filters) {
  const { where, values } = buildProductFilters(filters);
  const countSql = `SELECT COUNT(*) AS total FROM products${where}`;
  const dataSql = `${SELECT_PRODUCT}${where}${orderClause(filters.section)} LIMIT ${filters.limit} OFFSET ${filters.offset}`;

  const [[countRows], [rows]] = await Promise.all([
    pool.query(countSql, values),
    pool.query(dataSql, values),
  ]);

  return {
    products: rows.map(rowToProduct),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function getHomeProducts(section) {
  return listProducts({
    status: "PUBLISHED",
    section,
    limit: 100,
    offset: 0,
  }).then((result) => result.products);
}

export async function findProductById(id) {
  const [rows] = await pool.query(`${SELECT_PRODUCT} WHERE id = ?`, [id]);
  return rows[0] ? rowToProduct(rows[0]) : undefined;
}

export async function createProduct(product) {
  const placeholders = PRODUCT_COLUMNS.map(() => "?").join(", ");
  const sql = `INSERT INTO products (${PRODUCT_COLUMNS.join(", ")}) VALUES (${placeholders})`;
  await pool.query(sql, productToRowValues(product));
  return findProductById(product.id);
}

export async function replaceProduct(id, product) {
  const assignments = PRODUCT_COLUMNS.filter((column) => column !== "id")
    .map((column) => `${column} = ?`)
    .join(", ");

  const values = productToRowValues(product);
  const productWithoutId = [...values.slice(1), id];
  const [result] = await pool.query(`UPDATE products SET ${assignments} WHERE id = ?`, productWithoutId);

  if (result.affectedRows === 0) return undefined;
  return findProductById(id);
}

export async function updateProductStatus(id, status) {
  const [result] = await pool.query("UPDATE products SET status = ? WHERE id = ?", [status, id]);
  if (result.affectedRows === 0) return undefined;
  return findProductById(id);
}

export async function deleteProduct(id) {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
