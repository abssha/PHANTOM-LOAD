import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { APPLIANCE_CATALOG } from '../data/catalog'
import { cost, dailyKwh, monthlyKwh, wasteScore } from '../utils/calculations'
import { formatINR } from '../utils/formatting'

const DEFAULT_APPLIANCE = APPLIANCE_CATALOG[0]

function getInitialFormState(appliance) {
  const matchedCatalogItem = appliance?.isCustom
    ? null
    : APPLIANCE_CATALOG.find((entry) => entry.name === appliance?.name) ?? null

  return {
    selectedName: matchedCatalogItem ? matchedCatalogItem.name : appliance ? 'Custom' : DEFAULT_APPLIANCE.name,
    customName: matchedCatalogItem ? '' : appliance?.name ?? '',
    wattage: appliance?.wattage ?? matchedCatalogItem?.wattage ?? DEFAULT_APPLIANCE.wattage,
    quantity: appliance?.quantity ?? 1,
    dailyHours: appliance?.dailyHours ?? 4,
    standbyEnabled: Boolean(appliance?.standby),
    standbyHours: appliance?.standbyHours ?? 4,
  }
}

function ApplianceModal({
  isOpen,
  mode = 'add',
  roomId,
  appliance,
  rooms,
  onAddAppliance,
  onUpdateAppliance,
  ratePerUnit,
  onClose,
}) {
  const initialState = getInitialFormState(appliance)
  const [selectedName, setSelectedName] = useState(initialState.selectedName)
  const [customName, setCustomName] = useState(initialState.customName)
  const [wattage, setWattage] = useState(initialState.wattage)
  const [quantity, setQuantity] = useState(initialState.quantity)
  const [dailyHours, setDailyHours] = useState(initialState.dailyHours)
  const [standbyEnabled, setStandbyEnabled] = useState(initialState.standbyEnabled)
  const [standbyHours, setStandbyHours] = useState(initialState.standbyHours)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const room = rooms.find((entry) => entry.id === roomId)
  const isEditMode = mode === 'edit' && appliance
  const isCustom = selectedName === 'Custom'
  const maxStandbyHours = Math.max(0, 24 - Number(dailyHours))
  const clampedStandbyHours = standbyEnabled ? Math.min(Number(standbyHours) || 0, maxStandbyHours) : 0

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') {
      return undefined
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const resolvedName = isCustom ? customName.trim() || 'Custom Appliance' : selectedName
  const resolvedWattage = Number(wattage) || 0

  const payload = {
    name: resolvedName,
    wattage: resolvedWattage,
    quantity: Number(quantity) || 1,
    dailyHours: Number(dailyHours) || 0,
    standby: standbyEnabled,
    standbyHours: clampedStandbyHours,
    isCustom,
  }

  const previewMonthlyCost = cost(
    monthlyKwh(
      dailyKwh(
        payload.wattage,
        payload.quantity,
        payload.dailyHours,
        payload.standby,
        payload.standbyHours,
      ),
    ),
    ratePerUnit,
  )

  const previewScore = wasteScore(payload, ratePerUnit)
  const scoreClass =
    previewScore < 30 ? 'waste-low' : previewScore <= 60 ? 'waste-medium' : 'waste-high'

  function handleCatalogChange(event) {
    const nextName = event.target.value
    const nextItem = APPLIANCE_CATALOG.find((entry) => entry.name === nextName) ?? DEFAULT_APPLIANCE

    setSelectedName(nextName)
    setWattage(nextItem.wattage)

    if (nextName !== 'Custom') {
      setCustomName('')
    }
  }

  async function handleSubmit() {
    if (!resolvedName || resolvedWattage <= 0 || isSubmitting) {
      return
    }

    try {
      setIsSubmitting(true)

      if (isEditMode) {
        await onUpdateAppliance?.(roomId, appliance.id, payload)
      } else {
        await onAddAppliance?.(roomId, payload)
      }

      onClose()
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : `Could not ${isEditMode ? 'update' : 'add'} the appliance right now.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleOverlayClick() {
    if (!isSubmitting) {
      onClose()
    }
  }

  if (typeof document === 'undefined') {
    return null
  }

  const modalContent = (
    <div className="modal-overlay" role="presentation" onClick={handleOverlayClick}>
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditMode ? 'Edit Appliance' : 'Add Appliance'}</h2>
          <p className="modal-room-label">
            {isEditMode ? 'Updating' : 'Adding to'} <strong>{room?.name ?? 'Selected room'}</strong>
          </p>
        </div>

        <div className="modal-grid">
          <section className="control-card">
            <label className="field-stack">
              <span className="field-label">Appliance Type</span>
              <select className="select" value={selectedName} onChange={handleCatalogChange} disabled={isSubmitting}>
                {APPLIANCE_CATALOG.map((catalogAppliance) => (
                  <option key={catalogAppliance.name} value={catalogAppliance.name}>
                    {catalogAppliance.name}
                  </option>
                ))}
              </select>
            </label>

            {isCustom ? (
              <div className="grid-two" style={{ marginTop: '0.9rem' }}>
                <label className="field-stack">
                  <span className="field-label">Appliance Name</span>
                  <input
                    className="input"
                    value={customName}
                    placeholder="Custom appliance"
                    disabled={isSubmitting}
                    onChange={(event) => setCustomName(event.target.value)}
                  />
                </label>
                <label className="field-stack">
                  <span className="field-label">Wattage (W)</span>
                  <input
                    className="input mono"
                    type="number"
                    min="1"
                    value={wattage}
                    disabled={isSubmitting}
                    onChange={(event) => setWattage(Number(event.target.value) || 0)}
                  />
                </label>
              </div>
            ) : (
              <div className="grid-two" style={{ marginTop: '0.9rem' }}>
                <label className="field-stack">
                  <span className="field-label">Wattage (W)</span>
                  <input
                    className="input mono"
                    type="number"
                    min="1"
                    value={wattage}
                    disabled={isSubmitting}
                    onChange={(event) => setWattage(Number(event.target.value) || 0)}
                  />
                </label>
                <label className="field-stack">
                  <span className="field-label">Quantity</span>
                  <input
                    className="input mono"
                    type="number"
                    min="1"
                    max="20"
                    value={quantity}
                    disabled={isSubmitting}
                    onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                  />
                </label>
              </div>
            )}

            {isCustom ? (
              <label className="field-stack" style={{ marginTop: '0.9rem' }}>
                <span className="field-label">Quantity</span>
                <input
                  className="input mono"
                  type="number"
                  min="1"
                  max="20"
                  value={quantity}
                  disabled={isSubmitting}
                  onChange={(event) => setQuantity(Number(event.target.value) || 1)}
                />
              </label>
            ) : null}
          </section>

          <section className="control-card">
            <div className="range-wrap">
              <span className="field-label">Daily Usage: {Number(dailyHours).toFixed(1)} hrs</span>
              <input
                className="range-input"
                type="range"
                min="0"
                max="24"
                step="0.5"
                value={dailyHours}
                disabled={isSubmitting}
                onChange={(event) => setDailyHours(Number(event.target.value))}
              />
              <div className="range-meta">
                <span>0 hrs</span>
                <span>24 hrs</span>
              </div>
            </div>
          </section>

          <section className="control-card">
            <div className="toggle-row">
              <div>
                <p className="field-label">Standby / Phantom Load</p>
                <p className="field-help">Include the energy used while idle or waiting.</p>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={standbyEnabled}
                  disabled={isSubmitting}
                  onChange={(event) => {
                    const enabled = event.target.checked
                    setStandbyEnabled(enabled)

                    if (enabled && standbyHours === 0) {
                      setStandbyHours(Math.min(8, Math.max(0, 24 - Number(dailyHours))))
                    }
                  }}
                />
                <span className="toggle-track" />
              </label>
            </div>

            {standbyEnabled ? (
              <div className="range-wrap" style={{ marginTop: '1rem' }}>
                <span className="field-label">Standby Hours: {clampedStandbyHours} hrs</span>
                <input
                  className="range-input"
                  type="range"
                  min="0"
                  max={maxStandbyHours}
                  step="1"
                  value={clampedStandbyHours}
                  disabled={isSubmitting}
                  onChange={(event) => setStandbyHours(Number(event.target.value))}
                />
                <div className="range-meta">
                  <span>0 hrs</span>
                  <span>{maxStandbyHours} hrs</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="control-card">
            <div className="preview-grid">
              <div className="preview-card">
                <span className="preview-label">Monthly Cost</span>
                <p className="preview-value mono" style={{ color: '#00ff88' }}>
                  {formatINR(previewMonthlyCost)}
                </p>
              </div>
              <div className="preview-card">
                <span className="preview-label">Waste Score</span>
                <div className={`waste-pill ${scoreClass}`}>{previewScore}</div>
              </div>
            </div>
          </section>

          <div className="button-row">
            <button type="button" className="button button-primary" onClick={handleSubmit} disabled={isSubmitting}>
              {isEditMode ? 'Save Changes' : 'Add To Room'}
            </button>
            <button type="button" className="button button-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default ApplianceModal
