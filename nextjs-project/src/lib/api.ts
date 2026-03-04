const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',  // ALWAYS include -- needed for httpOnly cookie
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(data.detail ?? 'Request failed')
  }
  return res.json() as Promise<T>
}
