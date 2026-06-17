'use client'

import { useState, useEffect } from 'react'
import { Terminal, Sparkles, Send, Play } from 'lucide-react'

const AI_STEPS = [
  { text: 'Calculating CVSS v3.1 Score...', type: 'status', delay: 800 },
  { text: 'Score: 9.8 (CRITICAL) | Vector: AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H', type: 'result', delay: 1000 },
  { text: 'Generating Remediation Steps...', type: 'status', delay: 800 },
  { text: '1. Update package "nginx-core" to version 1.25.4-stable or higher.', type: 'remediation', delay: 1500 },
  { text: '2. Restrict HTTP method requests and disable script execution on public uploads.', type: 'remediation', delay: 1500 },
  { text: '3. Enable Rate Limiting and WAF signature matching rules for CVE-2026-1044.', type: 'remediation', delay: 1200 },
  { text: 'Export format: PDF, JSON, and HackerOne Writeup ready.', type: 'done', delay: 1500 }
]

export default function AITypingMockup() {
  const [lines, setLines] = useState<string[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [typedText, setTypedText] = useState('')
  const [promptText, setPromptText] = useState('hj-ai --generate-report --cve CVE-2026-1044')

  useEffect(() => {
    let timer: any
    
    if (currentStep < AI_STEPS.length) {
      const step = AI_STEPS[currentStep]
      
      // If status step, print immediately
      if (step.type === 'status') {
        timer = setTimeout(() => {
          setLines(prev => [...prev, `[+] ${step.text}`])
          setCurrentStep(c => c + 1)
        }, step.delay)
      } else {
        // Typewriter effect for content lines
        let charIndex = 0
        let tempText = ''
        const prefix = step.type === 'result' ? '[!] ' : step.type === 'done' ? '[✔] ' : '    - '
        
        const typeInterval = setInterval(() => {
          if (charIndex < step.text.length) {
            tempText += step.text[charIndex]
            setTypedText(tempText)
            charIndex++
          } else {
            clearInterval(typeInterval)
            setLines(prev => [...prev, `${prefix}${step.text}`])
            setTypedText('')
            timer = setTimeout(() => {
              setCurrentStep(c => c + 1)
            }, 500)
          }
        }, 30) // Typing speed
        
        return () => {
          clearInterval(typeInterval)
          clearTimeout(timer)
        }
      }
    } else {
      // Loop: Reset terminal after some time
      timer = setTimeout(() => {
        setLines([])
        setCurrentStep(0)
        setTypedText('')
      }, 5000)
    }

    return () => clearTimeout(timer)
  }, [currentStep])

  return (
    <div className="w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#0c0c14]/90 shadow-[0_20px_50px_-10px_rgba(127,119,221,0.15)] flex flex-col justify-between h-[300px] font-mono select-none overflow-hidden transition-all duration-300">
      
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.05] bg-[#08080f]/95">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]/30"></span>
          <span className="text-[10px] text-[#9b97cc] font-bold">hj-ai-assistant.sh</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#7F77DD] font-bold">
          <Sparkles size={11} className="text-[#39ff14]" />
          AI Copilot
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 bg-[#07070e] text-xs text-[#d1d5db] overflow-y-auto space-y-2 flex flex-col justify-start text-left">
        
        {/* Terminal Input Command */}
        <div className="flex items-start gap-1 text-[#39ff14]">
          <span className="text-[#00f0ff] font-bold">$</span>
          <span>{promptText}</span>
        </div>

        {/* Output lines */}
        <div className="space-y-1.5">
          {lines.map((line, idx) => {
            const isAlert = line.startsWith('[!]')
            const isSuccess = line.startsWith('[✔]')
            const isStatus = line.startsWith('[+]')
            return (
              <p key={idx} className={`${
                isAlert 
                  ? 'text-rose-400 font-bold' 
                  : isSuccess 
                  ? 'text-[#39ff14] font-semibold' 
                  : isStatus 
                  ? 'text-[#7F77DD]' 
                  : 'text-[#ced4da]'
              }`}>
                {line}
              </p>
            )
          })}
          
          {/* Current typing text */}
          {typedText && (
            <p className={`${
              AI_STEPS[currentStep]?.type === 'result' 
                ? 'text-rose-400 font-bold' 
                : AI_STEPS[currentStep]?.type === 'done' 
                ? 'text-[#39ff14] font-semibold' 
                : 'text-[#ced4da]'
            }`}>
              {AI_STEPS[currentStep]?.type === 'result' ? '[!] ' : AI_STEPS[currentStep]?.type === 'done' ? '[✔] ' : '    - '}
              {typedText}
              <span className="w-1.5 h-3.5 ml-0.5 bg-[#7F77DD] inline-block align-middle animate-ping"></span>
            </p>
          )}

          {/* Blink cursor if waiting for reset */}
          {currentStep === AI_STEPS.length && (
            <div className="flex items-center gap-1 text-[#9b97cc] opacity-70">
              <span className="w-1.5 h-3 bg-white inline-block animate-pulse"></span>
              <span className="text-[10px]">Processing report compilation...</span>
            </div>
          )}
        </div>

      </div>

      {/* Terminal Footer Panel */}
      <div className="p-3 bg-[#0a0a10] border-t border-white/[0.04] flex items-center justify-between text-[10px] text-[#9b97cc]">
        <span className="flex items-center gap-1">
          <Terminal size={11} className="text-[#00f0ff]" />
          AI Engine: GPT-4o Optimized
        </span>
        <span className="text-[#39ff14]/80 flex items-center gap-1 font-semibold">
          <span className="w-1 h-1 bg-[#39ff14] rounded-full animate-ping"></span>
          Ready to Export
        </span>
      </div>

    </div>
  )
}
