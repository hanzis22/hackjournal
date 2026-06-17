import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { signToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  const [rows]: any = await pool.query('SELECT * FROM users WHERE email = ?', [email])
  const user = rows[0]
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const payload = { id: user.id, email: user.email, username: user.username }
  const token = signToken(payload)

  const res = NextResponse.redirect(new URL('/dashboard', req.url))
  res.cookies.set('hj_token', token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax'
  })
  return res
}
