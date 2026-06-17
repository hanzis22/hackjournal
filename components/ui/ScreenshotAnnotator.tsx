'use client'
import React, { useRef, useState, useEffect } from 'react'

interface ScreenshotAnnotatorProps {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  initialImage?: string
}

type Tool = 'pen' | 'rect' | 'arrow' | 'text' | 'blur'

export default function ScreenshotAnnotator({ onSave, onCancel, initialImage }: ScreenshotAnnotatorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null)
  
  const [currentTool, setCurrentTool] = useState<Tool>('rect')
  const [color, setColor] = useState('#ff003c')
  const [lineWidth, setLineWidth] = useState(3)
  
  const handleImageFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')
      if (canvas && context) {
        canvas.width = img.width
        canvas.height = img.height
        context.drawImage(img, 0, 0)
        setBgImage(img)
        setImageLoaded(true)
      }
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleImageFile(file)
    }
  }

  const [textInput, setTextInput] = useState<{ x: number, y: number, canvasX: number, canvasY: number } | null>(null)
  const [textValue, setTextValue] = useState('')

  const commitText = () => {
    if (!textInput || !ctx || !canvasRef.current) return
    const text = textValue.trim()
    if (text) {
      ctx.font = `bold ${lineWidth * 6}px monospace`
      ctx.fillStyle = color
      ctx.fillText(text, textInput.canvasX, textInput.canvasY)
    }
    setTextInput(null)
    setTextValue('')
  }
  
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [snapshot, setSnapshot] = useState<ImageData | null>(null)
  
  const [imageLoaded, setImageLoaded] = useState(false)
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const context = canvas.getContext('2d')
      setCtx(context)
      
      if (initialImage) {
        const img = new Image()
        img.onload = () => {
          canvas.width = img.width
          canvas.height = img.height
          context?.drawImage(img, 0, 0)
          setBgImage(img)
          setImageLoaded(true)
        }
        img.src = initialImage
      } else {
        // Default empty canvas size
        canvas.width = 800
        canvas.height = 600
        if (context) {
          context.fillStyle = '#1e1e2e'
          context.fillRect(0, 0, canvas.width, canvas.height)
        }
        setImageLoaded(true)
      }
    }
  }, [initialImage])

  // Handle paste events globally within this component
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile()
          if (blob) {
            const url = URL.createObjectURL(blob)
            const img = new Image()
            img.onload = () => {
              const canvas = canvasRef.current
              const context = canvas?.getContext('2d')
              if (canvas && context) {
                canvas.width = img.width
                canvas.height = img.height
                context.drawImage(img, 0, 0)
                setBgImage(img)
                setImageLoaded(true)
              }
              URL.revokeObjectURL(url)
            }
            img.src = url
          }
          break
        }
      }
    }
    
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || !canvasRef.current) return
    
    setIsDrawing(true)
    const rect = canvasRef.current.getBoundingClientRect()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    // Calculate scale because CSS width might be different from actual canvas width
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY
    
    setStartPos({ x, y })
    setSnapshot(ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height))
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current || !snapshot) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    const scaleX = canvasRef.current.width / rect.width
    const scaleY = canvasRef.current.height / rect.height
    
    const x = (clientX - rect.left) * scaleX
    const y = (clientY - rect.top) * scaleY

    // Restore snapshot
    ctx.putImageData(snapshot, 0, 0)
    
    if (currentTool === 'pen') {
      ctx.lineTo(x, y)
      ctx.stroke()
    } else if (currentTool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y)
    } else if (currentTool === 'arrow') {
      // Draw line
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(x, y)
      ctx.stroke()
      
      // Draw arrowhead
      const angle = Math.atan2(y - startPos.y, x - startPos.x)
      const headLen = 15
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x - headLen * Math.cos(angle - Math.PI / 6), y - headLen * Math.sin(angle - Math.PI / 6))
      ctx.lineTo(x - headLen * Math.cos(angle + Math.PI / 6), y - headLen * Math.sin(angle + Math.PI / 6))
      ctx.fill()
    } else if (currentTool === 'blur') {
      // Create a pixelated/blur effect by copying the rect, shrinking it, and scaling it back up
      const blurW = x - startPos.x
      const blurH = y - startPos.y
      if (Math.abs(blurW) > 5 && Math.abs(blurH) > 5) {
        // Just draw a black semitransparent rect for redaction in this simple version
        ctx.fillStyle = '#000000'
        ctx.fillRect(startPos.x, startPos.y, blurW, blurH)
        ctx.fillStyle = color // restore
      }
    }
  }

  const endDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx || !canvasRef.current) return
    setIsDrawing(false)
    
    if (currentTool === 'text') {
      const rect = canvasRef.current.getBoundingClientRect()
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return

      const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX
      const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY
      
      const scaleX = canvasRef.current.width / rect.width
      const scaleY = canvasRef.current.height / rect.height
      
      const x = (clientX - rect.left) * scaleX
      const y = (clientY - rect.top) * scaleY
      
      setTextInput({
        x: clientX - containerRect.left,
        y: clientY - containerRect.top,
        canvasX: x,
        canvasY: y
      })
    }
  }

  const handleClear = () => {
    if (!ctx || !canvasRef.current) return
    if (bgImage) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      ctx.drawImage(bgImage, 0, 0)
    } else {
      ctx.fillStyle = '#1e1e2e'
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
  }

  const handleSave = () => {
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'))
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(5, 5, 8, 0.9)', backdropFilter: 'blur(10px)',
      zIndex: 3000, display: 'flex', flexDirection: 'column',
      fontFamily: 'monospace'
    }}>
      {/* Toolbar */}
      <div style={{
        height: '60px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontWeight: 'bold', marginRight: '10px' }}>🖼️ ANNOTATOR</span>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{ 
              padding: '6px 12px', 
              background: 'rgba(127,119,221,0.1)', 
              border: '1px solid var(--purple-600)', 
              borderRadius: '6px', 
              color: '#fff', 
              cursor: 'pointer', 
              fontSize: '11px',
              fontWeight: 'bold',
              marginRight: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📂 Upload Image
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            onChange={handleImageUpload} 
            style={{ display: 'none' }} 
          />

          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: '6px', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <button onClick={() => setCurrentTool('rect')} style={{ padding: '8px 12px', background: currentTool === 'rect' ? 'var(--purple-600)' : 'transparent', color: currentTool === 'rect' ? '#fff' : 'var(--text2)', border: 'none', cursor: 'pointer' }}>Rect</button>
            <button onClick={() => setCurrentTool('arrow')} style={{ padding: '8px 12px', background: currentTool === 'arrow' ? 'var(--purple-600)' : 'transparent', color: currentTool === 'arrow' ? '#fff' : 'var(--text2)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer' }}>Arrow</button>
            <button onClick={() => setCurrentTool('pen')} style={{ padding: '8px 12px', background: currentTool === 'pen' ? 'var(--purple-600)' : 'transparent', color: currentTool === 'pen' ? '#fff' : 'var(--text2)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer' }}>Pen</button>
            <button onClick={() => setCurrentTool('text')} style={{ padding: '8px 12px', background: currentTool === 'text' ? 'var(--purple-600)' : 'transparent', color: currentTool === 'text' ? '#fff' : 'var(--text2)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer' }}>Text</button>
            <button onClick={() => setCurrentTool('blur')} style={{ padding: '8px 12px', background: currentTool === 'blur' ? 'var(--purple-600)' : 'transparent', color: currentTool === 'blur' ? '#fff' : 'var(--text2)', border: 'none', borderLeft: '1px solid var(--border)', cursor: 'pointer' }}>Redact</button>
          </div>

          <input 
            type="color" 
            value={color} 
            onChange={e => setColor(e.target.value)}
            style={{ width: '32px', height: '32px', padding: '0', border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
          />
          
          <input 
            type="range" 
            min="1" max="10" 
            value={lineWidth} 
            onChange={e => setLineWidth(Number(e.target.value))}
            style={{ width: '80px', accentColor: 'var(--purple-500)' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleClear} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer' }}>Clear</button>
          <button onClick={onCancel} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text2)', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: 'var(--green)', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Save & Insert</button>
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}
      >
        {!imageLoaded && !initialImage && (
          <div style={{ position: 'absolute', color: 'var(--text2)', textAlign: 'center', zIndex: 10 }}>
            <p style={{ fontSize: '15px', color: '#fff', marginBottom: '8px' }}>Paste an image (Ctrl+V) to start</p>
            <p style={{ fontSize: '12px', marginBottom: '16px' }}>or draw on the empty canvas</p>
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '10px 20px',
                background: '#7F77DD',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '12px',
                boxShadow: '0 0 15px rgba(127,119,221,0.4)'
              }}
            >
              📂 Select File / Upload Image
            </button>
          </div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseOut={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ 
            boxShadow: '0 0 40px rgba(0,0,0,0.5)', 
            cursor: currentTool === 'text' ? 'text' : 'crosshair',
            maxWidth: '100%',
            objectFit: 'contain'
          }}
        />
        {textInput && (
          <input
            type="text"
            value={textValue}
            onChange={e => setTextValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                commitText()
              } else if (e.key === 'Escape') {
                setTextInput(null)
                setTextValue('')
              }
            }}
            onBlur={commitText}
            autoFocus
            style={{
              position: 'absolute',
              left: `${textInput.x}px`,
              top: `${textInput.y}px`,
              background: 'rgba(7, 7, 16, 0.95)',
              border: `2px solid ${color}`,
              color: '#fff',
              fontSize: `${lineWidth * 4 + 8}px`,
              fontFamily: 'monospace',
              padding: '4px 8px',
              borderRadius: '4px',
              outline: 'none',
              zIndex: 100,
              transform: 'translateY(-50%)',
              minWidth: '150px'
            }}
          />
        )}
      </div>
    </div>
  )
}
