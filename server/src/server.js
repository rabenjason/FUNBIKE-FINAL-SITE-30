import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { checkDatabaseConnection, pool } from "./db/pool.js";

if (env.nodeEnv === "production" && (env.auth.jwtSecretIsEphemeral || env.auth.jwtSecret.length < 32)) {
  console.error("JWT_SECRET doit etre defini avec au moins 32 caracteres en production.");
  process.exit(1);
}

const app = createApp();

const server = app.listen(env.port, env.host, async () => {
  console.log(`FunBike server en ecoute sur http://${env.host}:${env.port}`);

  try {
    await checkDatabaseConnection();
    console.log(`MySQL connecte : ${env.db.database} (${env.db.host}:${env.db.port})`);
  } catch {
    console.warn("MySQL non connecte pour le moment. Verifiez server/.env puis lancez : npm run db:migrate");
  }

  if (env.auth.jwtSecretIsEphemeral) {
    console.warn("JWT_SECRET absent : une cle temporaire est utilisee pour ce demarrage (developpement uniquement).");
  }

  if (env.allowApiKeyWrites && env.adminApiKey) {
    console.warn("ALLOW_API_KEY_WRITES=true : l'ancienne cle API peut modifier les produits sans compte utilisateur.");
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
