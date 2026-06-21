'use client'

interface EncryptionToggleProps {
  isEncrypted: boolean
  setIsEncrypted: (val: boolean) => void
  passphrase: string
  setPassphrase: (val: string) => void
  disabled?: boolean
}

export default function EncryptionToggle({
  isEncrypted,
  setIsEncrypted,
  passphrase,
  setPassphrase,
  disabled = false
}: EncryptionToggleProps) {
  const inputStyle = { width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '20px', opacity: disabled ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: isEncrypted ? '12px' : 0 }}>
        <input
          type="checkbox"
          id="is_encrypted"
          checked={isEncrypted}
          disabled={disabled}
          onChange={e => {
            setIsEncrypted(e.target.checked)
            if (!e.target.checked) setPassphrase('')
          }}
          style={{ accentColor: 'var(--purple-400)', width: '16px', height: '16px', cursor: disabled ? 'not-allowed' : 'pointer' }}
        />
        <label htmlFor="is_encrypted" style={{ color: 'var(--text)', fontSize: '13px', fontFamily: 'monospace', cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          🔒 Aktifkan Enkripsi Zero-Knowledge (AES-256)
        </label>
      </div>
      {isEncrypted && (
        <div>
          <p style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '10px', lineHeight: '1.5' }}>
            Enkripsi dilakukan langsung di dalam browser Anda sebelum dikirim ke server. Server/database tidak akan pernah mengetahui isi tulisan Anda. 
            <span style={{ color: 'var(--red)', fontWeight: 'bold' }}> PENTING: Jika password ini hilang, data tidak akan bisa dipulihkan!</span>
          </p>
          <input
            type="password"
            placeholder="Masukkan Passphrase Enkripsi..."
            value={passphrase}
            disabled={disabled}
            onChange={e => setPassphrase(e.target.value)}
            required={isEncrypted}
            style={{ ...inputStyle, width: '100%', maxWidth: '350px', cursor: disabled ? 'not-allowed' : 'text' }}
          />
        </div>
      )}
    </div>
  )
}
