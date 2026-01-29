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
            <div id="maharashtra-svg-map" className="h-full relative z-0">
              {/* Use the SVG directly */}
              <object 
                data="/maharashtra-divisions.svg" 
                type="image/svg+xml"
                className="h-full w-full"
                style={{ filter: 'brightness(0.8) invert(0.1)' }}
                onLoad={(e) => {
                  // When SVG loads, we can access its document
                  const obj = e.currentTarget as HTMLObjectElement;
                  
                  // Wait for SVG to be fully loaded
                  setTimeout(() => {
                    if (obj.contentDocument) {
                      const svgDoc = obj.contentDocument;
                      
                      // Find all region paths in the SVG
                      const paths = svgDoc.querySelectorAll('path');
                      
                      // Apply styling and interactions to each path
                      paths.forEach(path => {
                        const id = path.getAttribute('id');
                        let regionName = null;
                        
                        // Map path IDs to region names
                        if (id?.includes('Amravati')) regionName = 'Amravati';
                        else if (id?.includes('Nagpur')) regionName = 'Nagpur';
                        else if (id?.includes('Aurangabad')) regionName = 'Chhatrapati Sambhajinagar';
                        else if (id?.includes('Nashik')) regionName = 'Nashik';
                        else if (id?.includes('Pune')) regionName = 'Pune';
                        else if (id?.includes('Konkan')) regionName = 'Konkan';
                        
                        if (regionName) {
                          // Apply color based on metric
                          path.setAttribute('fill', getRegionColor(regionName));
                          path.setAttribute('stroke', '#fff');
                          path.setAttribute('stroke-width', '1');
                          
                          // Highlight selected region
                          if (regionName === selectedRegion) {
                            path.setAttribute('stroke', '#2563eb');
                            path.setAttribute('stroke-width', '2');
                          }
                          
                          // Add hover effect
                          path.addEventListener('mouseover', () => {
                            path.setAttribute('stroke', '#2563eb');
                            path.setAttribute('stroke-width', '2');
                            setHoveredRegion(regionName);
                          });
                          
                          path.addEventListener('mouseout', () => {
                            if (regionName !== selectedRegion) {
                              path.setAttribute('stroke', '#fff');
                              path.setAttribute('stroke-width', '1');
                            }
                            setHoveredRegion(null);
                          });
                          
                          // Add click event
                          path.addEventListener('click', () => {
                            onRegionClick(regionName!);
                          });
                          
                          // Make clickable
                          path.style.cursor = 'pointer';
                        }
                      });
                    }
                  }, 500); // Small delay to ensure SVG is fully loaded
                }}
              />
              
              {/* Custom overlays (pins, labels, legends) */}
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
                      r="6" 
                      fill="#FF4136" 
                      stroke="#fff" 
                      strokeWidth="1.5" 
                    />
                    <line 
                      x1={pin.x-4} 
                      y1={pin.y} 
                      x2={pin.x+4} 
                      y2={pin.y} 
                      stroke="#fff" 
                      strokeWidth="1" 
                    />
                    <line 
                      x1={pin.x} 
                      y1={pin.y-4} 
                      x2={pin.x} 
                      y2={pin.y+4} 
                      stroke="#fff" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={pin.x} 
                      y={pin.y+20} 
                      textAnchor="middle" 
                      fill="#fff" 
                      fontSize="14" 
                      fontWeight="bold"
                      filter="drop-shadow(0px 0px 2px #000)"
                    >
                      {pin.name}
                    </text>
                  </g>
                ))}
                
                {/* District labels */}
                {districtData.map((district, idx) => (
                  <text 
                    key={`district-${idx}`}
                    x={district.x} 
                    y={district.y} 
                    textAnchor="middle" 
                    fill="#fff" 
                    fontSize="10"
                    filter="drop-shadow(0px 0px 1px #000)"
                  >
                    {district.name}
                  </text>
                ))}
                
                {/* Compass rose */}
                <g transform="translate(50, 500)">
                  <circle cx="25" cy="25" r="22" fill="none" stroke="#fff" strokeWidth="1" />
                  <path d="M25,3 L25,47 M3,25 L47,25" stroke="#fff" strokeWidth="1" />
                  <path d="M10,10 L40,40 M10,40 L40,10" stroke="#fff" strokeWidth="1" />
                  <circle cx="25" cy="25" r="3" fill="#fff" stroke="#fff" strokeWidth="0.5" />
                  <text x="25" y="5" textAnchor="middle" fill="#fff" fontSize="10px">N</text>
                  <text x="25" y="48" textAnchor="middle" fill="#fff" fontSize="10px">S</text>
                  <text x="3" y="27" textAnchor="middle" fill="#fff" fontSize="10px">W</text>
                  <text x="47" y="27" textAnchor="middle" fill="#fff" fontSize="10px">E</text>
                </g>
                
                {/* Region legend */}
                <g transform="translate(450, 400)">
                  <rect x="0" y="0" width="100" height="140" fill="#0a1033" opacity="0.8" rx="4" ry="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold">Regions</text>
                  
                  {[
                    { name: 'Amravati', color: '#ffccaa', y: 40 },
                    { name: 'Nagpur', color: '#ffd699', y: 60 },
                    { name: 'C.S. Nagar', color: '#ccdeff', y: 80 },
                    { name: 'Nashik', color: '#ffeb99', y: 100 },
                    { name: 'Pune', color: '#adebad', y: 120 },
                    { name: 'Konkan', color: '#c2c2c2', y: 140 }
                  ].map((region, idx) => (
                    <g key={`legend-${idx}`}>
                      <rect x="10" y={region.y-10} width="10" height="10" fill={region.color} />
                      <text x="25" y={region.y} fill="#fff" fontSize="10">{region.name}</text>
                    </g>
                  ))}
                </g>
                
                {/* Metric legend */}
                <g transform="translate(450, 140)">
                  <rect x="0" y="0" width="100" height="140" fill="#0a1033" opacity="0.8" rx="4" ry="4" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                  
                  <text x="10" y="20" fill="#fff" fontSize="12" fontWeight="bold">
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
                      <rect x="10" y={item.y-10} width="10" height="10" fill={item.color} />
                      <text x="25" y={item.y} fill="#fff" fontSize="10">{item.label}</text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
            
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