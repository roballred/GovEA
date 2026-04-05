import { isSetupComplete, runSetup } from '@/actions/setup'
import { redirect } from 'next/navigation'

export default async function SetupPage() {
  const done = await isSetupComplete()
  if (done) redirect('/login')

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-8 shadow-sm border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Set up GovEA</h1>
          <p className="mt-1 text-sm text-gray-500">Create your admin account to get started.</p>
        </div>
        <form action={runSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="orgName">Organization name</label>
            <input id="orgName" name="orgName" type="text" required placeholder="City of Springfield"
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <hr className="border-gray-100" />
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="name">Your name</label>
            <input id="name" name="name" type="text" required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
          </div>
          <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Create admin account
          </button>
        </form>
      </div>
    </main>
  )
}
