import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from './change-password-form'

/**
 * /change-password — self-service password change (#527).
 *
 * Reachable two ways:
 *   - User clicked a "Change password" affordance somewhere (voluntary).
 *   - Middleware redirected here because `passwordExpiryDays` has elapsed
 *     since `lastPasswordChangedAt` (forced rotation).
 *
 * The `reason=expired` query param flips the copy from "Change password"
 * to "Your password has expired" so the forced-rotation case has the
 * right framing.
 */
export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const params = await searchParams
  const expired = params.reason === 'expired'

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {expired ? 'Password expired' : 'Change password'}
          </CardTitle>
          <CardDescription>
            {expired
              ? 'Your password has expired per your organization’s security policy. Set a new one to continue.'
              : 'Choose a new password. You’ll stay signed in.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  )
}
