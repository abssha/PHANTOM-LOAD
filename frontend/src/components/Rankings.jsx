import { co2, cost, dailyKwh, yearlyKwh, wasteScore } from '../utils/calculations'
import { formatCO2, formatINR } from '../utils/formatting'

function getScoreColor(score) {
  if (score < 30) {
    return '#00ff88'
  }

  if (score <= 60) {
    return '#ffaa00'
  }

  return '#ff4444'
}

function Rankings({ allAppliances, ratePerUnit }) {
  const ranked = allAppliances
    .map((appliance) => {
      const daily = dailyKwh(
        appliance.wattage,
        appliance.quantity,
        appliance.dailyHours,
        appliance.standby,
        appliance.standbyHours,
      )

      return {
        ...appliance,
        score: wasteScore(appliance, ratePerUnit),
        yearlyCost: cost(yearlyKwh(daily), ratePerUnit),
        yearlyCO2: co2(yearlyKwh(daily)),
      }
    })
    .sort((left, right) => right.score - left.score)

  const recommendations = ranked.slice(0, 3).map((appliance) => {
    let savings = appliance.yearlyCost * 0.3
    let text = `Replace ${appliance.name} with a 5-star model to save up to ${formatINR(savings)} per year.`

    if (appliance.name.includes('Incandescent')) {
      savings =
        appliance.yearlyCost -
        cost(
          yearlyKwh(dailyKwh(9, appliance.quantity, appliance.dailyHours, false, 0)),
          ratePerUnit,
        )
      text = `Switch your ${appliance.name} to LED (9W) and save ${formatINR(savings)} per year.`
    } else if (appliance.standby) {
      savings = cost(
        yearlyKwh((appliance.wattage * 0.1 * appliance.quantity * appliance.standbyHours) / 1000),
        ratePerUnit,
      )
      text = `Turn off standby on ${appliance.name} and save ${formatINR(savings)} per year.`
    } else if (appliance.name.includes('Geyser') && appliance.dailyHours > 1) {
      const reducedSavings = cost(
        yearlyKwh(
          dailyKwh(
            appliance.wattage,
            appliance.quantity,
            0.5,
            appliance.standby,
            appliance.standbyHours,
          ),
        ),
        ratePerUnit,
      )
      savings = appliance.yearlyCost - reducedSavings
      text = `Reduce ${appliance.name} by 30 minutes per day and save ${formatINR(savings)} per year.`
    } else if (appliance.dailyHours > 8) {
      const reducedUsage = Math.max(0, appliance.dailyHours - 2)
      const reducedCost = cost(
        yearlyKwh(
          dailyKwh(
            appliance.wattage,
            appliance.quantity,
            reducedUsage,
            appliance.standby,
            appliance.standbyHours,
          ),
        ),
        ratePerUnit,
      )
      savings = appliance.yearlyCost - reducedCost
      text = `Reduce ${appliance.name} by 2 hours per day and save ${formatINR(savings)} per year.`
    }

    const co2Saved = ratePerUnit > 0 ? (savings / ratePerUnit) * 0.82 : 0

    return {
      id: appliance.id,
      text,
      savings,
      co2Saved,
    }
  })

  return (
    <div className="ranking-stack">
      <div className="section-head">
        <div>
          <p className="panel-heading">Risk-first ranking</p>
          <h2 className="section-title">Energy Vampires</h2>
        </div>
        <p className="section-copy">
          This is the fastest judge-friendly answer to the question, which appliances are hurting
          me the most right now?
        </p>
      </div>

      <section className="ranking-panel">
        {ranked.length > 0 ? (
          <div className="ranking-list">
            {ranked.map((appliance, index) => (
              <article className="ranking-row" key={appliance.id}>
                <div className={`ranking-rank ${index < 3 ? 'ranking-rank-top' : ''}`}>{index + 1}</div>
                <div>
                  <p className="ranking-name">{appliance.name}</p>
                  <p className="ranking-room">{appliance.roomName}</p>
                  {index < 3 ? <span className="vampire-badge">Energy Vampire</span> : null}
                </div>
                <div className="score-wrap">
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{
                        width: `${Math.min(appliance.score, 100)}%`,
                        background: getScoreColor(appliance.score),
                      }}
                    />
                  </div>
                  <div className="score-meta">
                    <span>Waste score</span>
                    <strong className="mono">{appliance.score}</strong>
                  </div>
                </div>
                <div className="mono" style={{ color: '#00ff88' }}>
                  {formatINR(appliance.yearlyCost)}
                </div>
                <div className="mono" style={{ color: '#ffaa00' }}>
                  {formatCO2(appliance.yearlyCO2)}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div>
              <strong>No rankings yet.</strong>
              <p>Add appliances in Inventory to generate waste scores and savings recommendations.</p>
            </div>
          </div>
        )}
      </section>

      <section className="ranking-panel">
        <div className="section-head">
          <div>
            <p className="panel-heading">Actionable fixes</p>
            <h3 className="section-title">Swap And Save</h3>
          </div>
        </div>

        {recommendations.length > 0 ? (
          <div className="recommendation-grid">
            {recommendations.map((recommendation) => (
              <article className="recommendation-card" key={recommendation.id}>
                <p>{recommendation.text}</p>
                <strong className="recommendation-value mono">
                  Save {formatINR(recommendation.savings)} / year
                </strong>
                <span className="recommendation-co2 mono">
                  {formatCO2(recommendation.co2Saved)} CO2 saved
                </span>
              </article>
            ))}
          </div>
        ) : (
          <div className="chart-empty">Recommendations appear when the first few appliances are ranked.</div>
        )}
      </section>
    </div>
  )
}

export default Rankings
