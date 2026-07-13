// Verify POS header fix across iPhone & iPad
// Usage: node verify_header.js
const { chromium } = require('playwright');

const BASE = 'http://localhost:8081';
const SCREENS = ['/ban-hang', '/quan-ly', '/kitchen', '/ke-toan'];

async function measure(page) {
  return await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const gradDivs = [...document.querySelectorAll('div')].filter(d => {
      const cs = getComputedStyle(d);
      return cs.backgroundImage?.includes('linear-gradient') && d.offsetHeight > 0 && d.offsetHeight < 200;
    });
    const header = gradDivs[0] || null;
    const rect = header ? header.getBoundingClientRect() : null;
    return {
      viewport: `${vw}x${vh}`,
      headerFound: !!header,
      headerHeight: rect ? Math.round(rect.height) : null,
      headerText: header ? (header.innerText || '').slice(0,80).replace(/\n/g, ' ') : null,
      gradient: header ? getComputedStyle(header).backgroundImage?.slice(0,60) : null,
    };
  });
}

async function audit(viewport, width, height) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const results = {};
  for (const s of SCREENS) {
    const url = BASE + s;
    console.log(`\n=== ${viewport} → ${url} ===`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const msgs = [];
    page.on('console', msg => msgs.push(`${msg.type()}: ${msg.text()}`));
    // clear and re-collect
    await page.waitForTimeout(200);
    const m = await measure(page);
    results[s] = { ...m, consoleErrors: msgs.filter(m => m.startsWith('error:') || m.startsWith('Error:')) };
    console.log(`  Header: ${m.headerFound ? `✅ ${m.headerHeight}px - "${m.headerText}"` : '❌ NOT FOUND'}`);
    if (results[s].consoleErrors.length) console.log(`  Console ERRORS: ${results[s].consoleErrors.join('; ')}`);
  }
  await browser.close();
  return results;
}

(async () => {
  console.log('╔══════════════════════════════════════╗');
  console.log('║   POS Header Verification Suite      ║');
  console.log('╚══════════════════════════════════════╝');
  
  const iphone = await audit('iPhone 414×896', 414, 896);
  const ipad = await audit('iPad 1024×768', 1024, 768);
  
  console.log('\n═══════════════════════════════════════');
  console.log('📊 FINAL SUMMARY');
  console.log('═══════════════════════════════════════');
  let allOk = true;
  for (const s of SCREENS) {
    const i = iphone[s];
    const a = ipad[s];
    const iphoneOk = i?.headerFound && !i?.consoleErrors?.length;
    const ipadOk = a?.headerFound && !a?.consoleErrors?.length;
    if (!iphoneOk || !ipadOk) allOk = false;
    console.log(`${s.padEnd(20)} iPhone: ${iphoneOk ? '✅' : '❌'} ${i?.headerHeight || '?'}px  |  iPad: ${ipadOk ? '✅' : '❌'} ${a?.headerHeight || '?'}px`);
  }
  console.log(`\n${allOk ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
  
  if (allOk) process.exit(0);
  else process.exit(1);
})();
