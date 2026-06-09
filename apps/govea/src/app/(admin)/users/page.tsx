import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/rbac'
import { getUsers } from '@/actions/users'
import { getOrgMemberships } from '@/actions/memberships'
import { UserTable } from './user-table'
import { MembershipTable } from './membership-table'

export default async function UsersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!isAdmin(session.user)) redirect('/dashboard')

  const [userList, members] = await Promise.all([getUsers(), getOrgMemberships()])

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        </div>
        <UserTable users={userList} currentUserId={session.user.id} />
      </div>
      <MembershipTable members={members} currentUserId={session.user.id} />
    </div>
  )
}
