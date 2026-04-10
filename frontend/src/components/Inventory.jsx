import { useEffect, useState } from 'react'
import ApplianceModal from './ApplianceModal'
import { cost, dailyKwh, monthlyKwh, wasteScore } from '../utils/calculations'
import { formatINR, formatKwh } from '../utils/formatting'

function getWasteLabel(score) {
  if (score < 30) {
    return { className: 'waste-low', label: 'Low' }
  }

  if (score <= 60) {
    return { className: 'waste-medium', label: 'Med' }
  }

  return { className: 'waste-high', label: 'High' }
}

function Inventory({
  rooms,
  ratePerUnit,
  onAddRoom,
  onUpdateRoom,
  onRemoveRoom,
  onAddAppliance,
  onUpdateAppliance,
  onRemoveAppliance,
  onUpdateRatePerUnit,
  allAppliances,
}) {
  const [isAddingRoom, setIsAddingRoom] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [editingRoomId, setEditingRoomId] = useState(null)
  const [editingRoomName, setEditingRoomName] = useState('')
  const [rateInput, setRateInput] = useState(String(ratePerUnit))
  const [modalState, setModalState] = useState({
    isOpen: false,
    mode: 'add',
    roomId: null,
    appliance: null,
  })
  const [busyKey, setBusyKey] = useState('')

  useEffect(() => {
    setRateInput(String(ratePerUnit))
  }, [ratePerUnit])

  async function submitRoom() {
    const trimmedName = roomName.trim()

    if (!trimmedName || busyKey) {
      return
    }

    try {
      setBusyKey('add-room')
      await onAddRoom?.(trimmedName)
      setRoomName('')
      setIsAddingRoom(false)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not add the room right now.')
    } finally {
      setBusyKey('')
    }
  }

  function startRoomEdit(room) {
    setEditingRoomId(room.id)
    setEditingRoomName(room.name)
  }

  function cancelRoomEdit() {
    setEditingRoomId(null)
    setEditingRoomName('')
  }

  async function saveRoomEdit(roomId) {
    const trimmedName = editingRoomName.trim()

    if (!trimmedName || busyKey) {
      return
    }

    try {
      setBusyKey(`update-room-${roomId}`)
      await onUpdateRoom?.(roomId, trimmedName)
      cancelRoomEdit()
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not update the room right now.')
    } finally {
      setBusyKey('')
    }
  }

  function openAddApplianceModal(roomId) {
    setModalState({
      isOpen: true,
      mode: 'add',
      roomId,
      appliance: null,
    })
  }

  function openEditApplianceModal(roomId, appliance) {
    setModalState({
      isOpen: true,
      mode: 'edit',
      roomId,
      appliance,
    })
  }

  async function removeAppliance(roomId, applianceId, applianceName, roomNameValue) {
    const shouldRemove = window.confirm(
      `Remove ${applianceName} from ${roomNameValue}? This updates Dashboard, Rankings, Simulator, and AI too.`,
    )

    if (!shouldRemove) {
      return
    }

    try {
      setBusyKey(`remove-appliance-${applianceId}`)
      await onRemoveAppliance?.(roomId, applianceId)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not remove the appliance right now.')
    } finally {
      setBusyKey('')
    }
  }

  async function removeRoom(roomId) {
    const shouldRemove = window.confirm('Remove this room and all appliances inside it?')

    if (!shouldRemove) {
      return
    }

    try {
      setBusyKey(`remove-room-${roomId}`)
      await onRemoveRoom?.(roomId)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not remove the room right now.')
    } finally {
      setBusyKey('')
    }
  }

  function handleRateChange(event) {
    setRateInput(event.target.value)
  }

  async function handleRateBlur() {
    const parsedValue = Number(rateInput)

    if (!rateInput || !Number.isFinite(parsedValue) || parsedValue <= 0) {
      setRateInput(String(ratePerUnit))
      return
    }

    if (parsedValue === ratePerUnit) {
      setRateInput(String(parsedValue))
      return
    }

    try {
      setBusyKey('rate')
      await onUpdateRatePerUnit?.(parsedValue)
      setRateInput(String(parsedValue))
    } catch (error) {
      setRateInput(String(ratePerUnit))
      window.alert(error instanceof Error ? error.message : 'Could not update the electricity rate right now.')
    } finally {
      setBusyKey('')
    }
  }

  return (
    <div className="inventory-stack">
      <div className="section-head">
        <div>
          <p className="panel-heading">Editable home model</p>
          <h2 className="section-title">Inventory</h2>
        </div>
        <p className="section-copy">
          Add, edit, or remove rooms and appliances here. Because every tab reads from the same
          inventory state, updates here immediately reshape Dashboard, Rankings, Simulator, and AI.
        </p>
      </div>

      <section className="inventory-toolbar">
        <div className="toolbar-meta">
          <div className="toolbar-stat">
            <span className="field-label">Electricity Rate</span>
            <div className="field-stack">
              <input
                className="input mono"
                type="number"
                min="0.1"
                step="0.1"
                value={rateInput}
                onChange={handleRateChange}
                onBlur={handleRateBlur}
                disabled={busyKey === 'rate'}
              />
              <span className="field-help">Live rate: {formatINR(ratePerUnit)} per kWh</span>
            </div>
          </div>
          <div className="toolbar-stat">
            <span className="field-label">Rooms Tracked</span>
            <strong className="mono">{rooms.length}</strong>
          </div>
          <div className="toolbar-stat">
            <span className="field-label">Appliances Tracked</span>
            <strong className="mono">{allAppliances.length}</strong>
          </div>
        </div>

        {!isAddingRoom ? (
          <button
            type="button"
            className="button button-primary"
            onClick={() => setIsAddingRoom(true)}
            disabled={busyKey === 'add-room'}
          >
            + Add Room
          </button>
        ) : null}
      </section>

      {isAddingRoom ? (
        <section className="inventory-panel">
          <div className="inline-room-form">
            <label className="field-stack">
              <span className="field-label">Room Name</span>
              <input
                className="input"
                value={roomName}
                placeholder="Bedroom, Study, Kitchen..."
                onChange={(event) => setRoomName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    submitRoom()
                  }
                }}
                autoFocus
              />
            </label>
            <div className="button-row">
              <button type="button" className="button button-primary" onClick={submitRoom} disabled={busyKey === 'add-room'}>
                Confirm
              </button>
              <button
                type="button"
                className="button button-secondary"
                disabled={busyKey === 'add-room'}
                onClick={() => {
                  setRoomName('')
                  setIsAddingRoom(false)
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {rooms.length === 0 ? (
        <section className="empty-state">
          <div>
            <strong>Start by adding your first room.</strong>
            <p>The dashboard and rankings become meaningful as soon as the first inventory item lands.</p>
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setIsAddingRoom(true)}
              disabled={busyKey === 'add-room'}
            >
              + Add Room
            </button>
          </div>
        </section>
      ) : (
        <section className="room-grid">
          {rooms.map((room) => {
            const roomMonthlyKwh = room.appliances.reduce(
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

            const isEditingRoom = editingRoomId === room.id

            return (
              <article className="room-card" key={room.id}>
                <div className="room-card-header">
                  {isEditingRoom ? (
                    <div className="field-stack room-edit-stack">
                      <span className="field-label">Editing Room Name</span>
                      <input
                        className="input"
                        value={editingRoomName}
                        onChange={(event) => setEditingRoomName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            saveRoomEdit(room.id)
                          }
                        }}
                        autoFocus
                      />
                      <span className="field-help">Press Enter or Save to update this room.</span>
                    </div>
                  ) : (
                    <div className="room-title-stack">
                      <h3 className="room-name">{room.name}</h3>
                      <p className="room-meta">
                        {room.appliances.length} appliances - {formatKwh(roomMonthlyKwh)} / month
                      </p>
                    </div>
                  )}

                  <div className="button-row">
                    {isEditingRoom ? (
                      <>
                        <button
                          type="button"
                          className="button button-primary"
                          onClick={() => saveRoomEdit(room.id)}
                          disabled={busyKey === `update-room-${room.id}`}
                        >
                          Save Room
                        </button>
                        <button type="button" className="button button-secondary" onClick={cancelRoomEdit}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => startRoomEdit(room)}
                          disabled={busyKey.startsWith('remove-room-')}
                        >
                          Edit Room
                        </button>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => openAddApplianceModal(room.id)}
                          disabled={busyKey.startsWith('remove-room-')}
                        >
                          + Add Appliance
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          onClick={() => removeRoom(room.id)}
                          disabled={busyKey === `remove-room-${room.id}`}
                        >
                          Remove Room
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {room.appliances.length > 0 ? (
                  <div className="appliance-list">
                    {room.appliances.map((appliance) => {
                      const monthlyCost = cost(
                        monthlyKwh(
                          dailyKwh(
                            appliance.wattage,
                            appliance.quantity,
                            appliance.dailyHours,
                            appliance.standby,
                            appliance.standbyHours,
                          ),
                        ),
                        ratePerUnit,
                      )

                      const score = wasteScore(appliance, ratePerUnit)
                      const waste = getWasteLabel(score)

                      return (
                        <div className="appliance-row" key={appliance.id}>
                          <div>
                            <p className="appliance-name">{appliance.name}</p>
                            <p className="appliance-meta">
                              Qty {appliance.quantity}
                              {appliance.standby ? ` - Standby ${appliance.standbyHours}h` : ''}
                            </p>
                          </div>
                          <div className="appliance-value mono">{appliance.wattage}W</div>
                          <div className="appliance-value mono">{appliance.dailyHours}h/day</div>
                          <div className="appliance-cost mono">{formatINR(monthlyCost)}</div>
                          <div className="button-row">
                            <div className={`waste-pill ${waste.className}`}>{waste.label}</div>
                            <button
                              type="button"
                              className="button button-secondary button-small"
                              onClick={() => openEditApplianceModal(room.id, appliance)}
                              disabled={busyKey === `remove-appliance-${appliance.id}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button button-danger button-small"
                              onClick={() =>
                                removeAppliance(room.id, appliance.id, appliance.name, room.name)
                              }
                              disabled={busyKey === `remove-appliance-${appliance.id}`}
                              aria-label={`Remove ${appliance.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="chart-empty">No appliances yet. Add one to start scoring hidden load.</div>
                )}
              </article>
            )
          })}
        </section>
      )}

      {modalState.isOpen ? (
        <ApplianceModal
          key={`${modalState.roomId}-${modalState.appliance?.id ?? 'new'}`}
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          roomId={modalState.roomId}
          appliance={modalState.appliance}
          rooms={rooms}
          onAddAppliance={onAddAppliance}
          onUpdateAppliance={onUpdateAppliance}
          ratePerUnit={ratePerUnit}
          onClose={() =>
            setModalState({
              isOpen: false,
              mode: 'add',
              roomId: null,
              appliance: null,
            })
          }
        />
      ) : null}
    </div>
  )
}

export default Inventory
