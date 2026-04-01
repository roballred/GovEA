import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const metadata = { title: 'Sign In' }

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="flex min-h-screen items-center justify-center bg-govea-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-govea-600">
            <span className="text-xl font-bold text-white">G</span>
          </div>
          <h1 className="text-2xl font-bold text-white">GovEA</h1>
          <p className="mt-1 text-sm text-govea-300">
            Enterprise Architecture for Government
          </p>
        </div>

        {/* Sign-in card */}
        <div className="card p-6 space-y-5">
          <h2 className="text-base font-semibold text-gray-900">Sign in to your account</h2>

          <form
            action={async (formData: FormData) => {
              'use server'
              await signIn('credentials', {
                email: formData.get('email'),
                password: formData.get('password'),
                redirectTo: '/dashboard',
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           placeholder:text-gray-400 focus:border-govea-500 focus:outline-none
                           focus:ring-1 focus:ring-govea-500"
                placeholder="you@agency.gov"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm
                           focus:border-govea-500 focus:outline-none focus:ring-1 focus:ring-govea-500"
              />
            </div>

            <button type="submit" className="btn-primary w-full">
              Sign in
            </button>
          </form>

          {/* Entra ID SSO — conditionally rendered */}
          {process.env.ENTRA_CLIENT_ID && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white px-2">or</span>
                </div>
              </div>
              <form
                action={async () => {
                  'use server'
                  await signIn('microsoft-entra-id', { redirectTo: '/dashboard' })
                }}
              >
                <button type="submit" className="btn-secondary w-full gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                  </svg>
                  Sign in with Microsoft
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-govea-400">
          GovEA — Open source. Free forever.
        </p>
      </div>
    </div>
  )
}
