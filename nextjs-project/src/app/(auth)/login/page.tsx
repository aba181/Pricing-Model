'use client'
import { Suspense, useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'

const AZURE_ERRORS: Record<string, string> = {
  azure_failed: 'Azure login was cancelled or failed',
  token_failed: 'Failed to authenticate with Azure',
  missing_claims: 'Azure account is missing required information',
  api_failed: 'Failed to create account. Contact your administrator.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, undefined)
  const searchParams = useSearchParams()
  const azureError = searchParams.get('error')

  return (
    <div className="min-h-screen bg-white dark:bg-[#030712] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">ACMI Pricing</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Sign in to your account</p>

        {azureError && (
          <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 mb-5">
            {AZURE_ERRORS[azureError] ?? 'Login failed'}
          </p>
        )}

        <a
          href="/api/auth/login/azure"
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4
                     bg-[#2f2f2f] hover:bg-[#3b3b3b] dark:bg-white dark:hover:bg-gray-100
                     text-white dark:text-[#2f2f2f] font-medium rounded-lg transition-colors
                     focus:outline-none focus:ring-3 focus:ring-gray-500/50"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
            <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
            <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
          </svg>
          Sign in with Microsoft
        </a>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"/>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-gray-50 dark:bg-gray-900 px-2 text-gray-400 dark:text-gray-500">or</span>
          </div>
        </div>

        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/50
                         focus:border-indigo-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100
                         placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/50
                         focus:border-indigo-500 transition-colors"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button
            type="submit" disabled={isPending}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50
                       text-white font-medium rounded-lg transition-colors focus:outline-none
                       focus:ring-3 focus:ring-indigo-500/50"
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
