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
| IA | Groq API (`qwen/qwen3.8-27b`, fallback `allam-2-7b`) — voir `DOCUMENTATION_IA.md` |
| Graphiques | Recharts |
| Export PDF | jsPDF |

---



## Les 5 modules fonctionnels

**Travail de groupe ✅** — Authentification (register / login / JWT) + Profil Enfant (CRUD)

- (Membre 1) Molka ✅ — CRUD Étapes de développement + CRUD Allergies/Antécédents médicaux + IA jalons OMS
- (Membre 2) Montassar — CRUD Mesures de croissance + CRUD Documents médicaux (upload ordonnances/résultats) + IA analyse courbe
- (Membre 3) Wafa — CRUD Vaccinations + CRUD Rendez-vous + IA résumé rappels
- (Membre 4) Rahma ✅ — CRUD Journal des observations + CRUD Contacts médicaux (pédiatre, spécialistes) + IA synthèse journal

> **Accès aux modules des Membres 1 et 4** — le parent gère tout pour ses enfants. Le pédiatre voit, dans **Mes patients**, les enfants qui lui sont assignés (rendez-vous ou vaccination) : il peut modifier les étapes et les allergies/antécédents, et consulter le journal et les contacts en lecture seule. Règle centralisée dans `server/services/childAccess.js`.
- (Membre 5) Arij — CRUD Notes pédiatre (espace professionnel) + CRUD Questions pour consultation + Fiche Consultation "1 clic"

---

## 🚀 Installation et démarrage

### Prérequis

- [Node.js](https://nodejs.org/) v18 ou supérieur
- Compte [MongoDB Atlas](https://cloud.mongodb.com/) (gratuit)
- Compte [Groq](https://console.groq.com/) pour la clé API (gratuit)

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
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
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

### 5. Données de démo (optionnel)

```bash
cd server
node seed-demo.js                 # pédiatre par défaut : molka1@gmail.com
node seed-demo.js autre@email.tn  # ou un autre compte pédiatre existant
```
Crée le parent `demo.parent@pedicare.test` / `Demo1234!` avec 3 enfants (étapes, allergies, journal, contacts, RDV, vaccins) assignés au pédiatre. Relançable sans doublons.

### 6. Tests

```bash
cd server
npm test   # nécessite MONGO_URI ; les tests ai*.test.js appellent Groq (GROQ_API_KEY)
```

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
│   │   │   ├── PediatreDashboardPage   ✅ Home pédiatre
│   │   │   ├── PediatrePatientsPage    ✅ Mes patients (Membres 1 & 4)
│   │   │   └── PediatrePatientLayout   ✅ Fiche patient à onglets
│   │   ├── children/                   → Membre 1
│   │   │   ├── MilestonesPage.jsx      ✅ Étapes de développement + IA jalons OMS
│   │   │   ├── MedicalRecordsPage.jsx  ✅ Allergies & Antécédents
│   │   │   └── ChildRedirect.jsx       ✅ /journal, /allergies… → enfant actif
│   │   ├── growth/                     → Membre 2
│   │   ├── vaccination/                → Membre 3
│   │   ├── agenda/                     → Membre 3
│   │   ├── journal/                    → Membre 4
│   │   │   └── JournalPage.jsx         ✅ Journal + IA synthèse
│   │   ├── medical-contacts/           → Membre 4
│   │   │   └── MedicalContactsPage.jsx ✅ Contacts médicaux
│   │   ├── timeline/                   → Membre 2
│   │   ├── consultation/               → Membre 4 & 5
│   │   └── petitguide/                 → Membre 5
│   └── components/
│       ├── layout/
│       │   ├── AppShell.jsx            ✅ Layout parent
│       │   ├── Navbar.jsx              ✅ Navigation parent (menu « Dossier santé »)
│       │   ├── PediatreShell.jsx       ✅ Layout pédiatre
│       │   └── PediatreSidebar.jsx     ✅ Navigation pédiatre
│       └── ui/
│           ├── GlassCard.jsx           ✅
│           ├── AIBadge.jsx             ✅
│           ├── LoadingSpinner.jsx      ✅
│           ├── ErrorMessage.jsx        ✅
│           ├── ConfirmModal.jsx        ✅
│           ├── AIText.jsx              ✅ Texte IA (gras) sans injection HTML
│           └── Tooltip.jsx             ✅
│
└── server/
    ├── models/
    │   ├── User.js                     ✅ (role: parent | pediatre)
    │   ├── Child.js                    ✅
    │   ├── Measurement.js              ✅
    │   ├── Vaccination.js              ✅
    │   ├── Appointment.js              ✅
    │   ├── JournalEntry.js             ✅ (Membre 4)
    │   ├── MedicalContact.js           ✅ (Membre 4)
    │   ├── Milestone.js                ✅ (Membre 1)
    │   └── MedicalRecord.js            ✅ (Membre 1) allergies + antécédents
    ├── middleware/
    │   ├── auth.js                     ✅ vérifie JWT
    │   ├── checkRole.js                ✅ vérifie le rôle
    │   └── errorHandler.js             ✅
    ├── services/
    │   ├── childAccess.js              ✅ accès parent / pédiatre à un enfant
    │   └── anonymize.js                ✅ anonymisation avant envoi au LLM
    ├── controllers/                    ✅ auth, milestones, medicalRecords, journal, medicalContacts, ai…
    ├── routes/                         ✅ /api/children/:childId/{milestones,medical-records,journal,medical-contacts}
    ├── tests/unit/                     ✅ un fichier *.test.js par module
    └── seed-demo.js                    ✅ données de démo
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
