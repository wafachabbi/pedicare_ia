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

**Travail de groupe** — Authentification (inscription / connexion parent & pédiatre) ✅

- (Membre 1) — Profil Enfant + Étapes de développement + IA jalons OMS
- (Membre 2) — Carnet de Croissance + Frise Chronologique + IA analyse courbe
- (Membre 3) — Vaccination + Agenda + IA résumé rappels
- (Membre 4) — Journal des Observations + Mode Consultation + IA synthèse journal
- (Membre 5) — PetitGuide IA + Fiche Consultation "1 clic" + Pipeline IA central

---

## Les 5 modules fonctionnels

- (Membre 1) — Profil Enfant + Étapes de développement + IA jalons OMS
- (Membre 2) — Carnet de Croissance + Frise Chronologique + IA analyse courbe
- (Membre 3) — Vaccination + Agenda + IA résumé rappels
- (Membre 4) — Journal des Observations + Mode Consultation + IA synthèse journal
- (Membre 5) — PetitGuide IA + Fiche Consultation "1 clic" + Pipeline IA central

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
Résultat attendu :
```
✅ MongoDB connecté
🚀 Serveur PediCare AI démarré sur le port 5000
```

**Terminal 2 — Front-end :**
```bash
cd client
npm run dev
```
Résultat attendu :
```
➜  Local:   http://localhost:5173/
```

Ouvrir **http://localhost:5173** dans le navigateur.

---

## 📁 Structure du projet

```
pedicare_ia/
├── client/src/
│   ├── contexts/AuthContext.jsx        ✅ JWT session (parent + pédiatre)
│   ├── hooks/useAuth.js                ✅
│   ├── services/
│   │   ├── api.js                      ✅ axios + intercepteur JWT
│   │   └── auth.service.js             ✅
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.jsx           ✅
│   │   │   └── RegisterPage.jsx        ✅ (choix rôle parent/pédiatre)
│   │   ├── pediatre/
│   │   │   └── PediatreDashboardPage   ✅ Home pédiatre
│   │   ├── children/                   → Membre 1
│   │   ├── growth/                     → Membre 2
│   │   ├── vaccination/                → Membre 3
│   │   ├── agenda/                     → Membre 3
│   │   ├── journal/                    → Membre 4
│   │   ├── timeline/                   → Membre 2
│   │   ├── consultation/               → Membre 4 & 5
│   │   └── petitguide/                 → Membre 5
│   └── components/
│       ├── layout/
│       │   ├── AppShell.jsx            ✅ Layout parent
│       │   ├── Sidebar.jsx             ✅ Navigation parent
│       │   ├── PediatreShell.jsx       ✅ Layout pédiatre
│       │   └── PediatreSidebar.jsx     ✅ Navigation pédiatre
│       └── ui/
│           ├── GlassCard.jsx           ✅
│           ├── AIBadge.jsx             ✅
│           ├── LoadingSpinner.jsx      ✅
│           ├── ErrorMessage.jsx        ✅
│           ├── ConfirmModal.jsx        ✅
│           └── Tooltip.jsx             ✅
│
└── server/
    ├── models/
    │   ├── User.js                     ✅ (role: parent | pediatre)
    │   ├── Child.js                    ✅
    │   ├── Measurement.js              ✅
    │   ├── Vaccination.js              ✅
    │   ├── Appointment.js              ✅
    │   └── JournalEntry.js             ✅
    ├── middleware/
    │   ├── auth.js                     ✅ vérifie JWT
    │   ├── checkRole.js                ✅ vérifie le rôle
    │   └── errorHandler.js             ✅
    ├── controllers/auth.controller.js  ✅
    └── routes/auth.routes.js           ✅
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

### Middleware disponibles (back-end)

```js
const auth = require('../middleware/auth')
const checkRole = require('../middleware/checkRole')

// Route accessible à tous les utilisateurs connectés
router.get('/', auth, controller.getAll)

// Route accessible uniquement aux parents
router.get('/children', auth, checkRole('parent'), controller.getChildren)

// Route accessible uniquement aux pédiatres
router.get('/fiches', auth, checkRole('pediatre'), controller.getFiches)
```

### Composants UI disponibles (front-end)

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

const res = await api.get('/children')
const res = await api.post('/children', { firstName: 'Emma', dateOfBirth: '2023-01-01', gender: 'F' })
```

---

## 🎨 Design système

- **Couleur Parent** : mint (`#22c55e`)
- **Couleur Pédiatre** : sky (`#0ea5e9`)
- **Couleur IA** : violet (`#8b5cf6`) — toujours avec `<AIBadge />`
- **Style des cards** : classe CSS `glass-card`
- **Dark mode** : supporté via Tailwind `dark:`

---

## ⚠️ Règles importantes

- Ne **jamais** committer le fichier `.env`
- Ne **jamais** envoyer des données personnelles brutes au LLM
- Toujours `git pull` avant de commencer
- Travailler sur une branche : `git checkout -b feature/mon-module`

---

## 🌿 Workflow Git recommandé

```bash
git pull origin main
git checkout -b feature/mon-module
git add .
git commit -m "feat: ajout carnet de croissance"
git push origin feature/mon-module
# Créer une Pull Request sur GitHub
```
