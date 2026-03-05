'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

export interface UpdateRatesState {
  success?: boolean
  error?: string
}

export async function updateRatesAction(
  msn: number,
  prevState: UpdateRatesState,
  formData: FormData
): Promise<UpdateRatesState> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  if (!token) {
    return { error: 'Not authenticated' }
  }

  const body: Record<string, number> = {}
  for (const [key, value] of formData.entries()) {
    if (value && typeof value === 'string' && value.trim() !== '') {
      const num = Number(value)
      if (!isNaN(num)) {
        body[key] = num
      }
    }
  }

  if (Object.keys(body).length === 0) {
    return { error: 'No fields to update' }
  }

  try {
    const res = await fetch(`${API_URL}/aircraft/${msn}/rates`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `access_token=${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({ detail: 'Update failed' }))
      return { error: data.detail ?? 'Update failed' }
    }

    revalidatePath(`/aircraft/${msn}`)
    return { success: true }
  } catch {
    return { error: 'Network error — could not reach API' }
  }
}
