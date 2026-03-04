'use client'
import { useActionState } from 'react'
import { loginAction } from '@/app/actions/auth'

export default function LoginPage() {
  const [state, action, isPending] = useActionState(loginAction, undefined)

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-xl p-8">
        <h1 className="text-xl font-semibold text-gray-100 mb-1">ACMI Pricing</h1>
        <p className="text-sm text-gray-400 mb-8">Sign in to your account</p>

        <form action={action} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100
                         placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/50
                         focus:border-indigo-500 transition-colors"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100
                         placeholder-gray-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/50
                         focus:border-indigo-500 transition-colors"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2">
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
