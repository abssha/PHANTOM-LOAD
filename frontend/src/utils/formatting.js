export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatKwh(kwh) {
  return `${Number(kwh).toFixed(1)} kWh`
}

export function formatCO2(kg) {
  return `${Number(kg).toFixed(1)} kg`
}

export function formatNum(num, decimals = 1) {
  return Number(num).toFixed(decimals)
}
