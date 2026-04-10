import { useEffect, useMemo, useState } from 'react'
import './GameLab.css'
import { co2, cost, monthlyKwh } from '../utils/calculations'
import { formatCO2, formatINR, formatKwh } from '../utils/formatting'

const DEFAULT_RATE = 8
const VAMPIRE_THRESHOLD = 60
const MAX_VAMPIRE_DOTS = 4

const FEATURE_STEPS = [
  {
    id: 'inventory',
    title: 'Appliance Inventory',
    copy: 'Add rooms, appliances, usage hours, and standby behavior.',
  },
  {
    id: 'ranking',
    title: 'Waste Score',
    copy: 'Surface the worst devices by cost, standby waste, and usage.',
  },
  {
    id: 'simulator',
    title: 'What-If Simulator',
    copy: 'Test changes and compare savings before taking action.',
  },
  {
    id: 'advisor',
    title: 'AI Advisor',
    copy: 'Explain the energy story using the audit context.',
  },
]

const RECOMMENDATION_TIPS = {
  ac: 'Reduce runtime slightly or use a higher-efficiency AC.',
  tv: 'Switch fully off at the plug when not in use.',
  router: 'Put it on a timer at night if full-day access is not needed.',
  fan: 'Keep it. This one is comparatively efficient.',
  ac_bed: 'Pair cooling with airflow and raise the setpoint a little.',
  tv_bed: 'Turn on auto sleep or unplug when idle.',
  fridge: 'Keep seals tight and leave air space around the unit.',
  microwave: 'Unplug when not in use to remove standby waste.',
  geyser: 'Shorter heating time creates quick savings.',
}

const GAME_ROOMS = [
  {
    id: 'living',
    label: 'Living Room',
    intro:
      'Start in the living room. Tap each appliance card and expose the hidden energy story.',
    appliances: [
      {
        id: 'tv',
        icon: 'TV',
        name: 'LED TV 43"',
        wattage: 80,
        hours: 5,
        standby: true,
        standbyHours: 19,
      },
      {
        id: 'fan',
        icon: 'FAN',
        name: 'Ceiling Fan',
        wattage: 75,
        hours: 8,
        standby: false,
        standbyHours: 0,
      },
      {
        id: 'router',
        icon: 'NET',
        name: 'WiFi Router',
        wattage: 10,
        hours: 24,
        standby: true,
        standbyHours: 24,
      },
    ],
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    intro: 'Now check the bedroom. High-comfort devices often hide the biggest bill shocks.',
    appliances: [
      {
        id: 'ac_bed',
        icon: 'AC',
        name: 'AC 1.5 Ton',
        wattage: 1500,
        hours: 6,
        standby: true,
        standbyHours: 18,
      },
      {
        id: 'fan_bed',
        icon: 'FAN',
        name: 'Ceiling Fan',
        wattage: 75,
        hours: 8,
        standby: false,
        standbyHours: 0,
      },
      {
        id: 'tv_bed',
        icon: 'TV',
        name: 'Bedroom TV',
        wattage: 80,
        hours: 3,
        standby: true,
        standbyHours: 21,
      },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    intro: 'Last room. Heat and always-on appliances can quietly dominate the bill.',
    appliances: [
      {
        id: 'fridge',
        icon: 'FR',
        name: 'Refrigerator',
        wattage: 150,
        hours: 24,
        standby: false,
        standbyHours: 0,
      },
      {
        id: 'microwave',
        icon: 'MW',
        name: 'Microwave',
        wattage: 1200,
        hours: 0.5,
        standby: true,
        standbyHours: 23.5,
      },
      {
        id: 'geyser',
        icon: 'GY',
        name: 'Geyser',
        wattage: 2000,
        hours: 1,
        standby: false,
        standbyHours: 0,
      },
    ],
  },
]

function RahulAvatar({ compact = false }) {
  const size = compact ? 56 : 128

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
      <circle cx="60" cy="38" r="22" fill="#f4a261" />
      <path
        d="M38 36 Q38 14 60 14 Q82 14 82 36 Q78 26 60 26 Q42 26 38 36Z"
        fill="#1a0a00"
      />
      <circle cx="52" cy="35" r="3" fill="#1a0a00" />
      <circle cx="68" cy="35" r="3" fill="#1a0a00" />
      <circle cx="53" cy="34" r="1" fill="#fff" />
      <circle cx="69" cy="34" r="1" fill="#fff" />
      <path
        d="M52 45 Q60 42 68 45"
        stroke="#1a0a00"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M80 28 Q82 24 84 28 Q84 31 82 31 Q80 31 80 28Z" fill="#74b9ff" opacity="0.8" />
      <path
        d="M35 75 Q35 60 45 57 Q52 62 60 62 Q68 62 75 57 Q85 60 85 75 Z"
        fill="#2d3436"
      />
      <path d="M52 62 Q60 68 68 62" stroke="#636e72" strokeWidth="1.5" fill="none" />
      <path
        d="M35 75 Q25 72 28 88 Q30 95 38 95"
        fill="#f4a261"
        stroke="#e17055"
        strokeWidth="1"
      />
      <path
        d="M85 75 Q95 72 92 88 Q90 95 82 95"
        fill="#f4a261"
        stroke="#e17055"
        strokeWidth="1"
      />
      <rect x="45" y="95" width="12" height="22" rx="4" fill="#2d3436" />
      <rect x="63" y="95" width="12" height="22" rx="4" fill="#2d3436" />
      <ellipse cx="51" cy="117" rx="9" ry="4" fill="#1a0a00" />
      <ellipse cx="69" cy="117" rx="9" ry="4" fill="#1a0a00" />
    </svg>
  )
}

function calculateAppliance(appliance, ratePerUnit) {
  const activeDailyKwh = (appliance.wattage * appliance.hours) / 1000
  const standbyDailyKwh = appliance.standby
    ? (appliance.wattage * 0.1 * appliance.standbyHours) / 1000
    : 0
  const totalDailyKwh = activeDailyKwh + standbyDailyKwh
  const totalMonthlyKwh = monthlyKwh(totalDailyKwh)
  const monthlyCost = cost(totalMonthlyKwh, ratePerUnit)
  const standbyMonthlyCost = cost(monthlyKwh(standbyDailyKwh), ratePerUnit)
  const wasteScore = Math.min(
    100,
    Math.round(
      Math.min(monthlyCost / 5, 40) +
        (appliance.standby ? Math.min(appliance.standbyHours * 2, 30) : 0) +
        Math.min(appliance.hours * 2, 30),
    ),
  )

  return {
    dailyKwh: totalDailyKwh,
    monthlyKwh: totalMonthlyKwh,
    yearlyKwh: totalMonthlyKwh * 12,
    monthlyCost,
    yearlyCost: monthlyCost * 12,
    standbyMonthlyCost,
    yearlyCo2: co2(totalMonthlyKwh * 12),
    wasteScore,
  }
}

function getTone(calc) {
  if (calc.wasteScore > VAMPIRE_THRESHOLD) {
    return 'vampire'
  }

  if (calc.standbyMonthlyCost > 0) {
    return 'phantom'
  }

  return 'safe'
}

function getPotentialSavings(calc) {
  if (calc.wasteScore > VAMPIRE_THRESHOLD) {
    return calc.monthlyCost * 0.4
  }

  if (calc.standbyMonthlyCost > 0) {
    return calc.standbyMonthlyCost
  }

  return 0
}

function getSpeech(record) {
  if (record.tone === 'vampire') {
    return `${record.appliance.name} is a major energy vampire. It burns ${formatINR(
      record.calc.monthlyCost,
    )} each month.`
  }

  if (record.tone === 'phantom') {
    return `${record.appliance.name} leaks standby power. That hidden waste is ${formatINR(
      record.calc.standbyMonthlyCost,
    )} per month.`
  }

  return `${record.appliance.name} looks relatively efficient. Keep it, but watch total usage hours.`
}

function getToast(record) {
  if (record.tone === 'vampire') {
    return {
      message: `Energy vampire found: ${record.appliance.name}`,
      tone: 'vampire',
    }
  }

  if (record.tone === 'phantom') {
    return {
      message: `Phantom load detected on ${record.appliance.name}`,
      tone: 'phantom',
    }
  }

  return {
    message: `${record.appliance.name} is relatively safe`,
    tone: 'safe',
  }
}

function buildRecord(room, appliance, ratePerUnit) {
  const calc = calculateAppliance(appliance, ratePerUnit)

  return {
    roomId: room.id,
    roomLabel: room.label,
    appliance,
    calc,
    tone: getTone(calc),
    potentialSavings: getPotentialSavings(calc),
  }
}

function GameLab({ onNavigate, ratePerUnit }) {
  const effectiveRate = ratePerUnit > 0 ? ratePerUnit : DEFAULT_RATE
  const [screen, setScreen] = useState('intro')
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0)
  const [revealedMap, setRevealedMap] = useState({})
  const [revealedRecords, setRevealedRecords] = useState([])
  const [speech, setSpeech] = useState(GAME_ROOMS[0].intro)
  const [toast, setToast] = useState(null)

  const currentRoom = GAME_ROOMS[currentRoomIndex]

  const revealedLookup = useMemo(() => {
    const lookup = {}
    revealedRecords.forEach((record) => {
      lookup[record.appliance.id] = record
    })
    return lookup
  }, [revealedRecords])

  const currentRoomCount = currentRoom
    ? currentRoom.appliances.filter((appliance) => revealedMap[currentRoom.id]?.[appliance.id]).length
    : 0

  const totalMonthlyBill = useMemo(
    () => revealedRecords.reduce((sum, record) => sum + record.calc.monthlyCost, 0),
    [revealedRecords],
  )
  const totalPotentialMonthlySavings = useMemo(
    () => revealedRecords.reduce((sum, record) => sum + record.potentialSavings, 0),
    [revealedRecords],
  )
  const totalYearlyCo2 = useMemo(
    () => revealedRecords.reduce((sum, record) => sum + record.calc.yearlyCo2, 0),
    [revealedRecords],
  )
  const vampiresFound = useMemo(
    () => revealedRecords.filter((record) => record.tone === 'vampire').length,
    [revealedRecords],
  )
  const topVampires = useMemo(
    () =>
      [...revealedRecords]
        .sort((left, right) => right.calc.monthlyCost - left.calc.monthlyCost)
        .slice(0, 3),
    [revealedRecords],
  )

  useEffect(() => {
    if (!toast) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setToast(null), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  function resetGame(nextScreen = 'intro') {
    setScreen(nextScreen)
    setCurrentRoomIndex(0)
    setRevealedMap({})
    setRevealedRecords([])
    setSpeech(GAME_ROOMS[0].intro)
    setToast(null)
  }

  function startGame() {
    resetGame('game')
  }

  function revealAppliance(applianceId) {
    if (!currentRoom || revealedMap[currentRoom.id]?.[applianceId]) {
      return
    }

    const appliance = currentRoom.appliances.find((item) => item.id === applianceId)

    if (!appliance) {
      return
    }

    const record = buildRecord(currentRoom, appliance, effectiveRate)

    setRevealedMap((current) => ({
      ...current,
      [currentRoom.id]: {
        ...(current[currentRoom.id] ?? {}),
        [applianceId]: true,
      },
    }))
    setRevealedRecords((current) => [...current, record])
    setSpeech(getSpeech(record))
    setToast(getToast(record))
  }

  function handleNextRoom() {
    if (currentRoomIndex >= GAME_ROOMS.length - 1) {
      setScreen('results')
      return
    }

    const nextIndex = currentRoomIndex + 1
    setCurrentRoomIndex(nextIndex)
    setSpeech(GAME_ROOMS[nextIndex].intro)
    setToast(null)
  }

  function openRealAudit() {
    onNavigate?.('inventory')
  }

  if (screen === 'intro') {
    return (
      <div className="hunt-shell">
        <section className="hunt-screen hunt-screen-intro">
          <div className="hunt-grid-bg" aria-hidden="true" />
          <div className="hunt-intro-card">
            <p className="hunt-tagline">Energy Waste Finder</p>
            <h2 className="hunt-logo">
              Phantom
              <br />
              Load
            </h2>

            <div className="hunt-avatar-wrap">
              <div className="hunt-avatar-glow" aria-hidden="true" />
              <RahulAvatar />
              <span className="hunt-bill-badge">High bill alert</span>
            </div>

            <div className="hunt-story">
              Rahul got a high electricity bill and cannot see which appliances are causing it.
              Walk through his house, reveal the energy vampires, and learn why Phantom Load
              matters.
            </div>

            <div className="button-row">
              <button type="button" className="button button-primary" onClick={startGame}>
                Start Hunting
              </button>
              <button type="button" className="button button-secondary" onClick={openRealAudit}>
                Open Audit
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  if (screen === 'results') {
    return (
      <div className="hunt-shell">
        <section className="hunt-screen hunt-screen-results">
          <div className="hunt-results-wrap">
            <div className="hunt-results-header">
              <p className="hunt-tagline">Results</p>
              <h2 className="hunt-results-title">Energy Vampires Exposed</h2>
              <p className="section-copy">A quick picture of why the bill rises and what Phantom Load helps solve.</p>
            </div>

            <div className="hunt-big-grid">
              <article className="hunt-big-card">
                <span className="hunt-big-label">Monthly Bill</span>
                <strong className="hunt-big-value hunt-big-value-danger">{formatINR(totalMonthlyBill)}</strong>
              </article>
              <article className="hunt-big-card">
                <span className="hunt-big-label">Yearly Bill</span>
                <strong className="hunt-big-value">{formatINR(totalMonthlyBill * 12)}</strong>
              </article>
              <article className="hunt-big-card">
                <span className="hunt-big-label">Can Save / Year</span>
                <strong className="hunt-big-value hunt-big-value-good">
                  {formatINR(totalPotentialMonthlySavings * 12)}
                </strong>
              </article>
              <article className="hunt-big-card">
                <span className="hunt-big-label">CO2 / Year</span>
                <strong className="hunt-big-value hunt-big-value-info">{formatCO2(totalYearlyCo2)}</strong>
              </article>
            </div>

            <section className="hunt-panel">
              <div className="hunt-panel-head">
                <p className="panel-heading">Top Offenders</p>
                <h3 className="section-title">Worst Energy Vampires</h3>
              </div>

              <div className="hunt-vampire-list">
                {topVampires.map((record) => (
                  <article className="hunt-vampire-item" key={record.appliance.id}>
                    <div className="hunt-device-pill">{record.appliance.icon}</div>
                    <div className="hunt-vampire-copy">
                      <strong>{record.appliance.name}</strong>
                      <p>{RECOMMENDATION_TIPS[record.appliance.id] ?? 'Reduce usage hours or upgrade efficiency.'}</p>
                    </div>
                    <div className="hunt-vampire-cost">
                      <strong>{formatINR(record.calc.yearlyCost)}</strong>
                      <span>per year</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="hunt-panel">
              <div className="hunt-panel-head">
                <p className="panel-heading">What the Product Does</p>
                <h3 className="section-title">How Phantom Load Helps</h3>
              </div>

              <div className="hunt-feature-list">
                {FEATURE_STEPS.map((feature, index) => (
                  <div className="hunt-feature-row" key={feature.id}>
                    <span className="hunt-feature-num">{index + 1}</span>
                    <div>
                      <strong>{feature.title}</strong>
                      <p>{feature.copy}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <div className="button-row">
              <button type="button" className="button button-primary" onClick={openRealAudit}>
                Start Real Audit
              </button>
              <button type="button" className="button button-secondary" onClick={() => resetGame('intro')}>
                Play Again
              </button>
            </div>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="hunt-shell">
      <section className="hunt-screen hunt-screen-game">
        <header className="hunt-hud">
          <div className="hunt-hud-logo">Phantom Load</div>

          <div className="hunt-hud-stats">
            <div className="hunt-hud-stat">
              <span className="hunt-hud-label">Monthly Bill</span>
              <strong className="hunt-hud-value hunt-hud-value-danger">{formatINR(totalMonthlyBill)}</strong>
            </div>
            <div className="hunt-hud-stat">
              <span className="hunt-hud-label">Can Save</span>
              <strong className="hunt-hud-value hunt-hud-value-good">
                {formatINR(totalPotentialMonthlySavings)}
              </strong>
            </div>
            <div className="hunt-hud-stat">
              <span className="hunt-hud-label">Vampires</span>
              <div className="hunt-vampire-dots" aria-hidden="true">
                {Array.from({ length: MAX_VAMPIRE_DOTS }).map((_, index) => (
                  <span
                    key={`dot-${index}`}
                    className={`hunt-vampire-dot ${index < Math.min(vampiresFound, MAX_VAMPIRE_DOTS) ? 'hunt-vampire-dot-on' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="hunt-game-area">
          <div className="hunt-room-dots" aria-hidden="true">
            {GAME_ROOMS.map((room, index) => (
              <span
                key={room.id}
                className={`hunt-room-dot ${
                  index < currentRoomIndex ? 'hunt-room-dot-done' : index === currentRoomIndex ? 'hunt-room-dot-active' : ''
                }`}
              />
            ))}
          </div>

          <div className="hunt-speech">
            <div className="hunt-speech-avatar">
              <RahulAvatar compact />
            </div>
            <div className="hunt-speech-bubble">{speech}</div>
          </div>

          <div className="hunt-room-head">
            <div>
              <p className="panel-heading">{`Room ${currentRoomIndex + 1} of ${GAME_ROOMS.length}`}</p>
              <h3 className="section-title">{currentRoom.label}</h3>
            </div>
            <strong className="hunt-room-progress">
              {`${currentRoomCount}/${currentRoom.appliances.length} checked`}
            </strong>
          </div>

          <div className="hunt-grid">
            {currentRoom.appliances.map((appliance) => {
              const revealed = Boolean(revealedMap[currentRoom.id]?.[appliance.id])
              const record = revealedLookup[appliance.id] ?? buildRecord(currentRoom, appliance, effectiveRate)
              const toneClass =
                record.tone === 'vampire'
                  ? 'hunt-card-vampire'
                  : record.tone === 'phantom'
                    ? 'hunt-card-phantom'
                    : 'hunt-card-safe'

              return (
                <button
                  key={appliance.id}
                  type="button"
                  className={`hunt-card ${revealed ? `hunt-card-revealed ${toneClass}` : ''}`}
                  onClick={() => revealAppliance(appliance.id)}
                  disabled={revealed}
                >
                  <span className="hunt-device-icon">{appliance.icon}</span>
                  <strong className="hunt-device-name">{appliance.name}</strong>

                  {!revealed ? (
                    <span className="hunt-device-hint">Tap to inspect</span>
                  ) : (
                    <div className="hunt-reveal">
                      <div className="hunt-reveal-row">
                        <span>Monthly</span>
                        <strong>{formatINR(record.calc.monthlyCost)}</strong>
                      </div>
                      <div className="hunt-reveal-row">
                        <span>Usage</span>
                        <strong>{formatKwh(record.calc.dailyKwh)}</strong>
                      </div>
                      {record.calc.standbyMonthlyCost > 0 ? (
                        <div className="hunt-reveal-row">
                          <span>Standby</span>
                          <strong>{formatINR(record.calc.standbyMonthlyCost)}</strong>
                        </div>
                      ) : null}

                      <div className="hunt-bar">
                        <span className="hunt-bar-fill" style={{ width: `${record.calc.wasteScore}%` }} />
                      </div>

                      <span className={`hunt-tag hunt-tag-${record.tone}`}>
                        {record.tone === 'vampire'
                          ? 'Energy vampire'
                          : record.tone === 'phantom'
                            ? 'Phantom load'
                            : 'Relatively safe'}
                      </span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {currentRoomCount === currentRoom.appliances.length ? (
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={handleNextRoom}>
                {currentRoomIndex === GAME_ROOMS.length - 1 ? 'See Results' : 'Next Room'}
              </button>
            </div>
          ) : null}
        </div>

        <div className={`hunt-toast hunt-toast-${toast?.tone ?? 'safe'} ${toast ? 'hunt-toast-show' : ''}`}>
          {toast?.message ?? ''}
        </div>
      </section>
    </div>
  )
}

export default GameLab
