'use client'

import Link from 'next/link'
import { useQuoteHydration } from '@/components/quotes/hooks/useQuoteHydration'
import { QuoteHeader } from '@/components/quotes/QuoteHeader'
import { QuoteMetrics } from '@/components/quotes/QuoteMetrics'
import { QuoteMsnTable } from '@/components/quotes/QuoteMsnTable'
import type { QuoteDetailResponse } from '@/app/actions/quotes'

interface QuoteDetailClientProps {
  quote: QuoteDetailResponse
}

export function QuoteDetailClient({ quote }: QuoteDetailClientProps) {
  const { loaded, msnSummaries } = useQuoteHydration(quote)

  const dashState = quote.dashboard_state as Record<string, string> | null

  // Compute EBITDA margin from MSN summaries (D&A is 0 in the model, so netProfit ≈ EBITDA)
  const totals = msnSummaries.reduce(
    (acc, s) => ({
      totalRevenue: acc.totalRevenue + s.totalRevenue,
      netProfit: acc.netProfit + s.netProfit,
    }),
    { totalRevenue: 0, netProfit: 0 },
  )
  const ebitdaMargin = totals.totalRevenue > 0
    ? ((totals.netProfit / totals.totalRevenue) * 100).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      <QuoteHeader
        quoteNumber={quote.quote_number}
        clientName={quote.client_name}
        status={quote.status}
        createdAt={quote.created_at}
      />

      <QuoteMetrics
        exchangeRate={dashState?.exchangeRate ?? quote.exchange_rate}
        ebitdaMargin={ebitdaMargin}
        msnCount={quote.msn_list?.length ?? 0}
      />

      {loaded && quote.msn_snapshots && quote.msn_snapshots.length > 0 && (
        <QuoteMsnTable
          msnSnapshots={quote.msn_snapshots}
          msnSummaries={msnSummaries}
        />
      )}

      {/* Navigation hint */}
      <div className="text-xs text-gray-400 dark:text-gray-500">
        Stores are loaded with this quote&apos;s data. Navigate to{' '}
        <Link href="/pnl" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-600 dark:text-indigo-300">
          P&amp;L
        </Link>
        ,{' '}
        <Link href="/crew" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-600 dark:text-indigo-300">
          Crew
        </Link>
        , or{' '}
        <Link href="/costs" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-600 dark:text-indigo-300">
          Costs
        </Link>{' '}
        to see full details from this quote.
      </div>
    </div>
  )
}
