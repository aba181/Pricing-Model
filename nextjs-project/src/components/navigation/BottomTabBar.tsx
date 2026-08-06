'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  FileText,
  Settings,
  MoreHorizontal,
  Plane,
  Users,
  DollarSign,
  Calculator,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const primaryTabs = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calculation', label: 'Pricing', icon: Calculator },
  { href: '/quotes', label: 'Quotes', icon: FileText },
  { href: '/admin', label: 'Admin', icon: Settings },
]

const moreItems = [
  { href: '/pnl', label: 'P&L', icon: TrendingUp },
  { href: '/aircraft', label: 'Aircraft', icon: Plane },
  { href: '/crew', label: 'Crew', icon: Users },
  { href: '/costs', label: 'Costs', icon: DollarSign },
]

const viewerAllowedHrefs = new Set(['/dashboard', '/calculation', '/quotes'])

interface BottomTabBarProps {
  userRole: string
}

export function BottomTabBar({ userRole }: BottomTabBarProps) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const isViewer = userRole === 'viewer'
  // Admin tab is admin-only; users have all other rights.
  const adminOk = (href: string) => href !== '/admin' || userRole === 'admin'

  const visibleTabs = (isViewer
    ? primaryTabs.filter((t) => viewerAllowedHrefs.has(t.href))
    : primaryTabs
  ).filter((t) => adminOk(t.href))

  const visibleMoreItems = (isViewer
    ? moreItems.filter((t) => viewerAllowedHrefs.has(t.href))
    : moreItems
  ).filter((t) => adminOk(t.href))

  const showMore = !isViewer // viewers have no "more" items

  const isMoreActive = moreItems.some((item) => pathname.startsWith(item.href))

  return (
    <>
      {/* Backdrop */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More sheet — anchored above the in-flow bar (56px + safe area) */}
      {moreOpen && (
        <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] left-0 right-0 z-50 lg:hidden">
          <div
            className="mx-2 mb-1 rounded-xl p-4"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                More
              </span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Close menu"
                className="grid place-items-center w-11 h-11 -m-2 rounded-md touch-manip"
                style={{ color: 'var(--muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {visibleMoreItems.map(({ href, label, icon: Icon }) => {
                const isActive = pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg touch-manip transition-colors"
                    style={{
                      color: isActive ? 'var(--cyan-ink)' : 'var(--ink-2)',
                      background: isActive ? 'var(--cyan-soft)' : 'transparent',
                    }}
                  >
                    <Icon size={18} className="shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </Link>
                )
              })}
            </div>
            <div
              className="mt-3 pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--line)' }}
            >
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                Theme
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}

      {/* Tab bar — in-flow flex child below <main>, NOT position:fixed: the
          shell lays it out as a sibling so main's scroll area ends above the
          bar instead of extending under it. safe-pb covers the home indicator. */}
      <nav
        className="lg:hidden z-50 shrink-0 safe-pb"
        aria-label="Main navigation"
        style={{ background: 'var(--card)', borderTop: '1px solid var(--line)' }}
      >
        <div className="flex items-stretch justify-around h-14">
          {visibleTabs.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center flex-1 h-full min-w-11 touch-manip transition-colors"
                style={{ color: isActive ? 'var(--cyan-ink)' : 'var(--muted)' }}
              >
                {/* 2px top accent indicator — dual cue alongside the color change */}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-[20%] right-[20%] h-0.5 rounded-full"
                    style={{ background: 'var(--cyan)' }}
                  />
                )}
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {label}
                </span>
              </Link>
            )
          })}
          {showMore && (
            <button
              onClick={() => setMoreOpen((prev) => !prev)}
              aria-label="More pages"
              className="relative flex flex-col items-center justify-center flex-1 h-full min-w-11 touch-manip transition-colors"
              style={{
                color: isMoreActive || moreOpen ? 'var(--cyan-ink)' : 'var(--muted)',
              }}
            >
              {(isMoreActive || moreOpen) && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-[20%] right-[20%] h-0.5 rounded-full"
                  style={{ background: 'var(--cyan)' }}
                />
              )}
              <MoreHorizontal size={20} strokeWidth={isMoreActive || moreOpen ? 2 : 1.5} />
              <span
                className={`text-[10px] mt-0.5 ${isMoreActive || moreOpen ? 'font-semibold' : 'font-medium'}`}
              >
                More
              </span>
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
