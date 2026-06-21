/**
 * Abstraksi pengiriman email transaksional menggunakan Resend API.
 * Jika RESEND_API_KEY tidak dikonfigurasi, sistem akan menampilkan warning log dan melewatinya.
 */
export async function sendInviteEmail(
  to: string,
  payload: { teamName: string; inviteUrl: string }
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'onboarding@resend.dev'

  if (!apiKey) {
    console.warn(
      `[Email Warning] RESEND_API_KEY tidak dikonfigurasi. Lewati pengiriman email invite ke ${to}.`
    )
    console.warn(`[Invite Link] Link tujuan: ${payload.inviteUrl}`)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to,
        subject: `Undangan Bergabung ke Tim: ${payload.teamName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
            <h2 style="color: #7F77DD; margin-top: 0;">Undangan Tim HackJournal</h2>
            <p>Halo,</p>
            <p>Anda telah diundang untuk bergabung dengan tim <strong>${payload.teamName}</strong> di HackJournal.</p>
            <p>Silakan klik tombol di bawah ini untuk menerima undangan:</p>
            <div style="margin: 24px 0;">
              <a href="${payload.inviteUrl}" style="background-color: #7F77DD; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Terima Undangan</a>
            </div>
            <p style="font-size: 13px; color: #666;">
              Atau salin dan buka link berikut di browser Anda:<br>
              <a href="${payload.inviteUrl}" style="color: #7F77DD;">${payload.inviteUrl}</a>
            </p>
            <p style="font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; margin-top: 24px;">
              * Undangan ini berlaku selama 7 hari. Jika Anda merasa tidak mengenali undangan ini, silakan abaikan email ini.
            </p>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[Email Error] Resend API error: ${errText}`)
      return false
    }

    console.log(`[Email Success] Email undangan berhasil dikirim ke ${to}`)
    return true
  } catch (error) {
    console.error(`[Email Error] Gagal mengirim email ke ${to}:`, error)
    return false
  }
}
