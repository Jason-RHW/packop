const MM_PER_IN = 25.4

export function lengthSuffix(units) {
  return units === 'imperial' ? 'in' : 'mm'
}

// Round for display only -- stored form/report values always stay in mm.
export function mmToDisplay(mm, units) {
  if (mm === '' || mm == null || Number.isNaN(mm)) return mm
  if (units === 'imperial') {
    return Math.round((mm / MM_PER_IN) * 100) / 100
  }
  return Math.round(mm * 10) / 10
}

export function displayToMm(value, units) {
  if (value === '' || value == null || Number.isNaN(value)) return value
  if (units === 'imperial') {
    return Math.round(value * MM_PER_IN * 100) / 100
  }
  return value
}

// For read-only report numbers -- formats straight to a string with the right suffix.
export function formatLength(mm, units) {
  const v = mmToDisplay(mm, units)
  return `${v}`
}
