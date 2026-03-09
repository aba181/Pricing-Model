import { SensitivityView } from '@/components/sensitivity/SensitivityView'

export default function SensitivityPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-100">
        Sensitivity Analysis
      </h1>
      <SensitivityView />
    </div>
  )
}
