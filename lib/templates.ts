export interface WriteupTemplate {
  id: string
  name: string
  description: string
  writeup_mode: 'journal' | 'cve'
  title_pattern: string
  default_tags: string
  content: string
  // For CVE mode
  cve_product?: string
  cve_version?: string
  cve_cwe?: string
  cve_cvss_vector?: string
  cve_impact?: string
  cve_poc?: string
  cve_remediation?: string
  is_team?: boolean
}

export const BUILTIN_TEMPLATES: WriteupTemplate[] = [
  {
    id: 'htb-thm-machine',
    name: 'HTB / THM Machine Writeup',
    description: 'Template standar untuk dokumentasi penetration testing mesin HackTheBox atau TryHackMe.',
    writeup_mode: 'journal',
    title_pattern: 'HackTheBox - [Machine Name]',
    default_tags: 'HTB,Machine,Pentest',
    content: `<h1>Target Information</h1>
<p><strong>IP Address:</strong> 10.10.10.x</p>
<p><strong>OS:</strong> Linux / Windows</p>

<h1>1. Enumeration &amp; Reconnaissance</h1>
<h3>Nmap Scan Results</h3>
<pre class="ql-syntax" spellcheck="false"># nmap -sC -sV -oA nmap/initial 10.10.10.x</pre>
<p>Daftar port terbuka yang ditemukan:</p>
<ul>
  <li>Port 80/tcp - HTTP - Apache 2.4</li>
  <li>Port 22/tcp - SSH - OpenSSH 8.2</li>
</ul>

<h1>2. Exploitation / Entry Point</h1>
<p>Jelaskan bagaimana Anda mendapatkan shell pertama (User Access).</p>

<h1>3. Privilege Escalation</h1>
<p>Jelaskan langkah-langkah eskalasi hak akses untuk mendapatkan Root / Administrator.</p>
<blockquote>Privilege escalation vector: sudo / SUID / Kernel Exploit</blockquote>

<h1>4. Loot / Flags</h1>
<p><strong>User flag:</strong> <code>hash_here</code></p>
<p><strong>Root flag:</strong> <code>hash_here</code></p>`
  },
  {
    id: 'bug-bounty-report',
    name: 'Bug Bounty Report (HackerOne)',
    description: 'Format laporan standar industri yang dioptimalkan untuk pengiriman bug bounty di HackerOne atau Bugcrowd.',
    writeup_mode: 'cve',
    title_pattern: '[Vulnerability Type] di [Endpoint/Parameter]',
    default_tags: 'bug-bounty,hackerone,finding',
    cve_product: 'Web Application',
    cve_version: 'Production Environment',
    cve_cwe: 'CWE-79: Cross-Site Scripting (XSS)',
    cve_cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:N/A:N',
    content: `<p>Halo Tim Keamanan,</p>
<p>Saya menemukan kerentanan keamanan pada aplikasi Anda yang memungkinkan pengguna tidak sah untuk melakukan eksekusi kode atau manipulasi data.</p>
<h1>Summary / Deskripsi Ringkas</h1>
<p>Jelaskan kerentanan secara ringkas di sini.</p>`,
    cve_impact: `<p>Dampak teknis dari kerentanan ini memungkinkan penyerang untuk:</p>
<ul>
  <li>Mencuri cookie sesi pengguna lain.</li>
  <li>Melakukan tindakan atas nama korban.</li>
</ul>`,
    cve_poc: `<h3>Langkah Reproduksi:</h3>
<ol>
  <li>Akses halaman target di <code>https://target.com/page</code></li>
  <li>Masukkan payload berikut pada kolom input: <code>&lt;script&gt;alert(1)&lt;/script&gt;</code></li>
  <li>Klik simpan dan amati alert yang muncul.</li>
</ol>`,
    cve_remediation: `<p>Untuk memperbaiki kerentanan ini, disarankan untuk:</p>
<ul>
  <li>Melakukan pembersihan (encoding) pada seluruh input pengguna sebelum ditampilkan kembali di halaman web.</li>
  <li>Gunakan library anti-XSS standar.</li>
</ul>`
  },
  {
    id: 'cve-advisory',
    name: 'CVE Advisory (MITRE Format)',
    description: 'Struktur laporan formal untuk pengajuan CVE resmi ke CNA/MITRE.',
    writeup_mode: 'cve',
    title_pattern: '[Vendor] [Product] [Version] - [Vulnerability Type]',
    default_tags: 'cve,advisory,0day',
    cve_product: '',
    cve_version: '',
    cve_cwe: '',
    cve_cvss_vector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H',
    content: `<h1>Vulnerability Identifier</h1>
<p><strong>CVE-ID:</strong> PENDING / RESERVED</p>
<h1>Summary</h1>
<p>Kerentanan tipe [CWE] pada [Product] versi [Version] memungkinkan penyerang jarak jauh untuk [Impact] melalui [Vector].</p>`,
    cve_impact: `<p>Penyerang dapat memanfaatkan kerentanan ini untuk mendapatkan kontrol penuh atas sistem target atau mengekstrak data sensitif.</p>`,
    cve_poc: `<p>Gunakan script eksploitasi berikut:</p>
<pre class="ql-syntax" spellcheck="false"># python exploit.py -t http://target.local</pre>`,
    cve_remediation: `<p>Perbarui perangkat lunak ke versi terbaru atau terapkan patch keamanan yang disediakan oleh vendor.</p>`
  },
  {
    id: 'ctf-challenge',
    name: 'CTF Challenge Writeup',
    description: 'Format ringkas untuk mendokumentasikan penyelesaian soal CTF (Web, Crypto, Pwn, Reversing).',
    writeup_mode: 'journal',
    title_pattern: 'CTF [Event] - [Challenge Name] ([Category])',
    default_tags: 'ctf,writeup,crypto',
    content: `<h1>Challenge Description</h1>
<p><strong>Category:</strong> Web / Crypto / Reverse / Pwn / Forensic</p>
<p><strong>Points:</strong> 100</p>
<p><strong>Solves:</strong> 50</p>
<blockquote>Deskripsi soal di sini.</blockquote>

<h1>1. Analysis</h1>
<p>Jelaskan analisis awal file biner atau kode sumber yang diberikan.</p>

<h1>2. Solution / Exploit Script</h1>
<p>Jelaskan langkah penyelesaian atau tampilkan script solver:</p>
<pre class="ql-syntax" spellcheck="false"># solver.py
import requests
# Exploit logic here
</pre>

<h1>3. Flag</h1>
<p><code>FLAG{c0ngr4ts_y0u_d1d_1t}</code></p>`
  }
]
