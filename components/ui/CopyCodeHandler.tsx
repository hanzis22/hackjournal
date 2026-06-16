'use client'
import { useEffect } from 'react'

export default function CopyCodeHandler({ contentId }: { contentId: any }) {
  useEffect(() => {
    // Jeda singkat memastikan HTML konten selesai dirender di DOM oleh dangerouslySetInnerHTML
    const timer = setTimeout(() => {
      const preBlocks = document.querySelectorAll('.writeup-content pre')
      
      preBlocks.forEach((pre) => {
        // Hindari penumpukan tombol jika sudah ada
        if (pre.querySelector('.copy-code-btn')) return

        pre.style.position = 'relative'
        const code = pre.querySelector('code')
        const textToCopy = code ? code.innerText : (pre as HTMLElement).innerText

        const button = document.createElement('button')
        button.className = 'copy-code-btn'
        button.innerText = 'Copy'
        button.style.position = 'absolute'
        button.style.top = '8px'
        button.style.right = '8px'
        button.style.padding = '4px 8px'
        button.style.fontSize = '11px'
        button.style.fontFamily = 'monospace'
        button.style.background = 'var(--bg2)'
        button.style.border = '1px solid var(--border)'
        button.style.borderRadius = '4px'
        button.style.color = 'var(--text2)'
        button.style.cursor = 'pointer'
        button.style.zIndex = '10'
        button.style.transition = 'all 0.2s ease'

        button.addEventListener('mouseover', () => {
          button.style.borderColor = 'var(--purple-400)'
          button.style.color = 'var(--text)'
        })
        button.addEventListener('mouseout', () => {
          button.style.borderColor = 'var(--border)'
          button.style.color = 'var(--text2)'
        })

        button.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(textToCopy)
            button.innerText = 'Copied!'
            button.style.background = 'rgba(57,255,20,0.1)'
            button.style.borderColor = 'var(--green)'
            button.style.color = 'var(--green)'
            
            setTimeout(() => {
              button.innerText = 'Copy'
              button.style.background = 'var(--bg2)'
              button.style.borderColor = 'var(--border)'
              button.style.color = 'var(--text2)'
            }, 2000)
          } catch (err) {
            console.error('Failed to copy text: ', err)
          }
        })

        pre.appendChild(button)
      })
    }, 100)

    return () => clearTimeout(timer)
  }, [contentId])

  return null
}
