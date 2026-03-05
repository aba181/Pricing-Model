export interface EprMatrixRow {
  cycle_ratio: string
  benign_rate: string
  hot_rate: string
}

function formatValue(value: string | null): string {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatRatio(value: string | null): string {
  if (value === null || value === undefined) return '-'
  const num = parseFloat(value)
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}

export function EprMatrixTable({ eprMatrix }: { eprMatrix: EprMatrixRow[] }) {
  if (!eprMatrix || eprMatrix.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-3">EPR Matrix</h3>
        <p className="text-gray-500 text-sm">No EPR matrix data available</p>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-100 mb-3">EPR Matrix</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-2 text-gray-100 font-semibold">Cycle Ratio</th>
              <th className="text-right px-4 py-2 text-gray-100 font-semibold">Benign Rate</th>
              <th className="text-right px-4 py-2 text-gray-100 font-semibold">Hot Rate</th>
            </tr>
          </thead>
          <tbody>
            {eprMatrix.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-4 py-2 text-gray-300">{formatRatio(row.cycle_ratio)}</td>
                <td className="px-4 py-2 text-gray-300 text-right">{formatValue(row.benign_rate)}</td>
                <td className="px-4 py-2 text-gray-300 text-right">{formatValue(row.hot_rate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
