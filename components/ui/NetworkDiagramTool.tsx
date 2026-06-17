'use client'
import React, { useState, useRef, useEffect } from 'react'

export interface DiagramNode {
  id: string
  x: number
  y: number
  label: string
  type: 'attacker' | 'server' | 'database' | 'firewall' | 'user'
}

export interface DiagramEdge {
  id: string
  source: string
  target: string
  label?: string
}

export interface DiagramData {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

interface NetworkDiagramToolProps {
  initialData?: string
  onChange: (data: string) => void
}

export default function NetworkDiagramTool({ initialData, onChange }: NetworkDiagramToolProps) {
  const [data, setData] = useState<DiagramData>(() => {
    if (initialData) {
      try { return JSON.parse(initialData) } catch {}
    }
    return { nodes: [], edges: [] }
  })

  const [draggingNode, setDraggingNode] = useState<string | null>(null)
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  // Save to parent
  useEffect(() => {
    onChange(JSON.stringify(data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const addNode = (type: DiagramNode['type']) => {
    const id = `node_${Date.now()}`
    setData(prev => ({
      ...prev,
      nodes: [...prev.nodes, { id, type, x: 100, y: 100, label: type.toUpperCase() }]
    }))
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNode && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setData(prev => ({
        ...prev,
        nodes: prev.nodes.map(n => n.id === draggingNode ? { ...n, x, y } : n)
      }))
    }
  }

  const handleMouseUp = () => {
    setDraggingNode(null)
  }

  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (connectingFrom) {
      if (connectingFrom !== id) {
        setData(prev => ({
          ...prev,
          edges: [...prev.edges, { id: `edge_${Date.now()}`, source: connectingFrom, target: id }]
        }))
      }
      setConnectingFrom(null)
    }
  }

  const deleteNode = (id: string) => {
    setData(prev => ({
      nodes: prev.nodes.filter(n => n.id !== id),
      edges: prev.edges.filter(e => e.source !== id && e.target !== id)
    }))
  }

  const getNodeColor = (type: string) => {
    switch(type) {
      case 'attacker': return '#ff4560'
      case 'server': return '#00e396'
      case 'database': return '#775dd0'
      case 'firewall': return '#feb019'
      default: return '#008ffb'
    }
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '10px', background: 'var(--bg3)', display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
        <span style={{ color: 'var(--text2)', fontSize: '12px', fontWeight: 'bold' }}>Add Node:</span>
        <button type="button" onClick={() => addNode('attacker')} style={{ background: '#ff4560', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Attacker</button>
        <button type="button" onClick={() => addNode('firewall')} style={{ background: '#feb019', color: '#111', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Firewall</button>
        <button type="button" onClick={() => addNode('server')} style={{ background: '#00e396', color: '#111', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Server</button>
        <button type="button" onClick={() => addNode('database')} style={{ background: '#775dd0', color: '#fff', border: 'none', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Database</button>
        <div style={{ flex: 1 }} />
        {connectingFrom && <span style={{ color: 'var(--amber)', fontSize: '11px' }}>Select target node to connect...</span>}
        <button type="button" onClick={() => setData({ nodes: [], edges: [] })} style={{ background: 'transparent', border: '1px solid var(--red)', color: 'var(--red)', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}>Clear</button>
      </div>
      
      <svg 
        ref={svgRef}
        width="100%" 
        height="400" 
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setConnectingFrom(null)}
        style={{ background: 'var(--bg)', cursor: connectingFrom ? 'crosshair' : 'default' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--text2)" />
          </marker>
        </defs>

        {/* Edges */}
        {data.edges.map(edge => {
          const src = data.nodes.find(n => n.id === edge.source)
          const tgt = data.nodes.find(n => n.id === edge.target)
          if (!src || !tgt) return null
          return (
            <line 
              key={edge.id}
              x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
              stroke="var(--text2)" strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          )
        })}

        {/* Nodes */}
        {data.nodes.map(node => (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onMouseDown={(e) => { e.stopPropagation(); setDraggingNode(node.id) }}
            onClick={(e) => handleNodeClick(node.id, e)}
            onDoubleClick={(e) => { e.stopPropagation(); setConnectingFrom(node.id) }}
            style={{ cursor: 'move' }}
          >
            <circle r="25" fill={getNodeColor(node.type)} stroke="var(--bg)" strokeWidth="3" />
            <text y="40" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace" style={{ pointerEvents: 'none' }}>
              {node.label}
            </text>
            {/* Delete button indicator (top right) */}
            <circle cx="18" cy="-18" r="8" fill="var(--red)" cursor="pointer" onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }} />
            <text x="18" y="-15" textAnchor="middle" fill="#fff" fontSize="10" cursor="pointer" onClick={(e) => { e.stopPropagation(); deleteNode(node.id) }}>×</text>
          </g>
        ))}
      </svg>
      <div style={{ padding: '8px', fontSize: '10px', color: 'var(--text2)', textAlign: 'center' }}>
        Tip: Double-click a node to start an arrow, then click another node to connect.
      </div>
    </div>
  )
}
