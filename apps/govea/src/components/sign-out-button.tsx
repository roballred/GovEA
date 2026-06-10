import { Button } from '@/components/ui/button'

/**
 * Sign-out control for the admin and instance shells (#759).
 *
 * Deliberately a plain HTML form posting to a fixed URL, NOT a Server Action:
 * action ids are deployment-specific, so stale tabs fail with "Failed to find
 * Server Action" instead of signing out. The route handler URL never changes,
 * so this works from any page age, with or without client-side JS.
 */
export function SignOutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <Button
        variant="ghost"
        size="sm"
        type="submit"
        className="hover:bg-white/10 text-white"
      >
        Sign out
      </Button>
    </form>
  )
}
