# FunBike Server

Partie serveur du site FunBike : **Node.js + Express + MySQL**.

Ce dossier contient uniquement l'API serveur : produits, authentification, rôles et permissions. Les interfaces sont le site public à la racine du projet et le Dashboard dans `dashboard/`, tous deux reliés à cette API.

## Rôle

Le serveur gère le catalogue unique du site dans une seule table MySQL `products` :

- motos, pièces et équipements dans le même catalogue ;
- un produit enregistré une seule fois ;
- ajout, lecture, modification et suppression de produits ;
- publication ou archivage avec `status` (`PUBLISHED` / `ARCHIVED`) ;
- sélection indépendante pour les trois sections de l'accueil :
  - `homeNew` : Nouveautés / Arrivages ;
  - `motosHome` : section Motos ;
  - `essentialsHome` : Atelier / Essentiels ;
- ordre d'affichage propre à chaque section (`homeNewOrder`, `motosHomeOrder`, `essentialsHomeOrder`).

Le format JSON des produits est exactement celui du type `Product` déjà utilisé par le frontend dans `src/types/index.ts`.

Le serveur gere aussi les comptes du Dashboard dans les tables `users` et `user_sessions` : connexion, deconnexion, verification d'identite, roles ADMIN / MARKETING et permissions verifiees cote serveur.

## Installation

Prérequis : Node.js 20 ou supérieur, et un serveur MySQL accessible.

```bash
cd server
npm install
cp .env.example .env
```

Modifiez ensuite `server/.env` avec vos paramètres MySQL :

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=funbike
DB_PASSWORD=votre_mot_de_passe
DB_NAME=funbike
```

Avant la production, definissez aussi un `JWT_SECRET` long et aleatoire dans `server/.env` (au moins 32 caracteres). Exemple de generation :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Créez la base et les tables `products`, `users` et `user_sessions` :

```bash
npm run db:migrate
```

Chargez ensuite dans MySQL les produits actuels du site (fichier `server/database/seed-products.json` : les 60 produits aujourd'hui affiches, motos, pieces et equipements) :

```bash
npm run db:seed
```

L'import est idempotent : relancer la commande met a jour les produits existants par `id`, sans creer de doublons.

Creez ensuite le premier compte ADMIN avec la commande interactive dediee. Le mot de passe est saisi sans etre affiche, il n'existe pas dans le code, et la commande refuse de continuer si un ADMIN existe deja :

```bash
npm run admin:create
```

Démarrez l'API :

```bash
npm start
```

Par défaut, le serveur écoute sur `http://localhost:3001`.

- Vérification simple : `GET /health`
- Vérification MySQL : `GET /health/db`

## Importer ou recharger les produits du site

Le demarrage recommande est `npm run db:seed` : il charge `server/database/seed-products.json`, c'est-a-dire les produits actuels du site, dans la table `products`.

Pour importer un autre export JSON du catalogue (tableau de produits au format `Product`, ou objet `{ "data": [...] }`) :

```bash
npm run db:import -- ./data/products.json
```

L'import ajoute les nouveaux produits et met à jour ceux dont l'`id` existe déjà, dans une transaction. Les champs specifiques des fiches actuelles (tag moto, type d'accessoire, compatibilite, type de piece, source) sont conserves dans la colonne JSON `metadata`, afin que le site relie a l'API garde exactement les memes affichages et filtres.

## API

Toutes les réponses suivent la forme `{ "success": true, "data": ... }` (ou `{ "success": false, "error": ... }` en cas d'erreur).

### Lecture publique

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/health` | État du serveur |
| `GET` | `/health/db` | État de la connexion MySQL |
| `GET` | `/api/products` | Liste des produits publiés (les connectés peuvent aussi voir les archivés) |
| `GET` | `/api/products/:id` | Détail d'un produit publié (archivé réservé aux connectés) |
| `GET` | `/api/home/homeNew` | Nouveautés / Arrivages publiées, triées |
| `GET` | `/api/home/motosHome` | Section Motos publiée, triée |
| `GET` | `/api/home/essentialsHome` | Atelier / Essentiels publiés, triés |

Filtres acceptés par `GET /api/products` :

- `status=PUBLISHED` ou `status=ARCHIVED` (archive réservé aux utilisateurs connectés) ;
- `section=homeNew`, `section=motosHome` ou `section=essentialsHome` ;
- `type=bike` ou `type=part` ;
- `search=texte` (nom, marque, catégorie) ;
- `limit` (1 à 500, 100 par défaut) et `offset`.

Les routes `/api/home/...` appliquent toujours la règle de l'accueil : **produits `PUBLISHED` uniquement, booléen de la section à `true`, triés par l'ordre de la section**.

### Authentification

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/auth/login` | Connexion email + mot de passe |
| `POST` | `/api/auth/refresh` | Renouveler la session depuis le cookie sécurisé |
| `POST` | `/api/auth/logout` | Déconnexion et révocation de la session |
| `GET` | `/api/auth/me` | Vérifier l'identité, le rôle et les permissions |
| `PATCH` | `/api/auth/me` | Modifier son nom ou son email (jamais son rôle) |
| `POST` | `/api/auth/change-password` | Changer son mot de passe, toutes les sessions sont révoquées |

La connexion renvoie un **jeton d'accès JWT de 15 minutes** à envoyer dans `Authorization: Bearer ...`, plus un **refresh token** opaque dans un cookie `HttpOnly`. Le refresh token dure 7 jours par défaut, tourne à chaque renouvellement, et seul son hash SHA-256 est stocké dans `user_sessions`. La déconnexion révoque la session en base : le jeton d'accès cesse alors d'être accepté immédiatement.

Les mots de passe sont hashés avec **bcrypt** (coût 12 par défaut) et ne sont jamais renvoyés par l'API, pas plus que leur hash. Après 5 échecs de connexion par défaut pour un même couple IP + email, les tentatives sont bloquées pendant 15 minutes (valeurs configurables dans `.env`).

### Utilisateurs et rôles (ADMIN uniquement)

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/users` | Lister les utilisateurs |
| `POST` | `/api/users` | Créer un ADMIN ou un MARKETING |
| `GET` | `/api/users/:id` | Détail d'un utilisateur |
| `PATCH` | `/api/users/:id` | Modifier nom, email, mot de passe, rôle ou permission de suppression |
| `DELETE` | `/api/users/:id` | Supprimer un utilisateur |

Permissions appliquées côté serveur :

| Action | ADMIN | MARKETING |
|---|---|---|
| Consulter le catalogue, y compris les archivés | Oui | Oui |
| Ajouter / modifier des produits et leurs images | Oui | Oui |
| Publier / archiver | Oui | Oui |
| Sélectionner les produits de l'accueil et leur ordre | Oui | Oui |
| Supprimer des produits | Oui | Seulement si `canDeleteProducts` a été accordé par un ADMIN |
| Créer ou gérer des utilisateurs, attribuer les rôles | Oui | Non |
| Modifier son propre rôle ou ses permissions | Non (protégé aussi pour l'ADMIN) | Non |

Un ADMIN ne peut ni supprimer son propre compte, ni retirer le dernier compte ADMIN.

### Images produits

`POST /api/products/images` permet au Dashboard d'envoyer une image depuis l'appareil de l'utilisateur. La route exige une session valide et la permission d'ajouter ou modifier un produit. Formats JPG, PNG, WebP, GIF ou AVIF, 5 Mo maximum. Le fichier est stocke dans `server/uploads/products/` et la reponse renvoie son adresse `/uploads/products/...`, a enregistrer dans `image` / `images` du produit. Les fichiers de ce dossier ne doivent pas etre versionnes.

### Écriture des produits (utilisateur connecté)

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/products` | Ajouter un produit |
| `PUT` | `/api/products/:id` | Remplacer complètement un produit |
| `PATCH` | `/api/products/:id` | Modifier seulement les champs fournis |
| `PATCH` | `/api/products/:id/status` | Publier ou archiver : `{ "status": "ARCHIVED" }` |
| `DELETE` | `/api/products/:id` | Supprimer définitivement un produit |

Toutes ces routes exigent `Authorization: Bearer <jeton d'acces>` et la permission correspondante, vérifiée côté serveur.

Exemple de création :

```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer VOTRE_JETON" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "sherco-sef-250-factory-2026",
    "type": "bike",
    "name": "Sherco SEF 250 Factory 2026",
    "brand": "Sherco",
    "category": "Off-road",
    "description": "La référence enduro Sherco en finition Factory.",
    "image": "https://exemple.fr/image.jpg",
    "images": ["https://exemple.fr/image.jpg"],
    "alt": "Sherco SEF 250 Factory 2026",
    "specs": [{ "label": "Cylindrée", "value": "250 cc" }],
    "price": "Sur devis",
    "status": "PUBLISHED",
    "homeNew": true,
    "motosHome": true,
    "essentialsHome": false,
    "homeNewOrder": 1,
    "motosHomeOrder": 1,
    "essentialsHomeOrder": null
  }'
```

## Dashboard relie

Le Dashboard vit dans `dashboard/` et appelle cette API avec le jeton d'acces de l'utilisateur connecte. En developpement, ajoutez son origine a `CORS_ORIGINS` si vous changez de port ; par defaut, `http://localhost:5174` est deja autorise. Les controles de role et de permission ci-dessus restent appliques cote serveur, meme si une page est masquee dans l'interface.

## Test d'intégration MySQL

Le parcours complet peut être vérifié contre une vraie base MySQL de test :

```bash
cd server
npm run db:migrate
npm run db:seed
npm run test:mysql-e2e
```

Le script `tests/mysql-e2e.mjs` génère ses mots de passe de test à l'exécution, crée un ADMIN et un MARKETING temporaires, téléverse une image, crée puis modifie un produit, contrôle sa présence publique, son archivage, sa republication et les permissions de suppression. Le workflow GitHub **FunBike MySQL E2E** exécute automatiquement ce parcours avec MySQL 8.4 sur les Pull Requests concernées.

## Ancienne clé `ADMIN_API_KEY`

Les comptes utilisateurs sont désormais la règle pour modifier les produits. L'ancienne `ADMIN_API_KEY` est conservée uniquement comme secours **machine à machine** pour les routes produits, et seulement si `ALLOW_API_KEY_WRITES=true` est explicitement activé dans `server/.env` (désactivé par défaut). Elle ne donne jamais accès aux routes `/api/auth` ou `/api/users` et ne remplace pas l'authentification des utilisateurs.

## Structure

```text
server/
├── database/
│   ├── schema.sql              # Tables products, users et user_sessions
│   └── migrations/002_auth.sql # Meme ajout pour une base deja existante
├── src/
│   ├── app.js                  # Application Express (CORS, securite, routes)
│   ├── server.js               # Demarrage et arret propre du serveur
│   ├── auth/                   # Connexion, sessions, JWT, permissions, bcrypt
│   ├── users/                  # CRUD utilisateurs reserve a l'ADMIN
│   ├── config/env.js           # Configuration depuis .env
│   ├── db/pool.js              # Connexion MySQL (pool)
│   ├── middleware/             # Authentification, roles, erreurs JSON
│   ├── products/
│   │   ├── product.routes.js   # Routes CRUD et sections d'accueil
│   │   ├── product.repository.js # Requetes SQL parametrees
│   │   ├── product.mapper.js   # Conversion MySQL <-> Product
│   │   └── product.validation.js # Validation des donnees recues
│   ├── scripts/
│   │   ├── migrate.js          # Creation de la base et application des migrations
│   │   ├── create-admin.js     # Creation interactive du premier ADMIN
│   │   └── import-products.js  # Import / mise a jour depuis un JSON
│   └── utils/http-error.js
├── .env.example
└── package.json
```

## Branchement du site

Le site est relie a cette API via `src/lib/products.ts` :

- au premier rendu, les produits locaux actuels s'affichent immediatement ;
- le site charge ensuite `GET /api/products?status=PUBLISHED` et, des que le serveur repond, les produits stockes dans MySQL remplacent l'affichage dans l'accueil, le catalogue, les fiches motos et accessoires, le contact et le chat ;
- si l'API est arretee ou la base vide/non migree, le site garde l'affichage local de secours au lieu de se retrouver vide ;
- un produit cree, modifie, publie, archive ou supprime par le CRUD apparait donc dans le site apres rechargement, sans reconstruire le frontend.

En developpement, lancez le serveur (`npm start`, port 3001) puis le site (`npm run dev` a la racine) : Vite transmet automatiquement les appels `/api` au serveur local.

En production, si l'API est sur un autre domaine, definissez `VITE_API_URL=https://api.votre-domaine` avant de construire le site, et ajoutez l'origine publique du site dans `CORS_ORIGINS`.
