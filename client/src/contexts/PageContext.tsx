import React, { createContext, useContext, ReactNode } from 'react';
import { useLocation } from 'wouter';

export type PageType = 'chlorine' | 'pressure' | 'lpcd' | 'scheme-lpcd' | 'dashboard' | 'schemes' | 'regions' | 'other';

interface PageContextType {
  currentPage: PageType;
  getPageDisplayName: () => string;
  isDataPage: () => boolean;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within a PageContextProvider');
  }
  return context;
};

interface PageContextProviderProps {
  children: ReactNode;
}

export const PageContextProvider: React.FC<PageContextProviderProps> = ({ children }) => {
  const [location] = useLocation();

  const getCurrentPage = (): PageType => {
    if (location.includes('/chlorine')) return 'chlorine';
    if (location.includes('/pressure')) return 'pressure';
    if (location.includes('/lpcd') && !location.includes('/scheme-lpcd')) return 'lpcd';
    if (location.includes('/scheme-lpcd')) return 'scheme-lpcd';
    if (location.includes('/dashboard')) return 'dashboard';
    if (location.includes('/schemes')) return 'schemes';
    if (location.includes('/regions')) return 'regions';
    return 'other';
  };

  const getPageDisplayName = (): string => {
    const page = getCurrentPage();
    switch (page) {
      case 'chlorine': return 'Chlorine Dashboard';
      case 'pressure': return 'Pressure Dashboard';
      case 'lpcd': return 'LPCD Dashboard';
      case 'scheme-lpcd': return 'Scheme LPCD Dashboard';
      case 'dashboard': return 'Main Dashboard';
      case 'schemes': return 'Schemes Page';
      case 'regions': return 'Regions Page';
      default: return 'Dashboard';
    }
  };

  const isDataPage = (): boolean => {
    const page = getCurrentPage();
    return ['chlorine', 'pressure', 'lpcd', 'scheme-lpcd'].includes(page);
  };

  const value: PageContextType = {
    currentPage: getCurrentPage(),
    getPageDisplayName,
    isDataPage,
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};