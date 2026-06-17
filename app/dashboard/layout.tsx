import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import DashboardShell from './DashboardShell'
import pool from '@/lib/db'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('hj_token')?.value
  const payload = token ? verifyToken(token) : null

  if (!payload) {
    redirect('/login')
  }

  // Verify that the user exists in the database
  try {
    const [rows]: any = await pool.query('SELECT id FROM users WHERE id = ?', [payload.id])
    if (!rows || rows.length === 0) {
      cookieStore.delete('hj_token')
      redirect('/login')
    }
  } catch (err) {
    console.error('[DashboardLayout Auth Check Error]', err)
    cookieStore.delete('hj_token')
    redirect('/login')
  }

  return <DashboardShell>{children}</DashboardShell>
}
