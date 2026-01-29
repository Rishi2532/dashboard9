import React from 'react';
import { Region, RegionSummary } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface SimpleMaharashtraMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function SimpleMaharashtraMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: SimpleMaharashtraMapProps): JSX.Element {
  
  // Get percentage for metric display
  const getPercentage = (regionName: string): number => {
    if (!regions) return 0;
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return 0;
    
    let percentage = 0;
    
    if (metric === 'completion') {
      percentage = region.fully_completed_schemes / region.total_schemes_integrated * 100 || 0;
    } else if (metric === 'esr') {
      percentage = region.fully_completed_esr / region.total_esr_integrated * 100 || 0;
    } else if (metric === 'villages') {
      percentage = region.fully_completed_villages / region.total_villages_integrated * 100 || 0;
    } else if (metric === 'flow_meter') {
      percentage = region.flow_meter_integrated / region.total_schemes_integrated * 100 || 0;
    }
    
    return Math.min(Math.round(percentage), 100);
  };
  
  // Get metric value display
  const getMetricValue = (regionName: string): string => {
    if (!regions) return '';
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return '';
    
    if (metric === 'completion') {
      return `${region.fully_completed_schemes || 0}/${region.total_schemes_integrated || 0}`;
    } else if (metric === 'esr') {
      return `${region.fully_completed_esr || 0}/${region.total_esr_integrated || 0}`;
    } else if (metric === 'villages') {
      return `${region.fully_completed_villages || 0}/${region.total_villages_integrated || 0}`;
    } else if (metric === 'flow_meter') {
      return `${region.flow_meter_integrated || 0}/${region.total_schemes_integrated || 0}`;
    }
    
    return '';
  };
  
  // Get color based on region name
  const getColor = (regionName: string): string => {
    // Custom vibrant colors matching the reference image
    const regionColorMap: Record<string, string> = {
      'Nashik': '#8CB3E2',         // Light blue
      'Amravati': '#ff7300',       // Orange 
      'Nagpur': '#E2B8B8',         // Light red/pink
      'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
      'Pune': '#FFC408',           // Yellow
      'Konkan': '#4A77BB'          // Blue
    };
    
    return regionColorMap[regionName] || '#cccccc';
  };
  
  // Get metric color based on percentage
  const getMetricColor = (percentage: number): string => {
    if (percentage >= 80) return '#4CAF50'; // Green
    if (percentage >= 60) return '#8BC34A'; // Light Green
    if (percentage >= 40) return '#FFEB3B'; // Yellow
    if (percentage >= 20) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="relative w-full h-[300px] sm:h-[400px] rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-[300px] sm:h-[400px] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
      {/* Simple Maharashtra map with colored regions */}
      <div className="w-full h-full flex flex-col">
        {/* Map area */}
        <div className="flex-1 relative bg-blue-50">
          {/* Map background */}
          <div className="absolute inset-0 bg-blue-50 opacity-50"></div>
          
          {/* Maharashtra outline */}
          <svg viewBox="0 0 500 500" className="w-full h-full">
            {/* Region: Nagpur */}
            <path 
              d="M350,150 L450,170 L420,240 L350,220 Z" 
              fill={getColor("Nagpur")}
              stroke={selectedRegion === "Nagpur" ? "#2563eb" : "#fff"}
              strokeWidth={selectedRegion === "Nagpur" ? 3 : 1}
              onClick={() => onRegionClick("Nagpur")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region: Amravati */}
            <path 
              d="M280,180 L350,150 L350,220 L290,230 Z" 
              fill={getColor("Amravati")} 
              stroke={selectedRegion === "Amravati" ? "#2563eb" : "#fff"}
              strokeWidth={selectedRegion === "Amravati" ? 3 : 1}
              onClick={() => onRegionClick("Amravati")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region: Chhatrapati Sambhajinagar */}
            <path 
              d="M210,210 L280,180 L290,230 L230,280 Z" 
              fill={getColor("Chhatrapati Sambhajinagar")} 
              stroke={selectedRegion === "Chhatrapati Sambhajinagar" ? "#2563eb" : "#fff"} 
              strokeWidth={selectedRegion === "Chhatrapati Sambhajinagar" ? 3 : 1}
              onClick={() => onRegionClick("Chhatrapati Sambhajinagar")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region: Nashik */}
            <path 
              d="M150,170 L210,210 L230,280 L150,260 Z" 
              fill={getColor("Nashik")} 
              stroke={selectedRegion === "Nashik" ? "#2563eb" : "#fff"}
              strokeWidth={selectedRegion === "Nashik" ? 3 : 1}
              onClick={() => onRegionClick("Nashik")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region: Pune */}
            <path 
              d="M150,260 L230,280 L240,350 L140,340 Z" 
              fill={getColor("Pune")} 
              stroke={selectedRegion === "Pune" ? "#2563eb" : "#fff"}
              strokeWidth={selectedRegion === "Pune" ? 3 : 1}
              onClick={() => onRegionClick("Pune")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region: Konkan (Updated coordinates) */}
            <path 
              d="M110,240 L150,260 L140,340 L90,320 Z" 
              fill={getColor("Konkan")} 
              stroke={selectedRegion === "Konkan" ? "#2563eb" : "#fff"}
              strokeWidth={selectedRegion === "Konkan" ? 3 : 1}
              onClick={() => onRegionClick("Konkan")}
              className="cursor-pointer hover:opacity-80 hover:brightness-110 transition-all duration-200"
            />
            
            {/* Region Labels */}
            <text x="400" y="190" textAnchor="middle" className="text-xs font-semibold">Nagpur</text>
            <text x="310" y="190" textAnchor="middle" className="text-xs font-semibold">Amravati</text>
            <text x="240" y="230" textAnchor="middle" className="text-xs font-semibold">C.S.Nagar</text>
            <text x="170" y="220" textAnchor="middle" className="text-xs font-semibold">Nashik</text>
            <text x="190" y="310" textAnchor="middle" className="text-xs font-semibold">Pune</text>
            <text x="115" y="280" textAnchor="middle" className="text-xs font-semibold">Konkan</text>
          </svg>
        </div>
      </div>
      
      {/* Refresh button */}
      <div className="absolute top-2 right-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white h-7 w-7 p-0" 
          onClick={() => window.location.reload()}
        >
          <RefreshCw size={14} />
        </Button>
      </div>
    </div>
  );
}