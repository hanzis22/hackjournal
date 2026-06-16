import pool from './db'

export async function triggerWebhooks(userId: number, eventType: string, payload: any) {
  try {
    const [rows]: any = await pool.query(
      'SELECT url, platform, events FROM webhooks WHERE user_id = ? AND is_active = 1',
      [userId]
    )

    for (const hook of rows) {
      if (hook.events.includes(eventType)) {
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
        fetch(hook.url, {
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
