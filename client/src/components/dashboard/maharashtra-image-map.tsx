import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraImageMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraImageMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraImageMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Define clickable regions for the image map
  const regionAreas = [
    { 
      name: "Nagpur", 
      shape: "poly", 
      coords: "697,56, 737,61, 760,91, 766,143, 749,193, 708,240, 665,265, 619,240, 608,190, 634,131, 665,92", 
      title: "Nagpur Region" 
    },
    { 
      name: "Amravati", 
      shape: "poly", 
      coords: "510,124, 552,114, 608,109, 634,131, 619,190, 582,236, 525,242, 455,198, 442,151, 478,127", 
      title: "Amravati Region" 
    },
    { 
      name: "Chhatrapati Sambhajinagar", 
      shape: "poly", 
      coords: "316,206, 350,203, 389,220, 442,220, 495,220, 556,227, 582,236, 546,293, 487,340, 392,321, 330,291", 
      title: "Chhatrapati Sambhajinagar Region" 
    },
    { 
      name: "Nashik", 
      shape: "poly", 
      coords: "235,58, 270,53, 317,61, 401,87, 442,151, 405,205, 330,204, 285,220, 254,250, 229,186, 224,124", 
      title: "Nashik Region" 
    },
    { 
      name: "Pune", 
      shape: "poly", 
      coords: "202,341, 254,250, 285,220, 330,291, 392,321, 387,387, 330,458, 245,494, 198,453, 172,392", 
      title: "Pune Region" 
    },
    { 
      name: "Konkan", 
      shape: "poly", 
      coords: "72,205, 116,195, 168,220, 172,250, 147,313, 102,430, 41,361, 33,268", 
      title: "Konkan Region" 
    }
  ];

  // Handle click on a region
  const handleRegionClick = (regionName: string) => {
    onRegionClick(regionName);
  };

  // Get the CSS class for a region
  const getRegionClass = (regionName: string) => {
    if (regionName === selectedRegion || regionName === hoveredRegion) {
      return "region-highlight";
    }
    return "";
  };

  return (
    <Card className={isLoading ? "opacity-50" : ""}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Regions
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[400px] w-full rounded-md" />
          </div>
        ) : (
          <div className="relative w-full" style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="relative">
              <img 
                src="/maharashtra-map.png" 
                alt="Maharashtra Map" 
                className="w-full h-auto" 
                useMap="#maharashtra-map"
              />
              
              {/* Overlays for hover effects */}
              {regionAreas.map((region) => (
                <div 
                  key={region.name}
                  className={`absolute transition-all duration-200 ${
                    selectedRegion === region.name
                    ? 'opacity-40 bg-blue-600 border-2 border-white shadow-lg'
                    : hoveredRegion === region.name
                      ? 'opacity-30 bg-blue-400 border border-white'
                      : 'opacity-0'
                  }`}
                  style={{
                    clipPath: `polygon(${region.coords.split(',').map((coord, index) => {
                      // Convert comma-separated x,y coords to polygon points
                      return index % 2 === 0 
                        ? `${coord}px ` 
                        : `${coord}px, `;
                    }).join('')})`,
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none', // So it doesn't interfere with map clicks
                    zIndex: selectedRegion === region.name || hoveredRegion === region.name ? 10 : 0,
                  }}
                />
              ))}
              
              <map name="maharashtra-map">
                {regionAreas.map((region) => (
                  <area 
                    key={region.name}
                    shape={region.shape} 
                    coords={region.coords} 
                    alt={region.name} 
                    title={region.title}
                    onClick={() => handleRegionClick(region.name)}
                    onMouseEnter={() => setHoveredRegion(region.name)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </map>
            </div>
            
            {/* Selected region indicator */}
            {selectedRegion !== "all" && (
              <div className="mt-4 text-center">
                <span className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-sm font-medium shadow-sm">
                  {selectedRegion} Region Selected
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}