import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  console.warn('[AUTH] WARNING: JWT_SECRET environment variable is not set. Using fallback for development only.')
}
const JWT_KEY = SECRET || 'hackjournal_dev_fallback_change_me'

export interface JWTPayload {
  id:       number
  email:    string
  username: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_KEY, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_KEY) as JWTPayload
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: NextRequest): JWTPayload | null {
  const cookie = req.cookies.get('hj_token')?.value
  if (cookie) return verifyToken(cookie)

  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return verifyToken(auth.slice(7))

  return null
}
