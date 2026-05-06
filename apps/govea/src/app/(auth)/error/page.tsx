import { redirect } from 'next/navigation'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  redirect(error ? `/login?error=${encodeURIComponent(error)}` : '/login')
}
