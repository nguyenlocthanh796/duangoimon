/**
 * Dynamic Server IP / URL Configuration Manager for Native (iPad / Android APK) & Web.
 * Allows iPad / Android tablet users to input local server IP (e.g., http://192.168.1.100:8000).
 */

import { Platform } from 'react-native';

const SERVER_URL_KEY = 'pos_custom_server_url_v1';
let _cachedCustomUrl: string | null = null;

// ── Cloudflare Tunnel Base (single source of truth) ─────────────────────
// Quick Tunnel URL changes each restart. Update this ONE value to fix all.
export const CLOUDFLARE_TUNNEL_BASE = 'https://established-clouds-flame-tel.trycloudflare.com';

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
  // Strip trailing slashes
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

  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return `http://${host}:8000/api/v1`;
    }
    if (host.endsWith('.pages.dev') || host.endsWith('.cloudflare.com')) {
      // Cloudflare Pages -> proxy via tunnel
      return `${CLOUDFLARE_TUNNEL_BASE}/api/v1`;
    }
    return `${window.location.protocol}//${window.location.host}/api/v1`;
  }

  // Fallback for native devices when no IP is set
  return 'http://localhost:8000/api/v1';
}
