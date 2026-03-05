'use client'

import { useState } from 'react'
import { updateCrewConfigAction } from '@/app/actions/pricing'
import type { CrewConfigData } from '@/app/actions/pricing'

interface CrewConfigTableProps {
  crewConfigs: CrewConfigData[]
  isAdmin: boolean
}

const CREW_COMPOSITION: Record<string, Record<string, string>> = {
  A320: {
    wet: '2 Pilots + 1 Senior + 3 Regular',
    damp: '2 Pilots only',
    moist: '2 Pilots + 1 Senior',
  },
  A321: {
    wet: '2 Pilots + 1 Senior + 4 Regular',
    damp: '2 Pilots only',
    moist: '2 Pilots + 1 Senior',
  },
}

const PARAM_LABELS: Record<string, string> = {
  pilot_salary_monthly: 'Pilot Salary (monthly EUR)',
  senior_attendant_salary_monthly: 'Senior Attendant Salary (monthly EUR)',
  regular_attendant_salary_monthly: 'Regular Attendant Salary (monthly EUR)',
  per_diem_rate: 'Per Diem Rate (EUR/day)',
  accommodation_monthly_budget: 'Accommodation Budget (monthly EUR)',
  training_total_budget: 'Training Budget (total EUR)',
  uniform_total_budget: 'Uniform Budget (total EUR)',
}

const PARAM_KEYS = Object.keys(PARAM_LABELS) as Array<keyof typeof PARAM_LABELS>

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function CrewCard({
  config,
  isAdmin,
}: {
  config: CrewConfigData
  isAdmin: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  const startEdit = () => {
    const values: Record<string, string> = {}
    for (const key of PARAM_KEYS) {
      values[key] = (config as unknown as Record<string, string>)[key] ?? ''
    }
    setEditValues(values)
    setEditing(true)
    setError(null)
  }

  const cancelEdit = () => {
    setEditing(false)
    setError(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    const formData = new FormData()
    formData.set('aircraft_type', config.aircraft_type)
    for (const key of PARAM_KEYS) {
      if (editValues[key] !== undefined && editValues[key] !== '') {
        formData.set(key, editValues[key])
      }
    }

    const result = await updateCrewConfigAction(formData)
    setSaving(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    // Update succeeded -- update the displayed values from the returned config
    // In a real app we'd revalidate. For now, update local state.
    for (const key of PARAM_KEYS) {
      const val = (result as unknown as Record<string, string>)[key]
      if (val !== undefined) {
        ;(config as unknown as Record<string, string>)[key] = val
      }
    }
    setEditing(false)
  }

  const composition = CREW_COMPOSITION[config.aircraft_type]

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      {/* Card Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gray-100">
            {config.aircraft_type}
          </span>
          <span className="text-xs text-gray-500">v{config.version}</span>
        </div>
        {isAdmin && !editing && (
          <button
            onClick={startEdit}
            className="px-3 py-1 text-sm font-medium text-indigo-400 border border-indigo-400/30 rounded-md hover:bg-indigo-400/10 transition-colors"
          >
            Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              disabled={saving}
              className="px-3 py-1 text-sm font-medium text-gray-400 border border-gray-600 rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Parameters Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="text-left px-4 py-2 text-gray-400 font-medium">
              Parameter
            </th>
            <th className="text-right px-4 py-2 text-gray-400 font-medium">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {PARAM_KEYS.map((key) => {
            const rawValue = (config as unknown as Record<string, string>)[key]
            return (
              <tr key={key} className="border-b border-gray-800/50">
                <td className="px-4 py-2 text-gray-300">{PARAM_LABELS[key]}</td>
                <td className="px-4 py-2 text-right">
                  {editing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editValues[key] ?? ''}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-32 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 text-right focus:border-indigo-400 focus:outline-none"
                    />
                  ) : (
                    <span className="font-mono text-gray-100">
                      {formatValue(rawValue)}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Crew Composition Reference */}
      {composition && (
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-900/50">
          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
            Crew Composition
          </p>
          <div className="space-y-1">
            {Object.entries(composition).map(([type, desc]) => (
              <div key={type} className="flex justify-between text-xs">
                <span className="text-gray-400 capitalize">{type} Lease:</span>
                <span className="text-gray-300">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CrewConfigTable({ crewConfigs, isAdmin }: CrewConfigTableProps) {
  const a320 = crewConfigs.find((c) => c.aircraft_type === 'A320')
  const a321 = crewConfigs.find((c) => c.aircraft_type === 'A321')

  if (!a320 && !a321) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">
          No crew configuration found. An admin needs to set up crew cost parameters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {a320 && <CrewCard config={a320} isAdmin={isAdmin} />}
      {a321 && <CrewCard config={a321} isAdmin={isAdmin} />}
    </div>
  )
}
