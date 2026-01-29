import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraInteractiveMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraInteractiveMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraInteractiveMapProps) {
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // District to region mapping as requested
  const districtToRegion: { [key: string]: string } = {
    // Konkan
    "Mumbai City": "Konkan",
    "Mumbai Suburban": "Konkan", 
    "Thane": "Konkan",
    "Palghar": "Konkan",
    "Raigad": "Konkan",
    "Ratnagiri": "Konkan",
    "Sindhudurg": "Konkan",
    
    // Pune
    "Pune": "Pune",
    "Satara": "Pune",
    "Sangli": "Pune",
    "Kolhapur": "Pune",
    "Solapur": "Pune",
    
    // Nashik
    "Nashik": "Nashik",
    "Nandurbar": "Nashik",
    "Dhule": "Nashik", 
    "Jalgaon": "Nashik",
    "Ahmednagar": "Nashik",
    
    // Chhatrapati Sambhajinagar
    "Chhatrapati Sambhajinagar": "Chhatrapati Sambhajinagar",
    "Jalna": "Chhatrapati Sambhajinagar",
    "Beed": "Chhatrapati Sambhajinagar",
    "Parbhani": "Chhatrapati Sambhajinagar",
    "Hingoli": "Chhatrapati Sambhajinagar",
    "Latur": "Chhatrapati Sambhajinagar",
    "Osmanabad": "Chhatrapati Sambhajinagar",
    "Dharashiv": "Chhatrapati Sambhajinagar",
    "Nanded": "Chhatrapati Sambhajinagar",
    
    // Amravati
    "Akola": "Amravati",
    "Amravati": "Amravati",
    "Buldhana": "Amravati",
    "Washim": "Amravati",
    "Yavatmal": "Amravati",
    
    // Nagpur
    "Nagpur": "Nagpur",
    "Wardha": "Nagpur",
    "Chandrapur": "Nagpur",
    "Gadchiroli": "Nagpur",
    "Gondia": "Nagpur",
    "Bhandara": "Nagpur"
  };

  const handleDistrictHover = (districtName: string | null) => {
    setHoveredDistrict(districtName);
  };

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
      return darkenColor(baseColor, 0.3); // Darker for highlighting
    }
    
    return baseColor;
  };

  // District path data with coordinates
  const districts = [
    // Konkan Division
    { name: "Mumbai City", region: "Konkan", path: "M 25,312 L 75,312 L 75,362 L 25,362 Z", labelX: 50, labelY: 337, fontSize: 8 },
    { name: "Mumbai Suburban", region: "Konkan", path: "M 25,262 L 75,262 L 75,312 L 25,312 Z", labelX: 50, labelY: 287, fontSize: 8 },
    { name: "Thane", region: "Konkan", path: "M 75,262 L 125,262 L 125,312 L 75,312 Z", labelX: 100, labelY: 287, fontSize: 10 },
    { name: "Palghar", region: "Konkan", path: "M 125,212 L 175,212 L 175,262 L 125,262 Z", labelX: 150, labelY: 237, fontSize: 10 },
    { name: "Raigad", region: "Konkan", path: "M 75,312 L 125,312 L 125,362 L 75,362 Z", labelX: 100, labelY: 337, fontSize: 10 },
    { name: "Ratnagiri", region: "Konkan", path: "M 25,362 L 75,362 L 75,412 L 25,412 Z", labelX: 50, labelY: 387, fontSize: 9 },
    { name: "Sindhudurg", region: "Konkan", path: "M 25,412 L 75,412 L 75,462 L 25,462 Z", labelX: 50, labelY: 437, fontSize: 9 },
    
    // Pune Division  
    { name: "Pune", region: "Pune", path: "M 175,312 L 250,312 L 250,362 L 175,362 Z", labelX: 212, labelY: 337, fontSize: 10 },
    { name: "Solapur", region: "Pune", path: "M 250,312 L 325,312 L 325,362 L 250,362 Z", labelX: 287, labelY: 337, fontSize: 10 },
    { name: "Satara", region: "Pune", path: "M 175,362 L 250,362 L 250,412 L 175,412 Z", labelX: 212, labelY: 387, fontSize: 10 },
    { name: "Sangli", region: "Pune", path: "M 175,412 L 250,412 L 250,462 L 175,462 Z", labelX: 212, labelY: 437, fontSize: 10 },
    { name: "Kolhapur", region: "Pune", path: "M 175,462 L 250,462 L 250,500 L 175,500 Z", labelX: 212, labelY: 481, fontSize: 10 },
    
    // Nashik Division
    { name: "Nandurbar", region: "Nashik", path: "M 175,62 L 220,62 L 220,112 L 175,112 Z", labelX: 197, labelY: 87, fontSize: 10 },
    { name: "Dhule", region: "Nashik", path: "M 175,112 L 250,112 L 250,162 L 175,162 Z", labelX: 212, labelY: 137, fontSize: 10 },
    { name: "Jalgaon", region: "Nashik", path: "M 250,112 L 325,112 L 325,162 L 250,162 Z", labelX: 287, labelY: 137, fontSize: 10 },
    { name: "Nashik", region: "Nashik", path: "M 175,162 L 250,162 L 250,212 L 175,212 Z", labelX: 212, labelY: 187, fontSize: 10 },
    { name: "Ahmednagar", region: "Nashik", path: "M 250,212 L 325,212 L 325,262 L 250,262 Z", labelX: 287, labelY: 237, fontSize: 10 },
    
    // Amravati Division
    { name: "Akola", region: "Amravati", path: "M 325,112 L 400,112 L 400,162 L 325,162 Z", labelX: 362, labelY: 137, fontSize: 10 },
    { name: "Amravati", region: "Amravati", path: "M 400,112 L 475,112 L 475,162 L 400,162 Z", labelX: 437, labelY: 137, fontSize: 10 },
    { name: "Buldhana", region: "Amravati", path: "M 325,162 L 400,162 L 400,212 L 325,212 Z", labelX: 362, labelY: 187, fontSize: 10 },
    { name: "Washim", region: "Amravati", path: "M 400,162 L 475,162 L 475,212 L 400,212 Z", labelX: 437, labelY: 187, fontSize: 10 },
    { name: "Yavatmal", region: "Amravati", path: "M 475,162 L 550,162 L 550,212 L 475,212 Z", labelX: 512, labelY: 187, fontSize: 10 },
    
    // Nagpur Division
    { name: "Nagpur", region: "Nagpur", path: "M 475,62 L 550,62 L 550,112 L 475,112 Z", labelX: 512, labelY: 87, fontSize: 10 },
    { name: "Bhandara", region: "Nagpur", path: "M 550,62 L 600,62 L 600,112 L 550,112 Z", labelX: 575, labelY: 87, fontSize: 10 },
    { name: "Gondia", region: "Nagpur", path: "M 600,62 L 650,62 L 650,112 L 600,112 Z", labelX: 625, labelY: 87, fontSize: 10 },
    { name: "Wardha", region: "Nagpur", path: "M 475,112 L 550,112 L 550,162 L 475,162 Z", labelX: 512, labelY: 137, fontSize: 10 },
    { name: "Chandrapur", region: "Nagpur", path: "M 550,212 L 600,212 L 600,262 L 550,262 Z", labelX: 575, labelY: 237, fontSize: 10 },
    { name: "Gadchiroli", region: "Nagpur", path: "M 600,212 L 650,212 L 650,300 L 600,300 Z", labelX: 625, labelY: 256, fontSize: 10 },
    
    // Chhatrapati Sambhajinagar Division
    { name: "Chhatrapati Sambhajinagar", region: "Chhatrapati Sambhajinagar", path: "M 250,162 L 325,162 L 325,212 L 250,212 Z", labelX: 287, labelY: 187, fontSize: 9 },
    { name: "Jalna", region: "Chhatrapati Sambhajinagar", path: "M 325,212 L 400,212 L 400,262 L 325,262 Z", labelX: 362, labelY: 237, fontSize: 10 },
    { name: "Parbhani", region: "Chhatrapati Sambhajinagar", path: "M 400,212 L 475,212 L 475,262 L 400,262 Z", labelX: 437, labelY: 237, fontSize: 10 },
    { name: "Hingoli", region: "Chhatrapati Sambhajinagar", path: "M 475,212 L 550,212 L 550,262 L 475,262 Z", labelX: 512, labelY: 237, fontSize: 10 },
    { name: "Beed", region: "Chhatrapati Sambhajinagar", path: "M 325,262 L 400,262 L 400,312 L 325,312 Z", labelX: 362, labelY: 287, fontSize: 10 },
    { name: "Nanded", region: "Chhatrapati Sambhajinagar", path: "M 475,262 L 550,262 L 550,312 L 475,312 Z", labelX: 512, labelY: 287, fontSize: 10 },
    { name: "Latur", region: "Chhatrapati Sambhajinagar", path: "M 400,312 L 475,312 L 475,362 L 400,362 Z", labelX: 437, labelY: 337, fontSize: 10 },
    { name: "Osmanabad", region: "Chhatrapati Sambhajinagar", path: "M 325,312 L 400,312 L 400,362 L 325,362 Z", labelX: 362, labelY: 337, fontSize: 9 },
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
              viewBox="0 0 650 500" 
              className="w-full h-full"
              style={{ minHeight: '400px' }}
            >
              {/* Background */}
              <rect width="650" height="500" fill="#f0f9ff"/>
              
              {/* CSS for hover effects */}
              <defs>
                <style>
                  {`
                    .district-path {
                      pointer-events: all;
                      fill-opacity: 1;
                      stroke: #fff;
                      stroke-width: 1;
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
                      className={`district-path ${isHighlighted ? 'district-highlighted' : ''}`}
                      onMouseEnter={() => handleDistrictHover(district.name)}
                      onMouseLeave={() => handleDistrictHover(null)}
                      onClick={() => onRegionClick(district.region)}
                    />
                  <text 
                    x={district.labelX} 
                    y={district.labelY} 
                    textAnchor="middle" 
                    fontSize={district.fontSize} 
                    fill="#000"
                    style={{ pointerEvents: 'none' }}
                  >
                    {district.name === "Mumbai Suburban" ? (
                      <>
                        <tspan x={district.labelX} dy="0">Mumbai</tspan>
                        <tspan x={district.labelX} dy="12">Suburban</tspan>
                      </>
                    ) : district.name === "Mumbai City" ? (
                      <>
                        <tspan x={district.labelX} dy="0">Mumbai</tspan>
                        <tspan x={district.labelX} dy="12">City</tspan>
                      </>
                    ) : (
                      district.name
                    )}
                  </text>
                </g>
                );
              })}

              {/* Arabian Sea */}
              <rect x="0" y="0" width="25" height="500" fill="#e0f2fe"/>
              <text x="12" y="250" textAnchor="middle" fontSize="12" fill="#0369a1" transform="rotate(-90 12 250)">Arabian Sea</text>

              {/* Legend */}
              <g transform="translate(450, 320)">
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