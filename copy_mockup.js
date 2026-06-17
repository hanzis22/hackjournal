const fs = require('fs');
const src = 'C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\a9f46bd4-ea95-47c4-9b7d-18a057d28d89\\hackjournal_dashboard_mockup_1781593778684.png';
const dest = 'c:\\Aplikasi yang sudah di dwonload\\hackjournal\\public\\dashboard_mockup.png';
try {
  fs.copyFileSync(src, dest);
  console.log('SUCCESS');
} catch (e) {
  console.error(e);
}
