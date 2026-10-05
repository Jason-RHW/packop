const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8010'

export async function optimize(payload) {
  const res = await fetch(`${API_URL}/api/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    const detail = Array.isArray(data.detail)
      ? data.detail.map((d) => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`).join('; ')
      : data.detail
    throw new Error(detail || 'Optimization failed')
  }
  return data
}
