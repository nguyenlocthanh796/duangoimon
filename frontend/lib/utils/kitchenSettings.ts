/**
 * Store & Kitchen Module Settings Helper
 * Allows toggling Kitchen/Bar Module ON/OFF depending on shop size (e.g. cafe/takeaway kiosk vs large restaurant).
 */

const SETTINGS_KEY = 'pos_enable_kitchen_module';

export function getKitchenModuleEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(SETTINGS_KEY);
    return val !== null ? val === 'true' : true;
  } catch {
    return true;
  }
}

export function setKitchenModuleEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_KEY, String(enabled));
  } catch {
    /* ignore */
  }
}
