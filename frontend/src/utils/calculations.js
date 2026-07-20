export function dailyKwh(wattage, quantity, dailyHours, standby, standbyHours) {
  const activeKwh = (wattage * quantity * dailyHours) / 1000
  const standbyKwh = standby ? (wattage * 0.1 * quantity * standbyHours) / 1000 : 0
  return activeKwh + standbyKwh
}

export function monthlyKwh(daily) {
  return daily * 30
}

export function yearlyKwh(daily) {
  return daily * 365
}

export function cost(kwh, ratePerUnit) {
  return kwh * ratePerUnit
}

export function co2(kwh) {
  return kwh * 0.82
}

export function wasteScore(appliance, ratePerUnit) {
  const daily = dailyKwh(
    appliance.wattage,
    appliance.quantity,
    appliance.dailyHours,
    appliance.standby,
    appliance.standbyHours,
  )
  // Weight the estimated yearly cost more heavily so ranking reflects bill impact
  const yearlyCost = cost(yearlyKwh(daily), ratePerUnit)
  // scale cost into score space; cap reasonably to avoid runaway values
  const costScore = Math.min(yearlyCost / 50, 200)
  // standby and usage matter but are secondary to cost
  const standbyScore = appliance.standby ? Math.min(appliance.standbyHours * 0.5, 20) : 0
  const usageScore = Math.min(appliance.dailyHours * 1.2, 40)

  return Math.round(costScore + standbyScore + usageScore)
}
