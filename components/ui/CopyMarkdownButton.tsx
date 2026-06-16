'use client'
import { useState } from 'react'
import { generateAdvisoryMarkdown } from '@/lib/markdown'

interface Props {
  writeup: any
}

export default function CopyMarkdownButton({ writeup }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      const markdown = generateAdvisoryMarkdown(writeup)
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy markdown:', err)
      alert('Gagal menyalin markdown ke clipboard.')
    }
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '7px 16px',
        borderRadius: '6px',
        border: '1px solid var(--border2)',
        background: 'transparent',
        color: copied ? 'var(--green)' : 'var(--purple-200)',
        cursor: 'pointer',
        fontFamily: 'monospace',
        fontSize: '13px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.2s ease',
      }}
    >
      {copied ? '✓ Copied Markdown!' : '📋 Copy Markdown'}
    </button>
  )
}
