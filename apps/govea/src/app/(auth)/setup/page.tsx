export const dynamic = 'force-dynamic'

import { isSetupComplete, runSetup } from '@/actions/setup'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default async function SetupPage() {
  const done = await isSetupComplete()
  if (done) redirect('/login')

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Set up GovEA</CardTitle>
          <CardDescription>Create your admin account to get started.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={runSetup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" name="orgName" type="text" required placeholder="City of Springfield" />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" type="text" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" required minLength={8} />
            </div>
            <Button type="submit" className="w-full">Create admin account</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
