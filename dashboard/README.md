# FunBike Dashboard

Interface d’administration FunBike, reliée au même backend Node.js + MySQL que le site public.

- **Site public** : dossier racine `src/`, port local `5173`.
- **Backend** : dossier `server/`, port local `3001`.
- **Dashboard** : ce dossier `dashboard/`, port local `5174`.

Le Dashboard ne contient aucune copie du catalogue et aucun mot de passe administrateur. Il appelle l’API du backend : les rôles et permissions sont vérifiés côté serveur à chaque requête.

## Démarrage complet

Depuis la racine du projet, dans trois terminaux :

### 1. Backend + MySQL

```bash
cd server
cp .env.example .env
# Renseigner DB_HOST, DB_USER, DB_PASSWORD, DB_NAME et un JWT_SECRET fort.
npm install
npm run db:migrate
npm run db:seed
npm run admin:create
npm start
```

`npm run db:seed` charge dans MySQL les 60 produits actuels du site. `admin:create` crée le premier ADMIN de façon interactive, sans mot de passe codé dans le projet.

### 2. Site public

```bash
npm install
npm run dev
```

Site : `http://localhost:5173`

### 3. Dashboard

```bash
cd dashboard
cp .env.example .env
npm install
npm run dev
```

Dashboard : `http://localhost:5174`

En développement, les appels `/api` du site et du Dashboard sont transmis automatiquement au backend local par Vite.

## Fonctionnalités

### Authentification et rôles

- Connexion email + mot de passe via `/api/auth/login`.
- Jeton d’accès court, renouvelé automatiquement grâce au cookie HttpOnly.
- Déconnexion avec révocation de session côté serveur.
- Pages protégées : sans session, seul l’écran de connexion est accessible.
- ADMIN : produits, accueil, utilisateurs, rôles et permissions.
- MARKETING : consultation du catalogue complet, ajout/modification de produits et images, publication/archivage et gestion des sections d’accueil.
- Suppression de produits pour MARKETING uniquement si un ADMIN a accordé `canDeleteProducts`.
- Gestion des utilisateurs réservée aux ADMIN, dans l’interface comme dans l’API.

### Produits

- Liste complète des produits publiés et archivés.
- Recherche par nom, référence, marque ou catégorie.
- Filtres par statut, type, marque et section d’accueil.
- Ajout et modification d’une fiche : type, nom, marque, catégorie, description, prix, caractéristiques.
- Gestion des images : televersement depuis l’appareil (JPG, PNG, WebP, GIF ou AVIF, 5 Mo max) ou ajout par URL, image principale, galerie, ordre et retrait.
- Classement métier pour que le site place correctement motos, pièces et équipements dans ses filtres.
- Publication ou archivage.
- Suppression définitive, selon permission.
- Sélection dans les sections `homeNew`, `motosHome` et `essentialsHome`, avec ordre par section.

### Accueil du site

L’écran **Accueil du site** permet d’ajouter ou retirer un produit de chaque section, de modifier son ordre par boutons ou valeur numérique, et de voir immédiatement si un produit sélectionné est encore archivé donc invisible.

### Vue d’ensemble

Cartes statistiques du catalogue, état des sélections d’accueil, aperçu rapide des produits, actions rapides et état API/MySQL dans l’en-tête.

## Parcours de vérification

1. Démarrer MySQL puis le backend.
2. Exécuter migrations, seed et création du premier ADMIN.
3. Démarrer le site public et le Dashboard.
4. Se connecter au Dashboard.
5. Ajouter un produit avec une image, d’abord archivé ou directement publié.
6. Le publier et cocher une section d’accueil.
7. Recharger le site public : le produit apparaît dans le catalogue et dans la section choisie.
8. Modifier son nom, son prix ou son image : le changement apparaît après rechargement du site.
9. L’archiver : il disparaît du site public mais reste visible dans le Dashboard.
10. Tester un compte MARKETING : produits autorisés, utilisateurs refusés par l’interface et par l’API ; suppression refusée sans permission spéciale.

## Configuration

`dashboard/.env` :

```env
# Vide en développement : le proxy Vite envoie /api vers http://localhost:3001
VITE_API_URL=

# Adresse du lien "Site public"
VITE_PUBLIC_SITE_URL=http://localhost:5173
```

En production, servez le Dashboard derrière HTTPS, définissez `VITE_API_URL` si l’API est sur un autre domaine, et ajoutez l’origine exacte du Dashboard dans `CORS_ORIGINS` du fichier `server/.env`.

## Vérification du code

```bash
cd dashboard
npm run build
```

Cette commande lance le contrôle TypeScript puis le build Vite.
