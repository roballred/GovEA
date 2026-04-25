'use client'

import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : 'Mark as reviewed'}
    </button>
  )
}

interface MarkReviewedFormProps {
  action: (formData: FormData) => Promise<void>
}

export function MarkReviewedForm({ action }: MarkReviewedFormProps) {
  const router = useRouter()

  async function handleAction(formData: FormData) {
    await action(formData)
    router.refresh()
  }

  return (
    <form action={handleAction}>
      <SubmitButton />
    </form>
  )
}
