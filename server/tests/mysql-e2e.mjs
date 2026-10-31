import { randomBytes } from "node:crypto";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/auth/password.js";
import { checkDatabaseConnection, pool } from "../src/db/pool.js";
import { createUser } from "../src/users/user.repository.js";

/**
 * Test d'intégration MySQL du parcours FunBike.
 *
 * Prérequis : les migrations et le seed ont déjà été exécutés sur une base
 * de test. Le script crée ses propres utilisateurs et un produit temporaire,
 * puis vérifie l'authentification, l'upload, le CRUD produit, la publication,
 * l'archivage et les permissions ADMIN / MARKETING directement contre l'API.
 *
 * Aucun mot de passe de test n'est codé dans le dépôt : ils sont générés
 * pour cette exécution puis oubliés.
 */

const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
const productId = `e2e-moto-${suffix}`;
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=",
  "base64",
);

function generatedPassword() {
  return `FunBike-${randomBytes(18).toString("base64url")}9a`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
  console.log(`OK ${message}`);
}

function cookieHeader(headers) {
  const cookies = typeof headers.getSetCookie === "function" ? headers.getSetCookie() : [];
  return cookies.map((cookie) => cookie.split(";")[0]).join("; ");
}

let server;
let baseUrl;

async function request(path, { method = "GET", token, cookie, body, headers = {} } = {}) {
  const finalHeaders = { Accept: "application/json", ...headers };
  let finalBody = body;

  if (token) finalHeaders.Authorization = `Bearer ${token}`;
  if (cookie) finalHeaders.Cookie = cookie;
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
    finalBody = JSON.stringify(body);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: finalHeaders,
    body: finalBody,
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return { response, payload, text };
}

async function expectStatus(label, resultPromise, status) {
  const result = await resultPromise;
  assert(
    result.response.status === status,
    `${label} (${result.response.status})`,
  );
  return result;
}

async function login(email, password) {
  const result = await expectStatus(
    `Connexion ${email}`,
    request("/api/auth/login", { method: "POST", body: { email, password } }),
    200,
  );
  return {
    user: result.payload.data.user,
    accessToken: result.payload.data.accessToken,
    cookie: cookieHeader(result.response.headers),
  };
}

try {
  await checkDatabaseConnection();
  console.log("OK Connexion MySQL");

  const adminEmail = `e2e-admin-${suffix}@funbike.test`;
  const adminPassword = generatedPassword();
  const adminUser = await createUser({
    name: "Admin E2E FunBike",
    email: adminEmail,
    passwordHash: await hashPassword(adminPassword),
    role: "ADMIN",
    canDeleteProducts: true,
  });
  assert(adminUser.role === "ADMIN", "Création directe du compte ADMIN de test");

  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  let admin = await login(adminEmail, adminPassword);
  assert(admin.user.permissions.includes("users:manage"), "ADMIN possède users:manage");
  assert(!JSON.stringify(admin.user).includes("passwordHash"), "Aucun hash de mot de passe exposé");

  // La session peut être renouvelée depuis le cookie HttpOnly.
  const refreshed = await expectStatus(
    "Renouvellement de session par cookie",
    request("/api/auth/refresh", { method: "POST", cookie: admin.cookie }),
    200,
  );
  admin = {
    user: refreshed.payload.data.user,
    accessToken: refreshed.payload.data.accessToken,
    cookie: cookieHeader(refreshed.response.headers) || admin.cookie,
  };

  const seeded = await expectStatus(
    "Lecture du catalogue seedé",
    request("/api/products?limit=500", { token: admin.accessToken }),
    200,
  );
  assert(seeded.payload.pagination.total >= 60, "Au moins 60 produits seedés sont présents");

  // Upload d'une vraie image PNG par la route protégée du Dashboard.
  const formData = new FormData();
  formData.append("image", new Blob([png], { type: "image/png" }), "e2e-produit.png");
  const uploaded = await expectStatus(
    "Upload d'image produit",
    request("/api/products/images", {
      method: "POST",
      token: admin.accessToken,
      body: formData,
    }),
    201,
  );
  const imageUrl = uploaded.payload.data.imageUrl;
  assert(imageUrl.startsWith("/uploads/products/"), "L'upload renvoie une URL /uploads/products/...");

  const imageResponse = await fetch(`${baseUrl}${imageUrl}`);
  assert(imageResponse.status === 200, "L'image téléversée est servie par /uploads");
  assert(
    (imageResponse.headers.get("content-type") ?? "").startsWith("image/png"),
    "L'image téléversée est servie en image/png",
  );

  // Création d'un produit publié et sélectionné pour les Nouveautés.
  const productPayload = {
    id: productId,
    type: "bike",
    name: "Moto E2E FunBike",
    brand: "Funbike",
    category: "Off-road",
    description: "Produit temporaire du test d'intégration MySQL.",
    image: imageUrl,
    images: [imageUrl],
    alt: "Moto E2E FunBike",
    specs: [{ label: "Cylindrée", value: "250 cc" }],
    price: "Sur devis",
    status: "PUBLISHED",
    homeNew: true,
    motosHome: true,
    essentialsHome: false,
    homeNewOrder: 1,
    motosHomeOrder: 1,
    essentialsHomeOrder: null,
    homeCard: {
      surTitre: "Test E2E",
      titre: "Moto E2E",
      description: "Carte temporaire du test d'intégration.",
      points: ["MySQL", "Dashboard", "Site public"],
      alt: "Moto E2E FunBike",
    },
    metadata: { tag: "E2E", e2eMarker: suffix },
  };

  const created = await expectStatus(
    "Création du produit dans MySQL",
    request("/api/products", {
      method: "POST",
      token: admin.accessToken,
      body: productPayload,
    }),
    201,
  );
  assert(created.payload.data.metadata.e2eMarker === suffix, "Les métadonnées du produit sont conservées");

  const publicList = await expectStatus(
    "Catalogue public après publication",
    request("/api/products?status=PUBLISHED&limit=500"),
    200,
  );
  assert(
    publicList.payload.data.some((product) => product.id === productId),
    "Le produit publié apparaît dans le catalogue public",
  );

  const homeNew = await expectStatus(
    "Section publique Nouveautés",
    request("/api/home/homeNew"),
    200,
  );
  assert(
    homeNew.payload.data.some((product) => product.id === productId),
    "Le produit publié apparaît dans la section Nouveautés",
  );

  // Modification complète par l'API utilisée par le Dashboard.
  const updated = await expectStatus(
    "Modification du produit",
    request(`/api/products/${productId}`, {
      method: "PATCH",
      token: admin.accessToken,
      body: { price: "12 500 000 Ar" },
    }),
    200,
  );
  assert(updated.payload.data.price === "12 500 000 Ar", "Le nouveau prix est enregistré");
  assert(updated.payload.data.metadata.e2eMarker === suffix, "La modification partielle préserve les métadonnées");

  // Archivage : invisible publiquement, toujours visible pour l'équipe.
  await expectStatus(
    "Archivage du produit",
    request(`/api/products/${productId}/status`, {
      method: "PATCH",
      token: admin.accessToken,
      body: { status: "ARCHIVED" },
    }),
    200,
  );
  const publicAfterArchive = await request("/api/products?status=PUBLISHED&limit=500");
  assert(
    !publicAfterArchive.payload.data.some((product) => product.id === productId),
    "Le produit archivé disparaît du catalogue public",
  );
  const adminListAfterArchive = await request("/api/products?limit=500", {
    token: admin.accessToken,
  });
  const archivedProduct = adminListAfterArchive.payload.data.find((product) => product.id === productId);
  assert(archivedProduct?.status === "ARCHIVED", "Le produit archivé reste visible dans le Dashboard");

  await expectStatus(
    "Republication du produit",
    request(`/api/products/${productId}/status`, {
      method: "PATCH",
      token: admin.accessToken,
      body: { status: "PUBLISHED" },
    }),
    200,
  );

  // Création et contrôle d'un compte MARKETING par l'ADMIN.
  const marketingEmail = `e2e-marketing-${suffix}@funbike.test`;
  const marketingPassword = generatedPassword();
  const marketingCreated = await expectStatus(
    "Création d'un utilisateur MARKETING",
    request("/api/users", {
      method: "POST",
      token: admin.accessToken,
      body: {
        name: "Marketing E2E FunBike",
        email: marketingEmail,
        password: marketingPassword,
        role: "MARKETING",
        canDeleteProducts: false,
      },
    }),
    201,
  );
  assert(!JSON.stringify(marketingCreated.payload).includes("passwordHash"), "La création utilisateur n'expose aucun hash");

  let marketing = await login(marketingEmail, marketingPassword);
  assert(!marketing.user.permissions.includes("users:manage"), "MARKETING ne possède pas users:manage");
  assert(!marketing.user.permissions.includes("products:delete"), "MARKETING commence sans products:delete");

  await expectStatus(
    "MARKETING refusé sur la gestion des utilisateurs",
    request("/api/users?limit=500", { token: marketing.accessToken }),
    403,
  );
  await expectStatus(
    "MARKETING refusé sur la suppression sans permission",
    request(`/api/products/${productId}`, {
      method: "DELETE",
      token: marketing.accessToken,
    }),
    403,
  );

  const marketingUpdate = await expectStatus(
    "MARKETING autorisé à modifier un produit",
    request(`/api/products/${productId}`, {
      method: "PATCH",
      token: marketing.accessToken,
      body: { price: "13 000 000 Ar" },
    }),
    200,
  );
  assert(marketingUpdate.payload.data.price === "13 000 000 Ar", "La modification MARKETING est enregistrée");

  // L'ADMIN accorde la suppression : les anciennes sessions sont révoquées,
  // puis la nouvelle session MARKETING peut supprimer le produit.
  await expectStatus(
    "ADMIN accorde products:delete à MARKETING",
    request(`/api/users/${marketingCreated.payload.data.id}`, {
      method: "PATCH",
      token: admin.accessToken,
      body: { canDeleteProducts: true },
    }),
    200,
  );
  await expectStatus(
    "Ancienne session MARKETING révoquée après changement de permission",
    request("/api/auth/me", { token: marketing.accessToken }),
    401,
  );

  marketing = await login(marketingEmail, marketingPassword);
  assert(marketing.user.permissions.includes("products:delete"), "MARKETING reconnecté possède products:delete");
  await expectStatus(
    "Suppression du produit par MARKETING autorisé",
    request(`/api/products/${productId}`, {
      method: "DELETE",
      token: marketing.accessToken,
    }),
    204,
  );
  await expectStatus(
    "Produit supprimé introuvable",
    request(`/api/products/${productId}`, { token: admin.accessToken }),
    404,
  );

  // Déconnexion ADMIN : le jeton ne doit plus fonctionner.
  await expectStatus(
    "Déconnexion ADMIN",
    request("/api/auth/logout", {
      method: "POST",
      token: admin.accessToken,
      cookie: admin.cookie,
    }),
    204,
  );
  await expectStatus(
    "Jeton ADMIN invalide après déconnexion",
    request("/api/auth/me", { token: admin.accessToken }),
    401,
  );

  console.log("Test d'intégration MySQL FunBike : succès");
} catch (error) {
  console.error("Test d'intégration MySQL FunBike : échec");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
}
