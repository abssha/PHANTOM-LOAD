import { co2, cost, dailyKwh, monthlyKwh, wasteScore } from './calculations'

const STORAGE_KEY = 'phantom-load:app-state'
const MAX_SNAPSHOTS = 12

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function isValidAppliance(appliance) {
  return (
    appliance &&
    typeof appliance === 'object' &&
    typeof appliance.id === 'string' &&
    typeof appliance.name === 'string' &&
    Number.isFinite(Number(appliance.wattage)) &&
    Number.isFinite(Number(appliance.quantity)) &&
    Number.isFinite(Number(appliance.dailyHours)) &&
    typeof appliance.standby === 'boolean' &&
    Number.isFinite(Number(appliance.standbyHours))
  )
}

function isValidRoom(room) {
  return (
    room &&
    typeof room === 'object' &&
    typeof room.id === 'string' &&
    typeof room.name === 'string' &&
    Array.isArray(room.appliances) &&
    room.appliances.every(isValidAppliance)
  )
}

function sanitizeSnapshots(snapshots) {
  if (!Array.isArray(snapshots)) {
    return []
  }

  return snapshots
    .filter((snapshot) => snapshot && typeof snapshot === 'object' && typeof snapshot.id === 'string')
    .slice(0, MAX_SNAPSHOTS)
}

function createFallbackSlice({ fallbackRooms, fallbackRatePerUnit }) {
  return {
    rooms: cloneValue(fallbackRooms),
    ratePerUnit: fallbackRatePerUnit,
    auditSnapshots: [],
    lastSavedAt: null,
  }
}

function sanitizeStateSlice(candidate, fallbackSlice) {
  const rooms = Array.isArray(candidate?.rooms) && candidate.rooms.every(isValidRoom)
    ? candidate.rooms
    : fallbackSlice.rooms
  const ratePerUnit =
    Number.isFinite(Number(candidate?.ratePerUnit)) && Number(candidate.ratePerUnit) > 0
      ? Number(candidate.ratePerUnit)
      : fallbackSlice.ratePerUnit
  const auditSnapshots = sanitizeSnapshots(candidate?.auditSnapshots)
  const lastSavedAt = typeof candidate?.lastSavedAt === 'string' ? candidate.lastSavedAt : null

  return {
    rooms,
    ratePerUnit,
    auditSnapshots,
    lastSavedAt,
  }
}

function readStoredPayload() {
  const fallbackPayload = {
    theme: 'dark',
    users: {},
    guest: null,
  }

  if (typeof window === 'undefined') {
    return fallbackPayload
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return fallbackPayload
    }

    const parsed = JSON.parse(rawValue)
    const theme = parsed?.theme === 'light' ? 'light' : 'dark'
    const users = parsed?.users && typeof parsed.users === 'object' ? parsed.users : {}
    const legacyGuest =
      Array.isArray(parsed?.rooms) || Number.isFinite(Number(parsed?.ratePerUnit)) || Array.isArray(parsed?.auditSnapshots)
        ? parsed
        : null

    return {
      theme,
      users,
      guest: parsed?.guest && typeof parsed.guest === 'object' ? parsed.guest : legacyGuest,
    }
  } catch {
    return fallbackPayload
  }
}

export function loadStoredAppState({ fallbackRooms, fallbackRatePerUnit, userId = null }) {
  const fallbackSlice = createFallbackSlice({ fallbackRooms, fallbackRatePerUnit })
  const storedPayload = readStoredPayload()
  const storedSlice = userId ? storedPayload.users?.[userId] ?? null : storedPayload.guest

  return {
    ...sanitizeStateSlice(storedSlice, fallbackSlice),
    theme: storedPayload.theme,
  }
}

export function saveStoredAppState({
  rooms,
  ratePerUnit,
  auditSnapshots,
  lastSavedAt,
  theme,
  userId = null,
}) {
  if (typeof window === 'undefined') {
    return
  }

  const storedPayload = readStoredPayload()
  const stateSlice = {
    rooms,
    ratePerUnit,
    auditSnapshots: sanitizeSnapshots(auditSnapshots),
    lastSavedAt,
  }
  const payload = {
    theme: theme === 'light' ? 'light' : 'dark',
    users: {
      ...storedPayload.users,
      ...(userId ? { [userId]: stateSlice } : {}),
    },
    guest: userId ? storedPayload.guest : stateSlice,
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage write failures so the app remains usable.
  }
}

export function clearStoredAppState() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures so the UI can still continue.
  }
}

export function createAuditSnapshot({ rooms, ratePerUnit }) {
  const allAppliances = rooms.flatMap((room) =>
    room.appliances.map((appliance) => ({
      ...appliance,
      roomId: room.id,
      roomName: room.name,
    })),
  )

  const totalMonthlyKwh = allAppliances.reduce(
    (sum, appliance) =>
      sum +
      monthlyKwh(
        dailyKwh(
          appliance.wattage,
          appliance.quantity,
          appliance.dailyHours,
          appliance.standby,
          appliance.standbyHours,
        ),
      ),
    0,
  )
  const totalMonthlyCost = cost(totalMonthlyKwh, ratePerUnit)
  const totalCO2 = co2(totalMonthlyKwh)
  const topVampires = [...allAppliances]
    .map((appliance) => ({
      name: appliance.name,
      roomName: appliance.roomName,
      score: wasteScore(appliance, ratePerUnit),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  const roomSummary = rooms.map((room) => {
    const monthlyKwhValue = room.appliances.reduce(
      (sum, appliance) =>
        sum +
        monthlyKwh(
          dailyKwh(
            appliance.wattage,
            appliance.quantity,
            appliance.dailyHours,
            appliance.standby,
            appliance.standbyHours,
          ),
        ),
      0,
    )

    return {
      id: room.id,
      name: room.name,
      applianceCount: room.appliances.length,
      monthlyKwh: Number(monthlyKwhValue.toFixed(2)),
      monthlyCost: Number(cost(monthlyKwhValue, ratePerUnit).toFixed(2)),
    }
  })

  const createdAt = new Date().toISOString()
  const snapshotLabel = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(createdAt))

  return {
    id: `snapshot_${Date.now()}`,
    label: `Audit ${snapshotLabel}`,
    createdAt,
    totalMonthlyKwh: Number(totalMonthlyKwh.toFixed(2)),
    totalMonthlyCost: Number(totalMonthlyCost.toFixed(2)),
    totalCO2: Number(totalCO2.toFixed(2)),
    ratePerUnit: Number(ratePerUnit),
    roomSummary,
    topVampires,
    inventorySnapshot: cloneValue(rooms),
  }
}

export function trimSnapshots(snapshots) {
  return sanitizeSnapshots(snapshots)
}
