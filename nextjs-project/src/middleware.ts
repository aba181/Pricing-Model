import { NextRequest, NextResponse } from 'next/server'
import { sanitizeNext } from '@/lib/safe-next'

const protectedRoutes = ['/dashboard', '/calculation', '/pricing', '/quotes', '/aircraft', '/admin']
const publicRoutes = ['/login', '/api/auth/login/azure', '/api/auth/callback/azure']
const viewerAllowedRoutes = ['/dashboard', '/calculation', '/quotes']

function getRoleFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.role ?? null
  } catch {
    return null
  }
}

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtected = protectedRoutes.some(r => path.startsWith(r))
  const isPublic = publicRoutes.includes(path)
  const token = req.cookies.get('access_token')?.value

  if (isProtected && !token) {
    // Remember where they were headed so a shared deep link (e.g. /quotes/12)
    // survives the round-trip through Microsoft SSO instead of dumping the
    // recipient on the dashboard.
    const loginUrl = new URL('/login', req.nextUrl)
    loginUrl.searchParams.set('next', `${path}${req.nextUrl.search}`)
    return NextResponse.redirect(loginUrl)
  }
  if (isPublic && token) {
    // Already signed in — honour ?next= so a shared link still lands on target.
    const next = sanitizeNext(req.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next, req.nextUrl))
  }

  // Viewer role: restrict to Dashboard and Quotes only
  if (token && isProtected) {
    const role = getRoleFromToken(token)
    if (role === 'viewer') {
      const allowed = viewerAllowedRoutes.some(r => path.startsWith(r))
      if (!allowed) {
        return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
