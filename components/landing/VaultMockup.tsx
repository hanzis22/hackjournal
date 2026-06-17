'use client'

import { useState, useEffect } from 'react'
import { Lock, Unlock, ShieldAlert, Key, EyeOff, Eye } from 'lucide-react'

export default function VaultMockup() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hexData, setHexData] = useState<string[]>([])
  
  // Scrambled ciphertext
  const ciphertext = [
    '8f3c71a9b2d0e4f8c6b301a9b8e76c5d',
    '3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
    '77a88b99c00d11e22f33a44b55c66d77',
    'a1b2c3d4e5f60718293a4b5c6d7e8f90',
  ]

  // Plaintext findings
  const plaintext = [
    'hj_db_pass = "s3cr3t_p@ss_9934"',
    'client_key = "hj_api_09f381ab45"',
    'exploit_hash = "0x892ba3fd672"',
    'target_root = "admin:P@ssw0rd1337"',
  ]

  useEffect(() => {
    // Continuous random scrambling of characters when locked
    if (!isUnlocked) {
      const interval = setInterval(() => {
        setHexData(
          ciphertext.map(line => 
            line.split('').map(char => 
              Math.random() > 0.85 ? Math.floor(Math.random() * 16).toString(16) : char
            ).join('')
          )
        )
      }, 150)
      return () => clearInterval(interval)
    } else {
      setHexData(plaintext)
    }
  }, [isUnlocked])

  return (
    <div 
      className="w-full max-w-sm p-6 rounded-xl border border-white/[0.08] bg-[#0c0c14]/90 shadow-[0_20px_50px_-10px_rgba(127,119,221,0.15)] flex flex-col justify-between h-[300px] font-mono select-none group relative overflow-hidden transition-all duration-300"
      onMouseEnter={() => setIsUnlocked(true)}
      onMouseLeave={() => setIsUnlocked(false)}
    >
      {/* Decorative Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

      {/* Header Info */}
      <div className="flex items-center justify-between z-10 border-b border-white/[0.04] pb-3">
        <span className="text-[10px] text-[#9b97cc] font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Key size={12} className={isUnlocked ? 'text-[#39ff14]' : 'text-[#7F77DD]'} />
          Vault Decryption Engine
        </span>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border transition-all font-bold ${
          isUnlocked 
            ? 'bg-[#39ff14]/10 border-[#39ff14]/30 text-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.15)]'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {isUnlocked ? 'DECRYPTED' : 'ENCRYPTED'}
        </span>
      </div>

      {/* Center Padlock Visual */}
      <div className="flex flex-col items-center justify-center py-4 z-10 transition-transform duration-300 group-hover:scale-105">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-500 ${
          isUnlocked 
            ? 'bg-[#39ff14]/10 border-[#39ff14]/40 text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.3)]' 
            : 'bg-rose-500/5 border-rose-500/20 text-rose-500'
        }`}>
          {isUnlocked ? (
            <Unlock size={28} className="animate-bounce" />
          ) : (
            <Lock size={28} className="animate-pulse" />
          )}
        </div>
        
        <p className={`text-[10px] mt-3 font-semibold transition-all duration-300 ${
          isUnlocked ? 'text-[#39ff14]' : 'text-[#9b97cc]'
        }`}>
          {isUnlocked ? 'Local AES-256 Key Verified' : 'Hover to Decrypt PoC'}
        </p>
      </div>

      {/* Encrypted / Decrypted Data Streams */}
      <div className="bg-[#07070e] border border-white/[0.05] rounded-lg p-3 z-10 text-[10.5px] relative overflow-hidden h-[100px] flex flex-col justify-center">
        {/* Matrix background blur effect */}
        <div className={`absolute inset-0 bg-[#39ff14]/[0.02] transition-opacity duration-300 ${isUnlocked ? 'opacity-100' : 'opacity-0'}`}></div>
        
        <div className="space-y-1.5 relative z-10 font-mono">
          {hexData.map((line, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <span className={`transition-all duration-300 ${isUnlocked ? 'text-[#39ff14] font-semibold' : 'text-[#9b97cc]/40'}`}>
                {isUnlocked ? `[SUCCESS] ➜ ${line}` : `[AES_CIPHER] : 0x${line}`}
              </span>
              {!isUnlocked ? (
                <EyeOff size={10} className="text-rose-500/40" />
              ) : (
                <Eye size={10} className="text-[#39ff14]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
