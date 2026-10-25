const mongoose = require('mongoose')
const Child = require('./server/models/Child')

// Connect to MongoDB
mongoose.connect('mongodb+srv://molkaghazouani99_db_user:tiZ1tedIumu4rCQ4@cluster0.t5ofrcp.mongodb.net/pedicare_ai')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

const children = [
  {
    firstName: 'Thomas',
    dateOfBirth: new Date('2018-06-15'),
    gender: 'M',
    bloodType: 'A+',
    allergies: ['peanuts', 'shellfish'],
    antecedentsMedicaux: 'Apendicectomie en 2020'
  },
  {
    firstName: 'Emma',
    dateOfBirth: new Date('2020-03-10'),
    gender: 'F',
    bloodType: 'O-',
    allergies: ['milk', 'eggs'],
    antecedentsMedicaux: 'Rumination du nourrisson'
  },
  {
    firstName: 'Liam',
    dateOfBirth: new Date('2017-11-22'),
    gender: 'M',
    bloodType: 'B+',
    allergies: ['peanuts'],
    antecedentsMedicaux: 'None'
  },
  {
    firstName: 'Sophie',
    dateOfBirth: new Date('2019-08-28'),
    gender: 'F',
    bloodType: 'AB+',
    allergies: ['dust mites', 'pollen'],
    antecedentsMedicaux: 'Asthme depuis 2 ans'
  }
]

async function seedChildren() {
  try {
    // Clear existing children
    await Child.deleteMany({})
    console.log('Cleared existing children')

    // Create children with allergies and medical history
    const createdChildren = await Child.insertMany(children)
    console.log(`${createdChildren.length} children seeded successfully`)

    createdChildren.forEach(child => {
      console.log(`-${child.firstName}: Allergies=${child.allergies?.join(', ') || 'none'}, Antécédents=${child.antecedentsMedicaux || 'none'}`)
    })

    process.exit(0)
  } catch (error) {
    console.error('Error seeding children:', error)
    process.exit(1)
  }
}

seedChildren()