import fs from "node:fs/promises";
import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const schemaUrl = new URL("../../database/schema.sql", import.meta.url);
const schema = await fs.readFile(schemaUrl, "utf8");
const databaseName = env.db.database.replaceAll("`", "``");

let connection;

try {
  connection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.changeUser({ database: env.db.database });
  await connection.query(schema);

  console.log(`Migration terminee : table products prete dans la base "${env.db.database}".`);
} catch (error) {
  console.error("Migration impossible :", error.message);
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
