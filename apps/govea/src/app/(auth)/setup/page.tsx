// First-run setup wizard — creates the initial Admin account.
// Redirects away once setup is complete.
export default function SetupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md p-8">
        <h1 className="text-2xl font-bold">Set up GovEA</h1>
        <p className="text-sm text-gray-600">Create your admin account to get started.</p>
        {/* Setup form */}
      </div>
    </main>
  )
}
