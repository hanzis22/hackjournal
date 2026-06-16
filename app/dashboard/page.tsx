export default function DashboardHome() {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:'40px', textAlign:'center', minHeight:'60vh' }}>
      <div style={{ fontSize:'56px', marginBottom:'16px', opacity:0.2 }}>⬡</div>
      <h2 style={{ fontFamily:'monospace', fontSize:'18px', color:'var(--text2)', marginBottom:'8px' }}>
        Select a writeup<span style={{ display:'inline-block', width:'8px', height:'14px', background:'var(--purple-400)', marginLeft:'4px', verticalAlign:'middle', animation:'blink 1s step-end infinite' }}></span>
      </h2>
      <p style={{ color:'var(--text2)', fontSize:'13px', opacity:0.6, marginBottom:'24px' }}>
        Pilih writeup dari sidebar atau buat yang baru
      </p>
      <a href="/dashboard/new" style={{ padding:'10px 24px', borderRadius:'6px', background:'var(--purple-600)', color:'#fff', textDecoration:'none', fontFamily:'monospace', fontSize:'13px' }}>
        + New Writeup
      </a>
    </div>
  )
}
