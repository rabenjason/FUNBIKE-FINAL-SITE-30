# FunBike Server

Partie serveur du site FunBike : **Node.js + Express + MySQL**.

Ce dossier contient uniquement l'API serveur. Il n'y a **ni dashboard, ni interface d'administration, ni page HTML** : la gestion des produits se fait par appels API, en attendant le futur écran d'administration.

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

Créez la base et la table `products` :

```bash
npm run db:migrate
```

Démarrez l'API :

```bash
npm start
```

Par défaut, le serveur écoute sur `http://localhost:3001`.

- Vérification simple : `GET /health`
- Vérification MySQL : `GET /health/db`

## Importer les produits actuels

Aucune fiche produit n'est copiée dans le code du serveur. Pour remplir MySQL à partir d'un export JSON du catalogue (tableau de produits au format `Product`, ou objet `{ "data": [...] }`) :

```bash
npm run db:import -- ./data/products.json
```

L'import ajoute les nouveaux produits et met à jour ceux dont l'`id` existe déjà, dans une transaction.

## API

Toutes les réponses suivent la forme `{ "success": true, "data": ... }` (ou `{ "success": false, "error": ... }` en cas d'erreur).

### Lecture publique

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/health` | État du serveur |
| `GET` | `/health/db` | État de la connexion MySQL |
| `GET` | `/api/products` | Liste des produits |
| `GET` | `/api/products/:id` | Détail d'un produit |
| `GET` | `/api/home/homeNew` | Nouveautés / Arrivages publiées, triées |
| `GET` | `/api/home/motosHome` | Section Motos publiée, triée |
| `GET` | `/api/home/essentialsHome` | Atelier / Essentiels publiés, triés |

Filtres acceptés par `GET /api/products` :

- `status=PUBLISHED` ou `status=ARCHIVED` ;
- `section=homeNew`, `section=motosHome` ou `section=essentialsHome` ;
- `type=bike` ou `type=part` ;
- `search=texte` (nom, marque, catégorie) ;
- `limit` (1 à 500, 100 par défaut) et `offset`.

Les routes `/api/home/...` appliquent toujours la règle de l'accueil : **produits `PUBLISHED` uniquement, booléen de la section à `true`, triés par l'ordre de la section**.

### Écriture (futur dashboard ou appels API)

| Méthode | Route | Rôle |
|---|---|---|
| `POST` | `/api/products` | Ajouter un produit |
| `PUT` | `/api/products/:id` | Remplacer complètement un produit |
| `PATCH` | `/api/products/:id` | Modifier seulement les champs fournis |
| `PATCH` | `/api/products/:id/status` | Publier ou archiver : `{ "status": "ARCHIVED" }` |
| `DELETE` | `/api/products/:id` | Supprimer définitivement un produit |

Exemple de création :

```bash
curl -X POST http://localhost:3001/api/products \
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

## Sécurité des écritures

Il n'y a pas de système de comptes (pas de dashboard). Pour éviter que n'importe qui puisse modifier le catalogue une fois le serveur en ligne, renseignez `ADMIN_API_KEY` dans `server/.env` : les requêtes d'écriture devront alors envoyer l'en-tête `x-api-key`.

```bash
curl -X DELETE http://localhost:3001/api/products/mon-produit \
  -H "x-api-key: votre_cle"
```

Sans clé configurée, les écritures restent ouvertes : pratique en local, à ne pas utiliser tel quel en production.

## Structure

```text
server/
├── database/
│   └── schema.sql              # Table unique products
├── src/
│   ├── app.js                  # Application Express (CORS, securite, routes)
│   ├── server.js               # Demarrage et arret propre du serveur
│   ├── config/env.js           # Configuration depuis .env
│   ├── db/pool.js              # Connexion MySQL (pool)
│   ├── middleware/             # Erreurs JSON et protection des ecritures
│   ├── products/
│   │   ├── product.routes.js   # Routes CRUD et sections d'accueil
│   │   ├── product.repository.js # Requetes SQL parametrees
│   │   ├── product.mapper.js   # Conversion MySQL <-> Product
│   │   └── product.validation.js # Validation des donnees recues
│   ├── scripts/
│   │   ├── migrate.js          # Creation de la base et de la table
│   │   └── import-products.js  # Import / mise a jour depuis un JSON
│   └── utils/http-error.js
├── .env.example
└── package.json
```

## Branchement futur du frontend

Le frontend n'appelle pas encore cette API : il continue d'utiliser ses données locales via `src/lib/products.ts`. Le jour du branchement, seules les fonctions de ce fichier passeront en `fetch` vers `/api/products` et `/api/home/...` — les composants n'auront pas à changer, et ce serveur n'aura pas besoin d'être modifié.
