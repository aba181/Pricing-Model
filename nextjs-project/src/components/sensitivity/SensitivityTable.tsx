'use client'

import type { DataPoint } from './SensitivityChart'

interface SensitivityTableProps {
  data: DataPoint[]
  paramLabel: string
  paramUnit: string
}

export function SensitivityTable({ data, paramLabel, paramUnit }: SensitivityTableProps) {
  const basePoint = data.find((d) => d.label === 'Base')
  const baseEur = basePoint?.eurPerBh ?? 0

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-4">
        Comparison Table
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2 px-3 text-gray-400 font-medium">Step</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">
                {paramLabel}{paramUnit ? ` (${paramUnit})` : ''}
              </th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">EUR/BH Rate</th>
              <th className="text-right py-2 px-3 text-gray-400 font-medium">Change from Base</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => {
              const diff = point.eurPerBh - baseEur
              const pctDiff = baseEur !== 0 ? (diff / baseEur) * 100 : 0
              const isBase = point.label === 'Base'
              // Negative diff means cheaper (green), positive means more expensive (red)
              const changeColor =
                diff < 0 ? 'text-green-400' : diff > 0 ? 'text-red-400' : 'text-gray-400'

              return (
                <tr
                  key={point.label}
                  className={`border-b border-gray-800 ${isBase ? 'bg-gray-800' : ''}`}
                >
                  <td className="py-2 px-3 text-gray-100 font-medium">{point.label}</td>
                  <td className="py-2 px-3 text-right text-gray-300">
                    {point.paramValue.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-100">
                    {'\u20AC'}{point.eurPerBh.toFixed(2)}
                  </td>
                  <td className={`py-2 px-3 text-right ${changeColor}`}>
                    {isBase ? (
                      '\u2014'
                    ) : (
                      <>
                        {diff >= 0 ? '+' : ''}{'\u20AC'}{diff.toFixed(2)} ({pctDiff >= 0 ? '+' : ''}
                        {pctDiff.toFixed(1)}%)
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
