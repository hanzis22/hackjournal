// Client-side & server-side compatible localization dictionary for HackJournal

export type Lang = 'id' | 'en';

export const translations = {
  en: {
    dashboard: 'Dashboard',
    writeups: 'Writeups',
    folders: 'Folders',
    settings: 'Settings',
    feed: 'Public Feed',
    teams: 'Teams',
    engagements: 'Engagements',
    achievements: 'Achievements',
    vault: 'Secure Vault',
    aiAssistant: 'AI Assistant',
    language: 'Language',
    search: 'Search...',
    newWriteup: 'New Writeup',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    create: 'Create',
    actions: 'Actions',
    loading: 'Loading...',
    none: 'None',
    difficulty: 'Difficulty',
    cveMode: 'CVE Mode',
    journalMode: 'Journal Mode',
    all: 'All',
    tagCloud: 'Tag Cloud',
    threatMap: 'Threat Map',
    xp: 'XP',
    level: 'Level',
    achievementsList: 'Achievements & Badges',
    leaderboard: 'Global Leaderboard',
    credentials: 'Credentials',
    expiration: 'Expiration',
    expired: 'Expired',
    active: 'Active',
    compliance: 'Compliance Reports',
    generate: 'Generate',
    importTools: 'Tool Import Ecosystem',
    webhooks: 'Webhooks',
    versionHistory: 'Version History',
    viewDiff: 'View Diff',
    networkTopology: 'Network Diagram',
    exportFormat: 'Export Format',
    screenshotAnnotator: 'Screenshot Annotator'
  },
  id: {
    dashboard: 'Dasbor',
    writeups: 'Laporan Bug',
    folders: 'Folder',
    settings: 'Pengaturan',
    feed: 'Feed Publik',
    teams: 'Kolaborasi Tim',
    engagements: 'Manajemen Proyek',
    achievements: 'Pencapaian & XP',
    vault: 'Brankas Kredensial',
    aiAssistant: 'Asisten AI',
    language: 'Bahasa',
    search: 'Cari...',
    newWriteup: 'Laporan Baru',
    save: 'Simpan',
    cancel: 'Batal',
    delete: 'Hapus',
    edit: 'Ubah',
    create: 'Buat',
    actions: 'Aksi',
    loading: 'Memuat...',
    none: 'Tidak ada',
    difficulty: 'Tingkat Kesulitan',
    cveMode: 'Mode CVE',
    journalMode: 'Mode Jurnal',
    all: 'Semua',
    tagCloud: 'Kumpulan Tag',
    threatMap: 'Peta Ancaman',
    xp: 'XP',
    level: 'Level',
    achievementsList: 'Pencapaian & Badge',
    leaderboard: 'Peringkat Global',
    credentials: 'Data Kredensial',
    expiration: 'Masa Berlaku',
    expired: 'Kedaluwarsa',
    active: 'Aktif',
    compliance: 'Laporan Kepatuhan',
    generate: 'Hasilkan',
    importTools: 'Impor Hasil Scan',
    webhooks: 'Webhook',
    versionHistory: 'Riwayat Versi',
    viewDiff: 'Lihat Perbedaan',
    networkTopology: 'Diagram Jaringan',
    exportFormat: 'Format Ekspor',
    screenshotAnnotator: 'Anotasi Tangkapan Layar'
  }
};

export function getTranslation(lang: Lang, key: keyof typeof translations['en']): string {
  const dict = translations[lang] || translations['en'];
  return dict[key] || translations['en'][key] || String(key);
}

// Client-side helper to get current language from localStorage or user settings
export function getCurrentLang(): Lang {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('hj_lang') as Lang;
    if (saved === 'id' || saved === 'en') return saved;
  }
  return 'id'; // default is Indonesian as requested in custom
}
