import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenFromRequest(req)
  if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const cveId = id.trim().toUpperCase()

  if (!/^CVE-\d{4}-\d{4,7}$/.test(cveId)) {
    return NextResponse.json({ error: 'Format CVE ID tidak valid' }, { status: 400 })
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    const res = await fetch(`https://cve.circl.lu/api/cve/${cveId}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'HackJournal Security Advisory Tool' }
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      return NextResponse.json({ error: `Gagal mengambil data dari CVE registry (HTTP ${res.status})` }, { status: 502 })
    }

    const data = await res.json()
    if (!data || data.id !== cveId) {
      return NextResponse.json({ error: 'CVE tidak ditemukan di registry' }, { status: 404 })
    }

    // Extract CVE details
    const summary = data.summary || ''
    const cvssScore = data.cvss !== undefined && data.cvss !== null ? Number(data.cvss) : null
    const cvssVector = data['cvss-vector'] || data.cvss_vector || null
    const cwe = data.cwe || null

    // Determine severity from score
    let severity = 'None'
    if (cvssScore !== null) {
      if (cvssScore >= 9.0) severity = 'Critical'
      else if (cvssScore >= 7.0) severity = 'High'
      else if (cvssScore >= 4.0) severity = 'Medium'
      else if (cvssScore >= 0.1) severity = 'Low'
    }

    // Deduce product & version from vulnerable configurations or summary
    let product = ''
    let version = ''
    
    // Heuristics from vulnerable configurations:
    if (data.vulnerable_configuration && data.vulnerable_configuration.length > 0) {
      const cpe = data.vulnerable_configuration[0]
      if (typeof cpe === 'string') {
        const parts = cpe.split(':')
        if (parts.length >= 6) {
          product = `${parts[3].charAt(0).toUpperCase() + parts[3].slice(1)} ${parts[4]}`
          version = parts[5]
        }
      }
    }

    if (!product && summary) {
      const match = summary.match(/(Apache\s+[A-Za-z0-9_-]+|WordPress\s+[A-Za-z0-9_-]+|[A-Z][A-Za-z0-9_#-]+)\s+versions?\s+([0-9.x\s]+)/i)
      if (match) {
        product = match[1]
        version = match[2]
      }
    }

    return NextResponse.json({
      cve_id: cveId,
      cve_product: product || null,
      cve_version: version || null,
      cve_cwe: cwe,
      cve_cvss_score: cvssScore,
      cve_cvss_vector: cvssVector,
      cve_cvss_severity: severity,
      summary: summary
    })
  } catch (err: any) {
    console.error('[CVE FETCH ERROR]', err)
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timeout. Silakan coba beberapa saat lagi.' }, { status: 504 })
    }
    return NextResponse.json({ error: 'Gagal menghubungi server CVE registry' }, { status: 500 })
  }
}
