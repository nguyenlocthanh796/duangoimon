import React, { useState } from 'react';
import { createContext, useContext } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  toggleSidebar: () => void;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);
  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const toggleCollapse = () => setIsCollapsed((prev) => !prev);
  const setCollapsed = (v: boolean) => setIsCollapsed(v);

  return (
    <SidebarContext.Provider
      value={{ isOpen, openSidebar, closeSidebar, toggleSidebar, isCollapsed, toggleCollapse, setCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};
