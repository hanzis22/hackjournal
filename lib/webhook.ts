import pool from './db'
import { validateWebhookUrl } from './urlValidator'

export async function triggerWebhooks(userId: number, eventType: string, payload: any) {
  try {
    const [rows]: any = await pool.query(
      'SELECT url, platform, events FROM webhooks WHERE user_id = ? AND is_active = 1',
      [userId]
    )

    for (const hook of rows) {
      if (hook.events.includes(eventType)) {
        // SEC-06: Re-validate webhook URL at dispatch time (anti-SSRF)
        const validation = validateWebhookUrl(hook.url, hook.platform)
        if (!validation.valid) {
          console.warn(`[Webhook Blocked - SSRF Prevention] User ID: ${userId}, URL: ${hook.url}, Reason: ${validation.error}`)
          continue
        }

        let body: any = {}
        
        if (hook.platform === 'discord') {
          body = {
            content: `**HackJournal Notification**\nEvent: \`${eventType}\`\nWriteup: **${payload.title}**\nDifficulty: ${payload.difficulty}`
          }
        } else if (hook.platform === 'slack') {
          body = {
            text: `HackJournal Notification: Event: ${eventType} - Writeup: ${payload.title} (${payload.difficulty})`
          }
        } else {
          // Custom webhook
          body = {
            event: eventType,
            data: payload
          }
        }

        // Fire and forget, don't await blocking
        fetch(validation.url!.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).catch(err => console.error('[Webhook Dispatch Error]', err))
      }
    }
  } catch (err) {
    console.error('[Trigger Webhook Error]', err)
  }
}
