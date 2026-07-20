import { co2, cost, dailyKwh, monthlyKwh, wasteScore } from './calculations'

const STORAGE_KEY = 'phantom-load:app-state'
const MAX_SNAPSHOTS = 12

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function sanitizeSnapshots(snapshots) {
  if (!Array.isArray(snapshots)) {
    return []
  }

  return snapshots
    .filter((snapshot) => snapshot && typeof snapshot === 'object' && typeof snapshot.id === 'string')
    .slice(0, MAX_SNAPSHOTS)
}

function readStoredPayload() {
  if (typeof window === 'undefined') {
    return { theme: 'dark' }
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY)

    if (!rawValue) {
      return { theme: 'dark' }
    }

    const parsed = JSON.parse(rawValue)
    const theme = parsed?.theme === 'light' ? 'light' : 'dark'

    return { theme }
  } catch {
    return { theme: 'dark' }
  }
}

export function loadStoredAppState({ fallbackRatePerUnit = 8 } = {}) {
  const storedPayload = readStoredPayload()

  return {
    rooms: [],
    ratePerUnit: fallbackRatePerUnit,
    auditSnapshots: [],
    lastSavedAt: null,
    theme: storedPayload.theme,
  }
}

export function saveStoredAppState({
  theme,
}) {
  if (typeof window === 'undefined') {
    return
  }

  const payload = {
    theme: theme === 'light' ? 'light' : 'dark',
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
