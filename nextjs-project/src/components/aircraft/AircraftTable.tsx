'use client'

import { useState } from 'react'
import Link from 'next/link'

export interface Aircraft {
  id: number
  msn: number
  aircraft_type: string
  registration: string | null
  lease_rent_usd: string
  six_year_check_usd: string
  twelve_year_check_usd: string
  ldg_usd: string
  lease_rent_eur: string
  six_year_check_eur: string
  twelve_year_check_eur: string
  ldg_eur: string
}

function formatRate(value: string | number | null): string {
  if (value === null || value === undefined) return '-'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '-'
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function AircraftTable({ aircraft }: { aircraft: Aircraft[] }) {
  const [searchQuery, setSearchQuery] = useState('')

  const filtered = aircraft.filter((a) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const msnMatch = a.msn.toString().includes(q)
    const regMatch = a.registration?.toLowerCase().includes(q) ?? false
    return msnMatch || regMatch
  })

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div>
        <input
          type="text"
          placeholder="Search by MSN or registration..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left px-4 py-3 text-gray-100 font-semibold">MSN</th>
              <th className="text-left px-4 py-3 text-gray-100 font-semibold">Type</th>
              <th className="text-left px-4 py-3 text-gray-100 font-semibold">Registration</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">Lease Rent (USD)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">Lease Rent (EUR)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">6Y Check (USD)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">6Y Check (EUR)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">12Y Check (USD)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">12Y Check (EUR)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">LDG (USD)</th>
              <th className="text-right px-4 py-3 text-gray-100 font-semibold">LDG (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                  No aircraft found
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="border-b border-gray-800/50 hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/aircraft/${a.msn}`}
                      className="text-blue-400 hover:text-blue-300 font-medium"
                    >
                      {a.msn}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{a.aircraft_type}</td>
                  <td className="px-4 py-3 text-gray-300">{a.registration ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.lease_rent_usd)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.lease_rent_eur)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.six_year_check_usd)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.six_year_check_eur)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.twelve_year_check_usd)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.twelve_year_check_eur)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.ldg_usd)}</td>
                  <td className="px-4 py-3 text-gray-300 text-right">{formatRate(a.ldg_eur)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
