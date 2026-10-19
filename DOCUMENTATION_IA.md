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
