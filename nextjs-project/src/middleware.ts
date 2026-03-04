import { NextRequest, NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/pricing', '/quotes', '/aircraft', '/admin']
const publicRoutes = ['/login']

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtected = protectedRoutes.some(r => path.startsWith(r))
  const isPublic = publicRoutes.includes(path)
  const token = req.cookies.get('access_token')?.value

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }
  if (isPublic && token) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
