'use client'
import { useState, useEffect } from 'react'
import CustomModal from '@/components/ui/CustomModal'
import { showToast } from '@/components/ui/Toast'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
  } | null>(null)

  const [webhooks, setWebhooks] = useState<any[]>([])
  const [hookName, setHookName] = useState('')
  const [hookUrl, setHookUrl] = useState('')
  const [hookPlatform, setHookPlatform] = useState('custom')

  // Language & AI settings
  const [language, setLanguage] = useState<'id' | 'en'>('id')
  const [aiProvider, setAiProvider] = useState('gemini')
  const [aiEndpoint, setAiEndpoint] = useState('')

  useEffect(() => {
    fetch('/api/auth/apikey')
      .then(res => res.json())
      .then(data => {
        setApiKey(data.api_key)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Fetch profile settings
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setLanguage(data.user.language || 'id')
          setAiProvider(data.user.ai_provider || 'gemini')
          setAiEndpoint(data.user.ai_endpoint || '')
        }
      })

    fetchWebhooks()
  }, [])

  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks')
      const data = await res.json()
      if (data.webhooks) setWebhooks(data.webhooks)
    } catch (e) {
      console.error(e)
    }
  }

  const addWebhook = async () => {
    if (!hookUrl) return
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: hookName, url: hookUrl, platform: hookPlatform })
      })
      if (res.ok) {
        setHookName('')
        setHookUrl('')
        fetchWebhooks()
        showToast('Webhook ditambahkan!', 'success')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const saveProfileSettings = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, ai_provider: aiProvider, ai_endpoint: aiEndpoint })
      })
      if (res.ok) {
        localStorage.setItem('hj_lang', language)
        showToast('Pengaturan profil berhasil disimpan!', 'success')
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const deleteWebhook = async (id: number) => {
    setModalConfig({
      title: '⚠️ Hapus Webhook',
      message: 'Apakah Anda yakin ingin menghapus webhook ini?',
      onConfirm: async () => {
        setModalConfig(null)
        try {
          const res = await fetch(`/api/webhooks/${id}`, { method: 'DELETE' })
          if (res.ok) {
            fetchWebhooks()
            showToast('Webhook dihapus!', 'success')
          }
        } catch (e) {
          console.error(e)
        }
      }
    })
  }

  async function generateKey() {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/apikey', { method: 'POST' })
      const data = await res.json()
      if (data.api_key) {
        setApiKey(data.api_key)
        showToast('API Key baru berhasil dibuat!', 'success')
      } else {
        showToast('Gagal membuat API Key', 'error')
      }
    } catch {
      showToast('Gagal membuat API Key', 'error')
    } finally {
      setLoading(false)
    }
  }

  function confirmRevokeKey() {
    setModalConfig({
      title: '⚠️ Cabut API Key',
      message: 'Apakah Anda yakin ingin mencabut (revoke) API Key saat ini? Integrasi luar akan berhenti berfungsi.',
      onConfirm: async () => {
        setModalConfig(null)
        setLoading(true)
        try {
          const res = await fetch('/api/auth/apikey', { method: 'DELETE' })
          const data = await res.json()
          if (data.success) {
            setApiKey(null)
            showToast('API Key berhasil dicabut!', 'success')
          } else {
            showToast('Gagal mencabut API Key', 'error')
          }
        } catch {
          showToast('Gagal mencabut API Key', 'error')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  function handleCopy() {
    if (!apiKey) return
    navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pythonScript = `import sys
import json
import urllib.request

# ----------------------------------------------------
# CONFIGURATION
# ----------------------------------------------------
API_KEY = "${apiKey || 'TEMPEL_API_KEY_ANDA_DISINI'}"
API_URL = "http://localhost:3000/api/writeups/import"
# ----------------------------------------------------

def import_to_hackjournal(raw_http):
    payload = {
        "title": None, # Auto-generate dari HOST & Method
        "writeup_mode": "cve", # 'cve' atau 'journal'
        "difficulty": "Medium",
        "tags": "BurpSuite,Imported",
        "raw_http": raw_http
    }
    
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
        },
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            res_data = json.loads(response.read().decode())
            print(f"[+] Berhasil diimpor! ID: {res_data.get('writeup_id')}")
            print(f"[+] Tautan Draf: {API_URL.replace('/api/writeups/import', '')}{res_data.get('url')}")
    except Exception as e:
        print(f"[-] Gagal mengirim: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Penggunaan: python import_burp.py <file_http_raw>")
        sys.exit(1)
        
    with open(sys.argv[1], 'r', encoding='utf-8', errors='ignore') as f:
        raw_content = f.read()
        
    import_to_hackjournal(raw_content)
`

  return (
    <div style={{ padding: '30px', maxWidth: '900px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '24px', color: 'var(--purple-400)', borderBottom: '2px solid var(--purple-600)', paddingBottom: '12px', marginBottom: '24px' }}>
        ⚙️ Dashboard Settings & Integrations
      </h1>

      {/* API Key Panel */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>🔑 Burp Suite & API Integration Key</h2>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '20px' }}>
          Gunakan kunci API ini untuk mengirimkan draf kerentanan secara aman langsung dari alat eksternal seperti Burp Suite, Python exploit scripts, atau terminal curl.
        </p>

        {loading ? (
          <div style={{ color: 'var(--text2)' }}>Loading key...</div>
        ) : apiKey ? (
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <input
                type="text"
                readOnly
                value={apiKey}
                style={{ flex: 1, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px 14px', color: 'var(--green)', fontSize: '13px', outline: 'none' }}
              />
              <button
                onClick={handleCopy}
                style={{ padding: '10px 20px', borderRadius: '6px', border: '1px solid var(--purple-600)', background: 'var(--purple-900)', color: '#fff', cursor: 'pointer' }}
              >
                {copied ? 'Copied! ✓' : 'Copy'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={generateKey}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border2)', background: 'transparent', color: 'var(--purple-200)', cursor: 'pointer', fontSize: '12px' }}
              >
                Rotate API Key
              </button>
              <button
                onClick={confirmRevokeKey}
                style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(255, 69, 96, 0.3)', background: 'transparent', color: 'var(--red)', cursor: 'pointer', fontSize: '12px' }}
              >
                Revoke Key
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ border: '1px dashed var(--border2)', borderRadius: '6px', padding: '16px', textAlign: 'center', marginBottom: '16px', color: 'var(--text2)' }}>
              Tidak ada Kunci API aktif ditemukan.
            </div>
            <button
              onClick={generateKey}
              style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--purple-600)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Generate API Key
            </button>
          </div>
        )}
      </div>

      {/* Webhooks Panel */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>📡 Webhooks & Notifications</h2>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '20px' }}>
          Terima notifikasi ke platform Anda (Discord, Slack) setiap kali Writeup dibuat atau diupdate.
        </p>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Nama (opsional)" 
            value={hookName} 
            onChange={e => setHookName(e.target.value)}
            style={{ flex: 1, minWidth: '150px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
          <input 
            type="url" 
            placeholder="Webhook URL (https://...)" 
            value={hookUrl} 
            onChange={e => setHookUrl(e.target.value)}
            style={{ flex: 2, minWidth: '200px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
          <select 
            value={hookPlatform} 
            onChange={e => setHookPlatform(e.target.value)}
            style={{ flex: 1, minWidth: '100px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: '#fff', fontSize: '13px', outline: 'none' }}
          >
            <option value="custom">Custom</option>
            <option value="discord">Discord</option>
            <option value="slack">Slack</option>
          </select>
          <button 
            onClick={addWebhook}
            style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: 'var(--purple-600)', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Add
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {webhooks.length === 0 ? (
            <div style={{ color: 'var(--text2)', fontSize: '12px', textAlign: 'center', padding: '10px' }}>Belum ada webhook yang dikonfigurasi.</div>
          ) : webhooks.map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>{h.name} <span style={{ fontSize: '10px', background: 'var(--purple-900)', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>{h.platform}</span></div>
                <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '4px' }}>{h.url.substring(0, 40)}...</div>
              </div>
              <button 
                onClick={() => deleteWebhook(h.id)}
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(255,69,96,0.3)', color: 'var(--red)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Profile, Language & AI Settings Panel */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px', marginBottom: '30px' }}>
        <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '10px' }}>🌐 Language & AI Assistant Configuration</h2>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '20px' }}>
          Configure your UI language preferences and credentials for the AI-Assisted Writeup Generator.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase' }}>UI Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as any)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English (US)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase' }}>AI Provider</label>
            <select
              value={aiProvider}
              onChange={e => setAiProvider(e.target.value)}
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', padding: '10px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            >
              <option value="gemini">Google Gemini (Default)</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="anthropic">Anthropic Claude</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', color: 'var(--text2)', marginBottom: '6px', textTransform: 'uppercase' }}>AI Custom Endpoint (Optional)</label>
            <input
              type="text"
              value={aiEndpoint}
              onChange={e => setAiEndpoint(e.target.value)}
              placeholder="e.g. https://api.openai.com/v1"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', color: '#fff', padding: '10px 14px', borderRadius: '6px', fontSize: '13px', outline: 'none' }}
            />
          </div>

          <button
            onClick={saveProfileSettings}
            style={{ padding: '10px 20px', borderRadius: '6px', border: 'none', background: '#7F77DD', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', alignSelf: 'flex-start' }}
          >
            Save Profile Settings
          </button>
        </div>
      </div>

      {/* Integration Guide */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '24px' }}>
        <h2 style={{ fontSize: '18px', color: '#fff', marginBottom: '14px' }}>🔌 Panduan Integrasi Burp Suite</h2>
        
        <h3 style={{ fontSize: '14px', color: 'var(--purple-200)', marginBottom: '8px' }}>Metode A: Import Lewat Terminal (cURL)</h3>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '12px' }}>
          Simpan HTTP request Anda dalam file `req.txt`, lalu kirim menggunakan cURL:
        </p>
        <pre style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', overflowX: 'auto', fontSize: '11px', color: 'var(--purple-100)', marginBottom: '24px' }}>
          {`curl -X POST http://localhost:3000/api/writeups/import \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey || 'API_KEY_ANDA'}" \\
  -d "{\\"raw_http\\": $(jq -aRs . req.txt)}"`}
        </pre>

        <h3 style={{ fontSize: '14px', color: 'var(--purple-200)', marginBottom: '8px' }}>Metode B: Python Exploit Helper Script</h3>
        <p style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', marginBottom: '12px' }}>
          Gunakan script Python berikut untuk mengirimkan request HTTP mentah Anda ke HackJournal:
        </p>
        <pre style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', overflowX: 'auto', fontSize: '11px', color: 'var(--green)', maxHeight: '320px', overflowY: 'auto', lineHeight: '1.5' }}>
          {pythonScript}
        </pre>
      </div>

      {modalConfig && (
        <CustomModal
          type="confirm"
          title={modalConfig.title}
          message={modalConfig.message}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  )
}
