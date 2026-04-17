export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="p-8 text-center">
        <h1 className="text-xl font-semibold">Authentication error</h1>
        <p className="mt-2 text-sm text-gray-600">{error ?? 'Something went wrong.'}</p>
      </div>
    </main>
  )
}
