import { cookies } from 'next/headers'
import { PnlWorkspace } from '@/components/pricing/PnlWorkspace'
import type { QuoteListItem } from '@/app/actions/quotes'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

async function getQuotes(token: string): Promise<QuoteListItem[]> {
  try {
    const res = await fetch(`${API_URL}/quotes/?limit=100`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data: { items: QuoteListItem[] } = await res.json()
    return data.items
  } catch {
    return []
  }
}

export default async function PnlPage({
  searchParams,
}: {
  searchParams: Promise<{ quote?: string }>
}) {
  const { quote } = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value
  const quotes = token ? await getQuotes(token) : []
  const initialQuoteId = quote && /^\d+$/.test(quote) ? Number(quote) : null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="av-page-title">Profit &amp; Loss</h1>
        <p className="av-page-sub">
          Monthly financial statement for any quoted project, per MSN or total
        </p>
      </div>
      <PnlWorkspace quotes={quotes} initialQuoteId={initialQuoteId} />
    </div>
  )
}
