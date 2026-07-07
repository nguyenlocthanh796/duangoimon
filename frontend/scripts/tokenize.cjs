const fs = require('fs');
const path = require('path');

const dir = path.resolve(__dirname, '../app/quan-ly');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const tokenMap = {
  "'#F8FAFC'": "colors.surface.app",
  "'#fff'": "colors.surface.card",
  "'#FFFFFF'": "colors.surface.card",
  "'#FAFAFA'": "colors.surface.input",
  "'#F1F5F9'": "colors.surface.avatar",
  "'#FFF7ED'": "colors.surface.sidebarIcon",
  "'rgba(15,23,42,0.5)'": "colors.surface.overlay",
  "'#1E293B'": "colors.text.primary",
  "'#475569'": "colors.text.body",
  "'#94A3B8'": "colors.text.secondary",
  "'#64748B'": "colors.text.muted",
  "'#CBD5E1'": "colors.text.placeholder",
  "'#E2E8F0'": "colors.border.default",
  "'#334155'": "colors.icon.default",
  "'#F97316'": "colors.brand.primary",
  "'#ECFDF5'": "colors.status.successBg",
  "'#FEF2F2'": "colors.status.dangerBg",
  "'#10B981'": "colors.status.success",
  "'#EF4444'": "colors.text.danger",
  "'#DCFCE7'": "colors.track.on",
  "'#FEE2E2'": "colors.track.off",
};

let total = 0;
for (const file of files) {
  const fp = path.join(dir, file);
  let content = fs.readFileSync(fp, 'utf8');
  let changed = false;
  for (const [hex, token] of Object.entries(tokenMap)) {
    const re = new RegExp(hex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (re.test(content)) {
      content = content.replace(re, token);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(fp, content, 'utf8');
    total++;
    console.log(`Updated: ${file}`);
  }
}
console.log(`Done. ${total} files updated.`);
