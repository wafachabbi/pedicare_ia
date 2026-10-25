# Prompts, interactions LLM et justification des modèles — Membre 5 (Arij Juili)

## 1. Rôle et périmètre

Module **Consultation** de PediCare AI, branche `feature/consultation` :

| Partie | Fonctionnalité | Côté |
|---|---|---|
| A | **Notes pédiatre** : CRUD de notes privées sur ses patients (enfant = patient s'il a au moins un RDV avec le pédiatre) | Pédiatre |
| B | **Questions consultation** : le parent note ses questions avant le RDV (catégorie, priorité, lien RDV, statut traitée) | Parent |
| C | **Fiche consultation 1 clic** : synthèse générée par IA (Groq), partagée au pédiatre du RDV, export PDF | Parent + Pédiatre |
| E | **Tests** automatisés des trois parties | Serveur |

Stack : Express + Mongoose (API), React + Tailwind + framer-motion (client), Groq (LLM), jsPDF (export), Jest + Supertest (tests).

## 2. Outils IA utilisés et pourquoi

| Outil | Usage | Pourquoi |
|---|---|---|
| **Claude** (chat) | Découpage du module en étapes, choix d'architecture (modèles, routes, sécurité), rédaction des prompts envoyés à Claude Code | Raisonnement sur la conception avant d'écrire du code |
| **Claude Code** (CLI dans le repo) | Génération du code et des tests directement dans le dépôt, lecture des fichiers existants, build et exécution des tests | Il lit le code réel de l'équipe : le code produit respecte le style existant et il vérifie lui-même (build Vite, Jest) |
| **Groq** (API) | LLM de **production** qui génère la fiche consultation | Déjà utilisé par l'équipe (`ai.controller.js`), offre gratuite, latence faible |

## 3. Méthode de prompting

Chaque prompt envoyé à Claude Code suit le même gabarit :

1. **Contexte** : projet, branche, parties déjà terminées.
2. **Fichiers de référence à lire d'abord** : un contrôleur, une page ou un test existant pour imposer le style (nommage, format `{ success, data | error }`, helpers `ownsChild` / `handleError`).
3. **Spécification précise** : champs, validations et messages d'erreur, codes HTTP attendus, routes.
4. **Périmètre limité** : « crée UNIQUEMENT ces fichiers », « ajoute UNE ligne dans app.js », « ne modifie aucun autre fichier » (par exemple, interdiction de toucher à `ai.controller.js`, code d'un autre membre).
5. **Contrôle humain** : « pas de commit » ; je relis le diff puis je commite moi-même. Pour les tests : « si un test révèle un bug, ne le corrige pas, signale-le ».
6. **Livrable de fin** : tableau des endpoints, liste des fichiers, exemple de données, pour vérifier rapidement.

Ce cadrage évite les modifications hors périmètre et rend chaque étape relisible en un seul diff.

## 4. Journal des prompts

### A.1 — Modèle `PediatreNote`
- **Objectif** : stocker les notes d'un pédiatre sur un patient.
- **Prompt (résumé)** : créer `server/models/PediatreNote.js` en suivant le style de `Appointment.js` : `pediatreId`, `childId`, `title` (≤ 100), `content` (≤ 2000), `category` (observation / diagnostic / traitement / suivi), `isPrivate` (défaut `true`), timestamps.
- **Résultat** : modèle avec messages de validation en français et index composé `{ pediatreId, childId, createdAt }` pour les listes filtrées.
- **Validé par moi** : notes privées par défaut.

### A.2 — API notes
- **Objectif** : CRUD réservé aux pédiatres + liste de leurs patients.
- **Prompt (résumé)** : contrôleur + routes `/api/notes` avec `auth` + `checkRole('pediatre')` ; un enfant est « patient » s'il a un RDV avec ce pédiatre ; `pediatreId` toujours issu du token ; `/patients` déclarée avant `/:id`.
- **Résultat** : `isMyPatient()`, `handleError()` (ValidationError → 400, CastError → 404), toutes les requêtes filtrées par `pediatreId: req.user.id`.
- **Validé par moi** : 403 si l'enfant n'est pas un patient, 404 (et pas 403) sur la note d'un autre pédiatre, pour ne pas révéler son existence.

### A.4 — Page « Mes notes »
- **Objectif** : interface pédiatre.
- **Prompt (résumé)** : page React dans le style de l'espace pédiatre : en-tête dégradé sky → violet, filtre par patient, formulaire création/édition avec compteur de caractères, `ConfirmModal` pour la suppression.
- **Résultat** : `PediatreNotesPage.jsx` (états loading / erreur / vide).

### B.1 — API questions
- **Objectif** : questions du parent par enfant.
- **Prompt (résumé)** : modèle `ConsultationQuestion` + contrôleur + routes `/api/children/:childId/questions` (`mergeParams`), helper `ownsChild` d'`appointments.controller.js`, `appointmentId` optionnel vérifié comme appartenant à l'enfant, tri par priorité puis date.
- **Résultat** : CRUD avec liste blanche des champs modifiables et `runValidators: true`.
- **Choix validés** :
  - le tri par priorité est fait en JS, car MongoDB trierait l'enum par ordre alphabétique ;
  - un `appointmentId` mal formé renvoie 400 et non 404 ;
  - garde supplémentaire `parentId` sur PUT/DELETE.

### B.3 — Page Consultation (parent)
- **Objectif** : saisir et suivre ses questions.
- **Prompt (résumé)** : `ConsultationPage.jsx` avec `useChild()`, formulaire rapide (compteur x/500, catégorie avec emoji, priorité, lien RDV à venir), onglets En attente / Traitées / Toutes, cartes avec badges, case « Traitée », édition inline, suppression.
- **Corrections demandées après relecture** :
  - **Couleurs** : Claude Code avait d'abord utilisé `green-*`, parce que la palette `mint` du projet est en réalité bleue. J'ai demandé `mint-*` pour rester cohérente avec les autres pages, puis remplacé `emerald` par des dégradés **sky → violet** comme `AppointmentsPage`.
  - **Mobile** : les boutons Modifier / Supprimer n'apparaissaient qu'au survol, donc étaient invisibles sur mobile. Je les ai fait rendre **toujours visibles**.

### C.1 — API fiche consultation IA
- **Objectif** : générer une fiche structurée par LLM, sans exposer de données identifiantes.
- **Prompt (résumé)** : modèle `ConsultationSheet` (content en 5 sections + meta) ; `buildAnonymizedInput()` sans prénom, sans date de naissance, sans id ; hash SHA-256 de l'entrée pour le cache ; client Groq dédié avec le même modèle et le même fallback que l'équipe ; temperature 0.3, max_tokens 700, JSON forcé ; 502 `AI_ERROR` propre ; endpoints parent / pédiatre.
- **Résultat** : voir section 5.
- **Choix validés** :
  - **masquage du prénom dans les textes libres** (allergies, questions), proposé par Claude Code : un parent écrit souvent « Est-ce que Léa dort assez ? » ;
  - cache filtré aussi par `appointmentId`, pour que la fiche aille au bon pédiatre ;
  - **toutes** les erreurs Groq (429, clé invalide…) transformées en 502, car le `errorHandler` global renvoie `err.message` hors production ;
  - le pédiatre ne voit que les fiches au statut `partagee`.

### C.2 — Pages fiche + PDF
- **Objectif** : générer la fiche depuis l'espace parent, la consulter côté pédiatre, l'exporter.
- **Prompt (résumé)** : service, composant réutilisable `ConsultationSheetView` (5 sections, `AIBadge`, mention IA, ligne technique modèle · latence · tokens · cache, bouton PDF jsPDF avec `splitTextToSize` et saut de page), section génération + historique dans `ConsultationPage`, page `PediatreSheetsPage`, route `/pediatre/fiches`.
- **Résultat** :
  - mention IA en pied de chaque page du PDF ;
  - emojis retirés du texte du PDF, car les polices standard de jsPDF ne les affichent pas ;
  - encodage des accents vérifié ;
  - une fiche revenue du cache remonte dans l'historique sans doublon.

### E — Tests
- **Objectif** : prouver la sécurité et le comportement IA sans appel réseau.
- **Prompt (résumé)** : 3 fichiers Jest + Supertest dans le style de `ai.test.js` / `vaccinations.test.js`, `jest.mock('groq-sdk')`, emails uniques `Date.now()`, nettoyage `afterAll`, consigne de **signaler** les bugs sans les corriger.
- **Résultat** : 62 tests, tous verts (section 7). Aucun bug détecté dans le module ; nettoyage de la base vérifié après exécution.

## 5. Intégration du LLM Groq dans la fiche

### Choix du modèle
- **Modèle principal `qwen/qwen3.8-27b`, fallback `allam-2-7b`** : ce sont les mêmes que `ai.controller.js`, pour une cohérence d'équipe (un seul jeu de modèles à surveiller, mêmes quotas). Qwen est le meilleur modèle chat accessible sur l'offre gratuite Groq de l'équipe. Le fallback prend le relais si le principal renvoie 404 ou 503.
- **`temperature: 0.3`** : on veut une reformulation fidèle des données, pas de créativité. En contexte médical, une température basse limite les ajouts inventés.
- **`max_tokens: 700`** : assez pour 5 sections courtes, et une limite de coût et de latence.
- **Sortie JSON forcée** : `response_format: { type: 'json_object' }`. Si le modèle ne le supporte pas (400), on rappelle sans ce paramètre et on parse le JSON après `cleanResponse()`, qui retire les balises `<think>` de Qwen. La réponse est ensuite **normalisée** : `resume` obligatoire, sections forcées en tableaux de chaînes.

### Prompt système (extrait)
> Tu es un assistant pédiatrique. Tu rédiges en français une fiche de préparation de consultation destinée au pédiatre, à partir des données anonymisées fournies.
> Règles strictes : ne JAMAIS poser de diagnostic ni prescrire de traitement ou de médicament. N'invente aucune donnée absente de l'entrée. Réponds UNIQUEMENT avec un objet JSON valide […] avec exactement ces clés : `resume` (3 phrases max), `motifs`, `antecedents`, `questionsParent` (reformulées, triées par priorité), `pointsAttention`.

Les données sont envoyées dans un message `user` séparé, au format JSON. Le prompt système, qui porte les règles, n'est ainsi jamais mélangé avec le texte saisi par le parent.

### Anonymisation
Seul l'objet produit par `buildAnonymizedInput()` est envoyé au LLM :

| Donnée | Traitement |
|---|---|
| Prénom | **jamais envoyé** ; masqué par « l'enfant » s'il apparaît dans les allergies ou les questions (insensible à la casse) |
| Date de naissance | remplacée par l'**âge** (mois si < 24 mois, sinon ans) |
| Identifiants (enfant, parent, RDV, pédiatre) | **aucun** |
| Vaccinations | nom + **mois/année** seulement (ni lot, ni praticien) |
| Mesure, RDV, questions | valeurs utiles seulement (poids/taille/PC + date, type + date du RDV, texte + catégorie + priorité) |

Le prénom n'est réaffiché qu'**après** génération, côté pédiatre (populate Mongo) et dans le PDF : il ne quitte jamais le serveur vers Groq.

### Exemple réel d'interaction

Fiche réellement générée le 24/10/2026 pour un enfant de test (prénom Ahmed), extraite de la base MongoDB de développement.

**Preuve que c'est bien l'entrée envoyée** : l'entrée a été reconstruite avec `buildAnonymizedInput()` à partir des données en base. Son hash SHA-256 est **identique** au `meta.inputHash` enregistré dans la fiche : c'est donc exactement l'objet transmis à Groq. Une recherche automatique confirme que le prénom n'apparaît ni dans l'entrée ni dans la sortie.

**Entrée** : message `user`, après le prompt système (`server/controllers/consultationSheet.controller.js:108`)

```json
{
  "age": "11 ans",
  "sexe": "masculin",
  "groupeSanguin": "A+",
  "allergies": "Aucune connue",
  "vaccinations": [],
  "derniereMesure": null,
  "prochainRdv": {
    "type": "consultation",
    "date": "2026-10-25"
  },
  "questionsEnAttente": [
    {
      "texte": "Il tousse la nuit, est-ce normal ?",
      "categorie": "symptome",
      "priorite": "haute"
    },
    {
      "texte": "Quand introduire les œufs ?",
      "categorie": "alimentation",
      "priorite": "basse"
    }
  ]
}
```

**Sortie** : `content` enregistré (modèle `qwen/qwen3.8-27b`, 1009 ms, 396 + 287 tokens)

```json
{
  "resume": "Garçon de 11 ans sans antécédent allergique connu ni données de vaccination à jour. Le parent s'inquiète de toux nocturne persistante et demande des conseils sur l'introduction des œufs. Une consultation est prévue pour le 25 octobre 2026.",
  "motifs": [
    "Toux nocturne",
    "Conseil alimentation (introduction des œufs)"
  ],
  "antecedents": [
    "Aucune allergie connue",
    "Groupe sanguin A+",
    "Historique vaccinal non renseigné"
  ],
  "questionsParent": [
    "La toux nocturne de l'enfant est-elle normale ou nécessite-t-elle une investigation ?",
    "À quel âge est-il recommandé d'introduire les œufs dans l'alimentation ?"
  ],
  "pointsAttention": [
    "Caractériser la toux nocturne (fréquence, intensité, facteurs déclenchants, association à d'autres symptômes)",
    "Vérifier l'actualisation du carnet de vaccination",
    "Évaluer le contexte alimentaire actuel et l'absence d'intolérance à l'œuf"
  ]
}
```

**Analyse de la sortie**
- ✅ **Consignes respectées** : JSON strict avec les 5 clés, résumé en 3 phrases, questions reformulées et gardées dans l'ordre de priorité (toux « haute » avant œufs « basse »), aucun diagnostic ni prescription : les points d'attention sont des éléments à *vérifier*.
- ✅ **Pas d'invention** : l'absence de vaccinations est rendue par « Historique vaccinal non renseigné ».
- ⚠️ **Formulation ambiguë** : dans le résumé, « ni données de vaccination à jour » peut laisser croire à un retard vaccinal, alors qu'aucune donnée n'est saisie. Cela illustre le risque de reformulation (section 9).
- ⚠️ **Incohérence non relevée** : la question sur l'introduction des œufs n'a pas de sens à 11 ans (donnée de test), mais le modèle ne la signale pas. La fiche reformule, elle ne vérifie pas la cohérence clinique : c'est au pédiatre de le faire.
- ℹ️ **Masquage non sollicité ici** : aucune question de cet exemple ne contient le prénom. Le masquage dans les textes libres est couvert par les tests (section 7).

### Itérations de la fiche IA

Évolutions de la fiche IA au cours de la session, par rapport à la première spécification de C.1 :

| Évolution | Constat de départ | Décision | Code |
|---|---|---|---|
| **JSON forcé avec repli** | La spécification demandait `response_format: json_object` « si supporté », mais tous les modèles Groq ne l'acceptent pas | Appel en mode JSON ; si Groq répond **400**, même modèle rappelé **sans** `response_format`, puis extraction du JSON du texte après `cleanResponse()` | `callModel()` l. 117-124, `parseSheet()` l. 152 |
| **Masquage du prénom dans les textes libres** | Retirer le champ prénom ne suffit pas : un parent écrit « Est-ce que Léa dort assez ? » ou « Léa est allergique… » | `maskFirstName()` remplace le prénom par « l'enfant » dans les allergies et les questions (insensible à la casse, mot entier, accents gérés) | l. 71, utilisé dans `buildAnonymizedInput()` l. 78 |
| **Cache sur hash + `appointmentId`** | Avec le hash seul, deux RDV différents ayant même type et même date auraient partagé la même fiche, donc le même pédiatre destinataire | Clé de cache = `childId` + `appointmentId` + `meta.inputHash`. En base, `fromCache` reste `false` ; il ne passe à `true` que dans la réponse | l. 200-209 |
| **Erreurs Groq → 502** | Le `errorHandler` global renvoie `err.message` hors production, ce qui aurait exposé le message brut de Groq | **Toutes** les erreurs d'appel (429, clé invalide, réseau…) et les JSON invalides donnent 502 `AI_ERROR` générique. Le log serveur ne contient que le statut et le nom de l'erreur | l. 211-221 |

Ces décisions ont été prises pendant l'implémentation de C.1, à la lecture du code existant (`errorHandler.js`, `ai.controller.js`), puis vérifiées par les tests de l'étape E. Elles ne viennent pas d'incidents en production. Je ne sais pas si le repli « sans `response_format` » s'est déclenché lors de la génération réelle ci-dessus : seul le modèle utilisé est enregistré.

## 6. Optimisation mesurée

Mesures relevées lors d'un test réel de l'endpoint de génération :

| | 1er appel (LLM) | 2e appel (cache) |
|---|---|---|
| Temps de réponse API | 1485 ms | **178 ms** |
| dont latence LLM (`meta.latencyMs`) | 1009 ms | 0 (pas d'appel) |
| Tokens (prompt + complétion) | 396 + 287 = **683** | **0** |

→ environ **8× plus rapide** et **100 % des tokens économisés** sur une génération identique.

**Fonctionnement du cache** : l'entrée anonymisée est sérialisée puis hachée en **SHA-256** (`meta.inputHash`). Si une fiche existe déjà pour le même enfant, le même RDV et le même hash, elle est renvoyée directement avec `meta.fromCache: true`. Dès qu'une donnée change (nouvelle question, nouvelle mesure…), le hash change et une nouvelle fiche est générée. Contrairement au cache mémoire de `ai.controller.js` (5 min, perdu au redémarrage), ce cache est **persistant** (MongoDB) et ne devient jamais faux, puisqu'il dépend du contenu et non du temps.

### Techniques d'optimisation

Toutes les lignes citées sont dans `server/controllers/consultationSheet.controller.js`.

| Technique | Mise en œuvre | Effet | Où dans le code |
|---|---|---|---|
| **Prompt engineering** : rôle + contraintes + JSON strict | Prompt **système** séparé des données : rôle (« assistant pédiatrique »), contraintes (« ne JAMAIS diagnostiquer ni prescrire », « n'invente aucune donnée »), format imposé (5 clés, résumé ≤ 3 phrases, tableau vide si rien). Les données sont passées dans un message `user` distinct, en JSON | Sortie exploitable directement, sans post-traitement de texte libre ; moins de dérive médicale | `SYSTEM_PROMPT` l. 20 ; messages l. 106-108 |
| **Sortie structurée validée** | `response_format: json_object`, puis `parseSheet()` : `resume` obligatoire, sections forcées en tableaux de chaînes (max 15 éléments) | Un JSON incomplet est rejeté (502) au lieu d'être enregistré | l. 112, l. 149, l. 152 |
| **Cache** | Hash **SHA-256** de l'entrée anonymisée, stocké dans `meta.inputHash` ; fiche existante renvoyée si même enfant, même RDV et même hash | 2e appel ~8× plus rapide, 0 token | l. 200-209 |
| **Réduction de tokens** | Seules les données utiles sont envoyées : **10 dernières vaccinations** (`limit(10)`), **dernière** mesure seulement, questions **en attente** seulement, champs inutiles supprimés (lot, praticien, ids) ; `max_tokens: 700` plafonne la réponse | Prompt de taille bornée, même pour un dossier chargé | l. 193-195, `buildAnonymizedInput()` l. 78, l. 111 |
| **Fallback de modèle** | Si `qwen/qwen3.8-27b` renvoie 404 ou 503, l'appel est relancé sur `allam-2-7b` | Service maintenu si le modèle principal est retiré ou indisponible | constantes l. 14-15 ; `generateWithGroq()` l. 126-136 |
| **Température basse** | `temperature: 0.3` | Sortie plus déterministe et fidèle aux données, adaptée au contexte médical | l. 110 |

**Piste d'amélioration identifiée** : l'entrée est envoyée en JSON indenté (`JSON.stringify(input, null, 2)`, l. 108). L'envoyer sans indentation réduirait encore les tokens du prompt, sans perte d'information. Ce changement n'est pas encore fait.

## 7. Tests assistés par IA

**62 tests** Jest + Supertest, tous passants : `npx jest tests/unit/notes.test.js tests/unit/questions.test.js tests/unit/consultationSheet.test.js --runInBand --forceExit`.

| Fichier | Tests | Points couverts |
|---|---|---|
| `notes.test.js` | 17 | patient = RDV (201 / 403), validation `title`, **IDOR** (`pediatreId` du body ignoré), isolation entre pédiatres (404 en lecture / modification / suppression), rôles (403 / 401), id invalide, `/patients` |
| `questions.test.js` | 19 | CRUD, tri par priorité, filtre `?status=`, **ownership** (autre parent → 404), RDV d'un autre enfant → 400, validation (500 caractères, enum), pédiatre → 403 |
| `consultationSheet.test.js` | 26 | génération + meta, **anonymisation** du prompt capturé (prénom, date de naissance, ObjectId, lot, praticien ; prénom → « l'enfant »), **cache** (1 seul appel LLM, nouvel appel si données modifiées), **erreurs 502** (non-JSON, JSON incomplet, 429, sans texte brut ni clé), partage pédiatre, ownership |

**Groq est mocké** (`jest.mock('groq-sdk')`) : les tests sont déterministes, gratuits, rapides (environ 18 s pour les 3 fichiers) et utilisables en CI sans clé API.

## 8. Anomalies détectées dans le projet (signalées, non corrigées)

Ces points ont été repérés en lisant le code pendant le développement. Ils sont hors de mon périmètre, donc signalés à l'équipe sans modification :

1. **Prénom envoyé au LLM** dans `server/controllers/ai.controller.js` : les prompts de résumé, rappels et analyse de croissance contiennent `Prénom : ${child.firstName}` (avec allergies et dates complètes). C'est contraire au principe d'anonymisation appliqué dans la fiche.
2. **Token JWT accepté dans l'URL** (`?token=`) dans `server/middleware/auth.js`, pour les fichiers statiques : le token peut se retrouver dans l'historique du navigateur, les logs serveur ou proxy, et l'en-tête `Referer`.
3. **Images commitées dans `server/uploads/`** (5 fichiers PNG suivis par git) : des documents médicaux potentiellement réels se retrouvent dans l'historique du dépôt. Le dossier devrait être dans `.gitignore`.
4. **README incohérent** : il annonce OpenAI (GPT-4o-mini, `OPENAI_API_KEY`) alors que le code utilise Groq (`GROQ_API_KEY`).

## 9. Limites et éthique

- **L'IA ne remplace pas l'avis médical** : le prompt interdit diagnostic et prescription, et l'interface comme le PDF affichent « Générée par IA — ne remplace pas l'avis médical » avec un badge IA.
- **Risque d'hallucination** : il est réduit (température 0.3, consigne « n'invente aucune donnée », sortie JSON validée), mais pas éliminé. La fiche est une aide à la préparation, que le pédiatre relit.
- **Dépendance à un service externe** : modèle de secours en cas d'indisponibilité. En cas d'échec, l'API renvoie un 502 `AI_ERROR` générique (jamais le message brut ni la clé) et l'utilisateur dispose d'un bouton Réessayer. Le reste du module (notes, questions) fonctionne sans IA.
- **Données de santé** : minimisation (seules les données utiles à la consultation sont envoyées), anonymisation avant envoi, accès strict (parent propriétaire ou pédiatre destinataire, 404 sinon). Le masquage du prénom ne couvre pas un surnom ou le prénom d'un proche écrit dans une question : c'est une limite connue.

## 10. Gain de productivité

Estimation personnelle, à prendre comme un ordre de grandeur :

| Tâche | Sans IA (estimé) | Avec IA |
|---|---|---|
| API (3 modèles, 3 contrôleurs, routes) | ~1,5 jour | ~0,5 jour |
| Pages React (notes, consultation, fiches, PDF) | ~2 jours | ~0,5 jour |
| Tests (62) | ~1 jour | ~0,25 jour |

Soit environ **3 à 4 fois plus rapide** sur l'écriture du code. Le gain est surtout sur le code répétitif (CRUD, formulaires, tests). Le temps gagné a été réinvesti dans la **relecture**, la conception (anonymisation, cache, sécurité) et les corrections visuelles. L'IA ne dispense pas de comprendre le code : chaque diff a été relu avant commit, et plusieurs choix (couleurs, boutons sur mobile, périmètre des fichiers) ont été corrigés à la main dans les prompts suivants.
