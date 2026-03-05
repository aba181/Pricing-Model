import { cookies } from 'next/headers'
import { CrewConfigTable } from '@/components/crew/CrewConfigTable'
import type { CrewConfigData } from '@/app/actions/pricing'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

async function getCrewConfigs(): Promise<CrewConfigData[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return []

  try {
    const res = await fetch(`${API_URL}/pricing/crew-config`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

async function getIsAdmin(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return false

  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const user = await res.json()
    return user.is_admin === true
  } catch {
    return false
  }
}

export default async function CrewPage() {
  const [crewConfigs, isAdmin] = await Promise.all([
    getCrewConfigs(),
    getIsAdmin(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">
          Crew Cost Assumptions
        </h1>
        <p className="text-gray-400 mt-1">
          Crew salary, per diem, and training parameters by aircraft type
        </p>
      </div>
      <CrewConfigTable crewConfigs={crewConfigs} isAdmin={isAdmin} />
    </div>
  )
}
