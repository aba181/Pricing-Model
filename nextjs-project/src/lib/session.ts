import 'server-only'
import { cookies } from 'next/headers'

export async function getSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  return token ? { token } : null
}
