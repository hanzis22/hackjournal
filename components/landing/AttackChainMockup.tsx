'use client'

import { useState } from 'react'
import { GitFork, ShieldAlert, CheckCircle, Terminal, HelpCircle, ArrowRight } from 'lucide-react'

interface ChainNode {
  id: string
  title: string
  cve: string
  cvss: number
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  color: string
  description: string
  mitigation: string
  icon: string
}

const NODES: ChainNode[] = [
  {
    id: 'foothold',
    title: 'Initial Foothold',
    cve: 'Phishing Foothold',
    cvss: 4.3,
    severity: 'Medium',
    color: '#f0a500',
    description: 'Spear-phishing attachment executed on corporate workstation. Established stable user-space beacon.',
    mitigation: 'Implement strict email filtering, SPF/DKIM policies, and endpoint detection and response (EDR).',
    icon: '📧'
  },
  {
    id: 'lfi',
    title: 'Local File Inclusion',
    cve: 'CVE-2026-1934',
    cvss: 7.5,
    severity: 'High',
    color: '#f97316',
    description: 'Found unauthenticated file read vulnerability in internal logging API path: /api/v1/logs?path=../../../etc/passwd.',
    mitigation: 'Sanitize input paths, enforce directory indexing restrictions, and run webserver under limited privilege accounts.',
    icon: '📁'
  },
  {
    id: 'privesc',
    title: 'Local Privilege Escalation',
    cve: 'CVE-2026-3024',
    cvss: 8.8,
    severity: 'High',
    color: '#f97316',
    description: 'Exploited kernel buffer overflow vulnerability to elevate privileges from standard local user to administrative NT AUTHORITY\\SYSTEM.',
    mitigation: 'Apply security patches immediately. Restrict user privileges and monitor kernel events.',
    icon: '⚡'
  },
  {
    id: 'db_exfil',
    title: 'Domain Database Dump',
    cve: 'Data Exfiltration',
    cvss: 9.8,
    severity: 'Critical',
    color: '#ef4444',
    description: 'Full takeover of Domain Controller. Dumped Active Directory database containing credentials and NTLM password hashes.',
    mitigation: 'Implement strict network segmentation. Regularly audit domain administrator privileges.',
    icon: '🏆'
  }
]

export default function AttackChainMockup() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('lfi')
  const activeNode = NODES.find(n => n.id === selectedNodeId) || NODES[0]

  return (
    <div className="w-full max-w-md p-5 rounded-xl border border-white/[0.08] bg-[#0c0c14]/90 shadow-[0_20px_50px_-10px_rgba(127,119,221,0.15)] flex flex-col justify-between min-h-[340px] font-sans select-none relative overflow-hidden transition-all duration-300">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.04] pb-2 mb-3">
        <span className="text-[10px] text-[#9b97cc] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
          <GitFork size={12} className="text-[#00f0ff] rotate-90" />
          Interactive Attack Chain Map
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00f0ff]/10 border border-[#00f0ff]/20 text-[#00f0ff] font-mono">
          Click Nodes
        </span>
      </div>

      {/* Nodes Map Grid */}
      <div className="flex flex-wrap justify-center items-center gap-3 py-3 relative">
        {NODES.map((node, index) => {
          const isSelected = node.id === selectedNodeId
          const isLast = index === NODES.length - 1
          
          return (
            <div key={node.id} className="flex items-center">
              {/* Node Button */}
              <button
                onClick={() => setSelectedNodeId(node.id)}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all duration-300 ${
                  isSelected 
                    ? 'bg-gradient-to-b from-[#26215c]/80 to-[#131328]/60 text-white border-[#00f0ff] shadow-[0_0_15px_rgba(0,240,255,0.25)] scale-105' 
                    : 'bg-[#08080f]/90 border-white/[0.06] text-[#9b97cc] hover:border-[#7F77DD]/40 hover:text-white'
                }`}
                style={{ width: '82px' }}
              >
                <span className="text-xl mb-1">{node.icon}</span>
                <span className="text-[9px] font-bold text-center leading-tight truncate w-full">{node.title}</span>
                <span 
                  className="text-[7.5px] font-bold font-mono px-1 py-0.2 rounded mt-1"
                  style={{
                    backgroundColor: `${node.color}15`,
                    borderColor: `${node.color}30`,
                    borderWidth: '1px',
                    color: node.color
                  }}
                >
                  {node.severity}
                </span>
              </button>

              {/* Arrow Connector */}
              {!isLast && (
                <div className="flex-shrink-0 text-white/20 px-0.5">
                  <ArrowRight size={12} className={`animate-pulse ${isSelected ? 'text-[#00f0ff]' : 'text-[#7F77DD]/40'}`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Node Description Details Card (Glassmorphic look) */}
      <div className="mt-3 bg-[#07070e] border border-white/[0.05] rounded-lg p-3 text-[11px] font-mono leading-relaxed relative min-h-[120px] flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-1 mb-2">
            <span className="text-white font-bold text-[11.5px] flex items-center gap-1.5">
              <span>{activeNode.icon}</span>
              {activeNode.title}
            </span>
            <span 
              className="text-[9px] font-bold px-1.5 py-0.2 rounded"
              style={{
                backgroundColor: `${activeNode.color}10`,
                borderColor: `${activeNode.color}30`,
                borderWidth: '1px',
                color: activeNode.color
              }}
            >
              {activeNode.cve} (CVSS {activeNode.cvss.toFixed(1)})
            </span>
          </div>

          <p className="text-[#9b97cc] text-[10.5px]">
            {activeNode.description}
          </p>
        </div>

        <div className="mt-2 pt-2 border-t border-white/[0.04] text-[9.5px]">
          <span className="text-emerald-400 font-bold">Mitigation: </span>
          <span className="text-[#ced4da]">{activeNode.mitigation}</span>
        </div>
      </div>

    </div>
  )
}
