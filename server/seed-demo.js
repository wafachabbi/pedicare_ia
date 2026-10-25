/**
 * Données de démonstration — étapes de développement, allergies/antécédents,
 * journal et contacts médicaux, pour tester l'espace parent ET l'espace pédiatre.
 *
 * Usage :  node seed-demo.js [email-du-pediatre]
 *   (par défaut : molka1@gmail.com)
 *
 * Crée (ou recrée) le compte parent demo.parent@pedicare.test / Demo1234!
 * avec 3 enfants assignés au pédiatre via des rendez-vous et vaccinations.
 * Relançable : les anciennes données du parent de démo sont supprimées avant.
 */
require('dns').setServers(['8.8.8.8', '1.1.1.1'])
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Child = require('./models/Child')
const Appointment = require('./models/Appointment')
const Vaccination = require('./models/Vaccination')
const Milestone = require('./models/Milestone')
const MedicalRecord = require('./models/MedicalRecord')
const JournalEntry = require('./models/JournalEntry')
const MedicalContact = require('./models/MedicalContact')
const Measurement = require('./models/Measurement')

const PARENT_EMAIL = 'demo.parent@pedicare.test'
const PARENT_PASSWORD = 'Demo1234!'
const PEDIATRE_EMAIL = process.argv[2] || 'molka1@gmail.com'

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)
const daysFromNow = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000)
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d }

async function seed() {
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ MongoDB connecté')

  const pediatre = await User.findOne({ email: PEDIATRE_EMAIL, role: 'pediatre' })
  if (!pediatre) throw new Error(`Pédiatre ${PEDIATRE_EMAIL} introuvable`)

  // ── Nettoyage de l'ancien jeu de démo ───────────────────────────────────────
  const oldParent = await User.findOne({ email: PARENT_EMAIL })
  if (oldParent) {
    const oldIds = (await Child.find({ parentId: oldParent._id }).select('_id').lean()).map(c => c._id)
    const byChild = { childId: { $in: oldIds } }
    await Promise.all([
      Appointment.deleteMany(byChild), Vaccination.deleteMany(byChild), Milestone.deleteMany(byChild),
      MedicalRecord.deleteMany(byChild), JournalEntry.deleteMany(byChild), MedicalContact.deleteMany(byChild),
      Measurement.deleteMany(byChild), Child.deleteMany({ parentId: oldParent._id })
    ])
    await User.deleteOne({ _id: oldParent._id })
    console.log('🧹 Ancien jeu de démo supprimé')
  }

  const parent = await User.create({
    email: PARENT_EMAIL,
    password: await bcrypt.hash(PARENT_PASSWORD, 12),
    role: 'parent'
  })

  const pedName = pediatre.fullName ? `Dr. ${pediatre.fullName}` : pediatre.email

  // ── Enfants ────────────────────────────────────────────────────────────────
  const [yasmine, adam, lina] = await Child.create([
    { parentId: parent._id, firstName: 'Yasmine', dateOfBirth: monthsAgo(10), gender: 'F', bloodType: 'A+' },
    { parentId: parent._id, firstName: 'Adam', dateOfBirth: monthsAgo(26), gender: 'M', bloodType: 'O+' },
    { parentId: parent._id, firstName: 'Lina', dateOfBirth: monthsAgo(54), gender: 'F', bloodType: 'B-' }
  ])

  // ── Liens avec le pédiatre (rendez-vous + vaccinations) ─────────────────────
  await Appointment.create([
    { childId: yasmine._id, type: 'consultation', dateTime: daysFromNow(5), pediatreId: pediatre._id, practitioner: pedName, notes: 'Visite des 10 mois', status: 'upcoming' },
    { childId: yasmine._id, type: 'consultation', dateTime: daysAgo(60), pediatreId: pediatre._id, practitioner: pedName, notes: 'Bronchiolite', status: 'past' },
    { childId: adam._id, type: 'consultation', dateTime: daysFromNow(12), pediatreId: pediatre._id, practitioner: pedName, notes: 'Bilan des 2 ans', status: 'upcoming' },
    { childId: lina._id, type: 'exam', dateTime: daysAgo(20), pediatreId: pediatre._id, practitioner: pedName, notes: 'Tests allergologiques', status: 'past' }
  ])
  await Vaccination.create([
    { childId: yasmine._id, vaccineName: 'DTCaP-Hib-HepB (2e dose)', administeredAt: monthsAgo(6), lotNumber: 'HX4521', pediatreId: pediatre._id, practitioner: pedName },
    { childId: yasmine._id, vaccineName: 'Pneumocoque', administeredAt: monthsAgo(6), pediatreId: pediatre._id, practitioner: pedName },
    { childId: adam._id, vaccineName: 'ROR (2e dose)', administeredAt: monthsAgo(9), lotNumber: 'RR8890', pediatreId: pediatre._id, practitioner: pedName },
    { childId: lina._id, vaccineName: 'DTCaP (rappel)', administeredAt: monthsAgo(12), pediatreId: pediatre._id, practitioner: pedName }
  ])

  // ── Étapes de développement ─────────────────────────────────────────────────
  await Milestone.create([
    { childId: yasmine._id, category: 'Motricité globale', title: 'Tient assise sans appui', expectedAgeMonths: 7, status: 'atteint', achievedAt: monthsAgo(3) },
    { childId: yasmine._id, category: 'Motricité globale', title: 'Se met debout avec appui', expectedAgeMonths: 9, status: 'atteint', achievedAt: daysAgo(15) },
    { childId: yasmine._id, category: 'Motricité globale', title: 'Marche seule', expectedAgeMonths: 12, status: 'en_cours' },
    { childId: yasmine._id, category: 'Motricité fine', title: 'Pince pouce-index', expectedAgeMonths: 9, status: 'en_cours', notes: 'Commence à attraper les petits morceaux' },
    { childId: yasmine._id, category: 'Langage', title: 'Babille « mama », « baba »', expectedAgeMonths: 8, status: 'atteint', achievedAt: monthsAgo(2) },
    { childId: yasmine._id, category: 'Social/Émotionnel', title: 'Fait « au revoir » de la main', expectedAgeMonths: 10, status: 'non_atteint' },

    { childId: adam._id, category: 'Motricité globale', title: 'Marche seul', expectedAgeMonths: 12, status: 'atteint', achievedAt: monthsAgo(13) },
    { childId: adam._id, category: 'Motricité globale', title: 'Monte les escaliers avec aide', expectedAgeMonths: 18, status: 'atteint', achievedAt: monthsAgo(6) },
    { childId: adam._id, category: 'Langage', title: 'Associe deux mots', expectedAgeMonths: 24, status: 'en_cours', notes: 'Une dizaine de mots isolés' },
    { childId: adam._id, category: 'Cognitif', title: 'Empile 4 cubes', expectedAgeMonths: 18, status: 'atteint', achievedAt: monthsAgo(5) },
    { childId: adam._id, category: 'Social/Émotionnel', title: 'Joue à faire semblant', expectedAgeMonths: 24, status: 'en_cours' },

    { childId: lina._id, category: 'Motricité globale', title: 'Saute à cloche-pied', expectedAgeMonths: 48, status: 'atteint', achievedAt: monthsAgo(4) },
    { childId: lina._id, category: 'Motricité fine', title: 'Dessine un bonhomme', expectedAgeMonths: 48, status: 'atteint', achievedAt: monthsAgo(3) },
    { childId: lina._id, category: 'Langage', title: 'Raconte une petite histoire', expectedAgeMonths: 48, status: 'atteint', achievedAt: monthsAgo(5) },
    { childId: lina._id, category: 'Cognitif', title: 'Compte jusqu\'à 10', expectedAgeMonths: 54, status: 'en_cours' }
  ])

  // ── Allergies & antécédents ─────────────────────────────────────────────────
  await MedicalRecord.create([
    { childId: yasmine._id, type: 'allergie', name: 'Protéines de lait de vache', severity: 'moderee', reaction: 'Eczéma, coliques', diagnosedAt: monthsAgo(5), treatment: 'Lait infantile hydrolysé' },
    { childId: yasmine._id, type: 'antecedent', name: 'Bronchiolite', diagnosedAt: daysAgo(60), treatment: 'Kinésithérapie respiratoire', active: false },

    { childId: adam._id, type: 'antecedent', name: 'Convulsion fébrile', diagnosedAt: monthsAgo(11), notes: 'Épisode unique à 39,8°C', active: false },
    { childId: adam._id, type: 'antecedent', name: 'Otites à répétition', diagnosedAt: monthsAgo(8), treatment: 'Surveillance ORL' },

    { childId: lina._id, type: 'allergie', name: 'Arachides', severity: 'severe', reaction: 'Œdème des lèvres, urticaire', diagnosedAt: daysAgo(20), treatment: 'Stylo d\'adrénaline (Anapen)' },
    { childId: lina._id, type: 'allergie', name: 'Pollen de graminées', severity: 'legere', reaction: 'Rhinite, yeux qui piquent', treatment: 'Antihistaminique au printemps' },
    { childId: lina._id, type: 'antecedent', name: 'Asthme léger', diagnosedAt: monthsAgo(18), treatment: 'Ventoline si besoin' }
  ])

  // ── Journal des observations ────────────────────────────────────────────────
  await JournalEntry.create([
    { childId: yasmine._id, date: daysAgo(1), category: 'Sommeil', text: 'Réveillée 3 fois cette nuit, semble gênée par les dents du haut.' },
    { childId: yasmine._id, date: daysAgo(3), category: 'Alimentation', text: 'Premier essai de compote pomme-poire, bien acceptée.' },
    { childId: yasmine._id, date: daysAgo(6), category: 'Symptôme', text: 'Petites plaques rouges sur les joues après le biberon, disparues en 2 heures.' },
    { childId: yasmine._id, date: daysAgo(9), category: 'Question', text: 'Quand commencer les morceaux ? À demander au pédiatre.' },
    { childId: yasmine._id, date: daysAgo(14), category: 'Comportement', text: 'Pleure beaucoup quand on la laisse à la crèche.' },

    { childId: adam._id, date: daysAgo(2), category: 'Symptôme', text: 'Fièvre à 38,6°C le soir, tire sur son oreille droite.' },
    { childId: adam._id, date: daysAgo(4), category: 'Comportement', text: 'Colères fréquentes au moment du coucher.' },
    { childId: adam._id, date: daysAgo(10), category: 'Observation', text: 'Dit « encore » et « papa parti » : premières associations de mots ?' },
    { childId: adam._id, date: daysAgo(18), category: 'Sommeil', text: 'Fait des siestes plus courtes (45 min).' },

    { childId: lina._id, date: daysAgo(5), category: 'Symptôme', text: 'Toux sèche la nuit depuis 3 jours, pas de fièvre.' },
    { childId: lina._id, date: daysAgo(12), category: 'Alimentation', text: 'Goûter d\'anniversaire à l\'école : vérifié qu\'il n\'y avait pas d\'arachides.' },
    { childId: lina._id, date: daysAgo(25), category: 'Question', text: 'Faut-il prévoir un PAI pour l\'école ?' }
  ])

  // ── Contacts médicaux ───────────────────────────────────────────────────────
  const pedContact = (childId) => ({
    childId, type: 'pediatre', name: pedName, specialty: pediatre.speciality || 'Pédiatrie',
    phone: pediatre.phone || '+216 71 000 000', email: pediatre.email
  })
  await MedicalContact.create([
    pedContact(yasmine._id), pedContact(adam._id), pedContact(lina._id),
    { childId: yasmine._id, type: 'specialiste', name: 'Dr. Salma Trabelsi', specialty: 'Kinésithérapeute', phone: '+216 98 123 456', adresse: 'Rue de Marseille, Tunis' },
    { childId: adam._id, type: 'specialiste', name: 'Dr. Karim Ben Ali', specialty: 'ORL pédiatrique', phone: '+216 71 456 789', email: 'k.benali@clinique.tn', adresse: 'Clinique Les Berges du Lac' },
    { childId: lina._id, type: 'specialiste', name: 'Dr. Ines Mansour', specialty: 'Allergologue', phone: '+216 22 987 654', notes: 'Contrôle annuel au printemps' },
    { childId: lina._id, type: 'autre', name: 'SAMU', phone: '190', notes: 'Urgence : choc anaphylactique' }
  ])

  // ── Quelques mesures de croissance ──────────────────────────────────────────
  await Measurement.create([
    { childId: yasmine._id, date: monthsAgo(4), weight: 7.6, height: 67, headCircumference: 42.5 },
    { childId: yasmine._id, date: daysAgo(10), weight: 8.6, height: 72, headCircumference: 44 },
    { childId: adam._id, date: monthsAgo(6), weight: 11.4, height: 84 },
    { childId: adam._id, date: daysAgo(20), weight: 12.3, height: 88 },
    { childId: lina._id, date: daysAgo(20), weight: 16.8, height: 105 }
  ]).catch(err => console.warn('⚠️  Mesures ignorées :', err.message))

  console.log(`\n🌱 Données de démo créées (pédiatre : ${PEDIATRE_EMAIL})`)
  console.log(`   Parent : ${PARENT_EMAIL} / ${PARENT_PASSWORD}`)
  console.log('   Enfants : Yasmine (10 mois), Adam (2 ans), Lina (4 ans)')
}

seed()
  .catch(err => { console.error('❌', err.message); process.exitCode = 1 })
  .finally(() => mongoose.disconnect())
