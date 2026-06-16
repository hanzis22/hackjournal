import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { signToken } from '@/lib/auth'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req)
    const limit = checkRateLimit(ip, 'register')
    if (limit.limited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan registrasi. Silakan coba lagi dalam ${Math.ceil(limit.resetIn / 60000)} menit.` },
        { status: 429 }
      )
    }

    const { username, email, password } = await req.json()

    if (!username || !email || !password)
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 })

    if (password.length < 6)
      return NextResponse.json({ error: 'Password minimal 6 karakter' }, { status: 400 })

    const [existing]: any = await pool.query(
      'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
    )
    if ((existing as any[]).length > 0)
      return NextResponse.json({ error: 'Email atau username sudah digunakan' }, { status: 409 })

    const hashed = await bcrypt.hash(password, 12)
    const [result]: any = await pool.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashed]
    )

    const user = { id: (result as any).insertId, email, username }
    const token = signToken(user)

    const res = NextResponse.json({ message: 'Registrasi berhasil', user }, { status: 201 })
    res.cookies.set('hj_token', token, {
      httpOnly: true, maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'lax'
    })
    return res
  } catch (err: any) {
    console.error('[REGISTER]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
