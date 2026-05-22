'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeOwnPassword } from '@/actions/change-password'

export function ChangePasswordForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await changeOwnPassword(formData)
      if (result.ok) {
        setSuccess(true)
        // Send the user back to the auth-redirect dispatcher — same flow as
        // a fresh login. Their JWT will be refreshed with the new
        // lastPasswordChangedAt on the next 5-minute jwt-callback tick,
        // which is fine because the middleware skip-list also covers the
        // immediate /auth-redirect navigation.
        setTimeout(() => { router.replace('/auth-redirect') }, 800)
      } else {
        setError(result.message)
      }
    })
  }

  if (success) {
    return (
      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
        Password changed successfully. Redirecting…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Changing…' : 'Change password'}
      </Button>
    </form>
  )
}
