'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { listQuotesAction, updateQuoteStatusAction } from '@/app/actions/quotes'
import type { QuoteListItem } from '@/app/actions/quotes'

interface QuoteListProps {
  initialQuotes: { items: QuoteListItem[]; total: number }
}

const STATUSES = ['draft', 'sent', 'accepted', 'rejected']

export function QuoteList({ initialQuotes }: QuoteListProps) {
  const [quotes, setQuotes] = useState(initialQuotes.items)
  const [total, setTotal] = useState(initialQuotes.total)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [statusError, setStatusError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchQuotes = useCallback(async (searchVal: string, statusVal: string) => {
    const params: { search?: string; status?: string; limit?: number } = { limit: 50 }
    if (searchVal.trim()) params.search = searchVal.trim()
    if (statusVal) params.status = statusVal

    const result = await listQuotesAction(params)
    if (!('error' in result)) {
      setQuotes(result.items)
      setTotal(result.total)
    }
  }, [])

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchQuotes(val, statusFilter)
    }, 300)
  }

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val)
    fetchQuotes(search, val)
  }

  const handleStatusUpdate = async (quoteId: number, newStatus: string) => {
    setStatusError(null)
    const result = await updateQuoteStatusAction(quoteId, newStatus)
    if ('error' in result) {
      setStatusError(result.error)
      return
    }
    // Update local state
    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: newStatus } : q))
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search quotes..."
            className="w-full bg-gray-800 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-100 focus:border-indigo-400 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Status error toast */}
      {statusError && (
        <div className="bg-red-900/50 border border-red-700 rounded-md p-2 text-sm text-red-200">
          {statusError}
        </div>
      )}

      {/* Table */}
      {quotes.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">
            No quotes found. Create a pricing calculation on the Dashboard and
            save it as a quote.
          </p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="text-left px-4 py-3 font-medium">Quote #</th>
                <th className="text-left px-4 py-3 font-medium">Client</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Rate</th>
                <th className="text-left px-4 py-3 font-medium">MSNs</th>
                <th className="text-left px-4 py-3 font-medium">Created</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr
                  key={q.id}
                  className="border-b border-gray-800 last:border-b-0 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/quotes/${q.id}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{q.client_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-200 font-mono">
                    {q.exchange_rate ? `${parseFloat(q.exchange_rate).toFixed(4)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {q.msn_list?.length
                      ? q.msn_list.join(', ')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {formatDate(q.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={q.status}
                      onChange={(e) => handleStatusUpdate(q.id, e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 focus:border-indigo-400 focus:outline-none"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer with total */}
          <div className="px-4 py-2 border-t border-gray-800 text-xs text-gray-500">
            Showing {quotes.length} of {total} quotes
          </div>
        </div>
      )}
    </div>
  )
}
