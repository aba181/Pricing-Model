'use client'

export interface SensitivityParam {
  key: string
  label: string
  unit: string
}

export const SENSITIVITY_PARAMS: SensitivityParam[] = [
  { key: 'mgh', label: 'Monthly Guaranteed Hours', unit: 'BH' },
  { key: 'exchangeRate', label: 'USD/EUR Exchange Rate', unit: '' },
  { key: 'marginPercent', label: 'Margin %', unit: '%' },
  { key: 'cycleRatio', label: 'Cycle Ratio', unit: '' },
  { key: 'crewSets', label: 'Crew Sets', unit: 'sets' },
]

interface ParameterPickerProps {
  selected: string
  onChange: (key: string) => void
}

export function ParameterPicker({ selected, onChange }: ParameterPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <label htmlFor="sensitivity-param" className="text-sm font-medium text-gray-300">
        Parameter
      </label>
      <select
        id="sensitivity-param"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
      >
        {SENSITIVITY_PARAMS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  )
}
