import { NextRequest, NextResponse } from 'next/server'

const TENANT_ID = process.env.AZURE_TENANT_ID!
const CLIENT_ID = process.env.AZURE_CLIENT_ID!
const CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET!
const REDIRECT_URI = process.env.AZURE_REDIRECT_URI!
const API_BASE = process.env.API_URL ?? 'http://localhost:8000'
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')
    const error = req.nextUrl.searchParams.get('error')

    if (error || !code) {
      const desc = req.nextUrl.searchParams.get('error_description') ?? 'Azure login failed'
      console.error('[azure-callback] Error:', error, desc)
      return NextResponse.redirect(new URL('/login?error=azure_failed', req.url))
    }

    // Exchange auth code for tokens
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
          scope: 'openid email profile',
        }),
      },
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[azure-callback] Token exchange failed:', err)
      return NextResponse.redirect(new URL('/login?error=token_failed', req.url))
    }

    const tokens = await tokenRes.json()

    // Decode the id_token to get user info (JWT payload is base64url)
    const payload = JSON.parse(
      Buffer.from(tokens.id_token.split('.')[1], 'base64url').toString(),
    )

    const email = payload.preferred_username ?? payload.email
    const fullName = payload.name ?? null
    const azureId = payload.oid // Azure object ID

    if (!email || !azureId) {
      console.error('[azure-callback] Missing email or oid in token:', payload)
      return NextResponse.redirect(new URL('/login?error=missing_claims', req.url))
    }

    // Call FastAPI to create/find user and get JWT
    const apiRes = await fetch(`${API_BASE}/auth/azure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: fullName, azure_id: azureId }),
    })

    if (!apiRes.ok) {
      const err = await apiRes.text()
      console.error('[azure-callback] API call failed:', apiRes.status, err)
      if (apiRes.status === 403) {
        return NextResponse.redirect(new URL('/login?error=not_allowed', req.url))
      }
      return NextResponse.redirect(new URL('/login?error=api_failed', req.url))
    }

    const { token } = await apiRes.json()

    // Set the JWT cookie on the redirect response directly
    const response = NextResponse.redirect(new URL('/dashboard', req.url))
    response.cookies.set('access_token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 7 * 24 * 3600,
      path: '/',
    })
    return response
  } catch (e) {
    console.error('[azure-callback] Unexpected error:', e)
    return NextResponse.redirect(new URL('/login?error=api_failed', req.url))
  }
}
