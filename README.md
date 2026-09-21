# 🏥 PediCare AI — Compagnon intelligent de la santé de l'enfant

Application web full-stack de suivi pédiatrique avec assistant IA.  
Mini-projet — IA for Software Engineering — ESPRIT A.U 2026-2027

---

## 📋 Stack technique

| Couche | Technologie |
|--------|-------------|
| Front-end | React 18 + Vite + Tailwind CSS + Framer Motion |
| Back-end | Node.js + Express |
| Base de données | MongoDB Atlas + Mongoose |
| Authentification | JWT + bcrypt |
| IA | OpenAI API (GPT-4o-mini) |
| Graphiques | Recharts |
| Export PDF | jsPDF |

---

## 👥 Répartition des modules

| Membre | Module | Description |
|--------|--------|-------------|
| Tous | **Authentification** | Register / Login / JWT — déjà implémenté |
| Membre 1 | **Profils Enfant + Étapes de développement** | CRUD profils + jalons OMS + IA |
| Membre 2 | **Carnet de Croissance + Frise Chronologique** | Mesures + courbes Recharts + IA |
| Membre 3 | **Carnet de Vaccination + Agenda** | Vaccins + RDV + alertes + IA |
| Membre 4 | **Journal des Observations + Mode Consultation** | Journal + vue partage + IA |
| Membre 5 | **PetitGuide IA + Fiche Consultation** | Chatbot IA + génération fiche + export PDF |

---

## 🚀 Installation et démarrage

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- Compte [MongoDB Atlas](https://cloud.mongodb.com/) (gratuit)
- Compte [OpenAI](https://platform.openai.com/) pour la clé API (Membre 5)

### 1. Cloner le projet

```bash
git clone https://github.com/wafachabbi/pedicare_ia.git
cd pedicare_ia
```

### 2. Configurer le back-end

```bash
cd server
cp .env.example .env
```

Ouvrir `server/.env` et renseigner :

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/pedicare_ai?retryWrites=true&w=majority
JWT_SECRET=un_secret_long_et_complexe
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
NODE_ENV=development
```

> **MONGO_URI** : récupérer depuis MongoDB Atlas → Connect → Drivers  
> **OPENAI_API_KEY** : récupérer depuis [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

Installer les dépendances :

```bash
npm install
```

### 3. Configurer le front-end

```bash
cd ../client
npm install
```

### 4. Lancer le projet

**Terminal 1 — Back-end :**
```bash
cd server
npm run dev
```
✅ Résultat attendu :
```
✅ MongoDB connecté
🚀 Serveur PediCare AI démarré sur le port 5000
```

**Terminal 2 — Front-end :**
```bash
cd client
npm run dev
```
✅ Résultat attendu :
```
➜  Local:   http://localhost:5173/
```

Ouvrir **http://localhost:5173** dans le navigateur.

---

## 📁 Structure du projet

```
pedicare_ia/
├── client/                      # React + Vite (front-end)
│   └── src/
│       ├── contexts/            # AuthContext (JWT)
│       ├── hooks/               # useAuth
│       ├── services/            # api.js, auth.service.js
│       ├── pages/
│       │   ├── auth/            # LoginPage, RegisterPage ✅
│       │   ├── children/        # Membre 1
│       │   ├── growth/          # Membre 2
│       │   ├── vaccination/     # Membre 3
│       │   ├── agenda/          # Membre 3
│       │   ├── journal/         # Membre 4
│       │   ├── timeline/        # Membre 2
│       │   ├── consultation/    # Membre 4 & 5
│       │   └── petitguide/      # Membre 5
│       └── components/
│           ├── layout/          # AppShell, Sidebar ✅
│           └── ui/              # GlassCard, AIBadge, etc. ✅
│
└── server/                      # Node.js + Express (back-end)
    ├── models/                  # Schémas Mongoose ✅
    ├── middleware/              # auth.js, errorHandler.js ✅
    ├── controllers/             # auth.controller.js ✅
    ├── routes/                  # auth.routes.js ✅
    ├── services/                # LLM, Anonymiseur, Validateur
    └── tests/                   # Tests unitaires + propriétés
```

---

## 🔧 Guide pour chaque membre

### Comment ajouter son module (exemple Membre 2 — Croissance)

**Back-end :**

1. Créer `server/controllers/measurements.controller.js`
2. Créer `server/routes/measurements.routes.js`
3. Enregistrer la route dans `server/app.js` :
```js
app.use('/api/children', require('./routes/measurements.routes'))
```

**Front-end :**

1. Créer `client/src/services/growth.service.js`
2. Créer `client/src/pages/growth/GrowthPage.jsx`
3. Remplacer le placeholder dans `client/src/App.jsx` :
```jsx
import GrowthPage from './pages/growth/GrowthPage'
// ...
<Route path="/growth" element={<GrowthPage />} />
```

### Composants UI disponibles (prêts à l'emploi)

```jsx
import GlassCard from '../../components/ui/GlassCard'
import AIBadge from '../../components/ui/AIBadge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import ErrorMessage from '../../components/ui/ErrorMessage'
import ConfirmModal from '../../components/ui/ConfirmModal'
```

### Appels API authentifiés

```js
import api from '../../services/api'

// GET avec JWT automatique
const res = await api.get('/children')

// POST
const res = await api.post('/children', { firstName: 'Emma', dateOfBirth: '2023-01-01', gender: 'F' })
```

### Middleware auth (back-end)

```js
const auth = require('../middleware/auth')

// Protéger une route
router.get('/', auth, controller.getAll)
```

---

## 🎨 Design système

- **Couleur primaire** : mint (`#22c55e`)
- **Couleur secondaire** : sky (`#0ea5e9`)
- **Couleur IA** : violet (`#8b5cf6`) — toujours utiliser pour les réponses IA + `<AIBadge />`
- **Style des cards** : classe `glass-card` (glassmorphism)
- **Dark mode** : supporté via Tailwind `dark:` — déjà configuré

---

## ⚠️ Règles importantes

- Ne **jamais** committer le fichier `.env`
- Ne **jamais** envoyer des données personnelles brutes au LLM — utiliser l'Anonymiseur
- Toujours faire un `git pull` avant de commencer à travailler
- Travailler sur une branche par feature : `git checkout -b feature/croissance`

---

## 🌿 Workflow Git recommandé

```bash
# Avant de commencer
git pull origin main

# Créer sa branche
git checkout -b feature/mon-module

# Commiter son travail
git add .
git commit -m "feat: ajout carnet de croissance"

# Pousser sa branche
git push origin feature/mon-module

# Créer une Pull Request sur GitHub
```
