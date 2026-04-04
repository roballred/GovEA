'use server'

import { db } from '@/db/client'

export async function getUsers(organizationId: string) {
  return db.query.users.findMany({
    where: (u, { eq }) => eq(u.organizationId, organizationId),
    orderBy: (u, { asc }) => [asc(u.name)],
  })
}
