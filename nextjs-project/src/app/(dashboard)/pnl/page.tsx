import { PnlView } from '@/components/pricing/PnlView'

export default function PnlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-100">P&L Statement</h1>
        <p className="text-gray-400 mt-1">
          Financial statement per MSN or total project
        </p>
      </div>
      <PnlView />
    </div>
  )
}
