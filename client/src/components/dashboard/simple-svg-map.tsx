import React, { useState } from 'react';
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

export default function MaharashtraSvgMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraSvgMapProps): JSX.Element {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Get region color based on metric
  const getRegionColor = (regionName: string) => {
    if (!regions) return '#cccccc'; // Default color

    const region = regions.find(r => r.region_name === regionName);
    if (!region) {
      // Fallback color scheme for the regions
      if (regionName === 'Amravati') return '#ffccaa';
      if (regionName === 'Nagpur') return '#ffd699';
      if (regionName === 'Chhatrapati Sambhajinagar' || regionName === 'Aurangabad') return '#ccdeff';
      if (regionName === 'Nashik') return '#ffeb99';
      if (regionName === 'Pune') return '#adebad';
      if (regionName === 'Konkan') return '#c2c2c2';
      return '#cccccc';
    }
    
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
    
    // Color based on percentage
    if (percentage >= 75) {
      return '#4ade80'; // green-400 for high completion
    } else if (percentage >= 50) {
      return '#a3e635'; // lime-400 for medium-high completion
    } else if (percentage >= 25) {
      return '#facc15'; // yellow-400 for medium-low completion
    } else {
      return '#f87171'; // red-400 for low completion
    }
  };

  // Location pins for each region
  const regionPins = [
    { name: "Nagpur", x: 450, y: 150 },
    { name: "Amravati", x: 320, y: 180 },
    { name: "Chhatrapati Sambhajinagar", x: 250, y: 300 },
    { name: "Nashik", x: 130, y: 250 },
    { name: "Pune", x: 130, y: 380 },
    { name: "Konkan", x: 50, y: 420 }
  ];

  // District data for labels
  const districtData = [
    { name: "Akola", x: 300, y: 200, region: "Amravati" },
    { name: "Washim", x: 290, y: 230, region: "Amravati" },
    { name: "Yavatmal", x: 330, y: 250, region: "Amravati" },
    { name: "Buldhana", x: 250, y: 230, region: "Amravati" },
    
    { name: "Bhandara", x: 470, y: 160, region: "Nagpur" },
    { name: "Gondia", x: 490, y: 140, region: "Nagpur" },
    { name: "Wardha", x: 400, y: 200, region: "Nagpur" },
    { name: "Chandrapur", x: 450, y: 240, region: "Nagpur" },
    { name: "Gadchiroli", x: 480, y: 280, region: "Nagpur" },
    
    { name: "Jalna", x: 260, y: 280, region: "Chhatrapati Sambhajinagar" },
    { name: "Parbhani", x: 290, y: 310, region: "Chhatrapati Sambhajinagar" },
    { name: "Hingoli", x: 310, y: 290, region: "Chhatrapati Sambhajinagar" },
    { name: "Nanded", x: 350, y: 320, region: "Chhatrapati Sambhajinagar" },
    { name: "Beed", x: 220, y: 330, region: "Chhatrapati Sambhajinagar" },
    { name: "Latur", x: 280, y: 360, region: "Chhatrapati Sambhajinagar" },
    { name: "Dharashiv", x: 240, y: 380, region: "Chhatrapati Sambhajinagar" },
    
    { name: "Dhule", x: 150, y: 190, region: "Nashik" },
    { name: "Jalgaon", x: 200, y: 180, region: "Nashik" },
    { name: "Nandurbar", x: 120, y: 150, region: "Nashik" },
    { name: "Ahmadnagar", x: 170, y: 290, region: "Nashik" },
    { name: "Palghar", x: 60, y: 240, region: "Nashik" },
    
    { name: "Solapur", x: 200, y: 390, region: "Pune" },
    { name: "Sangli", x: 130, y: 440, region: "Pune" },
    { name: "Kolhapur", x: 100, y: 460, region: "Pune" },
    { name: "Satara", x: 130, y: 410, region: "Pune" },
    
    { name: "Mumbai", x: 50, y: 300, region: "Konkan" },
    { name: "Thane", x: 70, y: 280, region: "Konkan" },
    { name: "Raigad", x: 80, y: 330, region: "Konkan" },
    { name: "Ratnagiri", x: 60, y: 380, region: "Konkan" },
    { name: "Sindhudurg", x: 50, y: 440, region: "Konkan" }
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
            <div 
              id="maharashtra-svg-map" 
              className="h-full w-full bg-center bg-no-repeat bg-contain relative"
              style={{ backgroundColor: '#0a1033', backgroundImage: 'url(/maharashtra-divisions.svg)', backgroundPosition: 'center', backgroundSize: 'contain', backgroundRepeat: 'no-repeat' }}
            >
              {/* SVG overlay layer for pins, labels, etc. */}
              <svg 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                viewBox="0 0 550 550"
                style={{ zIndex: 10 }}
              >
                {/* Location pins */}
                {regionPins.map((pin, idx) => (
                  <g key={`pin-${idx}`}>
                    <circle 
                      cx={pin.x} 
                      cy={pin.y} 
                      r="7" 
                      fill="#FF4136" 
                      stroke="#fff" 
                      strokeWidth="1.5"
                      filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.5))"
                    />
                    <circle 
                      cx={pin.x} 
                      cy={pin.y} 
                      r="3" 
                      fill="#ff6b63" 
                      stroke="#fff" 
                      strokeWidth="0.5"
                    />
                    <line 
                      x1={pin.x-5} 
                      y1={pin.y} 
                      x2={pin.x+5} 
                      y2={pin.y} 
                      stroke="#fff" 
                      strokeWidth="1.5" 
                    />
                    <line 
                      x1={pin.x} 
                      y1={pin.y-5} 
                      x2={pin.x} 
                      y2={pin.y+5} 
                      stroke="#fff" 
                      strokeWidth="1.5" 
                    />
                    <text 
                      x={pin.x} 
                      y={pin.y+22} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="14" 
                      fontWeight="bold"
                      filter="drop-shadow(0px 1px 3px rgba(0,0,0,0.8))"
                      style={{ letterSpacing: '0.5px' }}
                    >
                      {pin.name}
                    </text>
                    {/* Text outline/glow for better visibility */}
                    <text 
                      x={pin.x} 
                      y={pin.y+22} 
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
                      {pin.name}
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
                      fontSize="10"
                      opacity="0.4"
                    >
                      {district.name}
                    </text>
                    <text 
                      x={district.x} 
                      y={district.y} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="10"
                      fontWeight="500"
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.6))"
                      style={{ letterSpacing: '0.2px' }}
                    >
                      {district.name}
                    </text>
                  </g>
                ))}
                
                {/* Compass rose */}
                <g transform="translate(50, 500)">
                  <circle cx="25" cy="25" r="24" fill="#0a1033" stroke="rgba(255,255,255,0.5)" strokeWidth="1" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
                  <circle cx="25" cy="25" r="22" fill="none" stroke="#fff" strokeWidth="1" />
                  <circle cx="25" cy="25" r="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <path d="M25,3 L25,47 M3,25 L47,25" stroke="#fff" strokeWidth="1" />
                  <path d="M10,10 L40,40 M10,40 L40,10" stroke="rgba(255,255,255,0.5)" strokeWidth="1" strokeDasharray="2,1" />
                  <circle cx="25" cy="25" r="4" fill="#0a1033" stroke="#fff" strokeWidth="1" />
                  <circle cx="25" cy="25" r="2" fill="#fff" />
                  <text x="25" y="8" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">N</text>
                  <text x="25" y="45" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">S</text>
                  <text x="5" y="27" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">W</text>
                  <text x="45" y="27" textAnchor="middle" fill="#fff" fontSize="10px" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">E</text>
                </g>
                
                {/* Region legend */}
                <g transform="translate(420, 375)">
                  <rect x="0" y="0" width="120" height="140" fill="#0a1033" opacity="0.8" rx="4" ry="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
                  <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">Regions</text>
                  
                  {[
                    { name: 'Amravati', color: '#ffccaa', y: 40 },
                    { name: 'Nagpur', color: '#ffd699', y: 60 },
                    { name: 'C.S. Nagar', color: '#ccdeff', y: 80 },
                    { name: 'Nashik', color: '#ffeb99', y: 100 },
                    { name: 'Pune', color: '#adebad', y: 120 },
                    { name: 'Konkan', color: '#c2c2c2', y: 140 }
                  ].map((region, idx) => (
                    <g key={`legend-${idx}`}>
                      <rect x="10" y={region.y-10} width="10" height="10" fill={region.color} stroke="#fff" strokeWidth="0.5" rx="2" ry="2" />
                      <text x="25" y={region.y} fill="#fff" fontSize="10" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.3))">{region.name}</text>
                    </g>
                  ))}
                </g>
                
                {/* Metric legend */}
                <g transform="translate(420, 140)">
                  <rect x="0" y="0" width="120" height="140" fill="#0a1033" opacity="0.8" rx="4" ry="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.3))" />
                  
                  <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.5))">
                    {metric === 'completion' ? 'Scheme Completion' : 
                    metric === 'esr' ? 'ESR Integration' : 
                    metric === 'villages' ? 'Village Integration' : 
                    'Flow Meter Progress'}
                  </text>
                  
                  {[
                    { label: '75-100%', color: '#4ade80', y: 40 },
                    { label: '50-74%', color: '#a3e635', y: 60 },
                    { label: '25-49%', color: '#facc15', y: 80 },
                    { label: '0-24%', color: '#f87171', y: 100 }
                  ].map((item, idx) => (
                    <g key={`metric-${idx}`}>
                      <rect x="10" y={item.y-10} width="10" height="10" fill={item.color} stroke="#fff" strokeWidth="0.5" rx="2" ry="2" />
                      <text x="25" y={item.y} fill="#fff" fontSize="10" filter="drop-shadow(0px 1px 1px rgba(0,0,0,0.3))">{item.label}</text>
                    </g>
                  ))}
                </g>
              </svg>
                
              {/* Clickable region areas */}
              <div className="absolute inset-0" style={{ zIndex: 5 }}>
                {/* Amravati region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '160px', 
                    left: '240px', 
                    width: '130px', 
                    height: '120px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Amravati' ? 'rgba(255,204,170,0.3)' : 'transparent',
                    border: selectedRegion === 'Amravati' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Amravati' ? '0 0 8px rgba(255,204,170,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Amravati')}
                  onMouseOver={() => setHoveredRegion('Amravati')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
                
                {/* Nagpur region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '120px', 
                    left: '380px', 
                    width: '150px', 
                    height: '180px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Nagpur' ? 'rgba(255,214,153,0.3)' : 'transparent',
                    border: selectedRegion === 'Nagpur' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Nagpur' ? '0 0 8px rgba(255,214,153,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Nagpur')}
                  onMouseOver={() => setHoveredRegion('Nagpur')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
                
                {/* Chhatrapati Sambhajinagar region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '260px', 
                    left: '200px', 
                    width: '180px', 
                    height: '150px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Chhatrapati Sambhajinagar' ? 'rgba(204,222,255,0.3)' : 'transparent',
                    border: selectedRegion === 'Chhatrapati Sambhajinagar' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Chhatrapati Sambhajinagar' ? '0 0 8px rgba(204,222,255,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Chhatrapati Sambhajinagar')}
                  onMouseOver={() => setHoveredRegion('Chhatrapati Sambhajinagar')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
                
                {/* Nashik region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '150px', 
                    left: '80px', 
                    width: '150px', 
                    height: '180px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Nashik' ? 'rgba(255,235,153,0.3)' : 'transparent',
                    border: selectedRegion === 'Nashik' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Nashik' ? '0 0 8px rgba(255,235,153,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Nashik')}
                  onMouseOver={() => setHoveredRegion('Nashik')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
                
                {/* Pune region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '350px', 
                    left: '80px', 
                    width: '160px', 
                    height: '150px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Pune' ? 'rgba(173,235,173,0.3)' : 'transparent',
                    border: selectedRegion === 'Pune' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Pune' ? '0 0 8px rgba(173,235,173,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Pune')}
                  onMouseOver={() => setHoveredRegion('Pune')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
                
                {/* Konkan region clickable area */}
                <div 
                  className="absolute transition-all duration-200 ease-in-out" 
                  style={{
                    top: '280px', 
                    left: '30px', 
                    width: '80px', 
                    height: '200px',
                    cursor: 'pointer',
                    backgroundColor: hoveredRegion === 'Konkan' ? 'rgba(194,194,194,0.3)' : 'transparent',
                    border: selectedRegion === 'Konkan' ? '2px solid #2563eb' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: hoveredRegion === 'Konkan' ? '0 0 8px rgba(194,194,194,0.5)' : 'none',
                    borderRadius: '4px'
                  }}
                  onClick={() => onRegionClick('Konkan')}
                  onMouseOver={() => setHoveredRegion('Konkan')}
                  onMouseOut={() => setHoveredRegion(null)}
                />
              </div>
            </div>
            
            {selectedRegion !== "all" && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full text-sm font-medium shadow-md backdrop-blur-sm border border-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
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