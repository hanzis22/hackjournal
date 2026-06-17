import { cookies } from 'next/headers'
import Link from 'next/link'
import { verifyToken } from '@/lib/auth'
import DashboardHeroMockup from '@/components/landing/DashboardHeroMockup'
import VaultMockup from '@/components/landing/VaultMockup'
import AttackChainMockup from '@/components/landing/AttackChainMockup'
import AITypingMockup from '@/components/landing/AITypingMockup'
import pool from '@/lib/db'

export const metadata = {
  title: 'HackJournal — Dokumentasi Pentest & Bug Bounty Modern',
  description: 'Tinggalkan Notepad. Kelola writeups, petakan attack chain, dan amankan zero-day Anda di dalam vault terenkripsi.'
}

export default async function LandingPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('hj_token')?.value
  const payload = token ? verifyToken(token) : null
  
  let isLoggedIn = false

  if (payload) {
    try {
      const [rows]: any = await pool.query('SELECT id FROM users WHERE id = ?', [payload.id])
      if (rows && rows.length > 0) {
        isLoggedIn = true
      } else {
        // Clear cookie if user does not exist in DB
        cookieStore.delete('hj_token')
      }
    } catch (err) {
      console.error('[LandingPage Auth Check Error]', err)
      cookieStore.delete('hj_token')
    }
  }

  const ctaUrl = isLoggedIn ? '/dashboard' : '/register'
  const ctaText = isLoggedIn ? 'Buka Dashboard' : 'Start for Free'

  return (
    <div className="min-h-screen bg-[#06060a] text-[#e8e6ff] font-sans antialiased selection:bg-[#39ff14]/30 selection:text-white relative overflow-x-hidden">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(circle_at_top,rgba(127,119,221,0.15),transparent_65%)] pointer-events-none z-0"></div>
      <div className="absolute top-[20%] left-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(0,240,255,0.03),transparent_70%)] pointer-events-none z-0 blur-[80px]"></div>
      <div className="absolute top-[60%] right-[-10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(57,255,20,0.03),transparent_70%)] pointer-events-none z-0 blur-[80px]"></div>

      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#06060a]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7F77DD] to-[#534AB7] flex items-center justify-center font-bold text-sm text-white shadow-[0_0_12px_rgba(127,119,221,0.4)] group-hover:scale-105 transition-transform">
              ⬡
            </div>
            <span className="font-mono font-bold text-lg tracking-wider text-white">
              Hack<span className="text-[#7F77DD] group-hover:text-[#00f0ff] transition-colors">Journal</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#9b97cc]">
            <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
            <a href="#keamanan" className="hover:text-white transition-colors">Keamanan</a>
            <a href="#testimoni" className="hover:text-white transition-colors">Testimoni</a>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-2 text-xs font-mono font-bold rounded-lg border border-[#39ff14]/30 bg-[#39ff14]/5 text-[#39ff14] hover:bg-[#39ff14]/15 transition-all shadow-[0_0_15px_rgba(57,255,20,0.1)] hover:shadow-[0_0_20px_rgba(57,255,20,0.2)]"
              >
                Dashboard ➜
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-semibold text-[#9b97cc] hover:text-white transition-colors">
                  Masuk
                </Link>
                <Link 
                  href="/register" 
                  className="px-4 py-2 text-xs font-mono font-bold rounded-lg bg-[#39ff14] text-[#06060a] hover:bg-[#39ff14]/90 transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)] hover:shadow-[0_0_25px_rgba(57,255,20,0.5)]"
                >
                  Start for Free
                </Link>
              </>
            )}
          </div>

        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 flex flex-col items-center text-center z-10">
        
        {/* Supertitle Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] text-xs font-semibold text-[#9b97cc] mb-6 animate-fade-in">
          <span className="text-[#39ff14]">🚀</span> Tinggalkan Notepad dan Markdown biasa.
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-[1.1] mb-6">
          Satu tempat yang aman dan mudah untuk semua dokumentasi pentest Anda.
        </h1>

        {/* Hero Subheadline */}
        <p className="text-base sm:text-lg text-[#9b97cc] max-w-3xl leading-relaxed mb-10">
          Dirancang khusus untuk bug bounty hunters solo, tim penetration tester, hingga pemula. 
          Petakan alur serangan, tulis laporan lebih cepat dengan AI, dan simpan zero-day Anda dalam brankas terenkripsi.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <Link 
            href={ctaUrl} 
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-bold bg-[#39ff14] text-[#06060a] hover:bg-[#39ff14]/90 hover:scale-105 transition-all shadow-[0_0_25px_rgba(57,255,20,0.35)] hover:shadow-[0_0_35px_rgba(57,255,20,0.6)] flex items-center justify-center gap-2"
          >
            {ctaText}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <a 
            href="#fitur" 
            className="w-full sm:w-auto px-8 py-3.5 rounded-lg text-sm font-bold border border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.05] transition-all hover:text-white flex items-center justify-center"
          >
            View Demo
          </a>
        </div>

        {/* Dashboard Visual Mockup */}
        <div className="w-full max-w-5xl border border-white/[0.06] rounded-xl bg-[#06060a]/60 p-1 md:p-2 backdrop-blur-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <DashboardHeroMockup />
        </div>

      </header>

      {/* SOCIAL PROOF */}
      <section className="border-y border-white/[0.05] bg-[#0c0c14]/40 py-12 relative z-10">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#9b97cc]/70 mb-8">
            Dipercaya oleh para periset keamanan yang mengamankan sistem di:
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:opacity-80 transition-opacity">
            <span className="font-mono font-bold text-lg text-white">HackerOne</span>
            <span className="font-mono font-bold text-lg text-white">Bugcrowd</span>
            <span className="font-mono font-bold text-lg text-white">Stripe</span>
            <span className="font-mono font-bold text-lg text-white">Cloudflare</span>
            <span className="font-mono font-bold text-lg text-white">Vercel</span>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="fitur" className="max-w-6xl mx-auto px-6 py-24 md:py-32 relative z-10 space-y-24 md:space-y-40">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7F77DD] border border-[#7F77DD]/30 bg-[#7F77DD]/5 px-3 py-1 rounded-full">
            Fitur Unggulan
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
            Alur Kerja Cybersecurity Terbaik
          </h2>
        </div>

        {/* Fitur 1: Vault */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center" id="keamanan">
          <div className="md:col-span-6 space-y-6">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              Keamanan Mutlak
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Temuan Anda Adalah Rahasia Anda.
            </h3>
            <p className="text-sm sm:text-base text-[#9b97cc] leading-relaxed">
              Jangan pertaruhkan Proof of Concept (PoC) dan data sensitif klien di aplikasi catatan biasa. 
              HackJournal dilengkapi dengan End-to-End Encrypted Vault untuk memastikan hanya Anda dan tim yang memiliki akses.
            </p>
          </div>
          <div className="md:col-span-6 flex justify-center">
            <VaultMockup />
          </div>
        </div>

        {/* Fitur 2: Attack Chain */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center md:flex-row-reverse">
          <div className="md:col-span-6 md:order-2 space-y-6">
            <div className="w-10 h-10 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 flex items-center justify-center text-[#00f0ff]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-git-fork"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9"/><path d="M12 12v3"/></svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f0ff]">
              Visualisasi Serangan
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Petakan Alur Serangan yang Kompleks.
            </h3>
            <p className="text-sm sm:text-base text-[#9b97cc] leading-relaxed">
              Jelaskan exploit chain yang rumit menjadi sederhana. Gunakan Visual Attack Chain Editor 
              untuk menghubungkan berbagai kerentanan menjadi satu narasi visual yang mudah dipahami oleh triager maupun klien.
            </p>
          </div>
          <div className="md:col-span-6 md:order-1 flex justify-center">
            <AttackChainMockup />
          </div>
        </div>

        {/* Fitur 3: AI & Templates */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6 space-y-6">
            <div className="w-10 h-10 rounded-lg bg-[#39ff14]/10 border border-[#39ff14]/30 flex items-center justify-center text-[#39ff14]">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-terminal"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#39ff14]">
              Efisiensi Tinggi
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Berhenti Mengetik, Mulai Meretas.
            </h3>
            <p className="text-sm sm:text-base text-[#9b97cc] leading-relaxed">
              Fokus pada perburuan bug. Biarkan AI Assistant kami membantu Anda menyusun draf writeup, 
              menghitung skor CVSS secara akurat, dan menghasilkan format laporan standar industri dalam hitungan detik.
            </p>
          </div>
          <div className="md:col-span-6 flex justify-center">
            <AITypingMockup />
          </div>
        </div>

      </section>

      {/* TESTIMONIAL (Glassmorphism Card) */}
      <section id="testimoni" className="relative z-10 py-24 bg-[radial-gradient(circle_at_center,rgba(127,119,221,0.04),transparent_60%)] border-t border-white/[0.05]">
        <div className="max-w-4xl mx-auto px-6">
          
          <div className="relative p-8 sm:p-12 rounded-2xl border border-white/[0.08] bg-[#0c0c14]/40 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden">
            {/* Glowing accent border */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#7F77DD]/40 to-transparent"></div>
            
            <div className="absolute -top-10 -left-10 text-9xl text-white/[0.02] font-serif pointer-events-none select-none">
              “
            </div>

            <blockquote className="space-y-6 relative z-10">
              <p className="text-lg sm:text-xl md:text-2xl font-medium text-[#e8e6ff] leading-relaxed italic">
                &ldquo;HackJournal mengubah cara saya bekerja. Saya tidak perlu lagi pusing mengatur folder laporan untuk setiap program bug bounty. Fitur kalkulator CVSS dan export PDF-nya sangat menghemat waktu saya sebelum submit ke HackerOne.&rdquo;
              </p>
              
              <footer className="flex items-center gap-4 pt-4 border-t border-white/[0.06]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7F77DD] to-[#534AB7] flex items-center justify-center font-bold text-white font-mono shadow-[0_0_12px_rgba(127,119,221,0.3)]">
                  AR
                </div>
                <div>
                  <cite className="not-italic font-bold text-white block text-sm sm:text-base">Alex R.</cite>
                  <cite className="not-italic text-xs sm:text-sm text-[#9b97cc]">Top 100 Bug Bounty Hunter</cite>
                </div>
              </footer>
            </blockquote>
          </div>

        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative z-10 py-24 max-w-5xl mx-auto px-6">
        <div className="relative rounded-2xl border border-[#39ff14]/20 bg-gradient-to-b from-[#0c0c14] to-[#06060a] p-8 sm:p-16 text-center overflow-hidden shadow-[0_0_40px_rgba(57,255,20,0.05)]">
          {/* Subtle Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Siap untuk mendokumentasikan bug pertama Anda?
            </h2>
            <p className="text-sm sm:text-base text-[#9b97cc] leading-relaxed">
              Bergabunglah dengan ribuan hacker dan amankan laporan Anda hari ini. Gratis untuk periset solo.
            </p>
            <div className="pt-4 flex justify-center">
              <Link 
                href={ctaUrl} 
                className="px-8 py-4 rounded-lg text-sm font-bold bg-[#39ff14] text-[#06060a] hover:bg-[#39ff14]/90 hover:scale-105 transition-all shadow-[0_0_25px_rgba(57,255,20,0.35)] hover:shadow-[0_0_35px_rgba(57,255,20,0.6)] flex items-center gap-2"
              >
                {ctaText}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-[#06060a] py-12 relative z-10 text-xs sm:text-sm text-[#9b97cc]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p>&copy; {new Date().getFullYear()} HackJournal. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="mailto:support@hackjournal.io" className="hover:text-white transition-colors">Contact Support</a>
          </div>
        </div>
      </footer>

    </div>
  )
}

