import { AuthError } from 'next-auth'
import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { safeCallbackUrl } from '@/lib/auth-redirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

async function devSignIn(formData: FormData) {
  'use server'
  const email = formData.get('email') as string
  await signIn('credentials', { email, password: 'dev-password', redirectTo: '/auth-redirect' })
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>
}) {
  const session = await auth()
  if (session) redirect('/auth-redirect')

  const params = await searchParams
  const showDemoShortcuts = process.env.NODE_ENV === 'development'
    || process.env.DEV === 'true'
    || process.env.DEMO_MODE === 'true'

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">GovEA</CardTitle>
          <CardDescription>Sign in to your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {params.error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              {params.error === 'CredentialsSignin' ? 'Invalid email or password.' : 'Authentication failed.'}
            </div>
          )}
          <form
            action={async (formData: FormData) => {
              'use server'
              try {
                await signIn('credentials', {
                  email: formData.get('email'),
                  password: formData.get('password'),
                  redirectTo: safeCallbackUrl(params.callbackUrl, '/auth-redirect'),
                })
              } catch (error) {
                if (error instanceof AuthError) {
                  redirect(`/login?error=${error.type}`)
                }
                throw error
              }
            }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full">Sign in</Button>
          </form>

          {process.env.AUTH_MICROSOFT_ENTRA_ID_ID && (
            <form action={async () => {
              'use server'
              await signIn('microsoft-entra-id', { redirectTo: safeCallbackUrl(params.callbackUrl, '/auth-redirect') })
            }}>
              <Button type="submit" variant="outline" className="w-full">Sign in with Microsoft</Button>
            </form>
          )}

          {showDemoShortcuts && (
            <div className="space-y-2 pt-2">
              <Separator />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-2">Dev shortcuts</p>
              {([
                { label: 'Riverdale Admin',       email: 'alice@govea.dev',               cls: 'bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100' },
                { label: 'Riverdale Contributor', email: 'carol@govea.dev',               cls: 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
                { label: 'GovEA Project Admin',   email: 'aria@govea-project.govea.dev',  cls: 'bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100' },
                { label: 'State Admin',           email: 'sam@state.govea.dev',           cls: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100' },
                { label: 'Hartfield EA Admin',    email: 'maya@hartfield.govea.dev',      cls: 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100' },
                { label: 'Ivan — Instance Admin (dev)',  email: 'ivan@govea.dev',         cls: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100' },
                { label: 'Nora — Instance Admin (dev)',  email: 'nora@govea.dev',         cls: 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100' },
                { label: 'Scale Test Admin (500 apps)',  email: 'scale@govea.dev',         cls: 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100' },
              ] as const).map(({ label, email, cls }) => (
                <form key={email} action={devSignIn}>
                  <input type="hidden" name="email" value={email} />
                  <Button type="submit" variant="outline" size="sm" className={`w-full text-xs ${cls}`}>{label}</Button>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
