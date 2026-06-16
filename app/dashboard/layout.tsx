import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import DashboardShell from './DashboardShell'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('hj_token')?.value
  if (!token || !verifyToken(token)) redirect('/login')

  return <DashboardShell>{children}</DashboardShell>
}
