# 🚀 A-KIME Website

Plateforme complète pour **A-KIME Sarl**, entreprise spécialisée en
construction, rénovation et aménagement.\
Ce projet inclut :\
- 🌐 **Site vitrine** (HTML/CSS/JS) → pages publiques (Accueil,
Services, Portfolio, Équipements, Contact, etc.)\
- 🛠 **Admin Dashboard** (JS/HTML) → gestion en temps réel des contenus
(Projets, Équipements, Services, Entreprise)\
- ⚙️ **Backend API (Node.js + Express + MongoDB)** → CRUD sécurisé avec
JWT + gestion des images via Multer

------------------------------------------------------------------------

## 📂 Structure du projet

    AKIME-WEBSITE/
    │
    ├── public/                # Frontend (site vitrine)
    │   ├── index.html
    │   ├── portfolio.html
    │   ├── equipment.html
    │   ├── contact.html
    │   ├── css/
    │   └── js/
    │
    ├── uploads/               # Fichiers uploadés (images)
    │   ├── projects/
    │   ├── equipment/
    │   ├── services/
    │   └── general/
    │
    ├── api/                   # Backend API
    │   ├── models/
    │   │   ├── Project.js
    │   │   ├── Equipment.js
    │   │   ├── Service.js
    │   │   │── Company.js
    │   │   └── User.js ...
    │   └── routes/
    │       ├── content.js     # CRUD Projects / Equipment / Services / Company
    │       ├── auth.js        # Authentification JWT
    │       └── contact.js     # Formulaire de contact
    │
    ├── public/admin/          # Dashboard d’administration
    │   ├── login.html
    │   ├── dashboard.html
    │   └── admin.js
    │
    ├── server.js              # Point d’entrée Express
    ├── .env                   # Variables d’environnement
    └── README.md              # Documentation

------------------------------------------------------------------------

## ⚙️ Installation

### 1️⃣ Cloner le projet

``` bash
git clone https://github.com/tonrepo/akime-website.git
cd akime-website
```

### 2️⃣ Installer les dépendances

``` bash
npm install
```

### 3️⃣ Créer le fichier `.env`

``` env
PORT=4001
MONGODB_URI=mongodb://127.0.0.1:27017/akime
JWT_SECRET=tonSecretFort
BASE_URL=http://localhost:4001
ORIGIN=http://localhost:4000,http://127.0.0.1:4000
MAX_FILE_SIZE=104857600
```

### 4️⃣ Lancer le serveur

``` bash
npm start
```

Par défaut, le site sera dispo sur :\
👉 `http://localhost:4001`

------------------------------------------------------------------------

## 🔐 Authentification

-   JWT utilisé pour protéger les routes admin (`/api/content/*`)\
-   Middleware `adminOrEditor()` → seuls les utilisateurs avec rôle
    **admin** ou **editor** peuvent créer/modifier/supprimer

------------------------------------------------------------------------

## 🖼️ Gestion des images

✅ Upload avec **Multer**\
- Projets → `/uploads/projects/`\
- Équipements → `/uploads/equipment/`\
- Services → `/uploads/services/`\
- Général → `/uploads/general/`

✅ Images servies statiquement par Express :

    http://localhost:4001/uploads/projects/nom-image.jpg
    http://localhost:4001/uploads/equipment/nom-image.jpg

------------------------------------------------------------------------

## 📌 Fonctionnalités

### 🔹 Public (Frontend)

-   **Accueil** → Présentation de l'entreprise\
-   **Portfolio** → Liste et détails des projets avec galerie d'images\
-   **Équipements** → Liste des équipements disponibles\
-   **Services** → Liste des services proposés\
-   **Contact** → Formulaire de contact (envoi backend)

### 🔹 Admin (Dashboard)

-   Connexion (JWT)\
-   **Gestion des projets** → CRUD (titre, description, images, galerie,
    client, localisation, etc.)\
-   **Gestion des équipements** → CRUD (image + infos techniques)\
-   **Gestion des services**\
-   **Gestion des infos entreprise**

------------------------------------------------------------------------

## 🧩 API Endpoints

### 🔸 Projects


    GET    /api/content/projects
    GET    /api/content/projects/:id
    POST   /api/content/projects
    PUT    /api/content/projects/:id
    DELETE /api/content/projects/:id

### 🔸 Equipment

    GET    /api/content/equipment
    GET    /api/content/equipment/:id
    POST   /api/content/equipment
    PUT    /api/content/equipment/:id
    DELETE /api/content/equipment/:id

### 🔸 Services

    GET    /api/content/services
    POST   /api/content/services
    PUT    /api/content/services/:id
    DELETE /api/content/services/:id

### 🔸 Company

    GET    /api/content/company
    PUT    /api/content/company

------------------------------------------------------------------------

## 🚀 Déploiement

### 📦 Build & Upload

1.  Uploader le dossier `public/` et `uploads/`\
2.  Lancer `server.js` sur le serveur distant (via PM2 par ex.)

### 🔗 Production URLS

-   **Site public** : `https://akime.com`\
-   **Admin** : `https://akime.com/admin/login`\
-   **API** : `https://akime.com/api/content/...`

------------------------------------------------------------------------

## 👨‍💻 Développé avec

-   **Backend** : Node.js, Express, MongoDB, Mongoose\
-   **Frontend** : HTML, CSS, Vanilla JS\
-   **Admin Dashboard** : Vanilla JS + JWT\
-   **Upload** : Multer\
-   **Sécurité** : Helmet, CORS, Rate Limiting\
-   **Logger** : Morgan

------------------------------------------------------------------------

## Admin

- creation d'un nouveau utilisateur admin : 'node create-admin.js'
- pour lancer le serveur : 'npm start' ou 'node server.js'
- pour cree jwt-secret : 'node create-jwt-secret.js'

🔥 **Projet final prêt pour production avec gestion temps réel des
contenus.**
