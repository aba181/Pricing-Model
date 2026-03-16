'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_BASE = process.env.API_URL ?? 'http://localhost:8000'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ username: email, password }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ detail: 'Login failed' }))
    return { error: data.detail as string }
  }

  // Forward the Set-Cookie from FastAPI to the browser
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const cookieStore = await cookies()
    // Parse the access_token value from the Set-Cookie header
    const tokenMatch = setCookie.match(/access_token=([^;]+)/)
    if (tokenMatch) {
      cookieStore.set('access_token', tokenMatch[1], {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600, // 7 days
        path: '/',
      })
    }
  }

  redirect('/dashboard')
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  redirect('/login')
}
