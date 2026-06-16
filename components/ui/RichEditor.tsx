'use client'
import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (val: string) => void
}

export default function RichEditor({ value, onChange }: Props) {
  const [Editor, setEditor] = useState<any>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    import('react-quill-new').then(mod => {
      setEditor(() => mod.default)
      import('react-quill-new/dist/quill.snow.css')
    })
  }, [])

  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }

  if (!mounted || !Editor) {
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '8px', minHeight: '300px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text2)', fontFamily: 'monospace', fontSize: '13px'
      }}>
        // Loading editor...
      </div>
    )
  }

  return (
    <Editor
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      style={{ fontFamily: 'monospace' }}
    />
  )
}
