import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeHtml } from '@/lib/sanitize'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const sourceId = Number((await params).id)
    const { team_id, decrypted_content } = await req.json()

    if (!team_id) {
      return NextResponse.json({ error: 'team_id wajib diisi' }, { status: 400 })
    }

    const destinationTeamId = Number(team_id)

    // 1. Fetch source writeup
    const [sourceRows]: any = await pool.query(
      'SELECT * FROM writeups WHERE id = ?',
      [sourceId]
    )
    const source = sourceRows[0]
    if (!source) {
      return NextResponse.json({ error: 'Writeup sumber tidak ditemukan' }, { status: 404 })
    }

    // 2. Validate requester is the owner of the source writeup AND source has team_id IS NULL
    if (source.user_id !== payload.id || source.team_id !== null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Validate requester has owner/editor role in the destination team
    const [memberRows]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [destinationTeamId, payload.id]
    )
    if (memberRows.length === 0 || (memberRows[0].role !== 'owner' && memberRows[0].role !== 'editor')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Resolve content
    let finalContent = ''
    if (source.is_encrypted === 1) {
      if (!decrypted_content) {
        return NextResponse.json({ error: 'decrypted_content wajib disertakan untuk laporan terenkripsi' }, { status: 400 })
      }
      finalContent = sanitizeHtml(decrypted_content)
    } else {
      finalContent = source.content
    }

    // 5. Insert cloned writeup
    const [result]: any = await pool.query(
      `INSERT INTO writeups (
        user_id, title, platform, difficulty, tags, content, is_public,
        writeup_mode, cve_id, cve_product, cve_version, cve_cwe,
        cve_cvss_score, cve_cvss_vector, cve_cvss_severity,
        cve_impact, cve_poc, cve_remediation,
        is_encrypted, encryption_salt, encryption_iv, attack_chain,
        folder_id, is_starred, checklist_state, team_id, cloned_from_id
       )
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL, ?, NULL, 0, ?, ?, ?)`,
      [
        payload.id,
        source.title,
        source.platform,
        source.difficulty,
        source.tags,
        finalContent,
        source.writeup_mode,
        source.cve_id,
        source.cve_product,
        source.cve_version,
        source.cve_cwe,
        source.cve_cvss_score,
        source.cve_cvss_vector,
        source.cve_cvss_severity,
        source.cve_impact,
        source.cve_poc,
        source.cve_remediation,
        source.attack_chain,
        source.checklist_state,
        destinationTeamId,
        sourceId
      ]
    )

    // Fetch team name
    const [teamRows]: any = await pool.query(
      'SELECT name, owner_id FROM teams WHERE id = ?',
      [destinationTeamId]
    )
    const teamName = teamRows[0]?.name || 'Tim'

    // Notify all owners & editors except the actor
    const [targetMembers]: any = await pool.query(
      "SELECT user_id FROM team_members WHERE team_id = ? AND role IN ('owner', 'editor') AND user_id != ?",
      [destinationTeamId, payload.id]
    )

    const { createNotification } = await import('@/lib/notification')
    for (const member of targetMembers) {
      await createNotification(
        member.user_id,
        'writeup_shared_to_team',
        'Laporan Baru Dibagikan',
        `Laporan "${source.title}" telah disalin ke tim "${teamName}".`,
        `/dashboard?tab=tim`
      )
    }

    // Trigger webhook for owner
    const { triggerWebhooks } = await import('@/lib/webhook')
    await triggerWebhooks(teamRows[0].owner_id, 'writeup_shared_to_team', {
      title: source.title,
      teamName: teamName,
    })

    return NextResponse.json({ success: true, newWriteupId: result.insertId })
  } catch (err: any) {
    console.error('[SHARE TO TEAM ERROR]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
