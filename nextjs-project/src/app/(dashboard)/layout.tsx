import { Sidebar } from '@/components/sidebar/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Defense-in-depth: verify session in layout, not just middleware
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
