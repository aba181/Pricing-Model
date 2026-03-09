'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { usePricingStore } from '@/stores/pricing-store'
import { useCrewConfigStore } from '@/stores/crew-config-store'
import { useCostsConfigStore } from '@/stores/costs-config-store'
import { StatusBadge } from '@/components/quotes/StatusBadge'
import type { QuoteDetailResponse } from '@/app/actions/quotes'
import type { MsnInput, MsnPnlResult, ComponentBreakdown } from '@/stores/pricing-store'

interface QuoteDetailClientProps {
  quote: QuoteDetailResponse
}

export function QuoteDetailClient({ quote }: QuoteDetailClientProps) {
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Populate all 3 stores from the quote snapshot data
    const dashboardState = (quote.dashboard_state ?? {}) as Record<string, string>

    // Reconstruct msnInputs from quote_msn_snapshots
    const msnInputs: MsnInput[] = (quote.quote_msn_snapshots ?? []).map((snap) => {
      const input = snap.msn_input as Record<string, unknown>
      return {
        id: input.id as number | undefined,
        aircraftId: (input.aircraftId as number) ?? snap.aircraft_id,
        msn: (input.msn as number) ?? snap.msn,
        aircraftType: (input.aircraftType as string) ?? snap.aircraft_type,
        registration: (input.registration as string | null) ?? null,
        mgh: String(input.mgh ?? '350'),
        cycleRatio: String(input.cycleRatio ?? '1.0'),
        environment: (input.environment as 'benign' | 'hot') ?? 'benign',
        periodStart: (input.periodStart as string) ?? '',
        periodEnd: (input.periodEnd as string) ?? '',
        leaseType: (input.leaseType as 'wet' | 'damp' | 'moist') ?? 'wet',
        crewSets: (input.crewSets as number) ?? 4,
        acmiRate: String(input.acmiRate ?? '0'),
        excessBh: String(input.excessBh ?? '0'),
        excessHourRate: String(input.excessHourRate ?? '0'),
        bhFhRatio: String(input.bhFhRatio ?? '1.2'),
        apuFhRatio: String(input.apuFhRatio ?? '1.1'),
        leaseRentEur: String(input.leaseRentEur ?? '0'),
        sixYearCheckEur: String(input.sixYearCheckEur ?? '0'),
        twelveYearCheckEur: String(input.twelveYearCheckEur ?? '0'),
        ldgEur: String(input.ldgEur ?? '0'),
        apuRateUsd: String(input.apuRateUsd ?? '0'),
        llp1RateUsd: String(input.llp1RateUsd ?? '0'),
        llp2RateUsd: String(input.llp2RateUsd ?? '0'),
        eprMatrix: (input.eprMatrix as Array<{ cycleRatio: number; benignRate: number; hotRate: number }>) ?? [],
      }
    })

    // Reconstruct msnResults from quote_msn_snapshots
    const msnResults: MsnPnlResult[] = (quote.quote_msn_snapshots ?? []).map((snap) => {
      const bd = snap.breakdown as Record<string, string>
      const mp = snap.monthly_pnl as Record<string, string>
      return {
        msn: snap.msn,
        aircraftType: snap.aircraft_type,
        breakdown: {
          aircraftEurPerBh: bd.aircraftEurPerBh ?? '0',
          crewEurPerBh: bd.crewEurPerBh ?? '0',
          maintenanceEurPerBh: bd.maintenanceEurPerBh ?? '0',
          insuranceEurPerBh: bd.insuranceEurPerBh ?? '0',
          docEurPerBh: bd.docEurPerBh ?? '0',
          otherCogsEurPerBh: bd.otherCogsEurPerBh ?? '0',
          overheadEurPerBh: bd.overheadEurPerBh ?? '0',
          totalCostPerBh: bd.totalCostPerBh ?? '0',
          revenuePerBh: bd.revenuePerBh ?? '0',
          marginPercent: bd.marginPercent ?? '0',
          finalRatePerBh: bd.finalRatePerBh ?? '0',
        },
        monthlyCost: mp.monthlyCost ?? '0',
        monthlyRevenue: mp.monthlyRevenue ?? '0',
        monthlyPnl: mp.monthlyPnl ?? '0',
      }
    })

    // Compute totalResult from individual msn results
    let totalResult: ComponentBreakdown | null = null
    if (msnResults.length > 0) {
      const sum = (field: keyof ComponentBreakdown) =>
        msnResults
          .reduce((acc, r) => acc + parseFloat(r.breakdown[field] || '0'), 0)
          .toFixed(2)
      const avg = (field: keyof ComponentBreakdown) =>
        (
          msnResults.reduce((acc, r) => acc + parseFloat(r.breakdown[field] || '0'), 0) /
          msnResults.length
        ).toFixed(2)

      totalResult = {
        aircraftEurPerBh: avg('aircraftEurPerBh'),
        crewEurPerBh: avg('crewEurPerBh'),
        maintenanceEurPerBh: avg('maintenanceEurPerBh'),
        insuranceEurPerBh: avg('insuranceEurPerBh'),
        docEurPerBh: avg('docEurPerBh'),
        otherCogsEurPerBh: avg('otherCogsEurPerBh'),
        overheadEurPerBh: avg('overheadEurPerBh'),
        totalCostPerBh: avg('totalCostPerBh'),
        revenuePerBh: avg('revenuePerBh'),
        marginPercent: dashboardState.marginPercent ?? '0',
        finalRatePerBh: avg('finalRatePerBh'),
      }
    }

    // Load into pricing store
    usePricingStore.getState().loadFromQuote({
      dashboardState: {
        projectName: dashboardState.projectName,
        exchangeRate: dashboardState.exchangeRate ?? quote.exchange_rate,
        marginPercent: dashboardState.marginPercent ?? quote.margin_percent,
        bhFhRatio: dashboardState.bhFhRatio,
        apuFhRatio: dashboardState.apuFhRatio,
      },
      msnInputs,
      msnResults,
      totalResult,
    })

    // Load crew config snapshot
    const crewSnap = quote.crew_config_snapshot as Record<string, unknown> | null
    if (crewSnap && Object.keys(crewSnap).length > 0) {
      useCrewConfigStore.getState().loadFromSnapshot({
        payroll: crewSnap.payroll as Array<{ position: string; grossSalary: number; benefits: number; perDiemFD: number; perDiemNFD: number; perBhPerdiem: number }>,
        otherCost: crewSnap.otherCost as Array<{ item: string; amount: number | null }>,
        training: crewSnap.training as Array<{ item: string; amount: number | null }>,
        averageAC: crewSnap.averageAC as number,
        fdDays: crewSnap.fdDays as number,
        nfdDays: crewSnap.nfdDays as number,
      })
    }

    // Load costs config snapshot
    const costsSnap = quote.costs_config_snapshot as Record<string, unknown> | null
    if (costsSnap && Object.keys(costsSnap).length > 0) {
      useCostsConfigStore.getState().loadFromSnapshot({
        maintPersonnel: costsSnap.maintPersonnel as Array<{ name: string; engineers: number; perDiem: number; days: number }>,
        maintCosts: costsSnap.maintCosts as Array<{ name: string; perMonthPerAc: number; mapping: string }>,
        insurance: costsSnap.insurance as Array<{ msn: number; priceUsd: number }>,
        doc: costsSnap.doc as Array<{ name: string; total: number; mapping: string }>,
        otherCogs: costsSnap.otherCogs as Array<{ name: string; perMonth: number; mapping: string; hasTotal?: boolean; total?: number }>,
        overhead: costsSnap.overhead as Array<{ name: string; total: number; mapping: string }>,
        avgAc: costsSnap.avgAc as number,
      })
    }

    setLoaded(true)
  }, [quote])

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const dashState = quote.dashboard_state as Record<string, string> | null

  return (
    <div className="space-y-6">
      {/* Quote header */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-semibold text-gray-100">
                {quote.quote_number}
              </h1>
              <StatusBadge status={quote.status} />
            </div>
            <p className="text-gray-300">{quote.client_name}</p>
            <p className="text-xs text-gray-500 mt-1">
              Created {formatDate(quote.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/quotes')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft size={14} />
              Back to Quotes
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
            >
              <ExternalLink size={14} />
              Fork and Edit on Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Fork info banner */}
      <div className="bg-indigo-900/50 border border-indigo-700 rounded-lg p-3 text-sm text-indigo-200">
        You are viewing a saved quote. Any changes will create a new quote when
        saved (fork behavior). Click &quot;Fork and Edit on Dashboard&quot; to modify
        this quote as a new working copy.
      </div>

      {/* Key metrics summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Exchange Rate (USD/EUR)</p>
          <p className="text-lg font-semibold text-gray-100 font-mono">
            {dashState?.exchangeRate ?? quote.exchange_rate}
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Margin</p>
          <p className="text-lg font-semibold text-gray-100 font-mono">
            {dashState?.marginPercent ?? quote.margin_percent}%
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <p className="text-xs text-gray-400 mb-1">Aircraft (MSNs)</p>
          <p className="text-lg font-semibold text-gray-100">
            {quote.msn_list?.length ?? 0}
          </p>
        </div>
      </div>

      {/* MSN breakdown */}
      {loaded && quote.quote_msn_snapshots && quote.quote_msn_snapshots.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-100">
              MSN Breakdown
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-2 font-medium">MSN</th>
                <th className="text-left px-4 py-2 font-medium">Type</th>
                <th className="text-right px-4 py-2 font-medium">Cost/BH</th>
                <th className="text-right px-4 py-2 font-medium">Final Rate/BH</th>
                <th className="text-right px-4 py-2 font-medium">Monthly P&amp;L</th>
              </tr>
            </thead>
            <tbody>
              {quote.quote_msn_snapshots.map((snap) => {
                const bd = snap.breakdown as Record<string, string>
                const mp = snap.monthly_pnl as Record<string, string>
                return (
                  <tr
                    key={snap.id}
                    className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50"
                  >
                    <td className="px-4 py-2 text-gray-200 font-medium">
                      {snap.msn}
                    </td>
                    <td className="px-4 py-2 text-gray-300">
                      {snap.aircraft_type}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-200 font-mono">
                      {parseFloat(bd.totalCostPerBh ?? '0').toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right text-indigo-300 font-mono font-medium">
                      {parseFloat(bd.finalRatePerBh ?? '0').toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      <span
                        className={
                          parseFloat(mp.monthlyPnl ?? '0') >= 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        }
                      >
                        {parseFloat(mp.monthlyPnl ?? '0').toFixed(2)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Navigation hint */}
      <div className="text-xs text-gray-500">
        Stores are loaded with this quote&apos;s data. Navigate to{' '}
        <Link href="/pnl" className="text-indigo-400 hover:text-indigo-300">
          P&amp;L
        </Link>
        ,{' '}
        <Link href="/crew" className="text-indigo-400 hover:text-indigo-300">
          Crew
        </Link>
        , or{' '}
        <Link href="/costs" className="text-indigo-400 hover:text-indigo-300">
          Costs
        </Link>{' '}
        to see full details from this quote.
      </div>
    </div>
  )
}
