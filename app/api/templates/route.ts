import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

// GET /api/templates - Get all builtin templates + user-created templates
export async function GET(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req)
    
    // Fetch builtin templates (user_id is NULL or is_builtin = 1)
    // and user templates if logged in
    let query = 'SELECT * FROM templates WHERE is_builtin = 1'
    const params: any[] = []

    if (user) {
      query += ' OR user_id = ?'
      params.push(user.id)
    }

    const [rows]: any = await pool.query(query, params)
    return NextResponse.json(rows)
  } catch (err) {
    console.error('[TEMPLATES_GET]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/templates - Create a new user template
export async function POST(req: NextRequest) {
  try {
    const user = getTokenFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, writeup_mode, template_data } = await req.json()
    if (!name || !template_data) {
      return NextResponse.json({ error: 'Name and template data are required' }, { status: 400 })
    }

    const [result]: any = await pool.query(
      'INSERT INTO templates (user_id, name, description, writeup_mode, template_data, is_builtin) VALUES (?, ?, ?, ?, ?, 0)',
      [user.id, name, description || '', writeup_mode || 'journal', JSON.stringify(template_data)]
    )

    return NextResponse.json({
      message: 'Template created successfully',
      id: result.insertId
    }, { status: 201 })
  } catch (err) {
    console.error('[TEMPLATES_POST]', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
