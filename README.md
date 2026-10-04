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

### Travail de groupe — Authentification (déjà implémenté ✅)
- Inscription avec choix de rôle (Parent / Pédiatre) via `POST /api/auth/register`
- Connexion sécurisée via `POST /api/auth/login` avec redirection automatique selon le rôle
- Gestion des tokens JWT (24h) + hachage bcrypt des mots de passe
- Middleware `auth.js` (vérification JWT) et `checkRole.js` (vérification du rôle)

---

## Les 5 modules fonctionnels

### Module 1 : Profil Enfant & Étapes de développement
**Responsable : Membre 1**

**Espace Parent :**
- Création d'un ou plusieurs profils enfant (prénom, date de naissance, genre) via `POST /api/children`
- Consultation et modification des profils enfant via `GET/PUT /api/children/:id`
- Suppression d'un profil avec confirmation et suppression en cascade de toutes les données associées via `DELETE /api/children/:id`
- Suivi des étapes de développement de l'enfant (premiers pas, premiers mots, propreté…) avec dates de validation via `GET /api/children/:id/milestones`
- Tableau de bord par enfant affichant les données récentes de tous les modules

**Espace Pédiatre :**
- Consultation du profil pédiatre (nom complet, spécialité, téléphone) via `GET /api/pediatre/profile`
- Modification des informations professionnelles via `PUT /api/pediatre/profile`

**Intégration IA (Membre 1) :**
- Comparaison des étapes de développement enregistrées avec les jalons OMS selon l'âge en mois
- Génération d'un commentaire informatif et rassurant affiché sur le tableau de bord avec badge `✨ Réponse IA`
- Endpoint : `GET /api/children/:id/milestones` → pipeline Anonymiseur → GPT-4o-mini → Validateur

---

### Module 2 : Carnet de Croissance & Frise Chronologique
**Responsable : Membre 2**

**Espace Parent :**
- Enregistrement des mesures de croissance (poids en kg, taille en cm, périmètre crânien en cm) avec date via `POST /api/children/:id/measurements`
- Validation des plages : poids [0,5 – 200 kg], taille [20 – 250 cm]
- Visualisation de l'historique des mesures sous forme de courbes interactives (Recharts) : poids/âge, taille/âge, périmètre crânien/âge
- Suppression d'une mesure enregistrée par erreur via `DELETE /api/children/:id/measurements/:mId`
- Frise chronologique unifiée agrégeant mesures, rendez-vous et observations sur un axe temporel via `GET /api/children/:id/timeline`
- Filtrage de la frise par type d'événement (mesures, rendez-vous, observations)

**Espace Pédiatre :**
- Visualisation des courbes de croissance des enfants dont les fiches ont été partagées par les parents

**Intégration IA (Membre 2) :**
- Analyse de la courbe de croissance et génération d'un commentaire informatif (ex. "la croissance est régulière depuis 3 mois")
- Endpoint : `GET /api/children/:id/growth-analysis` → pipeline Anonymiseur → GPT-4o-mini → Validateur

---

### Module 3 : Vaccination & Agenda
**Responsable : Membre 3**

**Espace Parent :**
- Enregistrement des vaccins reçus (nom du vaccin, date d'administration, numéro de lot optionnel) via `POST /api/children/:id/vaccinations`
- Consultation du calendrier vaccinal de référence et calcul des prochaines échéances selon l'âge via `GET /api/children/:id/vaccination-schedule`
- Affichage d'un indicateur d'alerte visuel sur le tableau de bord si une échéance est à moins de 30 jours
- Gestion des rendez-vous pédiatriques (type, date/heure, praticien, notes) via `POST /api/children/:id/appointments`
- Sections "À venir" (tri chronologique croissant) et "Historique" (tri décroissant) via `GET /api/children/:id/appointments`
- Modification et suppression des rendez-vous futurs avec confirmation

**Espace Pédiatre :**
- Consultation du carnet vaccinal partagé par le parent pour un enfant suivi

**Intégration IA (Membre 3) :**
- Génération d'un résumé clair des prochains rappels vaccinaux et rendez-vous à venir en langage simple
- Endpoint : `GET /api/children/:id/vaccination-summary` → pipeline Anonymiseur → GPT-4o-mini → Validateur

---

### Module 4 : Journal des Observations & Mode Consultation
**Responsable : Membre 4**

**Espace Parent :**
- Création d'entrées dans le journal quotidien (texte libre, catégorie parmi : Observation, Question, Symptôme, Comportement, Alimentation, Sommeil, Autre) via `POST /api/children/:id/journal`
- Limite de 2000 caractères par entrée avec compteur et avertissement
- Filtrage des entrées par catégorie et tri chronologique décroissant via `GET /api/children/:id/journal?category=`
- Modification et suppression des entrées existantes
- Mode Consultation : vue épurée permettant au parent de sélectionner individuellement les sections à afficher (mesures récentes, historique vaccinal, rendez-vous, observations) avant de montrer l'écran au pédiatre
- Masquage des éléments de navigation et contrôles d'édition en Mode Consultation

**Espace Pédiatre :**
- Consultation des fiches partagées volontairement par les parents
- Ajout de notes médicales de suivi sur les enfants suivis

**Intégration IA (Membre 4) :**
- Synthèse automatique des observations du journal des 30 derniers jours avant une consultation
- Identification des thèmes récurrents et des questions importantes
- Endpoint : `GET /api/children/:id/journal-synthesis` → pipeline Anonymiseur → GPT-4o-mini → Validateur

---

### Module 5 : PetitGuide IA & Fiche Consultation "1 clic"
**Responsable : Membre 5**

**Espace Parent :**
- Assistant chatbot PetitGuide : le parent saisit une question pédiatrique en texte libre (max 500 caractères) et reçoit une réponse en langage simple via `POST /api/ai/petitguide`
- Chaque réponse du PetitGuide affiche obligatoirement une source de référence (OMS, Société Française de Pédiatrie) et un avertissement non-diagnostic
- Si la question demande un diagnostic ou une prescription, l'assistant redirige vers le pédiatre sans répondre
- Historique de la session de questions-réponses (non persisté en base de données)
- Génération de la Fiche Consultation "1 clic" : assemblage des 3 dernières mesures, des observations des 30 derniers jours et des questions en attente via `POST /api/children/:id/consultation-sheet`
- Export de la fiche au format PDF (jsPDF) ou copie dans le presse-papiers
- Gestion des erreurs API : timeout (15s), quota dépassé, clé invalide — sans exposer les détails techniques

**Espace Pédiatre :**
- Génération d'un résumé IA de l'état de santé d'un enfant depuis la fiche partagée

**Intégration IA (Membre 5 — module IA principal) :**
- Pipeline IA partagé : Anonymiseur → LLM_Service (GPT-4o-mini) → Validateur
- L'Anonymiseur remplace le prénom de l'enfant par un alias, convertit la date de naissance en âge en mois, supprime tous les identifiants de base de données
- Le Validateur filtre les mots-clés médicaux dangereux (diagnostic, prescription, posologie…) et journalise toutes les réponses
- Prompts système définis pour chaque fonctionnalité IA
- Endpoint PetitGuide : `POST /api/ai/petitguide`
- Endpoint Fiche : `POST /api/children/:id/consultation-sheet`
- Endpoint PDF : `GET /api/children/:id/consultation-sheet/pdf`

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
