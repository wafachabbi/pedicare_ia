# 🏥 PediCare AI — Pipeline QLoRA

Fine-tuning QLoRA du modèle de synthèse du journal pédiatrique.

---

## Architecture

```
Observations journal (30 jours)
          ↓
    QLoRA fine-tuned
  (Mistral-7B en 4-bit)
          ↓
  Synthèse structurée
  pour le pédiatre
```

---

## Fichiers

```
qlora/
├── PediCare_QLoRA_Journal.ipynb   ← Notebook Google Colab (entraînement)
└── README.md                      ← Ce fichier

server/
├── data/
│   └── qlora-journal-dataset.json ← 12 exemples d'entraînement
└── services/
    └── qlora.service.js           ← Intégration backend Node.js
```

---

## Étapes pour entraîner et déployer

### Étape 1 — Préparer Google Colab

1. Ouvrir [Google Colab](https://colab.research.google.com)
2. **Fichier → Importer un notebook** → choisir `PediCare_QLoRA_Journal.ipynb`
3. **Runtime → Changer le type de runtime → GPU → T4** (gratuit)

### Étape 2 — Configurer HuggingFace

1. Créer un compte sur [huggingface.co](https://huggingface.co) (gratuit)
2. Aller sur [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Créer un token **READ+WRITE**
4. Dans Colab : icône 🔑 (Secrets) → Ajouter `HF_TOKEN` = votre token

### Étape 3 — Uploader le dataset

1. Dans Colab : icône 📁 (Fichiers) → **Importer**
2. Choisir `server/data/qlora-journal-dataset.json`

### Étape 4 — Exécuter le notebook

Exécuter les cellules dans l'ordre :

| Cellule | Action | Durée estimée |
|---------|--------|---------------|
| 1 | Installation dépendances | ~3 min |
| 2 | Authentification HuggingFace | ~10 sec |
| 3 | Chargement dataset | ~5 sec |
| 4 | Chargement modèle 4-bit | ~5 min |
| 5 | Configuration LoRA | ~10 sec |
| 6 | **Entraînement QLoRA** | ~20-40 min |
| 7 | Test du modèle | ~1 min |
| 8 | Sauvegarde adaptateurs | ~1 min |
| 9 | Merge (optionnel) | ~10 min |
| 10 | Export HuggingFace Hub | ~5 min |
| 11 | Évaluation qualitative | ~3 min |
| 12 | Téléchargement local | ~1 min |

> ⏱️ Durée totale estimée : **45-60 minutes** sur T4 gratuit

### Étape 5 — Configurer le backend

Après l'entraînement, dans `server/.env` :

```env
QLORA_MODE=huggingface
HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxx
HF_QLORA_MODEL=votre-username/pedicare-journal-qlora
```

Redémarrer le serveur → la synthèse du journal utilisera automatiquement le modèle QLoRA.

---

## Modes de fonctionnement

| `QLORA_MODE` | Comportement |
|---|---|
| `auto` | Essaie HuggingFace, fallback Groq si indisponible **(défaut)** |
| `huggingface` | Force le modèle QLoRA fine-tuné |
| `groq` | Force le fallback Groq (prompt engineering) |

---

## Paramètres QLoRA utilisés

```python
# Quantization
load_in_4bit = True
bnb_4bit_quant_type = 'nf4'          # Normal Float 4-bit
bnb_4bit_compute_dtype = float16
bnb_4bit_use_double_quant = True     # Double quantization

# LoRA adapters
r = 8                                 # Rank
lora_alpha = 16                       # Scaling factor (2 × rank)
lora_dropout = 0.05
target_modules = ['q_proj', 'k_proj', 'v_proj', 'o_proj',
                  'gate_proj', 'up_proj', 'down_proj']

# Entraînement
num_train_epochs = 5
learning_rate = 2e-4
optimizer = 'paged_adamw_32bit'
lr_scheduler = 'cosine'
```

---

## Comparaison techniques

| Technique | Qualité | GPU | Coût | Statut |
|---|---|---|---|---|
| Prompt Engineering (Groq) | Bonne | Aucun | 0€ | ✅ Actif (fallback) |
| **QLoRA fine-tuned** | **Meilleure** | T4 gratuit | **0€** | 🔄 À entraîner |

---

## Enrichir le dataset

Pour améliorer la qualité, ajouter des exemples dans `server/data/qlora-journal-dataset.json` :

```json
{
  "id": 13,
  "instruction": "Tu es un assistant médical pédiatrique. Synthétise les observations du journal parental en une synthèse structurée utile pour le pédiatre.",
  "input": "Observations (30 jours) :\n• [date] [catégorie] observation\n...\nEnfant : X mois, garçon/fille. Allergies : ...",
  "output": "**Résumé de la période**\n...\n**Tendances observées**\n...\n**Questions à poser au pédiatre**\n...\n**Points de vigilance**\n..."
}
```

**Recommandation : 50+ exemples** pour un bon fine-tuning. Plus d'exemples = meilleure qualité.

---

## Dépannage

| Problème | Solution |
|---|---|
| `CUDA out of memory` | Réduire `per_device_train_batch_size=1` |
| `Model loading` (HF) | Attendre 30s, modèle en cold start |
| `HF_TOKEN manquant` | Ajouter dans `server/.env` |
| Résultats mauvais | Ajouter plus d'exemples au dataset |
| Colab déconnecté | Relancer depuis la cellule 6 (les poids sont sauvegardés) |
