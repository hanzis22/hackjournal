import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIP } from '@/lib/rateLimit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ip = getClientIP(req)
    const key = `${id}:${ip}`

    const { limited, resetIn } = await checkRateLimit(key, 'share_passphrase')
    if (limited) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Silakan coba lagi dalam ${Math.ceil(resetIn / 1000)} detik.` },
        { status: 429 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[SHARE ATTEMPT ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
