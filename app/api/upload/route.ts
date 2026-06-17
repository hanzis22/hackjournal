import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getTokenFromRequest } from '@/lib/auth'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

// Safe extension map — derive from validated MIME type, never from user filename
const SAFE_EXT_MAP: Record<string, string> = {
  'image/png': '.png',
  'image/jpg': '.jpg',
  'image/jpeg': '.jpeg',
  'image/gif': '.gif',
  'image/webp': '.webp',
}

export async function POST(req: NextRequest) {
  // SEC-04 Fix: Authentication check
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting for uploads
  const ip = getClientIP(req)
  const limit = await checkRateLimit(ip, 'upload')
  if (limit.limited) {
    return NextResponse.json(
      { error: `Terlalu banyak upload. Silakan coba lagi dalam ${Math.ceil(limit.resetIn / 1000)} detik.` },
      { status: 429 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate MIME type against allowlist
    if (!SAFE_EXT_MAP[file.type]) {
      return NextResponse.json({ error: 'Format file tidak diizinkan. Hanya menerima PNG, JPG, JPEG, GIF, WEBP.' }, { status: 400 })
    }

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran file terlalu besar. Maksimal 5MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    // Generate safe unique filename — extension derived from validated MIME type, NOT from user input
    const ext = SAFE_EXT_MAP[file.type]
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`
    const filepath = path.join(uploadDir, filename)

    // Save to public/uploads
    await fs.writeFile(filepath, buffer)

    // Return static URL
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (err) {
    console.error('[UPLOAD ERROR]', err)
    return NextResponse.json({ error: 'Internal upload failure' }, { status: 500 })
  }
}
