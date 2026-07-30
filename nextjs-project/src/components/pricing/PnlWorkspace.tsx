'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getQuoteAction } from '@/app/actions/quotes'
import type { QuoteListItem, QuoteDetailResponse } from '@/app/actions/quotes'
import { reconstructEngineInputs, type QuoteEngineInputs } from '@/lib/quote-financials'
import { StatusBadge } from '@/components/quotes/StatusBadge'
import { PnlTable } from './PnlTable'
import { useCanViewCosts } from '@/providers/CostVisibilityProvider'

interface QuoteResult {
  id: number
  quote?: QuoteDetailResponse
  engine?: QuoteEngineInputs | null
  error?: string
}

/**
 * Standalone P&L: pick any saved quote from the dropdown and inspect its
 * monthly statement. Computes entirely from the quote's snapshots via
 * reconstructEngineInputs — the Pricing Workspace stores are never touched,
 * so whatever is loaded there stays untouched.
 */
export function PnlWorkspace({
  quotes,
  initialQuoteId,
}: {
  quotes: QuoteListItem[]
  initialQuoteId: number | null
}) {
  const router = useRouter()
  const canViewCosts = useCanViewCosts()
  const [selectedId, setSelectedId] = useState<number | null>(
    initialQuoteId ?? quotes[0]?.id ?? null,
  )
  // Result of the most recent fetch, keyed by quote id so loading state can be
  // derived (selected but not yet fetched = loading).
  const [result, setResult] = useState<QuoteResult | null>(null)
  // Scope: null = Total Project, otherwise a single MSN.
  const [scope, setScope] = useState<number | null>(null)

  const current = result && result.id === selectedId ? result : null
  const loading = selectedId !== null && current === null

  useEffect(() => {
    if (selectedId === null) return
    let cancelled = false
    getQuoteAction(selectedId).then((res) => {
      if (cancelled) return
      if ('error' in res) {
        setResult({ id: selectedId, error: res.error })
      } else {
        setResult({ id: selectedId, quote: res, engine: reconstructEngineInputs(res) })
      }
    })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  function handleSelect(value: string) {
    const id = Number(value)
    if (!id) return
    setSelectedId(id)
    setScope(null)
    router.replace(`/pnl?quote=${id}`, { scroll: false })
  }

  if (quotes.length === 0) {
    return (
      <div className="av-panel p-8 text-center">
        <p className="text-sm" style={{ color: 'var(--muted)' }}>
          No quotes yet. Save a quote from the Pricing Workspace to see its P&amp;L here.
        </p>
      </div>
    )
  }

  const quoteDetail = current?.quote ?? null
  const engine = current?.engine ?? null
  const error = current?.error ?? null
  const projectName = String(
    (quoteDetail?.dashboard_state as Record<string, unknown> | null)?.projectName ?? '',
  )

  return (
    <div className="space-y-4">
      {/* Quote picker */}
      <div className="av-panel">
        <div className="av-card-b flex flex-wrap items-center gap-3">
          <div className="av-nf" style={{ flex: '0 1 340px', minWidth: 240 }}>
            <label>Quoted project</label>
            <select
              className="av-input w-full"
              value={selectedId ?? ''}
              onChange={(e) => handleSelect(e.target.value)}
            >
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quote_number} — {q.client_name}
                </option>
              ))}
              {/* Deep-linked quote beyond the listed page still selectable */}
              {selectedId !== null && !quotes.some((q) => q.id === selectedId) && (
                <option value={selectedId}>
                  {quoteDetail
                    ? `${quoteDetail.quote_number} — ${quoteDetail.client_name}`
                    : `Quote #${selectedId}`}
                </option>
              )}
            </select>
          </div>
          {quoteDetail && (
            <div className="flex items-center gap-3 pt-3.5">
              <StatusBadge status={quoteDetail.status} />
              {projectName && (
                <span className="text-xs" style={{ color: 'var(--ink-2)' }}>{projectName}</span>
              )}
              <Link
                href={`/quotes/${quoteDetail.id}`}
                className="av-btn av-btn-ghost !h-[24px] !px-2.5 !py-0 !text-[11px]"
              >
                Open quote
              </Link>
            </div>
          )}
          <span className="ml-auto text-xs pt-3.5" style={{ color: 'var(--muted)' }}>
            Computed from the quote&apos;s saved snapshot — independent of the Pricing Workspace.
          </span>
        </div>
      </div>

      {loading && (
        <div className="av-panel p-8 text-center">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading quote…</p>
        </div>
      )}

      {!loading && error && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{ background: 'var(--neg-soft)', border: '1px solid var(--neg)', color: 'var(--neg)' }}
        >
          {error}
        </div>
      )}

      {!loading && !error && quoteDetail && !engine && (
        <div className="av-panel p-8 text-center">
          {canViewCosts ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {quoteDetail.quote_number} doesn&apos;t include the crew/costs snapshots needed to
              compute a P&amp;L.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="av-redacted" aria-label="Hidden — insufficient permission">
                ••••••••
              </span>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                The full P&amp;L cost breakdown is hidden — your account does not have
                permission to view naked costs and margins.
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && !error && engine && (
        <>
          {/* Scope tabs: Total Project + one per MSN on the quote */}
          <div className="av-ac-tabs">
            <button
              onClick={() => setScope(null)}
              className={`av-ac-tab ${scope === null ? 'active' : ''}`}
            >
              Total Project
            </button>
            {engine.msnInputs.map((input) => (
              <button
                key={input.msn}
                onClick={() => setScope(input.msn)}
                className={`av-ac-tab ${scope === input.msn ? 'active' : ''}`}
              >
                <span>MSN <span className="av-num">{input.msn}</span></span>
                {input.registration && <span className="ty">{input.registration}</span>}
              </button>
            ))}
          </div>

          <PnlTable
            source={{
              msnInputs: engine.msnInputs,
              crew: engine.crew,
              costs: engine.costs,
              exchangeRate: engine.exRate,
              selectedMsn: scope,
            }}
          />
        </>
      )}
    </div>
  )
}
