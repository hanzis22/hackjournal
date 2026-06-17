'use client'

import { useState } from 'react'
import { 
  Shield, 
  Lock, 
  Terminal, 
  FileText, 
  Settings, 
  Users, 
  Award, 
  Layers, 
  Activity, 
  ArrowRight,
  Sparkles,
  Search,
  Plus
} from 'lucide-react'

// Dummy writeups database for the hero mockup
const MOCK_WRITEUPS = [
  {
    id: 1,
    title: 'RCE via CVE-2026-4011 Apache Solr',
    severity: 'Critical',
    score: 9.8,
    color: '#ef4444', // Red
    target: 'solr-prod-02.acme.corp',
    chain: [
      { id: 'start', label: 'Internet', type: 'source' },
      { id: 'exploit', label: 'RCE CVE-2026-4011', type: 'exploit', details: 'Remote Code Execution in Admin panel' },
      { id: 'root', label: 'Root Shell', type: 'target' }
    ],
    content: `# RCE via CVE-2026-4011 Apache Solr

**Target:** solr-prod-02.acme.corp  
**CVSS Score:** 9.8 (Critical)

## Executive Summary
A remote code execution vulnerability was identified in the Apache Solr instance due to insecure deserialization. This allows an unauthenticated external attacker to run arbitrary code with root privileges.

## Proof of Concept
\`\`\`bash
$ curl -X POST http://solr-prod-02.acme.corp:8983/solr/admin -d 'payload=...'
# Output: root:x:0:0:root:/root:/bin/bash
\`\`\``
  },
  {
    id: 2,
    title: 'OAuth Misconfiguration Token Leakage',
    severity: 'High',
    score: 8.2,
    color: '#f97316', // Orange
    target: 'auth.acme-staging.net',
    chain: [
      { id: 'start', label: 'Phishing / Redirect', type: 'source' },
      { id: 'exploit', label: 'OAuth Token Hijack', type: 'exploit', details: 'Leaking state parameter in callback URL' },
      { id: 'root', label: 'User Account Takeover', type: 'target' }
    ],
    content: `# OAuth Misconfiguration Token Leakage

**Target:** auth.acme-staging.net  
**CVSS Score:** 8.2 (High)

## Executive Summary
The state parameter in the OAuth flow is not properly validated, allowing authorization codes to be leaked via Referer headers to external endpoints when logging in.

## Proof of Concept
1. Intercept callback request at \`auth.acme-staging.net/callback\`
2. Observe state parameter omission.
3. Token is sent to \`evil-attacker.com\` via referer header.`
  },
  {
    id: 3,
    title: 'Active Directory Kerberoasting Domain Admin',
    severity: 'High',
    score: 7.5,
    color: '#f97316', // Orange
    target: 'dc01.acme.local',
    chain: [
      { id: 'start', label: 'Internal Network', type: 'source' },
      { id: 'exploit', label: 'Kerberoast (TGS Crack)', type: 'exploit', details: 'Request SPNs and crack hash offline' },
      { id: 'root', label: 'Domain Admin Access', type: 'target' }
    ],
    content: `# Active Directory Kerberoasting Domain Admin

**Target:** dc01.acme.local  
**CVSS Score:** 7.5 (High)

## Executive Summary
Standard domain user was able to request service tickets (TGS-REP) for SPNs running with elevated service accounts and crack the NTLM hash offline.

## Proof of Concept
\`\`\`powershell
PS C:\\> Get-DomainSPN -Username "srv_sql" | Get-TGSTicket
# Cracked Hash: Admin123!
\`\`\``
  }
]

export default function DashboardHeroMockup() {
  const [activeWriteupId, setActiveWriteupId] = useState(1)
  const currentWriteup = MOCK_WRITEUPS.find(w => w.id === activeWriteupId) || MOCK_WRITEUPS[0]

  return (
    <div className="w-full max-w-5xl mx-auto rounded-xl border border-white/[0.08] bg-[#0c0c14]/90 shadow-[0_25px_60px_-15px_rgba(127,119,221,0.25)] backdrop-blur-md overflow-hidden text-left font-sans select-none">
      {/* Browser Window Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-[#08080f]/95">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
        </div>
        <div className="px-6 py-1 bg-white/[0.03] border border-white/[0.05] rounded-md text-[11px] text-[#9b97cc] font-mono tracking-wider w-72 truncate text-center">
          hackjournal.io/dashboard/writeups/{currentWriteup.id}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 text-[9px] font-bold bg-[#39ff14]/10 border border-[#39ff14]/30 text-[#39ff14] rounded font-mono uppercase animate-pulse">
            E2E Encrypted
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 min-h-[520px] bg-[#0a0a10]">
        
        {/* Mock Sidebar */}
        <div className="md:col-span-1 border-r border-white/[0.05] bg-[#08080e] flex flex-col text-[#9b97cc]">
          {/* Logo & Workspace Title */}
          <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7F77DD] to-[#534AB7] flex items-center justify-center font-bold text-xs text-white shadow-[0_0_8px_rgba(127,119,221,0.3)]">
                ⬡
              </div>
              <span className="text-white font-bold text-sm font-mono">HackJournal</span>
            </div>
            <div className="p-1 rounded hover:bg-white/[0.05] cursor-pointer text-xs text-white">
              <Plus size={14} className="text-[#39ff14]" />
            </div>
          </div>

          {/* Quick Menu */}
          <div className="p-3 border-b border-white/[0.04] space-y-1">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs bg-white/[0.04] text-[#e8e6ff] font-medium cursor-pointer">
              <FileText size={14} className="text-[#7F77DD]" />
              <span>Writeups</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs hover:bg-white/[0.02] hover:text-[#e8e6ff] transition cursor-pointer">
              <Lock size={14} className="text-[#00f0ff]" />
              <span>Vault</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs hover:bg-white/[0.02] hover:text-[#e8e6ff] transition cursor-pointer">
              <Layers size={14} className="text-pink-400" />
              <span>Engagements</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs hover:bg-white/[0.02] hover:text-[#e8e6ff] transition cursor-pointer">
              <Users size={14} className="text-amber-400" />
              <span>Team Vault</span>
            </div>
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs hover:bg-white/[0.02] hover:text-[#e8e6ff] transition cursor-pointer">
              <Activity size={14} className="text-teal-400" />
              <span>Analytics</span>
            </div>
          </div>

          {/* Writeups List */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[300px] md:max-h-none">
            <div className="px-2 text-[10px] uppercase font-bold tracking-wider opacity-60 flex items-center justify-between">
              <span>Recent Writeups</span>
              <Search size={10} />
            </div>
            <div className="space-y-1.5 mt-1.5">
              {MOCK_WRITEUPS.map(w => {
                const isActive = w.id === activeWriteupId
                return (
                  <div
                    key={w.id}
                    onClick={() => setActiveWriteupId(w.id)}
                    className={`group px-3 py-2.5 rounded-lg text-[11px] font-mono leading-relaxed transition cursor-pointer ${
                      isActive 
                        ? 'bg-gradient-to-r from-[#26215c]/60 to-[#18153c]/40 border border-[#7F77DD]/30 text-white shadow-[0_2px_10px_rgba(0,0,0,0.2)]' 
                        : 'border border-transparent hover:bg-white/[0.02] text-[#9b97cc] hover:text-[#e8e6ff]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: w.color }} />
                      <div className="flex-1 truncate">
                        <p className="font-semibold truncate">{w.title}</p>
                        <p className="text-[9px] opacity-65 flex items-center justify-between mt-1">
                          <span>{w.target}</span>
                          <span className="px-1 py-0.2 rounded bg-black/40 text-rose-300 font-bold border border-white/[0.05]">
                            {w.score.toFixed(1)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mock Editor and Graph Area */}
        <div className="md:col-span-3 flex flex-col bg-[#0b0b12] text-white overflow-hidden">
          {/* Editor Header Bar */}
          <div className="p-4 border-b border-white/[0.05] bg-[#0c0c15] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold font-mono tracking-tight text-white flex items-center gap-2">
                <FileText size={14} className="text-[#7F77DD]" />
                {currentWriteup.title}
              </h2>
              <p className="text-[10px] text-[#9b97cc] font-mono mt-0.5">
                Target: <span className="text-emerald-400">{currentWriteup.target}</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* CVSS Severity Pill */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold shadow-sm"
                style={{ 
                  backgroundColor: `${currentWriteup.color}15`, 
                  borderColor: `${currentWriteup.color}40`,
                  borderWidth: '1px',
                  color: currentWriteup.color
                }}
              >
                <Shield size={12} />
                <span>{currentWriteup.severity} ({currentWriteup.score})</span>
              </div>
              
              <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-mono font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Ready</span>
              </div>
            </div>
          </div>

          {/* Split Content Pane (Attack Chain Graph & Raw Markdown Editor preview) */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Visual Editor Pane (Interactive Attack Chain) */}
            <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-white/[0.05] flex flex-col justify-between bg-[#08080f]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-bold text-[#9b97cc] tracking-widest font-mono flex items-center gap-1">
                  <Sparkles size={11} className="text-[#00f0ff]" />
                  Attack Chain Preview
                </span>
                <span className="text-[9px] text-[#00f0ff] font-mono border border-[#00f0ff]/30 bg-[#00f0ff]/10 px-1.5 py-0.5 rounded">
                  Interactive Diagram
                </span>
              </div>

              {/* Node Chain Editor Graphic */}
              <div className="flex-1 flex flex-col justify-center items-center py-6">
                <div className="flex flex-col items-center gap-6 w-full max-w-xs font-mono relative">
                  {currentWriteup.chain.map((node, index) => {
                    const isLast = index === currentWriteup.chain.length - 1
                    return (
                      <div key={node.id} className="flex flex-col items-center w-full">
                        {/* Node Box */}
                        <div className={`w-full p-3 rounded-lg border flex items-center justify-between group transition-all duration-300 ${
                          node.type === 'source' 
                            ? 'bg-zinc-900/40 border-zinc-700/50 hover:border-zinc-500/80 shadow-[0_0_10px_rgba(255,255,255,0.02)]'
                            : node.type === 'exploit'
                            ? 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/80 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                            : 'bg-emerald-500/10 border-emerald-500/40 hover:border-emerald-500/80 shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <span className={`text-[10px] font-bold ${
                              node.type === 'source' ? 'text-zinc-400' : node.type === 'exploit' ? 'text-rose-400' : 'text-[#39ff14]'
                            }`}>
                              {node.type === 'source' ? '🌐' : node.type === 'exploit' ? '⚡' : '🏁'}
                            </span>
                            <span className="text-xs font-bold text-white truncate">{node.label}</span>
                          </div>
                          <span className="text-[9px] text-[#9b97cc] capitalize bg-white/[0.03] px-1.5 py-0.5 rounded border border-white/[0.04]">
                            {node.type}
                          </span>
                        </div>

                        {/* Connector Arrow */}
                        {!isLast && (
                          <div className="my-1.5 flex flex-col items-center text-center">
                            <div className="h-6 w-0.5 bg-gradient-to-b from-[#7F77DD] to-[#00f0ff] animate-pulse"></div>
                            <ArrowRight size={10} className="transform rotate-90 text-[#00f0ff] -mt-1" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="text-[9.5px] text-[#9b97cc] font-mono leading-relaxed bg-[#0c0c14] border border-white/[0.04] p-2.5 rounded-lg">
                <span className="text-emerald-400 font-bold">💡 Tip:</span> HackJournal dynamically updates these chains directly inside reports to speed up triage.
              </div>
            </div>

            {/* Code / Writeup Markdown Pane */}
            <div className="flex-1 p-4 bg-[#0a0a10] flex flex-col justify-between font-mono">
              <div className="flex items-center justify-between mb-3 border-b border-white/[0.04] pb-2 text-[#9b97cc] text-[10px]">
                <span className="uppercase font-bold tracking-wider">Markdown Writeup</span>
                <span>Auto-Saved</span>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[220px] text-xs text-[#ced4da] pr-1 scrollbar-thin">
                <pre className="whitespace-pre-wrap leading-relaxed select-text font-mono">
                  {currentWriteup.content}
                </pre>
              </div>

              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-[#9b97cc]">
                  <Terminal size={12} className="text-[#39ff14]" />
                  <span>Lines: {currentWriteup.content.split('\n').length}</span>
                </div>
                <div className="text-[9px] px-2 py-0.5 rounded bg-[#7F77DD]/10 text-[#7F77DD] border border-[#7F77DD]/20 font-semibold uppercase">
                  PDF & JSON Ready
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
