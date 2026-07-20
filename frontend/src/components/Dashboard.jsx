import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cost, dailyKwh, monthlyKwh, yearlyKwh, wasteScore } from '../utils/calculations'
import { formatCO2, formatINR, formatKwh } from '../utils/formatting'

const PIE_COLORS = ['#00ff88', '#ffaa00', '#ff4444', '#4488ff', '#f47fff', '#666666']

function formatSavedAt(value) {
  if (!value) {
    return 'Not saved yet'
  }

  const timestamp = new Date(value)

  if (Number.isNaN(timestamp.getTime())) {
    return 'Recently'
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp)
}

function getYearlyCost(appliance, ratePerUnit) {
  const daily = dailyKwh(
    appliance.wattage,
    appliance.quantity,
    appliance.dailyHours,
    appliance.standby,
    appliance.standbyHours,
  )
  return cost(yearlyKwh(daily), ratePerUnit)
}

function getMonthlyCost(appliance, ratePerUnit) {
  const daily = dailyKwh(
    appliance.wattage,
    appliance.quantity,
    appliance.dailyHours,
    appliance.standby,
    appliance.standbyHours,
  )
  return cost(monthlyKwh(daily), ratePerUnit)
}

function Dashboard({
  rooms,
  ratePerUnit,
  allAppliances,
  totalMonthlyKwh,
  totalMonthlyCost,
  totalCO2,
  topVampires,
  auditSnapshots,
  lastSavedAt,
  onSaveSnapshot,
  onNavigate,
}) {
  const roomChartData = rooms.map((room) => {
    const roomKwh = room.appliances.reduce(
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
      name: room.name,
      cost: Math.round(cost(roomKwh, ratePerUnit)),
    }
  })

  const sortedAppliances = [...allAppliances].sort(
    (left, right) => getYearlyCost(right, ratePerUnit) - getYearlyCost(left, ratePerUnit),
  )

  const pieSlices = sortedAppliances.slice(0, 5).map((appliance) => ({
    name: appliance.name,
    value: getYearlyCost(appliance, ratePerUnit),
  }))

  const othersValue = sortedAppliances
    .slice(5)
    .reduce((sum, appliance) => sum + getYearlyCost(appliance, ratePerUnit), 0)

  if (othersValue > 0) {
    pieSlices.push({ name: 'Others', value: othersValue })
  }

  const topAppliance = [...allAppliances]
    .slice()
    .sort((left, right) => {
      const ls = wasteScore(left, ratePerUnit)
      const rs = wasteScore(right, ratePerUnit)
      if (rs !== ls) return rs - ls
      return getMonthlyCost(right, ratePerUnit) - getMonthlyCost(left, ratePerUnit)
    })[0]

  const topCost = topAppliance ? getMonthlyCost(topAppliance, ratePerUnit) : 0
  const topPct = totalMonthlyCost ? Math.round((topCost / totalMonthlyCost) * 100) : 0

  const standbyYearlyCost = allAppliances
    .filter((appliance) => appliance.standby)
    .reduce((sum, appliance) => {
      const standbyDaily = (appliance.wattage * 0.1 * appliance.quantity * appliance.standbyHours) / 1000
      return sum + cost(yearlyKwh(standbyDaily), ratePerUnit)
    }, 0)

  const hungriestRoom = [...roomChartData].sort((left, right) => right.cost - left.cost)[0]
  const recentSnapshots = auditSnapshots.slice(0, 3)
  const roundedCurrentAudit = {
    label: 'Live now',
    createdAt: new Date().toISOString(),
    totalMonthlyKwh: Number(totalMonthlyKwh.toFixed(2)),
    totalMonthlyCost: Number(totalMonthlyCost.toFixed(2)),
    totalCO2: Number(totalCO2.toFixed(2)),
    isLive: true,
  }
  const latestSnapshot = auditSnapshots[0]
  const currentMatchesLatestSnapshot =
    latestSnapshot &&
    Math.abs(Number(latestSnapshot.totalMonthlyKwh) - roundedCurrentAudit.totalMonthlyKwh) < 0.05 &&
    Math.abs(Number(latestSnapshot.totalMonthlyCost) - roundedCurrentAudit.totalMonthlyCost) < 0.5 &&
    Math.abs(Number(latestSnapshot.totalCO2) - roundedCurrentAudit.totalCO2) < 0.05
  const baselineSnapshot = auditSnapshots[auditSnapshots.length - 1] ?? null
  const baselinePoint = baselineSnapshot
    ? {
        fullLabel: baselineSnapshot.label ?? 'Baseline audit',
        monthlyKwh: Number(baselineSnapshot.totalMonthlyKwh ?? 0),
        monthlyCost: Number(baselineSnapshot.totalMonthlyCost ?? 0),
        totalCO2: Number(baselineSnapshot.totalCO2 ?? 0),
      }
    : null
  const latestPoint = currentMatchesLatestSnapshot
    ? latestSnapshot
      ? {
          fullLabel: latestSnapshot.label ?? 'Latest saved audit',
          monthlyKwh: Number(latestSnapshot.totalMonthlyKwh ?? 0),
          monthlyCost: Number(latestSnapshot.totalMonthlyCost ?? 0),
          totalCO2: Number(latestSnapshot.totalCO2 ?? 0),
        }
      : null
    : {
        fullLabel: 'Current audit',
        monthlyKwh: roundedCurrentAudit.totalMonthlyKwh,
        monthlyCost: roundedCurrentAudit.totalMonthlyCost,
        totalCO2: roundedCurrentAudit.totalCO2,
      }
  const comparisonChartData =
    baselinePoint && latestPoint
      ? [
          {
            label: 'Baseline',
            monthlyKwh: baselinePoint.monthlyKwh,
            totalCO2: baselinePoint.totalCO2,
          },
          {
            label: currentMatchesLatestSnapshot ? 'Latest' : 'Current',
            monthlyKwh: latestPoint.monthlyKwh,
            totalCO2: latestPoint.totalCO2,
          },
        ]
      : []
  const savedKwh =
    baselinePoint && latestPoint ? Number((baselinePoint.monthlyKwh - latestPoint.monthlyKwh).toFixed(1)) : 0
  const savedCO2 =
    baselinePoint && latestPoint ? Number((baselinePoint.totalCO2 - latestPoint.totalCO2).toFixed(1)) : 0
  const savedCost =
    baselinePoint && latestPoint ? Number((baselinePoint.monthlyCost - latestPoint.monthlyCost).toFixed(0)) : 0
  const energyDirection = savedKwh > 0.1 ? 'down' : savedKwh < -0.1 ? 'up' : 'flat'
  const carbonDirection = savedCO2 > 0.1 ? 'down' : savedCO2 < -0.1 ? 'up' : 'flat'
  const costDirection = savedCost > 1 ? 'down' : savedCost < -1 ? 'up' : 'flat'
  let trendVerdict = {
    tone: 'neutral',
    title: 'Build your progress story',
    copy: 'Save another snapshot after making a change in Inventory or Simulator to unlock a real before-vs-after verdict.',
  }

  if (comparisonChartData.length >= 2) {
    if (energyDirection === 'down' || carbonDirection === 'down' || costDirection === 'down') {
      trendVerdict = {
        tone: 'good',
        title: 'Great progress so far',
        copy: `Since ${baselinePoint.fullLabel}, you are using ${formatKwh(Math.max(savedKwh, 0))} less each month, avoiding ${formatCO2(Math.max(savedCO2, 0))}, and saving ${formatINR(Math.max(savedCost, 0))}. Keep going, your smarter home habits are clearly paying off.`,
      }
    } else if (energyDirection === 'flat' && carbonDirection === 'flat' && costDirection === 'flat') {
      trendVerdict = {
        tone: 'neutral',
        title: 'Your audit is steady',
        copy: 'Your latest snapshot is close to your baseline. Try one focused simulator change, save a new snapshot, and this area will show the payoff.',
      }
    } else {
      trendVerdict = {
        tone: 'warn',
        title: 'Consumption is trending up',
        copy: `Compared with ${baselinePoint.fullLabel}, your latest audit is higher by ${formatKwh(Math.abs(savedKwh))} and ${formatCO2(Math.abs(savedCO2))}. Revisit Rankings or Simulator to pull the curve back down.`,
      }
    }
  }
  const quickStartSteps = [
    {
      step: '1',
      title: 'Add your home setup',
      copy: 'Open Inventory and enter rooms, appliances, hours of use, and standby behavior.',
    },
    {
      step: '2',
      title: 'Spot hidden waste',
      copy: 'Use Rankings to find the devices and rooms that are driving the biggest share of your bill.',
    },
    {
      step: '3',
      title: 'Test savings before changing anything',
      copy: 'Open Simulator or AI Advisor to see what cuts cost fastest before you spend money.',
    },
  ]

  return (
    <div className="dashboard-grid">
      <div className="section-head">
        <div>
          <p className="panel-heading">Start here</p>
          <h2 className="section-title">Your Home Energy Story</h2>
        </div>
        <p className="section-copy">
          Phantom Load helps you understand what is pushing your electricity bill up, where energy
          is being wasted, and what to fix first.
        </p>
      </div>

      <div className="dashboard-row dashboard-onboarding-row">
        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">What this app does</p>
              <h3 className="section-title">Turn a confusing bill into clear next steps</h3>
            </div>
          </div>

          <p className="section-copy">
            Add your rooms and appliances once, and the app will estimate your bill, highlight
            standby waste, and point you to the changes with the biggest savings potential.
          </p>

          <p className="dashboard-callout">
            {topAppliance
              ? `${topAppliance.name} in your ${topAppliance.roomName} is currently the biggest cost driver in this home.`
              : 'Start by adding your first appliance so Phantom Load can identify your biggest cost driver.'}
          </p>

          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => onNavigate?.('inventory')}>
              Add Or Edit Appliances
            </button>
            <button type="button" className="button button-secondary" onClick={() => onNavigate?.('rankings')}>
              View Biggest Waste
            </button>
          </div>
        </article>

        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">How it works</p>
              <h3 className="section-title">Three simple steps</h3>
            </div>
          </div>

          <div className="insight-grid">
            {quickStartSteps.map((item) => (
              <article className="insight-card quick-step-card" key={item.step}>
                <span className="quick-step-number">{item.step}</span>
                <div>
                  <span className="insight-label">{item.title}</span>
                  <p>{item.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </article>
      </div>

      <div className="dashboard-row dashboard-history-row">
        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">Saved data</p>
              <h3 className="section-title">This Audit Now Persists</h3>
            </div>
          </div>

          <p className="section-copy">
            Your inventory, electricity rate, and saved audit checkpoints now sync through the
            shared backend for this logged-in user.
          </p>

          <p className="dashboard-callout">
            <strong className="mono">Last saved: {formatSavedAt(lastSavedAt)}</strong>
            <br />
            Save snapshots when you want to compare today&apos;s energy profile with future changes.
          </p>

          <div className="button-row">
            <button type="button" className="button button-primary" onClick={() => onSaveSnapshot?.()}>
              Save Snapshot
            </button>
            <button type="button" className="button button-secondary" onClick={() => onNavigate?.('inventory')}>
              Update Inventory
            </button>
          </div>
        </article>

        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">Recent checkpoints</p>
              <h3 className="section-title">Audit History</h3>
            </div>
          </div>

          {recentSnapshots.length > 0 ? (
            <div className="history-list">
              {recentSnapshots.map((snapshot) => (
                <div className="history-item" key={snapshot.id}>
                  <div>
                    <p className="history-title">{snapshot.label}</p>
                    <p className="history-meta">
                      {formatSavedAt(snapshot.createdAt)}
                      {' - '}
                      {snapshot.topVampires?.[0]?.name ?? 'No top risk yet'}
                    </p>
                  </div>
                  <strong className="history-value mono">{formatINR(snapshot.totalMonthlyCost)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty">Save your first snapshot to start building audit history.</div>
          )}
        </article>
      </div>

      <div className="dashboard-row">
        <article className="chart-card">
          <div className="section-head">
            <div>
              <p className="panel-heading">Audit comparison</p>
              <h3 className="section-title">Energy And CO2 Snapshot</h3>
            </div>
          </div>

          {comparisonChartData.length > 0 ? (
            <div className="chart-wrapper history-trend-chart">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonChartData} margin={{ top: 8, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255,255,255,0.68)', fontSize: 11, fontFamily: 'Orbitron' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="energy"
                    tick={{ fill: 'rgba(255,255,255,0.68)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Math.round(value)}`}
                  />
                  <YAxis
                    yAxisId="carbon"
                    orientation="right"
                    tick={{ fill: 'rgba(255,255,255,0.56)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${Math.round(value)}`}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'Energy' ? formatKwh(value) : formatCO2(value),
                      name,
                    ]}
                  />
                  <Legend />
                  <Bar
                    yAxisId="energy"
                    dataKey="monthlyKwh"
                    name="Energy"
                    stroke="#00ff88"
                    fill="#00ff88"
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar
                    yAxisId="carbon"
                    dataKey="totalCO2"
                    name="CO2"
                    fill="#ffaa00"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">Save a snapshot to compare your baseline audit with your current home profile.</div>
          )}
        </article>

        <article className={`insight-panel progress-verdict-card progress-verdict-${trendVerdict.tone}`}>
          <div className="section-head">
            <div>
              <p className="panel-heading">Verdict</p>
              <h3 className="section-title">{trendVerdict.title}</h3>
            </div>
          </div>

          <p className="section-copy">{trendVerdict.copy}</p>

          <div className="progress-metric-grid">
            <div className="progress-metric">
              <span className="progress-metric-label">Energy</span>
              <strong className="mono">
                {savedKwh > 0.1 ? '-' : savedKwh < -0.1 ? '+' : ''}
                {formatKwh(Math.abs(savedKwh))}
              </strong>
            </div>
            <div className="progress-metric">
              <span className="progress-metric-label">CO2</span>
              <strong className="mono">
                {savedCO2 > 0.1 ? '-' : savedCO2 < -0.1 ? '+' : ''}
                {formatCO2(Math.abs(savedCO2))}
              </strong>
            </div>
            <div className="progress-metric">
              <span className="progress-metric-label">Monthly Bill</span>
              <strong className="mono">
                {savedCost > 1 ? '-' : savedCost < -1 ? '+' : ''}
                {formatINR(Math.abs(savedCost))}
              </strong>
            </div>
          </div>

          <p className="dashboard-callout progress-quote">
            {trendVerdict.tone === 'good'
              ? 'Every efficient habit you keep today becomes money saved month after month.'
              : trendVerdict.tone === 'warn'
                ? 'The good news is that your next smart change can still bend this line back down.'
                : 'Save snapshots after each improvement, and Phantom Load will turn your effort into visible progress.'}
          </p>
        </article>
      </div>

      <section className="stat-grid">
        <article className="stat-card stat-card-good">
          <span className="stat-label">Monthly Cost</span>
          <h3 className="stat-value stat-value-good mono">{formatINR(totalMonthlyCost)}</h3>
        </article>
        <article className="stat-card">
          <span className="stat-label">Yearly Cost</span>
          <h3 className="stat-value mono">{formatINR(totalMonthlyCost * 12)}</h3>
        </article>
        <article className="stat-card">
          <span className="stat-label">CO2 This Month</span>
          <h3 className="stat-value stat-value-warning mono">{formatCO2(totalCO2)}</h3>
        </article>
        <article className="stat-card">
          <span className="stat-label">Total Usage</span>
          <h3 className="stat-value mono">{formatKwh(totalMonthlyKwh)}</h3>
        </article>
      </section>

      <div className="dashboard-row">
        <article className="chart-card">
          <div className="section-head">
            <div>
              <p className="panel-heading">Cost spread</p>
              <h3 className="section-title">Consumption By Room</h3>
            </div>
          </div>

          {roomChartData.length > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={roomChartData}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'rgba(255,255,255,0.68)', fontSize: 11, fontFamily: 'Orbitron' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255,255,255,0.68)', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `Rs${value}`}
                  />
                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Bar dataKey="cost" fill="#00ff88" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">Add rooms and appliances to see room-wise cost.</div>
          )}
        </article>

        <article className="chart-card">
          <div className="section-head">
            <div>
              <p className="panel-heading">Heavy hitters</p>
              <h3 className="section-title">Top Energy Consumers</h3>
            </div>
          </div>

          {pieSlices.length > 0 ? (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={92}
                    paddingAngle={3}
                  >
                    {pieSlices.map((slice, index) => (
                      <Cell key={`${slice.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatINR(value)} />
                  <Legend verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="chart-empty">No appliance data yet.</div>
          )}
        </article>
      </div>

      <div className="dashboard-row">
        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">Auto-generated cues</p>
              <h3 className="section-title">Smart Insights</h3>
            </div>
          </div>

          <div className="insight-grid">
            <article className="insight-card">
              <span className="insight-label">Top Cost Appliance</span>
              <p>
                {topAppliance
                  ? `Your ${topAppliance.name} accounts for ${topPct}% of your monthly electricity bill.`
                  : 'Add appliances to reveal your biggest billing driver.'}
              </p>
            </article>
            <article className="insight-card insight-card-danger">
              <span className="insight-label">Standby Waste</span>
              <p>
                {allAppliances.some((appliance) => appliance.standby)
                  ? `Standby devices cost you ${formatINR(standbyYearlyCost)} per year without doing useful work.`
                  : 'No standby load detected yet. That is already a strong sign.'}
              </p>
            </article>
            <article className="insight-card insight-card-good">
              <span className="insight-label">Hungriest Room</span>
              <p>
                {hungriestRoom
                  ? `${hungriestRoom.name} is your most power-hungry room right now.`
                  : 'Room insights will appear once you start adding inventory.'}
              </p>
            </article>
          </div>
        </article>

        <article className="insight-panel">
          <div className="section-head">
            <div>
              <p className="panel-heading">Quick pitch section</p>
              <h3 className="section-title">Top Vampires</h3>
            </div>
          </div>

          {topVampires.length > 0 ? (
            <div className="dashboard-vampires">
              {topVampires.map((appliance) => (
                <div className="dashboard-vampire-item" key={appliance.id}>
                  <div>
                    <p className="dashboard-vampire-name">{appliance.name}</p>
                    <p className="dashboard-vampire-room">{appliance.roomName}</p>
                  </div>
                  <div className="waste-pill waste-high mono">{appliance.score}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="chart-empty">Once appliances are added, the worst offenders will surface here.</div>
          )}
        </article>
      </div>
    </div>
  )
}

export default Dashboard
