import { Suspense, lazy, startTransition, useEffect, useReducer, useState } from 'react'
import './App.css'
import AuthScreen from './components/AuthScreen'
import TabNav from './components/TabNav'
import Dashboard from './components/Dashboard'
import {
  API_BASE_URL,
  checkHealth,
  createAudit as createAuditRequest,
  createAppliance as createApplianceRequest,
  createRoom as createRoomRequest,
  deleteAppliance as deleteApplianceRequest,
  deleteRoom as deleteRoomRequest,
  fetchInitialData,
  loginUser as loginUserRequest,
  registerUser as registerUserRequest,
  setAuthToken,
  updateAppliance as updateApplianceRequest,
  updateRoom as updateRoomRequest,
  updateSetting as updateSettingRequest,
} from './services/api'
import { clearStoredAuth, loadStoredAuth, saveStoredAuth } from './utils/auth'
import { co2, cost, dailyKwh, monthlyKwh, wasteScore } from './utils/calculations'
import { formatINR, formatKwh } from './utils/formatting'
import { createAuditSnapshot, loadStoredAppState, saveStoredAppState, trimSnapshots } from './utils/persistence'

const loadInventory = () => import('./components/Inventory')
const loadRankings = () => import('./components/Rankings')
const loadSimulator = () => import('./components/Simulator')
const loadGame = () => import('./components/GameLab')
const loadAIChat = () => import('./components/AIChat')

const Inventory = lazy(loadInventory)
const Rankings = lazy(loadRankings)
const Simulator = lazy(loadSimulator)
const GameLab = lazy(loadGame)
const AIChat = lazy(loadAIChat)

const TAB_PRELOADERS = {
  inventory: loadInventory,
  rankings: loadRankings,
  simulator: loadSimulator,
  game: loadGame,
  chat: loadAIChat,
}

const TAB_LABELS = {
  dashboard: 'Dashboard',
  inventory: 'Inventory',
  rankings: 'Rankings',
  simulator: 'Simulator',
  game: 'Energy Game',
  chat: 'AI Advisor',
}

const DEMO_ROOMS = [
  {
    id: 'room_1',
    name: 'Living Room',
    appliances: [
      {
        id: 'a1',
        name: 'TV (LED 43")',
        wattage: 80,
        quantity: 1,
        dailyHours: 5,
        standby: true,
        standbyHours: 19,
        isCustom: false,
      },
      {
        id: 'a2',
        name: 'Fan (Ceiling)',
        wattage: 75,
        quantity: 1,
        dailyHours: 8,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
      {
        id: 'a3',
        name: 'WiFi Router',
        wattage: 10,
        quantity: 1,
        dailyHours: 24,
        standby: true,
        standbyHours: 0,
        isCustom: false,
      },
    ],
  },
  {
    id: 'room_2',
    name: 'Bedroom',
    appliances: [
      {
        id: 'a4',
        name: 'AC (1.5 Ton)',
        wattage: 1500,
        quantity: 1,
        dailyHours: 6,
        standby: true,
        standbyHours: 18,
        isCustom: false,
      },
      {
        id: 'a5',
        name: 'Fan (Ceiling)',
        wattage: 75,
        quantity: 1,
        dailyHours: 8,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
      {
        id: 'a6',
        name: 'TV (LED 43")',
        wattage: 80,
        quantity: 1,
        dailyHours: 3,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
    ],
  },
  {
    id: 'room_3',
    name: 'Kitchen',
    appliances: [
      {
        id: 'a7',
        name: 'Refrigerator',
        wattage: 150,
        quantity: 1,
        dailyHours: 24,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
      {
        id: 'a8',
        name: 'Microwave',
        wattage: 1200,
        quantity: 1,
        dailyHours: 0.5,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
      {
        id: 'a9',
        name: 'Geyser',
        wattage: 2000,
        quantity: 1,
        dailyHours: 1,
        standby: false,
        standbyHours: 0,
        isCustom: false,
      },
    ],
  },
]

function renderTab(activeTab, sharedProps) {
  switch (activeTab) {
    case 'dashboard':
      return <Dashboard {...sharedProps} />
    case 'inventory':
      return <Inventory {...sharedProps} />
    case 'rankings':
      return <Rankings {...sharedProps} />
    case 'simulator':
      return (
        <Simulator
          key={sharedProps.topVampires[0]?.id ?? sharedProps.allAppliances[0]?.id ?? 'simulator'}
          {...sharedProps}
        />
      )
    case 'game':
      return (
        <GameLab
          key={`${sharedProps.topVampires[0]?.id ?? 'game'}-${sharedProps.allAppliances.length}-${sharedProps.ratePerUnit}`}
          {...sharedProps}
        />
      )
    case 'chat':
      return <AIChat {...sharedProps} />
    default:
      return <Dashboard {...sharedProps} />
  }
}

function TabLoadingState({ activeTab }) {
  return (
    <div className="tab-loading" role="status" aria-live="polite">
      <span className="panel-heading">Loading module</span>
      <strong>{`Opening ${TAB_LABELS[activeTab] ?? 'workspace'}...`}</strong>
      <p className="sim-muted">Keeping the interface light so each tool loads only when you need it.</p>
    </div>
  )
}

function persistentStateReducer(state, action) {
  switch (action.type) {
    case 'set_rooms':
      return {
        ...state,
        rooms: typeof action.nextRooms === 'function' ? action.nextRooms(state.rooms) : action.nextRooms,
        lastSavedAt: action.timestamp,
      }
    case 'set_rate':
      return {
        ...state,
        ratePerUnit:
          typeof action.nextRatePerUnit === 'function'
            ? action.nextRatePerUnit(state.ratePerUnit)
            : action.nextRatePerUnit,
        lastSavedAt: action.timestamp,
      }
    case 'save_snapshot':
      return {
        ...state,
        auditSnapshots: trimSnapshots([action.snapshot, ...state.auditSnapshots]),
        lastSavedAt: action.timestamp,
      }
    case 'hydrate_remote':
      return {
        ...state,
        rooms: action.rooms,
        ratePerUnit: action.ratePerUnit,
        auditSnapshots: Array.isArray(action.auditSnapshots) ? action.auditSnapshots : state.auditSnapshots,
        lastSavedAt: action.timestamp ?? state.lastSavedAt,
      }
    case 'hydrate_local_user_state':
      return {
        ...state,
        rooms: action.rooms,
        ratePerUnit: action.ratePerUnit,
        auditSnapshots: action.auditSnapshots,
        lastSavedAt: action.lastSavedAt,
      }
    case 'prepare_authenticated_session':
      return {
        ...state,
        rooms: [],
        ratePerUnit: 8,
        lastSavedAt: action.timestamp ?? state.lastSavedAt,
      }
    case 'reset_for_logout':
      return {
        ...state,
        rooms: [],
        ratePerUnit: 8,
        auditSnapshots: [],
        lastSavedAt: null,
      }
    case 'set_theme':
      return {
        ...state,
        theme: action.theme === 'light' ? 'light' : 'dark',
      }
    default:
      return state
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [authState, setAuthState] = useState(loadStoredAuth)
  const [appBootState, setAppBootState] = useState(() => (loadStoredAuth().token ? 'loading' : 'locked'))
  const [persistentState, dispatch] = useReducer(
    persistentStateReducer,
    undefined,
    () =>
      loadStoredAppState({
        fallbackRooms: DEMO_ROOMS,
        fallbackRatePerUnit: 8,
        userId: loadStoredAuth().user?._id ?? null,
      }),
  )
  const { rooms, ratePerUnit, auditSnapshots, lastSavedAt, theme } = persistentState
  const isAuthenticated = Boolean(authState.token && authState.user?._id)

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
  const totalYearlyCost = totalMonthlyCost * 12
  const totalCO2 = co2(totalMonthlyKwh)

  const topVampires = [...allAppliances]
    .map((appliance) => ({
      ...appliance,
      score: wasteScore(appliance, ratePerUnit),
    }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)

  useEffect(() => {
    setAuthToken(authState.token)

    if (isAuthenticated) {
      saveStoredAuth(authState)
    } else {
      clearStoredAuth()
    }
  }, [authState, isAuthenticated])

  useEffect(() => {
    saveStoredAppState({
      rooms,
      ratePerUnit,
      auditSnapshots,
      lastSavedAt,
      theme,
      userId: authState.user?._id ?? null,
    })
  }, [rooms, ratePerUnit, auditSnapshots, lastSavedAt, theme, authState.user?._id])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    if (!isAuthenticated) {
      setAppBootState('locked')
      return undefined
    }

    let ignore = false
    setAppBootState('loading')
    const localUserState = loadStoredAppState({
      fallbackRooms: [],
      fallbackRatePerUnit: 8,
      userId: authState.user?._id ?? null,
    })

    dispatch({
      type: 'hydrate_local_user_state',
      rooms: localUserState.rooms,
      ratePerUnit: localUserState.ratePerUnit,
      auditSnapshots: localUserState.auditSnapshots,
      lastSavedAt: localUserState.lastSavedAt,
    })

    async function hydrateRemoteState() {
      try {
        const health = await checkHealth()

        if (ignore) {
          return
        }

        console.info('[Phantom Load] Backend connected:', API_BASE_URL, health)
      } catch (error) {
        console.error('[Phantom Load] Backend not connected:', API_BASE_URL, error)
        console.warn('Remote data sync failed. Using cached local data instead.')
        if (!ignore) {
          setAppBootState('ready')
        }
        return
      }

      try {
        const remoteState = await fetchInitialData()

        if (ignore) {
          return
        }

        console.info('[Phantom Load] Remote rooms and settings loaded successfully.')

        dispatch({
          type: 'hydrate_remote',
          rooms: remoteState.rooms,
          ratePerUnit: remoteState.ratePerUnit,
          auditSnapshots: remoteState.auditSnapshots,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.warn('Remote data sync failed after health check. Using cached local data instead.', error)
      } finally {
        if (!ignore) {
          setAppBootState('ready')
        }
      }
    }

    hydrateRemoteState()

    return () => {
      ignore = true
    }
  }, [isAuthenticated, authState.user?._id])

  function setLocalRooms(nextRooms) {
    dispatch({
      type: 'set_rooms',
      nextRooms,
      timestamp: new Date().toISOString(),
    })
  }

  function setLocalRatePerUnit(nextRatePerUnit) {
    dispatch({
      type: 'set_rate',
      nextRatePerUnit,
      timestamp: new Date().toISOString(),
    })
  }

  async function handleAddRoom(name) {
    const createdRoom = await createRoomRequest(name)
    setLocalRooms((currentRooms) => [...currentRooms, createdRoom])
    return createdRoom
  }

  async function handleUpdateRoom(roomId, name) {
    const updatedRoom = await updateRoomRequest(roomId, name)

    setLocalRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              name: updatedRoom.name || name,
            }
          : room,
      ),
    )

    return updatedRoom
  }

  async function handleRemoveRoom(roomId) {
    await deleteRoomRequest(roomId)
    setLocalRooms((currentRooms) => currentRooms.filter((room) => room.id !== roomId))
  }

  async function handleAddAppliance(roomId, appliance) {
    const createdAppliance = await createApplianceRequest(roomId, appliance)
    setLocalRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              appliances: [...room.appliances, createdAppliance],
            }
          : room,
      ),
    )

    return createdAppliance
  }

  async function handleUpdateAppliance(roomId, applianceId, appliance) {
    const updatedAppliance = await updateApplianceRequest(applianceId, appliance)

    setLocalRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              appliances: room.appliances.map((currentAppliance) =>
                currentAppliance.id === applianceId
                  ? {
                      ...currentAppliance,
                      ...updatedAppliance,
                    }
                  : currentAppliance,
              ),
            }
          : room,
      ),
    )

    return updatedAppliance
  }

  async function handleRemoveAppliance(roomId, applianceId) {
    await deleteApplianceRequest(applianceId)
    setLocalRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              appliances: room.appliances.filter((appliance) => appliance.id !== applianceId),
            }
          : room,
      ),
    )
  }

  async function handleUpdateRatePerUnit(nextRatePerUnit) {
    const updatedSetting = await updateSettingRequest('ratePerUnit', nextRatePerUnit)
    setLocalRatePerUnit(Number(updatedSetting.value) || nextRatePerUnit)
    return updatedSetting
  }

  function handleTabChange(nextTab) {
    TAB_PRELOADERS[nextTab]?.()
    startTransition(() => {
      setActiveTab(nextTab)
    })
  }

  async function handleSaveSnapshot() {
    const snapshot = createAuditSnapshot({
      rooms,
      ratePerUnit,
    })

    try {
      const savedSnapshot = await createAuditRequest(snapshot)

      dispatch({
        type: 'save_snapshot',
        snapshot: savedSnapshot,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.warn('Audit history sync failed. Saving snapshot on this device only.', error)
      dispatch({
        type: 'save_snapshot',
        snapshot,
        timestamp: new Date().toISOString(),
      })
      window.alert(
        error instanceof Error
          ? `${error.message} Snapshot was kept on this device only.`
          : 'Could not sync this audit to the backend. Snapshot was kept on this device only.',
      )
    }
  }

  function setTheme(nextTheme) {
    dispatch({
      type: 'set_theme',
      theme: nextTheme,
    })
  }

  async function handleRegister(credentials) {
    const session = await registerUserRequest(credentials)

    if (!session.token || !session.user?._id) {
      throw new Error('Registration succeeded but no valid token was returned.')
    }

    setAuthState({
      token: session.token,
      user: session.user,
    })
    setActiveTab('dashboard')
    setAppBootState('loading')
  }

  async function handleLogin(credentials) {
    const session = await loginUserRequest(credentials)

    if (!session.token || !session.user?._id) {
      throw new Error('Login succeeded but no valid token was returned.')
    }

    setAuthState({
      token: session.token,
      user: session.user,
    })
    setActiveTab('dashboard')
    setAppBootState('loading')
  }

  function handleLogout() {
    setAuthState({
      token: null,
      user: null,
    })
    setActiveTab('dashboard')
    setAppBootState('locked')
    dispatch({ type: 'reset_for_logout' })
  }

  const sharedProps = {
    currentUser: authState.user,
    rooms,
    ratePerUnit,
    onAddRoom: handleAddRoom,
    onUpdateRoom: handleUpdateRoom,
    onRemoveRoom: handleRemoveRoom,
    onAddAppliance: handleAddAppliance,
    onUpdateAppliance: handleUpdateAppliance,
    onRemoveAppliance: handleRemoveAppliance,
    onUpdateRatePerUnit: handleUpdateRatePerUnit,
    allAppliances,
    totalMonthlyKwh,
    totalMonthlyCost,
    totalYearlyCost,
    totalCO2,
    topVampires,
    auditSnapshots,
    lastSavedAt,
    onSaveSnapshot: handleSaveSnapshot,
    onNavigate: handleTabChange,
  }

  if (!isAuthenticated) {
    return (
      <div className="app-shell">
        <div className="app-glow app-glow-left" aria-hidden="true" />
        <div className="app-glow app-glow-right" aria-hidden="true" />
        <main className="app-main">
          <AuthScreen
            theme={theme}
            setTheme={setTheme}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-glow app-glow-left" aria-hidden="true" />
      <div className="app-glow app-glow-right" aria-hidden="true" />
      <TabNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        theme={theme}
        setTheme={setTheme}
        userName={authState.user?.name}
        onLogout={handleLogout}
      />
      <main className="app-main">
        {appBootState === 'loading' ? (
          <section className="panel panel-tight auth-loading-panel">
            <div className="tab-loading" role="status" aria-live="polite">
              <span className="panel-heading">Loading account</span>
              <strong>Opening your authenticated dashboard...</strong>
              <p className="sim-muted">Syncing rooms, settings, and AI context from the backend.</p>
            </div>
          </section>
        ) : null}

        {appBootState !== 'loading' && activeTab === 'dashboard' ? (
          <section className="hero-strip panel">
            <div className="hero-copy">
              <p className="eyebrow">Understand Your Bill</p>
              <h1>Find out why your electricity bill is high.</h1>
              <p className="hero-text">
                Add your rooms and appliances, and Phantom Load will show your monthly cost,
                hidden standby waste, and the fastest ways to save money.
              </p>
              <div className="hero-actions button-row">
                <button type="button" className="button button-primary" onClick={() => handleTabChange('inventory')}>
                  Start Audit
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => handleTabChange('rankings')}
                >
                  See Biggest Waste
                </button>
              </div>
              <p className="hero-guide">
                New here? Start with Inventory, then check Rankings and Simulator for the biggest
                savings opportunities.
              </p>
            </div>
            <div className="hero-metrics">
              <div className="hero-metric-card">
                <span className="metric-label">Monthly Estimate</span>
                <strong className="metric-value mono">{formatINR(totalMonthlyCost)}</strong>
              </div>
              <div className="hero-metric-card">
                <span className="metric-label">Home Usage</span>
                <strong className="metric-value mono">{formatKwh(totalMonthlyKwh)}</strong>
              </div>
              <div className="hero-metric-card">
                <span className="metric-label">Biggest Bill Driver</span>
                <strong className="metric-value">
                  {topVampires[0] ? topVampires[0].name : 'Add appliances'}
                </strong>
              </div>
              <div className="hero-metric-card">
                <span className="metric-label">Annual Projection</span>
                <strong className="metric-value mono">{formatINR(totalYearlyCost)}</strong>
              </div>
            </div>
          </section>
        ) : null}

        {appBootState !== 'loading' ? (
          <Suspense fallback={<section className="panel panel-tight"><TabLoadingState activeTab={activeTab} /></section>}>
            <section className="panel panel-tight">{renderTab(activeTab, sharedProps)}</section>
          </Suspense>
        ) : null}
      </main>
    </div>
  )
}

export default App
