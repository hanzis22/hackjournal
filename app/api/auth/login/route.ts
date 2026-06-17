import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { signToken } from '@/lib/auth'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const limit = await checkRateLimit(ip, 'login')
    if (limit.limited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan login. Silakan coba lagi dalam ${Math.ceil(limit.resetIn / 1000)} detik.` },
        { status: 429 }
      )
    }

    const { email, password } = await req.json()
    if (!email || !password)
      return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 })

    const [rows]: any = await pool.query(
      'SELECT * FROM users WHERE email = ?', [email]
    )
    const user = (rows as any[])[0]
    if (!user)
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid)
      return NextResponse.json({ error: 'Email atau password salah' }, { status: 401 })

    const payload = { id: user.id, email: user.email, username: user.username }
    const token = signToken(payload)

    const res = NextResponse.json({
      message: 'Login berhasil',
      user: { id: user.id, email: user.email, username: user.username }
    })
    res.cookies.set('hj_token', token, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax'
    })
    return res
  } catch (err) {
    console.error('[LOGIN]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ message: 'Logout berhasil' })
  res.cookies.delete('hj_token')
  return res
}
