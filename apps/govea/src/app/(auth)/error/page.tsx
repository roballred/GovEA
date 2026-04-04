export default function AuthErrorPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold">Authentication error</h1>
        <p className="mt-2 text-sm text-gray-600">{searchParams.error ?? 'Something went wrong.'}</p>
      </div>
    </main>
  )
}
