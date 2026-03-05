import { CostsConfigTable } from '@/components/costs/CostsConfigTable'

export default function CostsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">
          M, I, DOC, Other COGS, Overhead
        </h1>
        <p className="text-gray-400 mt-1">
          Configure maintenance, insurance, DOC, other COGS, and overhead cost
          assumptions
        </p>
      </div>
      <CostsConfigTable />
    </div>
  )
}
