import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';

interface RegionFilterExampleProps {
  onRegionChange?: (region: string) => void;
}

export const RegionFilterExample: React.FC<RegionFilterExampleProps> = ({ onRegionChange }) => {
  const [location] = useLocation();
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  useEffect(() => {
    // Listen for region filter changes from chatbot
    const handleRegionFilter = (event: CustomEvent) => {
      const { region } = event.detail;
      setSelectedRegion(region);
      if (onRegionChange) {
        onRegionChange(region);
      }
    };

    window.addEventListener('regionFilterChange', handleRegionFilter as EventListener);
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilter as EventListener);
    };
  }, [onRegionChange]);

  const getCurrentPageType = () => {
    if (location.includes('/chlorine')) return 'Chlorine Dashboard';
    if (location.includes('/pressure')) return 'Pressure Dashboard';  
    if (location.includes('/lpcd')) return 'LPCD Dashboard';
    if (location.includes('/scheme-lpcd')) return 'Scheme LPCD Dashboard';
    return 'Dashboard';
  };

  const getFilterMessage = () => {
    if (selectedRegion === 'all') {
      return `Showing data from all regions on ${getCurrentPageType()}`;
    }
    return `Filtered to show only ${selectedRegion} region data on ${getCurrentPageType()}`;
  };

  if (selectedRegion === 'all') {
    return null; // Don't show when no filter is applied
  }

  return (
    <div className="fixed top-32 right-6 p-3 bg-blue-50 border border-blue-200 rounded-lg shadow-md z-40 max-w-xs">
      <div className="text-sm">
        <div className="font-semibold text-blue-800 mb-1">Active Region Filter</div>
        <div className="text-blue-700">{getFilterMessage()}</div>
        <button
          onClick={() => {
            setSelectedRegion('all');
            const event = new CustomEvent('regionFilterChange', {
              detail: { region: 'all' }
            });
            window.dispatchEvent(event);
          }}
          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Clear Filter
        </button>
      </div>
    </div>
  );
};

export default RegionFilterExample;