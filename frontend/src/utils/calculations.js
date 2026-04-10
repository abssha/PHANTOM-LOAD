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
  const costScore = Math.min(cost(yearlyKwh(daily), ratePerUnit) / 50, 40)
  const standbyScore = appliance.standby ? Math.min(appliance.standbyHours * 2, 30) : 0
  const usageScore = Math.min(appliance.dailyHours * 2, 30)
  return Math.round(costScore + standbyScore + usageScore)
}
