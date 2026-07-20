import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { initDB } from './config/database.js'
import { User } from './models/User.js'
import { Room } from './models/Room.js'
import { Appliance } from './models/Appliance.js'
import { Settings } from './models/Settings.js'

const userData = {
  name: 'Abrar Shaikh',
  email: 'abrarshaikh@gmail.com',
  password: '1234567',
}

const roomTemplates = [
  {
    name: 'Living Room',
    appliances: [
      { name: 'LED TV', wattage: 150, quantity: 1, daily_hours: 5, standby: true, standby_hours: 8 },
      { name: 'Wi-Fi Router', wattage: 12, quantity: 1, daily_hours: 24, standby: true, standby_hours: 24 },
      { name: 'Air Purifier', wattage: 50, quantity: 1, daily_hours: 4, standby: false, standby_hours: 0 },
    ],
  },
  {
    name: 'Master Bedroom',
    appliances: [
      { name: 'Split AC', wattage: 1800, quantity: 1, daily_hours: 6, standby: false, standby_hours: 0 },
      { name: 'Bedside Lamp', wattage: 12, quantity: 2, daily_hours: 4, standby: false, standby_hours: 0 },
      { name: 'Phone Charger', wattage: 10, quantity: 2, daily_hours: 2, standby: true, standby_hours: 22 },
    ],
  },
  {
    name: 'Guest Bedroom',
    appliances: [
      { name: 'Ceiling Fan', wattage: 75, quantity: 1, daily_hours: 10, standby: false, standby_hours: 0 },
      { name: 'Reading Lamp', wattage: 12, quantity: 1, daily_hours: 3, standby: false, standby_hours: 0 },
      { name: 'Mobile Charger', wattage: 10, quantity: 1, daily_hours: 1, standby: true, standby_hours: 23 },
    ],
  },
  {
    name: 'Kitchen',
    appliances: [
      { name: 'Refrigerator', wattage: 180, quantity: 1, daily_hours: 24, standby: false, standby_hours: 0 },
      { name: 'Microwave', wattage: 1200, quantity: 1, daily_hours: 0.5, standby: true, standby_hours: 23.5 },
      { name: 'Water Heater', wattage: 2000, quantity: 1, daily_hours: 1, standby: false, standby_hours: 0 },
    ],
  },
]

const settings = [
  { key: 'ratePerUnit', value: 8 },
]

async function seed() {
  await initDB()

  const normalizedEmail = userData.email.trim().toLowerCase()
  let user = await User.findOne({ email: normalizedEmail })

  if (user) {
    console.log(`Found existing user ${normalizedEmail}, replacing home data for that user.`)
    await Appliance.deleteMany({ user_id: user._id })
    await Room.deleteMany({ user_id: user._id })
    await Settings.deleteMany({ user_id: user._id })
  }

  const passwordHash = await bcrypt.hash(userData.password, 12)

  if (!user) {
    user = await User.create({
      name: userData.name,
      email: normalizedEmail,
      password_hash: passwordHash,
    })
    console.log(`Created user: ${normalizedEmail}`)
  } else {
    user.name = userData.name
    user.password_hash = passwordHash
    await user.save()
    console.log(`Updated user credentials for: ${normalizedEmail}`)
  }

  const roomRecords = []
  for (const roomTemplate of roomTemplates) {
    const room = await Room.create({
      user_id: user._id,
      name: roomTemplate.name,
    })
    roomRecords.push(room)

    for (const applianceTemplate of roomTemplate.appliances) {
      await Appliance.create({
        user_id: user._id,
        room_id: room._id,
        name: applianceTemplate.name,
        wattage: applianceTemplate.wattage,
        quantity: applianceTemplate.quantity,
        daily_hours: applianceTemplate.daily_hours,
        standby: applianceTemplate.standby,
        standby_hours: applianceTemplate.standby_hours,
        is_custom: false,
      })
    }
  }

  for (const setting of settings) {
    await Settings.create({
      user_id: user._id,
      key: setting.key,
      value: setting.value,
    })
  }

  console.log('Seed completed successfully.')
  console.log(`User: ${userData.name} <${normalizedEmail}>`)
  console.log('2BHK home rooms added:')
  roomRecords.forEach((room) => console.log(` - ${room.name}`))
  process.exit(0)
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
