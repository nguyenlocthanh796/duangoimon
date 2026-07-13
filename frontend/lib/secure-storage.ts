/**
 * Secure token storage module.
 *
 * Uses expo-secure-store (iOS Keychain / Android EncryptedSharedPreferences)
 * as the primary storage for JWT tokens.
 *
 * Falls back to localStorage for web (expo-secure-store is unavailable on web).
 */

import { Platform } from 'react-native';

const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_user';

let SecureStore: any = null;

// Lazy-load expo-secure-store (it may not be available on web/native)
async function getSecureStore() {
  if (!SecureStore) {
    try {
      SecureStore = await import('expo-secure-store');
    } catch {
      // expo-secure-store not available (e.g., web)
      SecureStore = null;
    }
  }
  return SecureStore;
}

function isNative(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

// ─── Token (JWT) ─────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      return store.getItemAsync(TOKEN_KEY);
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export async function setToken(token: string): Promise<void> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      await store.setItemAsync(TOKEN_KEY, token);
      return;
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      await store.deleteItemAsync(TOKEN_KEY);
      // Also delete user data
      await store.deleteItemAsync(USER_KEY);
      return;
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  }
}

// ─── User data (non-sensitive profile cache) ────────────────────────────────
// Note: Only non-sensitive profile info is stored here.
// The JWT token (sensitive) is stored via setToken/getToken above.

export async function getUser(): Promise<any | null> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      const raw = await store.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
  return null;
}

export async function setUser(user: any): Promise<void> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      await store.setItemAsync(USER_KEY, JSON.stringify(user));
      return;
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

export async function clearUser(): Promise<void> {
  if (isNative()) {
    const store = await getSecureStore();
    if (store) {
      await store.deleteItemAsync(USER_KEY);
      return;
    }
  }
  // Fallback for web
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(USER_KEY);
  }
}
