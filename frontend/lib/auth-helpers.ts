export interface DecodedToken {
  sub?: string;
  role?: string;
  exp?: number;
  [key: string]: any;
}

function base64Decode(str: string): string {
  // Try using global atob if available
  if (typeof atob === 'function') {
    try {
      return atob(str);
    } catch {
      // Fallback if atob fails on custom chars
    }
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = '';
  const cleaned = str.replace(/=+$/, '');
  
  for (let i = 0, bc = 0, bs = 0; i < cleaned.length; i++) {
    const char = cleaned.charAt(i);
    const idx = chars.indexOf(char);
    if (idx === -1) continue;
    
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      buffer += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return buffer;
}

export function decodeJwt(token: string): DecodedToken | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = base64Decode(base64);
    
    // Decode UTF-8 string properly
    const utf8Data = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(utf8Data);
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}
