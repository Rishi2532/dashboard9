import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface RegionFilterContextType {
  selectedRegion: string;
  setSelectedRegion: (region: string) => void;
  applyRegionFilter: (region: string) => void;
  clearRegionFilter: () => void;
}

const RegionFilterContext = createContext<RegionFilterContextType | undefined>(undefined);

export const useRegionFilter = () => {
  const context = useContext(RegionFilterContext);
  if (!context) {
    throw new Error('useRegionFilter must be used within a RegionFilterProvider');
  }
  return context;
};

interface RegionFilterProviderProps {
  children: ReactNode;
}

export const RegionFilterProvider: React.FC<RegionFilterProviderProps> = ({ children }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  const applyRegionFilter = (region: string) => {
    const normalizedRegion = normalizeRegionName(region);
    setSelectedRegion(normalizedRegion);
    
    // Trigger custom event to notify dashboard components
    const event = new CustomEvent('regionFilterChange', {
      detail: { region: normalizedRegion }
    });
    window.dispatchEvent(event);
  };

  const clearRegionFilter = () => {
    setSelectedRegion('all');
    
    // Trigger custom event to notify dashboard components
    const event = new CustomEvent('regionFilterChange', {
      detail: { region: 'all' }
    });
    window.dispatchEvent(event);
  };

  const normalizeRegionName = (region: string): string => {
    const regionMap: { [key: string]: string } = {
      'nagpur': 'Nagpur',
      'amravati': 'Amravati',
      'nashik': 'Nashik',
      'chhatrapati sambhajinagar': 'Chhatrapati Sambhajinagar',
      'aurangabad': 'Chhatrapati Sambhajinagar',
      'pune': 'Pune',
      'konkan': 'Konkan',
      'mumbai': 'Mumbai'
    };

    const lowerRegion = region.toLowerCase();
    return regionMap[lowerRegion] || region;
  };

  const value: RegionFilterContextType = {
    selectedRegion,
    setSelectedRegion,
    applyRegionFilter,
    clearRegionFilter,
  };

  return (
    <RegionFilterContext.Provider value={value}>
      {children}
    </RegionFilterContext.Provider>
  );
};