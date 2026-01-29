import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region, RegionSummary } from '@/types';

interface MaharashtraSvgMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function EnhancedSvgMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraSvgMapProps): JSX.Element {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  
  // Load the SVG file when the component mounts
  useEffect(() => {
    fetch('/maharashtra-divisions.svg')
      .then(response => response.text())
      .then(data => {
        setSvgContent(data);
      })
      .catch(error => {
        console.error('Error loading SVG data:', error);
      });
  }, []);

  // Get region color based on region name
  const getRegionColor = (regionName: string) => {
    // Match colors exactly as in the reference image
    if (regionName === 'Amaravati' || regionName === 'Amravati') return '#F8BFC7'; // Light pink
    if (regionName === 'Nagpur') return '#E8CEAD'; // Light brown/beige
    if (regionName === 'Chhatrapati Sambhajinagar' || regionName === 'Aurangabad') return '#C0D1F0'; // Light blue
    if (regionName === 'Nashik') return '#F1E476'; // Yellow
    if (regionName === 'Pune') return '#ADEBAD'; // Light green
    if (regionName === 'Konkan') return '#BFC0C0'; // Gray
    return '#cccccc'; // Default fallback
  };

  // Get percentage for displaying metrics
  const getPercentage = (regionName: string) => {
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
    
    return Math.round(percentage);
  };

  // Location pins for each region
  const regionPins = [
    { name: "Nagpur", x: 670, y: 100, regionName: "Nagpur" },
    { name: "Amravati", x: 515, y: 115, regionName: "Amravati" },
    { name: "Chhatrapati Sambhajinagar", x: 318, y: 218, regionName: "Chhatrapati Sambhajinagar" },
    { name: "Nashik", x: 180, y: 185, regionName: "Nashik" },
    { name: "Pune", x: 230, y: 340, regionName: "Pune" },
    { name: "Konkan", x: 100, y: 420, regionName: "Konkan" }
  ];

  // District data for labels
  const districtData = [
    // Amravati region
    { name: "Akola", x: 460, y: 140, region: "Amravati" },
    { name: "Washim", x: 455, y: 180, region: "Amravati" },
    { name: "Yavatmal", x: 505, y: 195, region: "Amravati" },
    { name: "Buldhana", x: 390, y: 165, region: "Amravati" },
    
    // Nagpur region
    { name: "Bhandara", x: 725, y: 100, region: "Nagpur" },
    { name: "Gondia", x: 760, y: 80, region: "Nagpur" },
    { name: "Wardha", x: 595, y: 140, region: "Nagpur" },
    { name: "Chandrapur", x: 675, y: 180, region: "Nagpur" },
    { name: "Gadchiroli", x: 720, y: 250, region: "Nagpur" },
    
    // Chhatrapati Sambhajinagar region
    { name: "Jalna", x: 400, y: 218, region: "Chhatrapati Sambhajinagar" },
    { name: "Parbhani", x: 430, y: 245, region: "Chhatrapati Sambhajinagar" },
    { name: "Hingoli", x: 465, y: 255, region: "Chhatrapati Sambhajinagar" },
    { name: "Nanded", x: 500, y: 265, region: "Chhatrapati Sambhajinagar" },
    { name: "Beed", x: 350, y: 280, region: "Chhatrapati Sambhajinagar" },
    { name: "Latur", x: 425, y: 300, region: "Chhatrapati Sambhajinagar" },
    { name: "Dharashiv", x: 380, y: 340, region: "Chhatrapati Sambhajinagar" },
    
    // Nashik region
    { name: "Dhule", x: 215, y: 140, region: "Nashik" },
    { name: "Jalgaon", x: 300, y: 125, region: "Nashik" },
    { name: "Nandurbar", x: 160, y: 100, region: "Nashik" },
    { name: "Ahmadnagar", x: 270, y: 260, region: "Nashik" },
    { name: "Palghar", x: 120, y: 170, region: "Nashik" },
    
    // Pune region
    { name: "Solapur", x: 320, y: 380, region: "Pune" },
    { name: "Sangli", x: 230, y: 420, region: "Pune" },
    { name: "Kolhapur", x: 190, y: 460, region: "Pune" },
    { name: "Satara", x: 230, y: 380, region: "Pune" },
    
    // Konkan region
    { name: "Mumbai", x: 60, y: 320, region: "Konkan" },
    { name: "Mumbai Suburban", x: 60, y: 300, region: "Konkan" },
    { name: "Thane", x: 100, y: 280, region: "Konkan" },
    { name: "Raigad", x: 120, y: 330, region: "Konkan" },
    { name: "Ratnagiri", x: 140, y: 390, region: "Konkan" },
    { name: "Sindhudurg", x: 120, y: 460, region: "Konkan" }
  ];

  // Clickable region areas - matched to the reference image
  const regionAreas = [
    {
      name: "Amravati",
      top: 90,
      left: 390,
      width: 160,
      height: 120,
    },
    {
      name: "Nagpur",
      top: 70,
      left: 580,
      width: 200,
      height: 180,
    },
    {
      name: "Chhatrapati Sambhajinagar",
      top: 210,
      left: 320,
      width: 200,
      height: 150,
    },
    {
      name: "Nashik",
      top: 125,
      left: 120,
      width: 220,
      height: 150,
    },
    {
      name: "Pune",
      top: 280,
      left: 150,
      width: 230,
      height: 200,
    },
    {
      name: "Konkan",
      top: 280,
      left: 50,
      width: 100,
      height: 220,
    }
  ];

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
          <div className="relative w-full" style={{ height: '500px', backgroundColor: '#0a1033', overflow: 'hidden' }}>
            {/* Use the SVG as a background */}
            <div 
              id="maharashtra-svg-map" 
              className="h-full w-full relative"
              style={{ backgroundColor: '#0a1033' }}
            >
              {/* Region colored areas */}
              {regionAreas.map((area, idx) => (
                <div 
                  key={`region-${idx}`}
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: `${area.top}px`, 
                    left: `${area.left}px`, 
                    width: `${area.width}px`, 
                    height: `${area.height}px`,
                    cursor: 'pointer',
                    backgroundColor: getRegionColor(area.name),
                    opacity: hoveredRegion === area.name ? 0.9 : 0.7,
                    border: selectedRegion === area.name ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === area.name ? '0 0 8px rgba(255,255,255,0.5)' : 'none',
                    borderRadius: '4px',
                    zIndex: 1
                  }}
                  onClick={() => onRegionClick(area.name)}
                  onMouseOver={() => setHoveredRegion(area.name)}
                  onMouseOut={() => setHoveredRegion(null)}
                />
              ))}
              
              {/* SVG overlay layer for boundaries */}
              <div 
                className="absolute top-0 left-0 w-full h-full"
                style={{ zIndex: 2 }}
                dangerouslySetInnerHTML={{ 
                  __html: `<svg viewBox="0 0 800 600" width="100%" height="100%">
                    <g fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.7">
                      <!-- District boundaries -->
                      <path d="M160,100 L215,140 L300,125 L390,165 L455,180 L505,195" />
                      <path d="M160,100 L160,170 L120,170" />
                      <path d="M300,125 L390,165 L400,218" />
                      <path d="M400,218 L430,245 L465,255 L500,265" />
                      <path d="M400,218 L350,280 L425,300 L380,340" />
                      <path d="M215,140 L270,260 L230,340" />
                      <path d="M230,340 L320,380 L230,420 L190,460" />
                      <path d="M120,170 L100,280 L60,300 L60,320 L120,330 L140,390 L120,460" />
                    </g>
                  </svg>`
                }} 
              />
              
              {/* SVG overlay layer for pins, labels, etc. */}
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                viewBox="0 0 800 600"
                style={{ zIndex: 10 }}
              >
                {/* Location pins */}
                {regionPins.map((pin, idx) => (
                  <g key={`pin-${idx}`}>
                    {/* Small dot marker without circles around it */}
                    <circle 
                      cx={pin.x} 
                      cy={pin.y} 
                      r="4" 
                      fill="#FF4136" 
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.4))"
                    />
                    <text 
                      x={pin.x} 
                      y={pin.y - 15} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="14" 
                      fontWeight="bold"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {pin.regionName}
                    </text>
                    {/* Text outline/glow for better visibility */}
                    <text 
                      x={pin.x} 
                      y={pin.y - 15}
                      textAnchor="middle" 
                      stroke="#0a1033" 
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      fill="none"
                      fontSize="14" 
                      fontWeight="bold"
                      style={{ opacity: 0.5 }}
                    >
                      {pin.regionName}
                    </text>
                  </g>
                ))}
                
                {/* District labels */}
                {districtData.map((district, idx) => (
                  <g key={`district-${idx}`}>
                    {/* Text shadow/outline for better readability */}
                    <text 
                      x={district.x} 
                      y={district.y} 
                      textAnchor="middle" 
                      stroke="#0a1033" 
                      strokeWidth="3"
                      strokeLinejoin="round"
                      fill="none"
                      fontSize="9"
                      opacity="0.4"
                    >
                      {district.name}
                    </text>
                    <text 
                      x={district.x} 
                      y={district.y} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="9"
                      fontWeight="500"
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.6))"
                      style={{ letterSpacing: '0.2px' }}
                    >
                      {district.name}
                    </text>
                  </g>
                ))}
                
                {/* Compass rose (no circular boundaries) */}
                <g transform="translate(50, 500)">
                  {/* Compass directional lines only */}
                  <path d="M25,3 L25,47 M3,25 L47,25" stroke="#fff" strokeWidth="1" />
                  <path d="M10,10 L40,40 M10,40 L40,10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2,1" />
                  {/* Center point */}
                  <circle cx="25" cy="25" r="2" fill="#fff" />
                  <text x="25" y="8" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">N</text>
                  <text x="25" y="45" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">S</text>
                  <text x="5" y="27" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">W</text>
                  <text x="45" y="27" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">E</text>
                </g>
                
                {/* Region legend */}
                <g transform="translate(620, 400)">
                  <rect x="0" y="0" width="150" height="175" fill="#0a1033" opacity="0.8" rx="4" ry="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
                  <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">Regions</text>
                  
                  {[
                    { name: 'Amaravati', color: '#F8BFC7', y: 45 },
                    { name: 'Nagpur', color: '#E8CEAD', y: 65 },
                    { name: 'C.S. Nagar', color: '#C0D1F0', y: 85 },
                    { name: 'Nashik', color: '#F1E476', y: 105 },
                    { name: 'Pune', color: '#ADEBAD', y: 125 },
                    { name: 'Konkan', color: '#BFC0C0', y: 145 }
                  ].map((region, idx) => (
                    <g key={`legend-${idx}`}>
                      <rect x="10" y={region.y-10} width="15" height="15" fill={region.color} stroke="#fff" strokeWidth="0.5" rx="2" ry="2" />
                      <text x="32" y={region.y} fill="#fff" fontSize="10" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.3))">{region.name}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}