'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export interface DataPoint {
  label: string
  paramValue: number
  eurPerBh: number
}

interface SensitivityChartProps {
  data: DataPoint[]
  paramLabel: string
}

export function SensitivityChart({ data, paramLabel }: SensitivityChartProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-300 mb-4">
        EUR/BH Rate vs {paramLabel}
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="label"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            tickFormatter={(value: number) => `\u20AC${value.toFixed(2)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any) => [`\u20AC${Number(value).toFixed(2)}`, 'EUR/BH']}
            labelFormatter={(label) => `Step: ${String(label)}`}
          />
          <ReferenceLine x="Base" stroke="#6366F1" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="eurPerBh"
            stroke="#818CF8"
            strokeWidth={2}
            dot={{ fill: '#818CF8', r: 4 }}
            activeDot={{ r: 6, fill: '#A5B4FC' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
