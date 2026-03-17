import { cookies } from 'next/headers'
import { QuoteList } from '@/components/quotes/QuoteList'
import type { QuoteListItem } from '@/app/actions/quotes'

const API_URL = process.env.API_URL ?? 'http://localhost:8000'

async function getQuotes(
  token: string
): Promise<{ items: QuoteListItem[]; total: number }> {
  try {
    const res = await fetch(`${API_URL}/quotes/?limit=50`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return { items: [], total: 0 }
    return res.json()
  } catch {
    return { items: [], total: 0 }
  }
}

async function getIsAdmin(token: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, {
      headers: { Cookie: `access_token=${token}` },
      cache: 'no-store',
    })
    if (!res.ok) return false
    const user = await res.json()
    return user.role === 'admin'
  } catch {
    return false
  }
}

export default async function QuotesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('access_token')?.value

  const [initialQuotes, isAdmin] = token
    ? await Promise.all([getQuotes(token), getIsAdmin(token)])
    : [{ items: [], total: 0 }, false]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Quotes</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {initialQuotes.total > 0
            ? `${initialQuotes.total} saved quote${initialQuotes.total === 1 ? '' : 's'}`
            : 'No quotes yet'}
        </p>
      </div>
      <QuoteList initialQuotes={initialQuotes} isAdmin={isAdmin} />
    </div>
  )
}
