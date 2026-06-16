import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'

function parseRawHttp(rawHttp: string) {
  const lines = rawHttp.split('\n');
  if (lines.length === 0 || !lines[0].trim()) return null;
  
  const firstLine = lines[0].trim();
  const parts = firstLine.split(/\s+/);
  if (parts.length < 2) return null;
  
  const method = parts[0];
  const path = parts[1];

  let host = 'Target';
  for (const line of lines) {
    const match = line.match(/^Host:\s*(.*)$/i);
    if (match) {
      host = match[1].trim();
      break;
    }
  }

  return { method, path, host };
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key')
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({ error: 'Unauthorized: Missing API Key' }, { status: 401 })
  }

  try {
    // Authenticate user by API Key
    const [users]: any = await pool.query('SELECT id, username, email FROM users WHERE api_key = ?', [apiKey.trim()])
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 })
    }
    const user = users[0]

    const body = await req.json()
    let { title, platform, difficulty, tags, content, writeup_mode, raw_http } = body

    if (raw_http && raw_http.trim()) {
      const parsed = parseRawHttp(raw_http)
      if (parsed) {
        if (!title) {
          title = `Burp Import: ${parsed.method} ${parsed.host}${parsed.path}`
        }
        if (!platform || platform === 'Custom') {
          platform = parsed.host
        }
        
        // Format raw HTTP request neatly in PoC block
        const formattedPoC = `<h3>Raw HTTP Request</h3><pre><code>${raw_http}</code></pre>`
        if (writeup_mode === 'cve') {
          body.cve_poc = formattedPoC
        } else {
          content = (content || '') + formattedPoC
        }
      }
    }

    if (!title) {
      title = `Imported Draft - ${new Date().toLocaleDateString()}`
    }

    const mode = writeup_mode === 'cve' ? 'cve' : 'journal'

    const [result]: any = await pool.query(
      `INSERT INTO writeups (
        user_id, title, platform, difficulty, tags, content, is_public,
        writeup_mode, cve_poc, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, NOW(), NOW())`,
      [
        user.id,
        title,
        platform || 'Burp Suite',
        difficulty || 'Medium',
        tags || 'Imported,Burp',
        content || '<p>Imported draft from Burp Suite integration.</p>',
        mode,
        body.cve_poc || ''
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Draft writeup successfully imported',
      writeup_id: result.insertId,
      url: `/dashboard/${result.insertId}`
    })
  } catch (err: any) {
    console.error('[API IMPORT ERROR]', err)
    return NextResponse.json({ error: err.message || 'Failed to import writeup' }, { status: 500 })
  }
}
