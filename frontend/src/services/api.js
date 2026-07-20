const DEFAULT_API_BASE_URL = 'http://localhost:3001'
let authToken = null

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '')

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function mapApplianceFromApi(appliance) {
  return {
    id: appliance?._id ?? appliance?.id ?? '',
    roomId: appliance?.room_id ?? appliance?.roomId ?? null,
    name: appliance?.name ?? 'Unnamed Appliance',
    wattage: toNumber(appliance?.wattage),
    quantity: Math.max(1, toNumber(appliance?.quantity, 1)),
    dailyHours: toNumber(appliance?.daily_hours ?? appliance?.dailyHours),
    standby: Boolean(appliance?.standby),
    standbyHours: toNumber(appliance?.standby_hours ?? appliance?.standbyHours),
    isCustom: Boolean(appliance?.is_custom ?? appliance?.isCustom),
  }
}

function mapRoomFromApi(room) {
  return {
    id: room?._id ?? room?.id ?? '',
    name: room?.name ?? 'Untitled Room',
    createdAt: room?.createdAt ?? null,
    appliances: Array.isArray(room?.appliances) ? room.appliances.map(mapApplianceFromApi) : [],
  }
}

function mapUserFromApi(user) {
  return {
    _id: user?._id ?? user?.id ?? '',
    name: user?.name ?? 'User',
    email: user?.email ?? '',
    createdAt: user?.createdAt ?? null,
    updatedAt: user?.updatedAt ?? null,
  }
}

function mapTopVampireFromApi(item) {
  return {
    applianceId: item?.applianceId ?? item?.appliance_id ?? item?._id ?? item?.id ?? '',
    name: item?.name ?? 'Unnamed Appliance',
    roomName: item?.roomName ?? item?.room_name ?? 'Unknown Room',
    score: toNumber(item?.score),
  }
}

function mapRoomSummaryFromApi(item) {
  return {
    roomId: item?.roomId ?? item?.room_id ?? item?._id ?? item?.id ?? '',
    name: item?.name ?? 'Untitled Room',
    applianceCount: Math.max(0, toNumber(item?.applianceCount ?? item?.appliance_count)),
    monthlyKwh: toNumber(item?.monthlyKwh ?? item?.monthly_kwh),
    monthlyCost: toNumber(item?.monthlyCost ?? item?.monthly_cost),
  }
}

function mapAuditFromApi(audit, index = 0) {
  return {
    id: audit?._id ?? audit?.id ?? `audit_${index}`,
    label: audit?.label ?? audit?.title ?? audit?.name ?? 'Saved audit',
    createdAt: audit?.createdAt ?? audit?.created_at ?? audit?.updatedAt ?? null,
    totalMonthlyKwh: toNumber(
      audit?.totalMonthlyKwh ?? audit?.total_monthly_kwh ?? audit?.monthlyKwh ?? audit?.monthly_kwh,
    ),
    totalMonthlyCost: toNumber(
      audit?.totalMonthlyCost ?? audit?.total_monthly_cost ?? audit?.monthlyCost ?? audit?.monthly_cost,
    ),
    totalCO2: toNumber(audit?.totalCO2 ?? audit?.total_co2 ?? audit?.co2 ?? audit?.monthlyCo2),
    ratePerUnit: Math.max(0.1, toNumber(audit?.ratePerUnit ?? audit?.rate_per_unit, 8)),
    topVampires: Array.isArray(audit?.topVampires ?? audit?.top_vampires)
      ? (audit.topVampires ?? audit.top_vampires).map(mapTopVampireFromApi)
      : [],
    roomSummary: Array.isArray(audit?.roomSummary ?? audit?.room_summary)
      ? (audit.roomSummary ?? audit.room_summary).map(mapRoomSummaryFromApi)
      : [],
    inventorySnapshot: Array.isArray(audit?.inventorySnapshot ?? audit?.inventory_snapshot)
      ? (audit.inventorySnapshot ?? audit.inventory_snapshot).map(mapRoomFromApi)
      : [],
  }
}

function mapApplianceToApi(appliance) {
  return {
    name: appliance.name,
    wattage: toNumber(appliance.wattage),
    quantity: Math.max(1, toNumber(appliance.quantity, 1)),
    daily_hours: Math.max(0, toNumber(appliance.dailyHours)),
    standby: Boolean(appliance.standby),
    standby_hours: appliance.standby ? Math.max(0, toNumber(appliance.standbyHours)) : 0,
    is_custom: Boolean(appliance.isCustom),
  }
}

function mapAuditToApi(audit) {
  const inventorySnapshot = Array.isArray(audit?.inventorySnapshot) ? audit.inventorySnapshot : []

  return {
    _id: audit?.id,
    createdAt: audit?.createdAt,
    label: audit?.label ?? 'Saved audit',
    ratePerUnit: toNumber(audit?.ratePerUnit, 8),
    totalMonthlyKwh: toNumber(audit?.totalMonthlyKwh),
    totalMonthlyCost: toNumber(audit?.totalMonthlyCost),
    totalCO2: toNumber(audit?.totalCO2),
    topVampires: Array.isArray(audit?.topVampires) ? audit.topVampires : [],
    roomSummary: Array.isArray(audit?.roomSummary) ? audit.roomSummary : [],
    inventorySnapshot,
  }
}

export function setAuthToken(token) {
  authToken = token || null
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const responseBody = contentType.includes('application/json') ? await response.json().catch(() => null) : null

  if (!response.ok) {
    throw new Error(responseBody?.error || responseBody?.message || `Request failed with status ${response.status}`)
  }

  return responseBody
}

export async function checkHealth() {
  return request('/api/health', { method: 'GET' })
}

export async function registerUser(payload) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    message: data?.message ?? 'Registration successful',
    token: data?.token ?? null,
    user: mapUserFromApi(data?.user),
  }
}

export async function loginUser(payload) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return {
    message: data?.message ?? 'Login successful',
    token: data?.token ?? null,
    user: mapUserFromApi(data?.user),
  }
}

export async function getCurrentUser() {
  const data = await request('/api/auth/me', { method: 'GET' })
  return mapUserFromApi(data?.user)
}

export async function getRooms() {
  const data = await request('/api/rooms', { method: 'GET' })
  return Array.isArray(data) ? data.map(mapRoomFromApi) : []
}

export async function createRoom(name) {
  const data = await request('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })

  return mapRoomFromApi(data)
}

export async function updateRoom(id, name) {
  const data = await request(`/api/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })

  return mapRoomFromApi(data)
}

export async function deleteRoom(id) {
  return request(`/api/rooms/${id}`, { method: 'DELETE' })
}

export async function createAppliance(roomId, appliance) {
  const data = await request(`/api/rooms/${roomId}/appliances`, {
    method: 'POST',
    body: JSON.stringify(mapApplianceToApi(appliance)),
  })

  return mapApplianceFromApi(data)
}

export async function updateAppliance(id, appliance) {
  const data = await request(`/api/appliances/${id}`, {
    method: 'PUT',
    body: JSON.stringify(mapApplianceToApi(appliance)),
  })

  return mapApplianceFromApi(data)
}

export async function deleteAppliance(id) {
  return request(`/api/appliances/${id}`, { method: 'DELETE' })
}

export async function getSettings() {
  const data = await request('/api/settings', { method: 'GET' })

  return {
    ratePerUnit: Math.max(0.1, toNumber(data?.ratePerUnit, 8)),
  }
}

export async function updateSetting(key, value) {
  const data = await request(`/api/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  })

  return {
    key: data?.key ?? key,
    value: data?.value,
  }
}

export async function getAudits() {
  const data = await request('/api/audits', { method: 'GET' })
  const auditItems = Array.isArray(data) ? data : Array.isArray(data?.audits) ? data.audits : []

  return auditItems.map(mapAuditFromApi)
}

export async function createAudit(audit) {
  const data = await request('/api/audits', {
    method: 'POST',
    body: JSON.stringify(mapAuditToApi(audit)),
  })

  return mapAuditFromApi(data)
}

export async function fetchInitialData() {
  const [roomsResult, settingsResult, auditsResult] = await Promise.allSettled([
    getRooms(),
    getSettings(),
    getAudits(),
  ])

  if (roomsResult.status === 'rejected') {
    throw roomsResult.reason
  }

  if (settingsResult.status === 'rejected') {
    throw settingsResult.reason
  }

  return {
    rooms: roomsResult.value,
    ratePerUnit: Math.max(0.1, toNumber(settingsResult.value?.ratePerUnit, 8)),
    auditSnapshots: auditsResult.status === 'fulfilled' ? auditsResult.value : null,
  }
}

export async function sendChat(payload) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
