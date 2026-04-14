'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const AZURE_ERRORS: Record<string, string> = {
  azure_failed: 'Azure login was cancelled or failed',
  token_failed: 'Failed to authenticate with Azure',
  missing_claims: 'Azure account is missing required information',
  api_failed: 'Failed to create account. Contact your administrator.',
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
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
      </div>
    </div>
  )
}
