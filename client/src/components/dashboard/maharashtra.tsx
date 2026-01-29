import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region } from '@/types';

interface MaharashtraMapProps {
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraMap({
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraMapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // District to region mapping (exact JSON structure provided by user)
  const regionMapping = {
    "Konkan": ["Mumbai City", "Mumbai Suburban", "Thane", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg"],
    "Pune": ["Pune", "Satara", "Sangli", "Kolhapur", "Solapur"],
    "Nashik": ["Nashik", "Nandurbar", "Dhule", "Jalgaon", "Ahmednagar"],
    "Chhatrapati Sambhajinagar": ["Chhatrapati Sambhajinagar", "Jalna", "Beed", "Parbhani", "Hingoli", "Latur", "Osmanabad", "Nanded"],
    "Amravati": ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
    "Nagpur": ["Nagpur", "Wardha", "Chandrapur", "Gadchiroli", "Gondia", "Bhandara"]
  };

  // Function to find region for a district
  const getRegionForDistrict = (districtName: string): string | null => {
    for (const [region, districts] of Object.entries(regionMapping)) {
      if (districts.includes(districtName)) {
        return region;
      }
    }
    return null;
  };

  // Legacy mapping for backwards compatibility
  const districtToRegion: { [key: string]: string } = {};
  Object.entries(regionMapping).forEach(([region, districts]) => {
    districts.forEach(district => {
      districtToRegion[district] = region;
    });
  });

  // Get base color for region based on metric
  const getBaseRegionColor = (regionName: string) => {
    const regionData = regions.find(r => r.region_name === regionName);
    if (!regionData) {
      return '#E5E7EB'; // gray-200 if region not found
    }

    let percentage = 0;
    switch (metric) {
      case 'completion':
        if (regionData.total_schemes_integrated > 0) {
          percentage = (Number(regionData.fully_completed_schemes) / Number(regionData.total_schemes_integrated)) * 100;
        }
        break;
      case 'esr':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.fully_completed_esr) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
      case 'villages':
        if (regionData.total_villages_integrated > 0) {
          percentage = (Number(regionData.fully_completed_villages) / Number(regionData.total_villages_integrated)) * 100;
        }
        break;
      case 'flow_meter':
        if (regionData.total_esr_integrated > 0) {
          percentage = (Number(regionData.flow_meter_integrated) / Number(regionData.total_esr_integrated)) * 100;
        }
        break;
    }

    // Color scale based on percentage
    if (percentage >= 75) {
      return '#4ade80'; // green-400 for high completion
    } else if (percentage >= 50) {
      return '#a3e635'; // lime-400 for good completion
    } else if (percentage >= 25) {
      return '#facc15'; // yellow-400 for medium completion
    } else {
      return '#f87171'; // red-400 for low completion
    }
  };

  // Utility function to darken a hex color
  const darkenColor = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * amount * 100);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Get color for district with highlighting logic
  const getDistrictColor = (districtName: string) => {
    const regionName = districtToRegion[districtName];
    const baseColor = getBaseRegionColor(regionName);
    
    // Check if this district should be highlighted
    const shouldHighlight = hoveredDistrict && districtToRegion[hoveredDistrict] === regionName;
    
    if (shouldHighlight) {
      return darkenColor(baseColor, 0.4); // Darker for highlighting
    }
    
    return baseColor;
  };

  const handleDistrictHover = (districtName: string | null) => {
    setHoveredDistrict(districtName);
  };

  // District paths with larger, more hoverable shapes
  const districts = [
    // Konkan Division - Western coastal region
    { name: "Mumbai City", region: "Konkan", path: "M50,320 L110,315 L115,350 L108,365 L50,370 Z" },
    { name: "Mumbai Suburban", region: "Konkan", path: "M50,280 L115,275 L120,305 L115,325 L50,330 Z" },
    { name: "Thane", region: "Konkan", path: "M115,275 L160,270 L165,305 L160,325 L120,305 Z" },
    { name: "Palghar", region: "Konkan", path: "M115,220 L165,215 L175,250 L165,275 L115,280 Z" },
    { name: "Raigad", region: "Konkan", path: "M115,325 L160,320 L170,355 L165,385 L115,350 Z" },
    { name: "Ratnagiri", region: "Konkan", path: "M50,370 L108,365 L115,400 L105,440 L45,445 Z" },
    { name: "Sindhudurg", region: "Konkan", path: "M45,445 L105,440 L110,475 L100,505 L40,510 Z" },
    
    // Pune Division - South-central region
    { name: "Pune", region: "Pune", path: "M180,290 L260,285 L270,325 L265,360 L180,365 Z" },
    { name: "Solapur", region: "Pune", path: "M270,325 L350,320 L360,360 L355,400 L270,405 Z" },
    { name: "Satara", region: "Pune", path: "M150,365 L260,360 L270,400 L260,440 L150,445 Z" },
    { name: "Sangli", region: "Pune", path: "M150,445 L260,440 L270,480 L260,520 L150,525 Z" },
    { name: "Kolhapur", region: "Pune", path: "M150,525 L260,520 L270,560 L260,600 L150,605 Z" },
    
    // Nashik Division - North-western region  
    { name: "Nandurbar", region: "Nashik", path: "M175,80 L225,75 L235,115 L225,155 L175,160 Z" },
    { name: "Dhule", region: "Nashik", path: "M225,155 L290,150 L300,190 L290,230 L225,235 Z" },
    { name: "Jalgaon", region: "Nashik", path: "M290,150 L360,145 L370,185 L360,225 L290,230 Z" },
    { name: "Nashik", region: "Nashik", path: "M175,200 L260,195 L270,235 L260,275 L175,280 Z" },
    { name: "Ahmednagar", region: "Nashik", path: "M260,275 L340,270 L350,310 L340,350 L260,355 Z" },
    
    // Amravati Division - Central region
    { name: "Akola", region: "Amravati", path: "M370,150 L430,145 L440,185 L430,225 L370,230 Z" },
    { name: "Amravati", region: "Amravati", path: "M430,145 L490,140 L500,180 L490,220 L430,225 Z" },
    { name: "Buldhana", region: "Amravati", path: "M370,230 L430,225 L440,265 L430,305 L370,310 Z" },
    { name: "Washim", region: "Amravati", path: "M430,225 L490,220 L500,260 L490,300 L430,305 Z" },
    { name: "Yavatmal", region: "Amravati", path: "M490,220 L550,215 L560,255 L550,295 L490,300 Z" },
    
    // Nagpur Division - Eastern region
    { name: "Nagpur", region: "Nagpur", path: "M500,80 L560,75 L570,115 L560,155 L500,160 Z" },
    { name: "Bhandara", region: "Nagpur", path: "M560,75 L620,70 L630,110 L620,150 L560,155 Z" },
    { name: "Gondia", region: "Nagpur", path: "M620,70 L680,65 L690,105 L680,145 L620,150 Z" },
    { name: "Wardha", region: "Nagpur", path: "M500,160 L560,155 L570,195 L560,235 L500,240 Z" },
    { name: "Chandrapur", region: "Nagpur", path: "M560,280 L620,275 L630,315 L620,355 L560,360 Z" },
    { name: "Gadchiroli", region: "Nagpur", path: "M620,275 L690,270 L700,330 L690,390 L620,395 Z" },
    
    // Chhatrapati Sambhajinagar Division - Central-eastern region
    { name: "Chhatrapati Sambhajinagar", region: "Chhatrapati Sambhajinagar", path: "M260,195 L340,190 L350,230 L340,270 L260,275 Z" },
    { name: "Jalna", region: "Chhatrapati Sambhajinagar", path: "M340,270 L400,265 L410,305 L400,345 L340,350 Z" },
    { name: "Parbhani", region: "Chhatrapati Sambhajinagar", path: "M400,265 L460,260 L470,300 L460,340 L400,345 Z" },
    { name: "Hingoli", region: "Chhatrapati Sambhajinagar", path: "M460,260 L520,255 L530,295 L520,335 L460,340 Z" },
    { name: "Beed", region: "Chhatrapati Sambhajinagar", path: "M340,350 L400,345 L410,385 L400,425 L340,430 Z" },
    { name: "Nanded", region: "Chhatrapati Sambhajinagar", path: "M460,340 L520,335 L530,375 L520,415 L460,420 Z" },
    { name: "Latur", region: "Chhatrapati Sambhajinagar", path: "M400,425 L460,420 L470,460 L460,500 L400,505 Z" },
    { name: "Osmanabad", region: "Chhatrapati Sambhajinagar", path: "M340,430 L400,425 L410,465 L400,505 L340,510 Z" },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Districts - Interactive Map
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
          <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border">
            <svg 
              viewBox="0 0 700 500" 
              className="w-full h-full"
              style={{ minHeight: '400px' }}
            >
              {/* Background */}
              <rect width="700" height="500" fill="#f0f9ff"/>
              
              {/* CSS for hover effects */}
              <defs>
                <style>
                  {`
                    path {
                      pointer-events: all !important;
                      fill-opacity: 1 !important;
                      stroke: #fff;
                      stroke-width: 1;
                      transition: fill 0.2s ease, stroke 0.2s ease;
                      cursor: pointer;
                    }
                    
                    .district-path {
                      pointer-events: all !important;
                      fill-opacity: 1 !important;
                      stroke: #fff;
                      stroke-width: 2;
                      stroke-linejoin: round;  
                      stroke-linecap: round;
                      transition: fill 0.2s ease, stroke 0.2s ease;
                      cursor: pointer;
                    }
                    
                    .district-path:hover {
                      stroke-width: 2;
                    }
                    
                    .district-highlighted {
                      stroke-width: 2;
                      stroke: #1f2937;
                    }
                    
                    /* Region-based default colors */
                    [data-region="Konkan"] {
                      fill: #BFC0C0;
                    }
                    [data-region="Pune"] {
                      fill: #4CAF50;
                    }
                    [data-region="Nashik"] {
                      fill: #F1E476;
                    }
                    [data-region="Chhatrapati Sambhajinagar"] {
                      fill: #C0D1F0;
                    }
                    [data-region="Amravati"] {
                      fill: #F8BFC7;
                    }
                    [data-region="Nagpur"] {
                      fill: #E8CEAD;
                    }
                    
                    /* Darker colors for highlighting (hover effect) */
                    [data-region="Konkan"].highlight {
                      fill: #888B8B !important;
                    }
                    [data-region="Pune"].highlight {
                      fill: #2E7D32 !important;
                    }
                    [data-region="Nashik"].highlight {
                      fill: #C9B037 !important;
                    }
                    [data-region="Chhatrapati Sambhajinagar"].highlight {
                      fill: #7A9BC2 !important;
                    }
                    [data-region="Amravati"].highlight {
                      fill: #D1899F !important;
                    }
                    [data-region="Nagpur"].highlight {
                      fill: #C4A475 !important;
                    }
                  `}
                </style>
              </defs>

              {/* Render all districts */}
              {districts.map((district) => {
                const isHighlighted = hoveredDistrict && 
                  districtToRegion[hoveredDistrict] === district.region;
                
                return (
                  <g key={district.name}>
                    <path
                      d={district.path}
                      data-district={district.name}
                      data-region={district.region}
                      fill={getDistrictColor(district.name)}
                      className={`district-path ${isHighlighted ? 'district-highlighted highlight' : ''}`}
                      style={{ pointerEvents: 'all', cursor: 'pointer' }}
                      onMouseEnter={() => handleDistrictHover(district.name)}
                      onMouseLeave={() => handleDistrictHover(null)}
                      onClick={() => onRegionClick(district.region)}
                    />
                    {/* Large circular hover detection area for maximum coverage */}
                    <circle
                      cx={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const x1 = parseInt(coords[0]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const x2 = parseInt(lastCoord[0]);
                        return (x1 + x2) / 2;
                      })()}
                      cy={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const y1 = parseInt(coords[1]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const y2 = parseInt(lastCoord[1]);
                        return (y1 + y2) / 2;
                      })()}
                      r="35"
                      fill="transparent"
                      style={{ 
                        pointerEvents: 'all', 
                        cursor: 'pointer',
                        opacity: 0 
                      }}
                      onMouseEnter={() => handleDistrictHover(district.name)}
                      onMouseLeave={() => handleDistrictHover(null)}
                      onClick={() => onRegionClick(district.region)}
                    />
                    <text 
                      x={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const x1 = parseInt(coords[0]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const x2 = parseInt(lastCoord[0]);
                        return (x1 + x2) / 2;
                      })()} 
                      y={(() => {
                        const coords = district.path.split(' ')[1].split(',');
                        const y1 = parseInt(coords[1]);
                        const pathParts = district.path.split(' ');
                        const lastCoord = pathParts[pathParts.length - 2].split(',');
                        const y2 = parseInt(lastCoord[1]);
                        return (y1 + y2) / 2 + 3;
                      })()} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fill="#000"
                      fontWeight="500"
                      style={{ pointerEvents: 'none' }}
                    >
                      {district.name === "Mumbai Suburban" ? "Mumbai Sub." : 
                       district.name === "Chhatrapati Sambhajinagar" ? "C. Sambhajinagar" : 
                       district.name}
                    </text>
                  </g>
                );
              })}

              {/* Arabian Sea */}
              <rect x="0" y="0" width="80" height="500" fill="#e0f2fe"/>
              <text x="40" y="250" textAnchor="middle" fontSize="12" fill="#0369a1" transform="rotate(-90 40 250)">Arabian Sea</text>

              {/* Legend */}
              <g transform="translate(500, 320)">
                <rect x="0" y="0" width="190" height="170" fill="rgba(255,255,255,0.95)" stroke="#ccc" rx="5"/>
                <text x="10" y="18" fill="#000" fontSize="12" fontWeight="bold">Maharashtra Districts</text>
                <text x="10" y="35" fill="#666" fontSize="10">Hover over any district to</text>
                <text x="10" y="47" fill="#666" fontSize="10">highlight its entire region</text>
                
                {/* Color coding legend */}
                <text x="10" y="65" fill="#000" fontSize="10" fontWeight="bold">Completion Levels:</text>
                <rect x="10" y="75" width="12" height="12" fill="#4ade80"/>
                <text x="28" y="85" fill="#000" fontSize="9">≥75% (High)</text>
                <rect x="10" y="90" width="12" height="12" fill="#a3e635"/>
                <text x="28" y="100" fill="#000" fontSize="9">50-74% (Good)</text>
                <rect x="10" y="105" width="12" height="12" fill="#facc15"/>
                <text x="28" y="115" fill="#000" fontSize="9">25-49% (Medium)</text>
                <rect x="10" y="120" width="12" height="12" fill="#f87171"/>
                <text x="28" y="130" fill="#000" fontSize="9">&lt;25% (Low)</text>
                
                {hoveredDistrict && (
                  <text x="10" y="155" fill="#1f2937" fontSize="11" fontWeight="bold">
                    Hovering: {hoveredDistrict}
                  </text>
                )}
              </g>
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}