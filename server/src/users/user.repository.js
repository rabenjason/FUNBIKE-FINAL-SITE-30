import { pool } from "../db/pool.js";
import { rowToUser } from "./user.mapper.js";

const USER_COLUMNS = "id, name, email, password_hash, role, can_delete_products, created_at, updated_at";
const PUBLIC_COLUMNS = "id, name, email, role, can_delete_products, created_at, updated_at";

export async function findUserByEmail(email) {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE email = ?`, [email]);
  return rows[0];
}

export async function findUserById(id) {
  const [rows] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [id]);
  return rows[0];
}

export async function findPublicUserById(id) {
  const user = await findUserById(id);
  return user ? rowToUser(user) : undefined;
}

export async function listUsers({ role, search, limit, offset }) {
  const conditions = [];
  const values = [];

  if (role) {
    conditions.push("role = ?");
    values.push(role);
  }
  if (search) {
    conditions.push("(name LIKE ? OR email LIKE ?)");
    const term = `%${search}%`;
    values.push(term, term);
  }

  const where = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const [[countRows], [rows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM users${where}`, values),
    pool.query(
      `SELECT ${PUBLIC_COLUMNS} FROM users${where} ORDER BY created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}`,
      values,
    ),
  ]);

  return {
    users: rows.map(rowToUser),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function createUser({ name, email, passwordHash, role, canDeleteProducts }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, can_delete_products)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, passwordHash, role, canDeleteProducts ? 1 : 0],
  );

  return findPublicUserById(result.insertId);
}

export async function updateUser(id, updates) {
  const columnByField = {
    name: "name",
    email: "email",
    passwordHash: "password_hash",
    role: "role",
    canDeleteProducts: "can_delete_products",
  };

  const entries = Object.entries(updates).filter(([field]) => columnByField[field]);
  if (entries.length === 0) return findPublicUserById(id);

  const assignments = entries.map(([field]) => `${columnByField[field]} = ?`).join(", ");
  const values = entries.map(([field, value]) => (field === "canDeleteProducts" ? (value ? 1 : 0) : value));

  await pool.query(`UPDATE users SET ${assignments} WHERE id = ?`, [...values, id]);
  return findPublicUserById(id);
}

export async function deleteUser(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

export async function countAdmins() {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'ADMIN'");
  return Number(rows[0]?.total ?? 0);
}
