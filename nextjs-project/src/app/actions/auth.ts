'use server'
import { redirect } from 'next/navigation'

const API_BASE = process.env.API_URL ?? 'http://localhost:8000'

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
    credentials: 'include',
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Login failed' }))
    return { error: data.detail as string }
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })
  redirect('/login')
}
