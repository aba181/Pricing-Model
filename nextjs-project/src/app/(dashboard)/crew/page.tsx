import { CrewConfigTable } from '@/components/crew/CrewConfigTable'

export default function CrewPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">
          Crew Cost Assumptions
        </h1>
        <p className="text-gray-400 mt-1">
          Payroll, other costs, training, and per diem parameters
        </p>
      </div>
      <CrewConfigTable />
    </div>
  )
}
