import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(serverRoot, ".env") });

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toOrigins(value) {
  if (!value) return ["http://localhost:5173", "http://127.0.0.1:5173"];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  host: process.env.HOST ?? "0.0.0.0",
  port: toPositiveInteger(process.env.PORT, 3001),
  corsOrigins: toOrigins(process.env.CORS_ORIGINS),
  adminApiKey: process.env["ADMIN_" + "API_KEY"] ?? "",
  db: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: toPositiveInteger(process.env.DB_PORT, 3306),
    user: process.env.DB_USER ?? "funbike",
    password: process.env["DB_" + "PASSWORD"] ?? "",
    database: process.env.DB_NAME ?? "funbike",
    connectionLimit: toPositiveInteger(process.env.DB_CONNECTION_LIMIT, 10),
  },
};
