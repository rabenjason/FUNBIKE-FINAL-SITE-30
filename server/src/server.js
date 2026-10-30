import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseConnection, pool } from "./db/pool.js";

const app = createApp();

const server = app.listen(env.port, env.host, async () => {
  console.log(`FunBike server en ecoute sur http://${env.host}:${env.port}`);

  try {
    await checkDatabaseConnection();
    console.log(`MySQL connecte : ${env.db.database} (${env.db.host}:${env.db.port})`);
  } catch {
    console.warn("MySQL non connecte pour le moment. Verifiez server/.env puis lancez : npm run db:migrate");
  }

  if (!env.adminApiKey) {
    console.warn("ADMIN_API_KEY vide : les ecritures API sont ouvertes. A renseigner avant une mise en production.");
  }
});

async function shutdown(signal) {
  console.log(`${signal} recu : arret du serveur...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
