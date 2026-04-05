import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const session = await auth()
  if (session) redirect('/dashboard')

  const params = await searchParams
  const isDev = process.env.NODE_ENV === 'development'

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">GovEA</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your organization</p>
        </div>

        {params.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {params.error === 'CredentialsSignin' ? 'Invalid email or password.' : 'Authentication failed.'}
          </p>
        )}

        <form
          action={async (formData: FormData) => {
            'use server'
            await signIn('credentials', {
              email: formData.get('email'),
              password: formData.get('password'),
              redirectTo: params.callbackUrl ?? '/dashboard',
            })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
            <input
              id="email" name="email" type="email" required autoComplete="email"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password" required autoComplete="current-password"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Sign in
          </button>
        </form>

        {process.env.AUTH_MICROSOFT_ENTRA_ID_ID && (
          <form action={async () => {
            'use server'
            await signIn('microsoft-entra-id', { redirectTo: params.callbackUrl ?? '/dashboard' })
          }}>
            <button type="submit" className="w-full rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Sign in with Microsoft
            </button>
          </form>
        )}

        {isDev && (
          <div className="border-t border-dashed border-gray-200 pt-4">
            <p className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">Dev shortcuts</p>
            <div className="space-y-2">
              {([
                { label: 'Sign in as Admin', email: 'alice@govea.dev', cls: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
                { label: 'Sign in as Contributor', email: 'carol@govea.dev', cls: 'bg-green-100 text-green-800 hover:bg-green-200' },
                { label: 'Sign in as Viewer', email: 'victor@govea.dev', cls: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
              ] as const).map(({ label, email, cls }) => (
                <form key={email} action={async () => {
                  'use server'
                  await signIn('credentials', { email, password: 'dev-password', redirectTo: '/dashboard' })
                }}>
                  <button type="submit" className={`w-full rounded px-3 py-1.5 text-xs font-medium ${cls}`}>
                    {label}
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
