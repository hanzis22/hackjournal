import { NextRequest } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import { killSwitchEmitter } from '@/lib/kill-switch'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = payload.id
  const { searchParams } = new URL(req.url)
  const engagementIdStr = searchParams.get('engagement_id')
  const engagementId = engagementIdStr ? Number(engagementIdStr) : null

  const encoder = new TextEncoder()

  const customStream = new ReadableStream({
    start(controller) {
      // Send connection acknowledgement
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'))

      const handleDisconnect = (data: { userId: number }) => {
        if (data.userId === userId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'force_disconnect', userId })}\n\n`))
        }
      }

      const handleWarRoomEvent = (data: { engagementId: number; type: string; payload: any }) => {
        if (engagementId && data.engagementId === engagementId) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: data.type, ...data.payload })}\n\n`))
        }
      }

      killSwitchEmitter.on('force_disconnect', handleDisconnect)
      if (engagementId) {
        killSwitchEmitter.on('war_room_event', handleWarRoomEvent)
      }

      req.signal.addEventListener('abort', () => {
        killSwitchEmitter.off('force_disconnect', handleDisconnect)
        if (engagementId) {
          killSwitchEmitter.off('war_room_event', handleWarRoomEvent)
        }
      })
    },
  })

  return new Response(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}
