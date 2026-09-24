const https = require('https');
const http = require('http');

console.log("================================================================================");
console.log("👑 ONGCHU LEAN POS - WEBSOCKET & HTTP SYNC AUDIT (NODE.JS)");
console.log("================================================================================");

const req = https.request('https://app.ongchu.cloud/api/v1/health', (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("  ✅ Backend Health Status:", res.statusCode, body);
  });
});
req.on('error', (e) => console.error("  ❌ Lỗi Health check:", e));
req.end();
