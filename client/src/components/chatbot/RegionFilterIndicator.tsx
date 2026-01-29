import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { X, Filter } from 'lucide-react';

interface RegionFilterIndicatorProps {
  className?: string;
}

const RegionFilterIndicator: React.FC<RegionFilterIndicatorProps> = ({ className = '' }) => {
  const [location] = useLocation();
  const [activeRegion, setActiveRegion] = useState<string>('all');

  useEffect(() => {
    const handleRegionFilterChange = (event: CustomEvent) => {
      const { region } = event.detail;
      setActiveRegion(region);
    };

    window.addEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    
    return () => {
      window.removeEventListener('regionFilterChange', handleRegionFilterChange as EventListener);
    };
  }, []);

  const getCurrentPageType = () => {
    if (location.includes('/chlorine')) return 'Chlorine Dashboard';
    if (location.includes('/pressure')) return 'Pressure Dashboard';  
    if (location.includes('/lpcd')) return 'LPCD Dashboard';
    if (location.includes('/scheme-lpcd')) return 'Scheme LPCD Dashboard';
    return 'Main Dashboard';
  };

  const clearFilter = () => {
    setActiveRegion('all');
    window.dispatchEvent(new CustomEvent('regionFilterChange', {
      detail: { region: 'all' }
    }));
  };

  // Don't show indicator when no filter is active
  if (activeRegion === 'all') {
    return null;
  }

  return (
    <div className={`fixed top-20 right-6 bg-blue-50 border border-blue-200 rounded-lg shadow-lg z-50 p-3 max-w-xs ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <div className="text-sm">
            <div className="font-semibold text-blue-800">Active Region Filter</div>
            <div className="text-blue-700">
              Showing {activeRegion} data on {getCurrentPageType()}
            </div>
          </div>
        </div>
        <button
          onClick={clearFilter}
          className="ml-2 p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded"
          title="Clear filter"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default RegionFilterIndicator;