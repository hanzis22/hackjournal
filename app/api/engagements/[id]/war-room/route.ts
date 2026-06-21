import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import pool from '@/lib/db'
import { sanitizeText } from '@/lib/sanitize'
import { killSwitchEmitter } from '@/lib/kill-switch'

export const dynamic = 'force-dynamic'

async function checkEngagementAccess(engagementId: number, userId: number) {
  const [rows]: any = await pool.query('SELECT * FROM engagements WHERE id = ?', [engagementId])
  if (rows.length === 0) return null

  const engagement = rows[0]
  if (engagement.team_id !== null) {
    const [memberRows]: any = await pool.query(
      'SELECT role FROM team_members WHERE team_id = ? AND user_id = ?',
      [engagement.team_id, userId]
    )
    if (memberRows.length > 0) {
      return { allowed: true, engagement, role: memberRows[0].role }
    }
  } else {
    if (engagement.user_id === userId) {
      return { allowed: true, engagement, role: 'owner' }
    }
  }

  return { allowed: false }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const engagementId = Number((await params).id)
    const access = await checkEngagementAccess(engagementId, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Engagement not found or access denied' }, { status: 404 })
    }

    // Get latest commands
    const [commands]: any = await pool.query(
      `SELECT wrc.id, wrc.command, wrc.tool_name, wrc.created_at, u.username 
       FROM war_room_commands wrc
       JOIN users u ON wrc.user_id = u.id
       WHERE wrc.engagement_id = ?
       ORDER BY wrc.created_at DESC
       LIMIT 50`,
      [engagementId]
    )

    return NextResponse.json({
      attack_map_data: access.engagement.attack_map_data,
      commands
    })
  } catch (err: any) {
    console.error('[WAR ROOM GET ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch war room data' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = getTokenFromRequest(req)
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const engagementId = Number((await params).id)
    const access = await checkEngagementAccess(engagementId, payload.id)
    if (!access || !access.allowed) {
      return NextResponse.json({ error: 'Engagement not found or access denied' }, { status: 404 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'update_map') {
      if (access.role !== 'owner' && access.role !== 'editor') {
        return NextResponse.json({ error: 'Forbidden: read-only access' }, { status: 403 })
      }
      const { attack_map_data } = body
      await pool.query(
        'UPDATE engagements SET attack_map_data = ? WHERE id = ?',
        [JSON.stringify(attack_map_data), engagementId]
      )

      killSwitchEmitter.emit('war_room_event', {
        engagementId,
        type: 'map_updated',
        payload: { attack_map_data }
      })

      return NextResponse.json({ success: true, message: 'Attack map updated successfully' })
    }

    if (action === 'lock_node' || action === 'unlock_node') {
      if (access.role !== 'owner' && access.role !== 'editor') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const { nodeId } = body
      if (!nodeId) {
        return NextResponse.json({ error: 'nodeId is required' }, { status: 400 })
      }

      const [uRows]: any = await pool.query('SELECT username FROM users WHERE id = ?', [payload.id])
      const username = uRows[0]?.username || 'user'

      let mapData = access.engagement.attack_map_data
      if (typeof mapData === 'string') {
        mapData = JSON.parse(mapData)
      }
      if (!mapData || !mapData.nodes) {
        mapData = { nodes: [] }
      }

      mapData.nodes = mapData.nodes.map((node: any) => {
        if (node.id === nodeId) {
          if (action === 'lock_node') {
            node.locked_by = payload.id
            node.locked_by_name = username
          } else {
            node.locked_by = null
            node.locked_by_name = null
          }
        }
        return node
      })

      await pool.query(
        'UPDATE engagements SET attack_map_data = ? WHERE id = ?',
        [JSON.stringify(mapData), engagementId]
      )

      killSwitchEmitter.emit('war_room_event', {
        engagementId,
        type: 'map_updated',
        payload: { attack_map_data: mapData }
      })

      return NextResponse.json({ success: true, attack_map_data: mapData })
    }

    if (action === 'log_command') {
      const { command, tool_name } = body
      if (!command || !command.trim()) {
        return NextResponse.json({ error: 'Command text is required' }, { status: 400 })
      }

      const cleanCommand = sanitizeText(command.trim())
      const cleanTool = sanitizeText(tool_name || 'custom')

      const [result]: any = await pool.query(
        'INSERT INTO war_room_commands (engagement_id, user_id, command, tool_name) VALUES (?, ?, ?, ?)',
        [engagementId, payload.id, cleanCommand, cleanTool]
      )

      const [uRows]: any = await pool.query('SELECT username FROM users WHERE id = ?', [payload.id])
      const username = uRows[0]?.username || 'user'

      const newCmdObj = {
        id: result.insertId,
        command: cleanCommand,
        tool_name: cleanTool,
        username,
        created_at: new Date().toISOString()
      }

      killSwitchEmitter.emit('war_room_event', {
        engagementId,
        type: 'command_logged',
        payload: { command: newCmdObj }
      })

      return NextResponse.json({ success: true, message: 'Command logged successfully', command: newCmdObj })
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 })
  } catch (err: any) {
    console.error('[WAR ROOM POST ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 500 })
  }
}
