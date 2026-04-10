import { useEffect, useState } from 'react'
import { co2, cost, dailyKwh, yearlyKwh } from '../utils/calculations'
import { formatCO2, formatINR } from '../utils/formatting'

function getYearlyCost(
  appliance,
  ratePerUnit,
  hours = appliance.dailyHours,
  standby = appliance.standby,
  wattage = appliance.wattage,
) {
  return cost(
    yearlyKwh(
      dailyKwh(
        wattage,
        appliance.quantity,
        hours,
        standby,
        standby ? appliance.standbyHours : 0,
      ),
    ),
    ratePerUnit,
  )
}

function getDefaultAppliance(allAppliances, topVampires) {
  return topVampires?.[0] ?? allAppliances[0] ?? null
}

function Simulator({ allAppliances, setRooms, ratePerUnit, topVampires }) {
  const defaultAppliance = getDefaultAppliance(allAppliances, topVampires)
  const [selectedId, setSelectedId] = useState(defaultAppliance?.id ?? null)
  const [simHours, setSimHours] = useState(defaultAppliance?.dailyHours ?? 0)
  const [simStandby, setSimStandby] = useState(defaultAppliance?.standby ?? false)
  const [efficientMode, setEfficientMode] = useState(false)
  const [simWattage, setSimWattage] = useState(defaultAppliance?.wattage ?? 0)
  const [applied, setApplied] = useState(false)

  const selectedAppliance = allAppliances.find((appliance) => appliance.id === selectedId) ?? null

  function selectAppliance(appliance) {
    setSelectedId(appliance.id)
    setSimHours(appliance.dailyHours)
    setSimStandby(appliance.standby)
    setSimWattage(appliance.wattage)
    setEfficientMode(false)
    setApplied(false)
  }

  useEffect(() => {
    if (!applied) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => setApplied(false), 2000)
    return () => window.clearTimeout(timeoutId)
  }, [applied])

  const currentYearlyCost = selectedAppliance ? getYearlyCost(selectedAppliance, ratePerUnit) : 0
  const simulatedYearlyCost = selectedAppliance
    ? getYearlyCost(selectedAppliance, ratePerUnit, simHours, simStandby, simWattage)
    : 0
  const savings = Math.max(0, currentYearlyCost - simulatedYearlyCost)
  const co2Saved = ratePerUnit > 0 ? co2(savings / ratePerUnit) : 0

  function resetSimulation() {
    if (!selectedAppliance) {
      return
    }

    setSimHours(selectedAppliance.dailyHours)
    setSimStandby(selectedAppliance.standby)
    setSimWattage(selectedAppliance.wattage)
    setEfficientMode(false)
    setApplied(false)
  }

  function applyChange() {
    if (!selectedAppliance || savings <= 0) {
      return
    }

    setRooms((currentRooms) =>
      currentRooms.map((room) =>
        room.id === selectedAppliance.roomId
          ? {
              ...room,
              appliances: room.appliances.map((appliance) =>
                appliance.id === selectedAppliance.id
                  ? {
                      ...appliance,
                      wattage: simWattage,
                      dailyHours: simHours,
                      standby: simStandby,
                      standbyHours: simStandby ? appliance.standbyHours : 0,
                    }
                  : appliance,
              ),
            }
          : room,
      ),
    )

    setApplied(true)
  }

  return (
    <div className="ranking-stack">
      <div className="section-head">
        <div>
          <p className="panel-heading">What-if mode</p>
          <h2 className="section-title">Simulator</h2>
        </div>
        <p className="section-copy">
          Use this tab in the demo to show savings before making changes. It makes the product feel
          decisive instead of descriptive. The biggest energy vampire is preselected so savings show
          up faster in front of judges.
        </p>
      </div>

      <div className="simulator-grid">
        <aside className="sim-panel sim-sidebar">
          <div>
            <p className="panel-heading">Pick an appliance</p>
            <h3 className="section-title">Select Appliance</h3>
          </div>
          {allAppliances.length > 0 ? (
            <div className="sim-list">
              {allAppliances.map((appliance) => (
                <button
                  key={appliance.id}
                  type="button"
                  className={`sim-list-button ${selectedId === appliance.id ? 'sim-list-button-active' : ''}`}
                  onClick={() => selectAppliance(appliance)}
                >
                  <div>{appliance.name}</div>
                  <div className="sim-list-room">
                    {appliance.roomName} · <span className="mono">{appliance.wattage}W</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="sim-empty">
              <div>
                <strong>No appliances to simulate.</strong>
                <p>Add some items in Inventory first.</p>
              </div>
            </div>
          )}
        </aside>

        <section className="sim-panel sim-detail">
          {selectedAppliance ? (
            <>
              <div className="sim-heading">
                <div>
                  <p className="panel-heading">Simulation target</p>
                  <h3 className="section-title">{selectedAppliance.name}</h3>
                  <p className="section-copy">{selectedAppliance.roomName}</p>
                </div>
                <div className="mono">Current yearly cost: {formatINR(currentYearlyCost)}</div>
              </div>

              <article className="control-card">
                <div className="range-wrap">
                  <span className="field-label">Daily Hours: {Number(simHours).toFixed(1)} hrs</span>
                  <input
                    className="range-input"
                    type="range"
                    min="0"
                    max={selectedAppliance.dailyHours}
                    step="0.5"
                    value={simHours}
                    onChange={(event) => setSimHours(Number(event.target.value))}
                  />
                  <div className="range-meta">
                    <span>0 hrs</span>
                    <span>{selectedAppliance.dailyHours} hrs</span>
                  </div>
                </div>
              </article>

              {selectedAppliance.standby ? (
                <article className="control-card">
                  <div className="toggle-row">
                    <div>
                      <p className="field-label">Standby Control</p>
                      <p className="field-help">Turn off standby draw for this simulation.</p>
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={!simStandby}
                        onChange={(event) => setSimStandby(!event.target.checked)}
                      />
                      <span className="toggle-track" />
                    </label>
                  </div>
                </article>
              ) : null}

              <article className="control-card">
                <div className="toggle-row">
                  <div>
                    <p className="field-label">Efficient Model</p>
                    <p className="field-help">Swap this appliance for a more efficient wattage.</p>
                  </div>
                  <label className="toggle">
                    <input
                      type="checkbox"
                      checked={efficientMode}
                      onChange={(event) => {
                        const enabled = event.target.checked
                        setEfficientMode(enabled)
                        setSimWattage(
                          enabled
                            ? Math.round(selectedAppliance.wattage * 0.7)
                            : selectedAppliance.wattage,
                        )
                      }}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>

                {efficientMode ? (
                  <label className="field-stack" style={{ marginTop: '1rem' }}>
                    <span className="field-label">New Wattage (W)</span>
                    <input
                      className="input mono"
                      type="number"
                      min="1"
                      value={simWattage}
                      onChange={(event) => setSimWattage(Number(event.target.value) || 0)}
                    />
                  </label>
                ) : null}
              </article>

              <article className="sim-result-card">
                <div className="sim-compare">
                  <div>
                    <p className="field-label">Current</p>
                    <strong className="mono" style={{ color: '#ff4444' }}>
                      {formatINR(currentYearlyCost)} / year
                    </strong>
                  </div>
                  <div className="sim-arrow">TO</div>
                  <div>
                    <p className="field-label">Simulated</p>
                    <strong className="mono" style={{ color: '#00ff88' }}>
                      {formatINR(simulatedYearlyCost)} / year
                    </strong>
                  </div>
                </div>

                {savings > 0 ? (
                  <>
                    <p className="sim-highlight">You save {formatINR(savings)} / year</p>
                    <p className="mono" style={{ color: '#ffaa00' }}>
                      {formatCO2(co2Saved)} CO2 per year
                    </p>
                  </>
                ) : (
                  <p className="sim-muted">
                    Reduce daily hours, switch off standby, or enable the efficient model to reveal
                    savings.
                  </p>
                )}

                {applied ? (
                  <p className="sim-highlight" style={{ fontSize: '1rem' }}>
                    Changes Applied
                  </p>
                ) : null}

                <div className="button-row" style={{ marginTop: '1rem' }}>
                  {savings > 0 ? (
                    <button type="button" className="button button-primary" onClick={applyChange}>
                      Apply Change
                    </button>
                  ) : null}
                  <button type="button" className="button button-secondary" onClick={resetSimulation}>
                    Reset
                  </button>
                </div>
              </article>
            </>
          ) : (
            <div className="sim-empty">
              <div>
                <strong>Select an appliance to simulate changes.</strong>
                <p>Start with the AC or geyser for the most dramatic demo savings.</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Simulator
