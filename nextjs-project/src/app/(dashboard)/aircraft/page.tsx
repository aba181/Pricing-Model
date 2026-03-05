import { cookies } from 'next/headers'
import { AircraftTable } from '@/components/aircraft/AircraftTable'
import type { Aircraft } from '@/components/aircraft/AircraftTable'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

async function getAircraft(): Promise<Aircraft[]> {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  if (!token) return []

  try {
    const res = await fetch(`${API_URL}/aircraft`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function AircraftPage() {
  const aircraft = await getAircraft()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Aircraft Fleet</h1>
        <p className="text-gray-400 mt-1">
          Manage aircraft master data and cost parameters
        </p>
      </div>
      <AircraftTable aircraft={aircraft} />
    </div>
  )
}
