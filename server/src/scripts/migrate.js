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

  const migrationsUrl = new URL("../../database/migrations/", import.meta.url);
  let migrationFiles = [];
  try {
    migrationFiles = (await fs.readdir(migrationsUrl))
      .filter((file) => file.endsWith(".sql"))
      .sort();
  } catch {
    migrationFiles = [];
  }

  for (const file of migrationFiles) {
    const migration = await fs.readFile(new URL(file, migrationsUrl), "utf8");
    await connection.query(migration);
    console.log(`Migration appliquee : ${file}`);
  }

  console.log(`Migrations terminees : tables products, users et user_sessions pretes dans "${env.db.database}".`);
} catch (error) {
  console.error("Migration impossible :", error.message);
  process.exitCode = 1;
} finally {
  if (connection) await connection.end();
}
