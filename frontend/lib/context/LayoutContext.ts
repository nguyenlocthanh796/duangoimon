import { createContext, useContext } from 'react';

interface LayoutState {
  /** Sidebar is always visible (docked) — hide the menu button header */
  sidebarPersistent: boolean;
}

const LayoutCtx = createContext<LayoutState>({ sidebarPersistent: false });

export function useLayoutState() {
  return useContext(LayoutCtx);
}

export const LayoutProvider = LayoutCtx.Provider;
