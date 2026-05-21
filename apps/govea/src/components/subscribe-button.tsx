'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { subscribe, unsubscribe, type NotifiableEntityType } from '@/actions/notifications'

interface Props {
  entityType: NotifiableEntityType
  entityId: string
  initialSubscribed: boolean
}

/**
 * Subscribe / unsubscribe toggle for a single architecture object (#581).
 *
 * The Domain Architect persona's pain point #4 — *"changes in adjacent
 * domains do not notify the domain architect"* — is unaddressable without
 * a subscription primitive. This button is the user-facing surface for
 * that primitive. Idempotent: server actions use ON CONFLICT DO NOTHING.
 */
export function SubscribeButton({ entityType, entityId, initialSubscribed }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [subscribed, setSubscribed] = useState(initialSubscribed)

  function handleToggle() {
    startTransition(async () => {
      if (subscribed) {
        await unsubscribe(entityType, entityId)
        setSubscribed(false)
      } else {
        await subscribe(entityType, entityId)
        setSubscribed(true)
      }
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      size="sm"
      variant={subscribed ? 'secondary' : 'outline'}
      onClick={handleToggle}
      disabled={isPending}
      title={subscribed ? 'You will be notified when this changes' : 'Get notified when this changes'}
    >
      {subscribed
        ? (isPending ? 'Unsubscribing…' : '✓ Subscribed')
        : (isPending ? 'Subscribing…' : '+ Subscribe')}
    </Button>
  )
}
