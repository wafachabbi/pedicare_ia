// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION DES PUBLICITÉS
// ─────────────────────────────────────────────────────────────────────────────
// Pour AJOUTER une pub    → ajouter un objet dans le tableau ci-dessous
// Pour SUPPRIMER une pub  → supprimer ou commenter l'objet correspondant
// Pour DÉSACTIVER une pub → passer active: false
//
// Champs :
//   id          — identifiant unique (string)
//   image       — URL de l'image (externe) OU chemin import local (voir exemple)
//   title       — titre du produit
//   description — courte description (1-2 phrases)
//   badge       — label badge coloré (ex: "Nouveau", "Recommandé")
//   badgeColor  — couleur du badge : "blue" | "rose" | "emerald" | "orange" | "violet"
//   link        — URL vers le site du produit (mettre '#' si pas de lien)
//   active      — true = affiché, false = masqué sans supprimer
//
// ─── Pour utiliser une image locale ─────────────────────────────────────────
// 1. Copiez votre image dans : client/src/assets/ads/
// 2. Importez-la en haut de ce fichier :
//    import monImage from '../assets/ads/mon-produit.jpg'
// 3. Utilisez-la dans le champ image :
//    image: monImage
// ─────────────────────────────────────────────────────────────────────────────

const ads = [
  {
    id: 'primalac-premium',
    // ↓ Remplacez par : import primalacPremium from '../assets/ads/primalac-premium.jpg'
    //   puis mettez : image: primalacPremium
    image: 'https://www.primalac.com/wp-content/uploads/2021/03/primalac-1-starter.png',
    title: 'Primalac Premium',
    description: 'Lait infantile 0-6 mois enrichi en fer · Qualité Suisse · DHA/ARA · Prébiotiques',
    badge: 'Recommandé',
    badgeColor: 'blue',
    link: 'https://www.primalac.com',
    active: true
  },
  {
    id: 'primalac-mama',
    image: 'https://www.primalac.com/wp-content/uploads/2021/03/primalac-mama.png',
    title: 'Primalac Mama',
    description: 'Complément pour femmes enceintes et allaitantes · Oméga 3 · Acide Folique · Vitamines',
    badge: 'Nouveau',
    badgeColor: 'rose',
    link: 'https://www.primalac.com',
    active: true
  },

  // ── Exemple pour ajouter un nouveau produit ──────────────────────────────
  // {
  //   id: 'vitamin-d',
  //   image: 'https://url-de-votre-image.jpg',
  //   title: 'Vitamine D Pédiatrique',
  //   description: 'Complément en vitamine D pour nourrissons et jeunes enfants.',
  //   badge: 'Promo',
  //   badgeColor: 'emerald',
  //   link: 'https://www.site-produit.com',
  //   active: true
  // },
]

export default ads.filter(ad => ad.active)
