type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Insane'

const colors: Record<Difficulty, { bg: string; color: string; border: string }> = {
  Easy:   { bg: 'rgba(57,255,20,0.12)',   color: '#39ff14', border: 'rgba(57,255,20,0.3)' },
  Medium: { bg: 'rgba(240,165,0,0.12)',   color: '#f0a500', border: 'rgba(240,165,0,0.3)' },
  Hard:   { bg: 'rgba(255,69,96,0.12)',   color: '#ff4560', border: 'rgba(255,69,96,0.3)' },
  Insane: { bg: 'rgba(175,169,236,0.12)', color: '#AFA9EC', border: 'rgba(175,169,236,0.3)' },
}

export default function DiffBadge({ diff }: { diff: string }) {
  const c = colors[diff as Difficulty] || colors.Easy
  return (
    <span style={{
      fontSize: '11px', padding: '2px 9px', borderRadius: '10px',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'monospace', fontWeight: 500, whiteSpace: 'nowrap'
    }}>
      {diff}
    </span>
  )
}
