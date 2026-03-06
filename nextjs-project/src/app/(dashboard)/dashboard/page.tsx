import { cookies } from 'next/headers'
import { DashboardSummary } from '@/components/pricing/DashboardSummary'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

interface EprMatrixRowApi {
  cycle_ratio: string
  benign_rate: string
  hot_rate: string
}

interface AircraftOption {
  id: number
  msn: number
  aircraft_type: string
  registration: string | null
  lease_rent_eur: string | null
  six_year_check_eur: string | null
  twelve_year_check_eur: string | null
  ldg_eur: string | null
  apu_rate_usd: string | null
  llp1_rate_usd: string | null
  llp2_rate_usd: string | null
  epr_matrix: EprMatrixRowApi[]
}

async function getAircraftList(): Promise<AircraftOption[]> {
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

export default async function DashboardPage() {
  const aircraftList = await getAircraftList()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Configure MSN inputs and view pricing summary
        </p>
      </div>
      <DashboardSummary aircraftList={aircraftList} />
    </div>
  )
}
