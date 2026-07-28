/**
 * Dynamic Server IP / URL Configuration Manager for Native (iPad / Android APK) & Web.
 * Allows iPad / Android tablet users to input local server IP (e.g., http://192.168.1.100:8000).
 */

import Constants from 'expo-constants';

const SERVER_URL_KEY = 'pos_custom_server_url_v1';
let _cachedCustomUrl: string | null = null;

// ── Cloudflare Tunnel Base (single source of truth) ─────────────────────
export const CLOUDFLARE_TUNNEL_BASE = 'https://established-clouds-flame-tel.trycloudflare.com';

// Extract local developer machine IP address from Expo Metro packager
function getExpoDevServerIp(): string | null {
  try {
    const hostUri = Constants.expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch {}
  return null;
}

// Read custom server URL from storage synchronously
export function getCustomServerUrlSync(): string | null {
  if (_cachedCustomUrl) return _cachedCustomUrl;
  if (typeof window !== 'undefined' && window.localStorage) {
    _cachedCustomUrl = localStorage.getItem(SERVER_URL_KEY);
  }
  return _cachedCustomUrl;
}

// Set custom server URL
export function setCustomServerUrl(url: string) {
  let formatted = url.trim();
  if (formatted && !formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `http://${formatted}`;
  }
  formatted = formatted.replace(/\/+$/, '');
  
  _cachedCustomUrl = formatted;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (formatted) {
      localStorage.setItem(SERVER_URL_KEY, formatted);
    } else {
      localStorage.removeItem(SERVER_URL_KEY);
    }
  }
}

/**
 * Resolve active API Base URL dynamically across Web & Native
 */
export function getApiBaseUrl(): string {
  const custom = getCustomServerUrlSync();
  if (custom) {
    return custom.endsWith('/api/v1') ? custom : `${custom}/api/v1`;
  }

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host.endsWith('.pages.dev') || host.endsWith('.cloudflare.com')) {
      return `${CLOUDFLARE_TUNNEL_BASE}/api/v1`;
    }
    // Always target port 8000 on active hostname (localhost, 127.0.0.1, or 192.168.x.x)
    return `${window.location.protocol}//${host}:8000/api/v1`;
  }

  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Native devices (iPhone / iPad):
  const devIp = getExpoDevServerIp();
  if (devIp) {
    return `http://${devIp}:8000/api/v1`;
  }

  return `${CLOUDFLARE_TUNNEL_BASE}/api/v1`;
}
