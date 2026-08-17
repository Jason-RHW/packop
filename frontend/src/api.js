const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010'

export async function optimize(payload) {
  const res = await fetch(`${API_URL}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || 'Optimization failed')
  }
  return data
}
