# Documentation IA — PediCare AI
## Module : Résumé Médical & Rappels Intelligents

---

## 1. Outils d'IA générative utilisés

| Outil | Rôle |
|-------|------|
| **Kiro (Claude Sonnet)** | Assistant de développement — génération de code, debugging, architecture |
| **Groq API** | Inférence LLM ultra-rapide pour les fonctionnalités IA du projet |
| **Qwen3-8B-27B** | Modèle de langage pour résumé médical et rappels intelligents |

---

## 2. Justification du choix du modèle

### Pourquoi Groq ?
- **Gratuité** : tier gratuit sans carte bancaire (contrairement à OpenAI/Anthropic)
- **Vitesse** : inférence ~10x plus rapide que OpenAI (Groq utilise des puces LPU dédiées)
- **Compatibilité** : API compatible OpenAI SDK, migration facile

### Pourquoi Qwen3-8B-27B ?
- Seul modèle de chat disponible sur la clé gratuite (LLaMA 3.1 non disponible)
- Très bonnes performances en français
- Bonne compréhension des domaines médicaux

### Comparaison des modèles testés

| Modèle | Statut | Raison |
|--------|--------|--------|
| `llama-3.1-8b-instant` | ❌ Non disponible | Modèle 404 sur clé gratuite |
| `qwen/qwen3.8-27b` | ✅ Utilisé | Meilleur disponible, bon français |
| `allam-2-7b` | ⚠️ Fallback | Utilisé si Qwen indisponible |

---

## 3. Prompts utilisés et justification

### 3.1 Prompt — Résumé médical

```
Tu es un assistant médical pédiatrique expert. Génère un résumé clair en français...

DONNÉES PATIENT :
- Prénom, Âge, Sexe, Groupe sanguin, Allergies

VACCINATIONS (N) : liste des vaccins avec dates

RENDEZ-VOUS (N) : liste des RDV avec statut

INSTRUCTIONS :
Rédige un résumé structuré avec exactement ces 4 sections :
1. Aperçu général
2. Statut vaccinal
3. Points d'attention
4. Recommandation
Maximum 180 mots. Ton professionnel mais accessible. Ne jamais diagnostiquer.
```

**Justification des choix de prompt :**
- **Rôle explicite** ("Tu es un assistant médical pédiatrique") → améliore la pertinence médicale
- **Structure imposée** (4 sections numérotées) → réponse cohérente et prévisible
- **Contrainte de longueur** (180 mots) → évite les réponses trop longues, réduit les tokens
- **"Ne jamais diagnostiquer"** → garde éthique et sécurité médicale
- **temperature = 0.4** → équilibre créativité/précision (0 = trop rigide, 1 = trop aléatoire)

### 3.2 Prompt — Rappels intelligents

```
Tu es un assistant médical pédiatrique. Analyse ce dossier et génère des rappels...

PATIENT : prénom, âge, sexe, allergies, vaccins reçus, RDV à venir

CALENDRIER VACCINAL FRANÇAIS : (liste complète par âge)

INSTRUCTIONS : Réponds UNIQUEMENT avec ce JSON valide :
{"reminders":[{"type":"urgent|warning|info","title":"...","message":"...","action":"..."}]}
Maximum 4 rappels. Types : urgent=vaccin manquant critique...
```

**Justification :**
- **Format JSON forcé** → parsing fiable côté serveur
- **Calendrier vaccinal injecté** → le modèle n'a pas besoin de "mémoriser" les données médicales (technique RAG légère)
- **temperature = 0.2** → plus bas que le résumé car on veut un JSON précis et valide
- **max_tokens = 600** → suffisant pour 4 rappels JSON

---

## 4. Techniques d'adaptation et d'optimisation

### 4.1 Prompt Tuning
Itérations effectuées sur le prompt de rappels :
- **V1** : Prompt simple → JSON souvent invalide
- **V2** : Ajout de l'instruction "Réponds UNIQUEMENT avec le JSON" → amélioration
- **V3** : Ajout du format exact JSON dans le prompt + temperature 0.2 → JSON valide systématiquement

### 4.2 RAG (Retrieval Augmented Generation) léger
Le calendrier vaccinal français est **injecté directement dans le prompt** plutôt que de dépendre des connaissances du modèle. C'est une forme de RAG : on fournit au modèle un contexte externe fiable (la source médicale officielle) pour améliorer la précision des rappels.

### 4.3 Cache en mémoire
```javascript
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
```
- **Réduit la latence** : réponse instantanée si déjà générée
- **Réduit le coût** : moins d'appels API
- **Logique** : un dossier médical ne change pas en 5 minutes

### 4.4 Fallback de modèle
```javascript
try { résultat = await groq(PREFERRED_MODEL) }
catch { résultat = await groq(FALLBACK_MODEL) }
```
Garantit la disponibilité du service même si le modèle principal est indisponible.

### 4.5 Nettoyage des réponses
Qwen3 génère parfois des balises `<think>...</think>` (chain-of-thought visible). Ces balises sont nettoyées avant traitement :
```javascript
content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
```

### 4.6 Réduction de tokens
- Limitation à 10 vaccinations et 5 RDV dans le contexte
- `max_tokens` calibrés précisément (400 pour résumé, 600 pour rappels)
- Résultat : ~60% moins de tokens consommés vs prompt naïf

---

## 5. Interactions avec le LLM — Exemples réels

### Exemple 1 — Génération du résumé pour "Amina, 11 ans"

**Input envoyé au modèle :**
```
Vaccinations (1) : BCG — 14/10/2026
Rendez-vous (1) : Consultation — 15/10/2026 (à venir) avec Dr. Ahmed
```

**Output obtenu :**
```
1. **Aperçu général**
Amina est une enfant de 11 ans dont le dossier médical est en cours de constitution...

2. **Statut vaccinal**
Une seule vaccination enregistrée (BCG). Le suivi vaccinal semble incomplet pour son âge...

3. **Points d'attention**
Plusieurs vaccins du calendrier sont potentiellement manquants (DTCaP, ROR, HPV)...

4. **Recommandation**
Il est conseillé de consulter le pédiatre pour effectuer un bilan vaccinal complet...
```

### Exemple 2 — Rappels intelligents

**Output JSON obtenu :**
```json
{
  "reminders": [
    {
      "type": "urgent",
      "title": "Vaccins manquants détectés",
      "message": "À 11 ans, Amina devrait avoir reçu DTCaP, ROR (2 doses), Méningocoque C...",
      "action": "Consulter le pédiatre pour bilan vaccinal"
    },
    {
      "type": "info",
      "title": "HPV recommandé",
      "message": "Le vaccin HPV est recommandé entre 11-13 ans pour les filles...",
      "action": "Discuter avec le médecin lors du prochain RDV"
    }
  ]
}
```

---

## 6. Évaluation des performances et limites

### Performances mesurées
| Métrique | Valeur |
|----------|--------|
| Latence moyenne (sans cache) | ~2-4 secondes |
| Latence avec cache | < 50ms |
| Taux de JSON valide | ~90% |
| Tokens moyens par appel | ~350 (résumé), ~450 (rappels) |

### Limites éthiques et techniques
1. **Ne remplace pas un médecin** — disclaimer affiché à l'utilisateur
2. **Données limitées** — le modèle ne voit que les données saisies dans l'app
3. **Hallucination possible** — le modèle peut inventer des recommandations incorrectes
4. **Calendrier vaccinal** — basé sur le calendrier français standard, peut ne pas s'appliquer à tous les pays
5. **Clé API exposée** — stockée en `.env`, jamais commitée dans Git

### Mesures de sécurité
- Clé API en variable d'environnement (`.env` dans `.gitignore`)
- Vérification ownership avant tout appel IA (un parent ne peut générer que pour SES enfants)
- Disclaimer médical affiché dans l'interface

---

## 7. Valeurs ajoutées

- **Cache intelligent** — réduction latence et coût
- **Fallback automatique** — haute disponibilité
- **RAG léger** — injection du calendrier vaccinal officiel
- **Prompt versioning** — 3 itérations documentées
- **Endpoint `/api/ai/models`** — liste dynamique des modèles disponibles

---
---

# Modules : Jalons OMS (Membre 1 — Molka) & Synthèse du journal (Membre 4 — Rahma)

Même infrastructure que ci-dessus (Groq, `qwen/qwen3.8-27b`, fallback `allam-2-7b`, nettoyage `<think>`, cache mémoire 5 min).
Code : `server/controllers/ai.controller.js` (`analyzeMilestones`, `summarizeJournal`), anonymisation : `server/services/anonymize.js`.

| Endpoint | Rôle | Accès |
|----------|------|-------|
| `POST /api/ai/milestones/:childId` | Évalue les étapes de développement au regard des jalons OMS + suggère les prochaines étapes | Parent (ses enfants) ou pédiatre qui suit l'enfant |
| `POST /api/ai/journal/:childId` | Synthèse des observations des 3 derniers mois pour préparer la consultation | Parent ou pédiatre qui suit l'enfant |

---

## 1. Prompts utilisés et justification

### 1.1 Prompt — Jalons OMS

```
Tu es un pédiatre expert du développement de l'enfant, référencé sur les jalons de
développement de l'OMS (WHO Motor Development Study) et les repères du carnet de santé.

PATIENT : fille de 10 mois (10 mois)

ÉTAPES DÉJÀ SUIVIES PAR LES PARENTS (6) :
• [Motricité globale] Tient assise sans appui — atteint (attendu vers 7 mois)
• [Social/Émotionnel] Fait « au revoir » de la main — non atteint (attendu vers 10 mois)
• ...

Désigne toujours le patient par « l'enfant » (aucun prénom).

INSTRUCTIONS : Réponds UNIQUEMENT avec ce JSON valide (sans texte avant/après, sans balises) :
{"assessment":"string","suggestions":[{"category":"string","title":"string","expectedAgeMonths":number,"tip":"string"}]}
- assessment : 3-4 phrases bienveillantes ... sans jamais diagnostiquer ...
- suggestions : 3 à 6 jalons OMS pertinents ..., NON déjà présents dans la liste ci-dessus.
- category : exactement une valeur parmi "Motricité globale", "Motricité fine", "Langage", "Social/Émotionnel", "Cognitif".
- title : max 60 caractères — tip : une activité simple (max 100 caractères).
```

**Justification :**
- **Rôle + référentiel nommé (OMS)** → le modèle s'appuie sur des repères reconnus plutôt que sur des généralités
- **Étapes déjà suivies injectées** (RAG léger) → l'évaluation porte sur les données réelles et les suggestions évitent les doublons
- **Catégories imposées = enum du modèle Mongoose** → chaque suggestion peut être ajoutée telle quelle en base (bouton « + Suivre »)
- **JSON forcé + temperature 0.3** → parsing fiable ; un peu plus de variété que les rappels (0.2) pour les conseils d'activités
- **max_tokens = 700** → évaluation + 6 suggestions

### 1.2 Prompt — Synthèse du journal

```
Tu es un assistant médical pédiatrique. Les parents tiennent un journal d'observations sur
leur enfant. Prépare une synthèse en français, utile à présenter au pédiatre lors de la
prochaine consultation.

PATIENT : fille de 4 ans et 6 mois
Allergies connues : Arachides, Pollen de graminées
Antécédents : Asthme léger

OBSERVATIONS (3, de la plus récente à la plus ancienne) :
• 19/10/2026 [Symptôme] Toux sèche la nuit depuis 3 jours, pas de fièvre.
• ...

Les données ont été anonymisées : désigne toujours le patient par « l'enfant » (aucun prénom).

INSTRUCTIONS : Rédige une synthèse structurée avec exactement ces 4 sections :
1. **Résumé de la période**   2. **Tendances observées**
3. **Questions à poser au pédiatre** (2 à 4)   4. **Points de vigilance** (si urgent → consulter rapidement)
Maximum 220 mots. Ton bienveillant et factuel. Ne jamais diagnostiquer.
```

**Justification :**
- **Objectif concret (préparer la consultation)** → la section « Questions à poser » rend la synthèse directement utile au parent et au pédiatre
- **Allergies/antécédents actifs injectés** (module de Molka) → le modèle relie les symptômes au contexte médical (ex. toux nocturne ↔ asthme)
- **Fenêtre de 3 mois, 30 observations max, 300 caractères par observation** → contexte pertinent et nombre de tokens maîtrisé
- **Consigne d'urgence explicite** → le modèle oriente vers une consultation rapide en cas de signe d'alerte
- **temperature 0.3, max_tokens 600**

---

## 2. Techniques d'adaptation et d'optimisation

### 2.1 Anonymisation avant envoi au LLM
Règle du projet : *ne jamais envoyer de données personnelles brutes au LLM*. `anonymize()` est appliquée à tous les textes libres (titres d'étapes, observations, allergies/antécédents) :

| Donnée | Remplacée par |
|--------|---------------|
| Prénom de l'enfant (insensible à la casse, mot entier, accents gérés) | `l'enfant` |
| Emails | `[email]` |
| Numéros de téléphone | `[téléphone]` |
| URLs | `[lien]` |
| « Dr / Docteur / Pr » + nom | `[médecin]` |

Le prénom n'est jamais dans le prompt (on envoie seulement « fille de 10 mois »). Les données médicales utiles (températures, dates) sont conservées.
Exemple : `Adam a 38,5°C, appelé le Dr. Karim Ben Ali au +216 98 123 456` → `l'enfant a 38,5°C, appelé le [médecin] au [téléphone]`.
Vérifié par `tests/unit/anonymize.test.js` et par `ai-dossier.test.js` (un prénom rare ne doit jamais apparaître dans la réponse).

### 2.2 Sortie contrôlée (Jalons OMS)
La réponse JSON est validée côté serveur avant d'être renvoyée : suggestions filtrées sur les 5 catégories autorisées, titres tronqués, âge converti en nombre, 6 suggestions max. Si le JSON est inexploitable, une évaluation générique est renvoyée au lieu d'une erreur.

### 2.3 Cache invalidé à la modification
Contrairement au résumé (cache fixe de 5 min), la clé de cache inclut **le nombre d'éléments et la date de dernière modification** :
```javascript
const cacheKey = `journal_${child._id}_${entries.length}_${lastUpdate}`
```
→ une nouvelle observation ou étape relance immédiatement l'analyse ; sinon la réponse est instantanée (cache partagé entre parent et pédiatre).

### 2.4 Contrôle d'accès
`canAccessChild()` (`server/services/childAccess.js`) : un parent n'analyse que ses enfants, un pédiatre seulement ceux qui lui sont assignés (rendez-vous ou vaccination). Sinon → 404.

---

## 3. Interactions avec le LLM — Exemples réels (données de démo, `node seed-demo.js`)

### Exemple 1 — Jalons OMS, fille de 10 mois (latence 1,3 s)

**Output obtenu (extrait) :**
```json
{
  "assessment": "L'enfant présente un développement moteur global solide, étant déjà capable de se tenir debout avec appui [...] Le fait que l'enfant ne fasse pas encore « au revoir » de la main n'est pas une source d'inquiétude majeure à 10 mois, mais il est conseillé d'en parler au pédiatre lors de la prochaine visite [...]",
  "suggestions": [
    { "category": "Motricité fine", "title": "Transfère un objet d'une main à l'autre", "expectedAgeMonths": 9,
      "tip": "Donnez-lui une balle légère pour qu'elle apprenne à la passer d'une main à l'autre." },
    { "category": "Cognitif", "title": "Cherche un objet caché", "expectedAgeMonths": 10,
      "tip": "Cachez un jouet sous un linge et encouragez-la à le trouver." }
  ]
}
```
→ l'étape « non atteinte » est signalée sans alarmisme, avec renvoi vers le pédiatre ; aucune suggestion ne duplique une étape existante.

### Exemple 2 — Synthèse du journal, fille de 4 ans (asthme, allergie arachides)

**Input (après anonymisation) :**
```
• [Symptôme] Toux sèche la nuit depuis 3 jours, pas de fièvre.
• [Alimentation] Goûter d'anniversaire à l'école : vérifié qu'il n'y avait pas d'arachides.
• [Question] Faut-il prévoir un PAI pour l'école ?
```

**Output obtenu (extrait) :**
```
**Résumé de la période**
L'enfant présente une toux sèche nocturne depuis trois jours, sans fièvre. Cette observation
survient dans un contexte de suivi de son asthme léger et de gestion de ses allergies [...]

**Questions à poser au pédiatre**
1. La toux sèche nocturne actuelle nécessite-t-elle un ajustement du traitement de l'asthme ?
2. Compte tenu des allergies, est-il indispensable de formaliser un Projet d'Accueil Individualisé (PAI) pour l'école ?
3. Quels sont les signes précis qui doivent déclencher une consultation urgente en cas d'aggravation respiratoire ?

**Points de vigilance**
[...] Consulter rapidement si l'enfant présente une gêne respiratoire au repos, une respiration
sifflante persistante, une fièvre élevée ou une détresse visible.
```
→ le modèle relie la toux à l'antécédent d'asthme et reprend la question du parent sur le PAI.

---

## 4. Évaluation des performances et limites

### Performances mesurées
| Métrique | Jalons OMS | Synthèse journal |
|----------|-----------|------------------|
| Latence sans cache | ~1,3 s | ~1 à 16 s (variable selon la charge Groq) |
| Latence avec cache | < 50 ms | < 50 ms |
| Suggestions dans une catégorie valide | 100 % sur nos essais (filtrées sinon) | — |
| Sections respectées | — | 4/4 sur nos essais |

### Limites
1. **Pas de diagnostic** — l'évaluation des jalons est indicative ; chaque enfant évolue à son rythme (disclaimer affiché)
2. **Données saisies par les parents** — la synthèse ne vaut que ce que contient le journal
3. **Anonymisation par motifs** — un nom propre non précédé de « Dr » (ex. nom d'un frère) n'est pas détecté
4. **Âges attendus** — les âges proposés par le modèle sont des repères approximatifs, à confirmer avec le carnet de santé
5. **Latence variable** — le tier gratuit de Groq peut ralentir (jusqu'à ~20 s observés)

### Tests
`tests/unit/ai-dossier.test.js` (appels Groq réels) : structure de la réponse, catégories valides, absence du prénom et des coordonnées dans la réponse, cache, invalidation du cache, contrôle d'accès.
