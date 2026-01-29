import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { districtToRegionMapping, districtColorMap } from '@/data/maharashtra-districts';
import { Region, RegionSummary } from '@/types';

interface MaharashtraDistrictMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraDistrictMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraDistrictMapProps) {

  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  // Handle district click
  const handleDistrictClick = (district: string) => {
    if (district && districtToRegionMapping[district]) {
      onRegionClick(districtToRegionMapping[district]);
    }
  };

  // Get the fill color for a district
  const getDistrictFillColor = (district: string) => {
    if (!district || !districtToRegionMapping[district]) {
      return "#e5e5e5"; // Default gray for unknown districts
    }

    const region = districtToRegionMapping[district];
    
    // If this is the selected region or hovered district, highlight it
    if (selectedRegion === region || hoveredDistrict === district) {
      return "#3b82f6"; // Highlight blue
    }
    
    // Otherwise return the predefined region color from the map
    return districtColorMap[district] || "#e5e5e5";
  };

  // Get the stroke color (border) for a district
  const getDistrictStrokeColor = (district: string) => {
    if (!district || !districtToRegionMapping[district]) {
      return "#ffffff";
    }

    const region = districtToRegionMapping[district];
    return selectedRegion === region ? "#1e40af" : "#ffffff";
  };

  // Get the district name to display
  const getDistrictDisplayName = (district: string) => {
    // If too long, abbreviate
    if (district.length > 10) {
      return district.substring(0, 8) + "..";
    }
    return district;
  };

  return (
    <Card className={isLoading ? "opacity-50" : ""}>
      <CardContent className="p-3 sm:p-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm sm:text-base font-medium text-neutral-700">
            Maharashtra Districts
          </h3>
          {selectedRegion !== "all" && (
            <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
              Region: {selectedRegion}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-[300px] w-full rounded-md" />
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3]">
            {/* SVG Map of Maharashtra with districts */}
            <svg 
              viewBox="0 0 800 600" 
              className="w-full h-full"
              style={{ backgroundColor: '#f0f9ff' }}
            >
              <style>
                {`
                  .district-path {
                    transition: all 0.3s ease;
                    cursor: pointer;
                  }
                  .district-path:hover {
                    filter: brightness(1.2) saturate(1.1);
                    stroke-width: 2.5 !important;
                    opacity: 0.9;
                  }
                  .district-text {
                    transition: all 0.3s ease;
                    pointer-events: none;
                  }
                  .district-group:hover .district-text {
                    font-weight: bold;
                    filter: drop-shadow(0px 1px 2px rgba(0,0,0,0.3));
                  }
                `}
              </style>
              {/* Mumbai City */}
              <g className="district-group" onClick={() => handleDistrictClick("Mumbai City")}>
                <path
                  className="district-path"
                  d="M108,373 L117,375 L119,383 L112,390 L104,387 L101,380 L108,373"
                  fill={getDistrictFillColor("Mumbai City")}
                  stroke={getDistrictStrokeColor("Mumbai City")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Mumbai City")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                />
                <text className="district-text" x="112" y="383" fontSize="10" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Mumbai City")}
                </text>
              </g>

              {/* Mumbai Suburban */}
              <g className="district-group" onClick={() => handleDistrictClick("Mumbai Suburban")}>
                <path
                  className="district-path"
                  d="M120,330 L125,345 L122,365 L117,375 L101,380 L95,370 L90,360 L95,340 L105,330 L120,330"
                  fill={getDistrictFillColor("Mumbai Suburban")}
                  stroke={getDistrictStrokeColor("Mumbai Suburban")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Mumbai Suburban")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                />
                <text className="district-text" x="108" y="355" fontSize="10" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Mumbai Suburban")}
                </text>
              </g>

              {/* Thane */}
              <g className="district-group" onClick={() => handleDistrictClick("Thane")}>
                <path
                  className="district-path"
                  d="M120,330 L135,300 L155,285 L175,280 L178,300 L173,320 L160,330 L145,335 L125,345 L120,330"
                  fill={getDistrictFillColor("Thane")}
                  stroke={getDistrictStrokeColor("Thane")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Thane")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                />
                <text className="district-text" x="150" y="315" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Thane")}
                </text>
              </g>

              {/* Palghar */}
              <g onClick={() => handleDistrictClick("Palghar")}>
                <path
                  d="M135,300 L140,280 L145,260 L160,240 L175,230 L185,250 L182,275 L175,280 L155,285 L135,300"
                  fill={getDistrictFillColor("Palghar")}
                  stroke={getDistrictStrokeColor("Palghar")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Palghar")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="160" y="260" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Palghar")}
                </text>
              </g>

              {/* Nashik */}
              <g onClick={() => handleDistrictClick("Nashik")}>
                <path
                  d="M185,250 L215,220 L240,210 L270,220 L280,245 L275,270 L260,290 L235,290 L210,285 L185,275 L182,275 L185,250"
                  fill={getDistrictFillColor("Nashik")}
                  stroke={getDistrictStrokeColor("Nashik")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Nashik")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="230" y="260" fontSize="14" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Nashik")}
                </text>
              </g>

              {/* Dhule */}
              <g onClick={() => handleDistrictClick("Dhule")}>
                <path
                  d="M240,210 L270,220 L290,195 L310,180 L335,175 L345,195 L340,215 L325,230 L300,235 L280,245 L270,220 L240,210"
                  fill={getDistrictFillColor("Dhule")}
                  stroke={getDistrictStrokeColor("Dhule")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Dhule")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="295" y="210" fontSize="14" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Dhule")}
                </text>
              </g>

              {/* Nandurbar */}
              <g onClick={() => handleDistrictClick("Nandurbar")}>
                <path
                  d="M290,195 L310,180 L335,175 L345,150 L365,140 L375,115 L365,90 L340,95 L310,115 L290,140 L280,165 L290,195"
                  fill={getDistrictFillColor("Nandurbar")}
                  stroke={getDistrictStrokeColor("Nandurbar")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Nandurbar")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="330" y="130" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Nandurbar")}
                </text>
              </g>

              {/* Jalgaon */}
              <g onClick={() => handleDistrictClick("Jalgaon")}>
                <path
                  d="M345,195 L340,215 L325,230 L330,250 L345,265 L370,270 L395,260 L410,245 L420,225 L410,205 L385,195 L365,185 L345,195"
                  fill={getDistrictFillColor("Jalgaon")}
                  stroke={getDistrictStrokeColor("Jalgaon")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Jalgaon")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="370" y="230" fontSize="14" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Jalgaon")}
                </text>
              </g>

              {/* Ahmadnagar */}
              <g onClick={() => handleDistrictClick("Ahmadnagar")}>
                <path
                  d="M275,270 L280,245 L300,235 L325,230 L330,250 L345,265 L350,290 L340,315 L320,335 L290,340 L275,325 L260,310 L260,290 L275,270"
                  fill={getDistrictFillColor("Ahmadnagar")}
                  stroke={getDistrictStrokeColor("Ahmadnagar")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Ahmadnagar")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="300" y="290" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Ahmadnagar")}
                </text>
              </g>

              {/* Buldhana */}
              <g onClick={() => handleDistrictClick("Buldhana")}>
                <path
                  d="M370,270 L395,260 L410,245 L430,250 L450,260 L455,280 L445,305 L425,315 L400,310 L375,295 L365,280 L370,270"
                  fill={getDistrictFillColor("Buldhana")}
                  stroke={getDistrictStrokeColor("Buldhana")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Buldhana")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="415" y="280" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Buldhana")}
                </text>
              </g>

              {/* Akola */}
              <g onClick={() => handleDistrictClick("Akola")}>
                <path
                  d="M430,250 L450,260 L455,280 L470,265 L490,255 L505,265 L510,285 L495,300 L480,305 L460,300 L445,305 L430,250"
                  fill={getDistrictFillColor("Akola")}
                  stroke={getDistrictStrokeColor("Akola")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Akola")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="470" y="280" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Akola")}
                </text>
              </g>

              {/* Washim */}
              <g onClick={() => handleDistrictClick("Washim")}>
                <path
                  d="M445,305 L460,300 L480,305 L495,300 L505,315 L500,335 L480,345 L465,335 L450,325 L445,305"
                  fill={getDistrictFillColor("Washim")}
                  stroke={getDistrictStrokeColor("Washim")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Washim")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="475" y="320" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Washim")}
                </text>
              </g>

              {/* Amravati */}
              <g onClick={() => handleDistrictClick("Amravati")}>
                <path
                  d="M490,255 L505,265 L510,285 L530,275 L550,275 L560,290 L550,310 L535,320 L520,315 L505,315 L495,300 L490,255"
                  fill={getDistrictFillColor("Amravati")}
                  stroke={getDistrictStrokeColor("Amravati")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Amravati")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="525" y="290" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Amravati")}
                </text>
              </g>

              {/* Yavatmal */}
              <g onClick={() => handleDistrictClick("Yavatmal")}>
                <path
                  d="M500,335 L505,315 L520,315 L535,320 L550,310 L575,310 L585,325 L580,345 L565,360 L545,355 L525,345 L505,335 L500,335"
                  fill={getDistrictFillColor("Yavatmal")}
                  stroke={getDistrictStrokeColor("Yavatmal")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Yavatmal")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="540" y="335" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Yavatmal")}
                </text>
              </g>

              {/* Wardha */}
              <g onClick={() => handleDistrictClick("Wardha")}>
                <path
                  d="M550,275 L560,290 L550,310 L575,310 L585,325 L605,315 L615,295 L605,275 L585,265 L550,275"
                  fill={getDistrictFillColor("Wardha")}
                  stroke={getDistrictStrokeColor("Wardha")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Wardha")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="580" y="295" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Wardha")}
                </text>
              </g>

              {/* Nagpur */}
              <g onClick={() => handleDistrictClick("Nagpur")}>
                <path
                  d="M585,265 L605,275 L615,295 L635,285 L655,280 L670,290 L665,310 L645,325 L625,325 L605,315 L585,325 L585,265"
                  fill={getDistrictFillColor("Nagpur")}
                  stroke={getDistrictStrokeColor("Nagpur")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Nagpur")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="625" y="300" fontSize="13" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Nagpur")}
                </text>
              </g>

              {/* Chandrapur */}
              <g onClick={() => handleDistrictClick("Chandrapur")}>
                <path
                  d="M580,345 L585,325 L605,315 L625,325 L645,325 L655,345 L650,365 L635,380 L615,385 L595,375 L580,355 L580,345"
                  fill={getDistrictFillColor("Chandrapur")}
                  stroke={getDistrictStrokeColor("Chandrapur")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Chandrapur")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="615" y="350" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Chandrapur")}
                </text>
              </g>

              {/* Gadchiroli */}
              <g onClick={() => handleDistrictClick("Gadchiroli")}>
                <path
                  d="M635,380 L650,365 L655,345 L645,325 L665,310 L685,310 L700,325 L695,345 L680,365 L660,385 L635,380"
                  fill={getDistrictFillColor("Gadchiroli")}
                  stroke={getDistrictStrokeColor("Gadchiroli")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Gadchiroli")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="670" y="345" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Gadchiroli")}
                </text>
              </g>

              {/* Gondia */}
              <g onClick={() => handleDistrictClick("Gondia")}>
                <path
                  d="M655,280 L670,290 L665,310 L685,310 L700,325 L710,310 L705,290 L685,275 L670,270 L655,280"
                  fill={getDistrictFillColor("Gondia")}
                  stroke={getDistrictStrokeColor("Gondia")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Gondia")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="680" y="295" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Gondia")}
                </text>
              </g>

              {/* Aurangabad */}
              <g onClick={() => handleDistrictClick("Aurangabad")}>
                <path
                  d="M350,290 L365,280 L375,295 L400,310 L415,330 L415,350 L395,360 L375,350 L360,335 L350,315 L350,290"
                  fill={getDistrictFillColor("Aurangabad")}
                  stroke={getDistrictStrokeColor("Aurangabad")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Aurangabad")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="380" y="325" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Aurangabad")}
                </text>
              </g>

              {/* Jalna */}
              <g onClick={() => handleDistrictClick("Jalna")}>
                <path
                  d="M400,310 L425,315 L445,305 L450,325 L445,345 L430,355 L415,350 L415,330 L400,310"
                  fill={getDistrictFillColor("Jalna")}
                  stroke={getDistrictStrokeColor("Jalna")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Jalna")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="425" y="330" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Jalna")}
                </text>
              </g>

              {/* Parbhani */}
              <g onClick={() => handleDistrictClick("Parbhani")}>
                <path
                  d="M445,345 L450,325 L465,335 L480,345 L485,365 L475,385 L455,385 L440,370 L445,345"
                  fill={getDistrictFillColor("Parbhani")}
                  stroke={getDistrictStrokeColor("Parbhani")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Parbhani")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="465" y="360" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Parbhani")}
                </text>
              </g>

              {/* Hingoli */}
              <g onClick={() => handleDistrictClick("Hingoli")}>
                <path
                  d="M480,345 L500,335 L505,335 L525,345 L525,365 L515,380 L495,385 L485,365 L480,345"
                  fill={getDistrictFillColor("Hingoli")}
                  stroke={getDistrictStrokeColor("Hingoli")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Hingoli")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="505" y="360" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Hingoli")}
                </text>
              </g>

              {/* Nanded */}
              <g onClick={() => handleDistrictClick("Nanded")}>
                <path
                  d="M525,345 L545,355 L565,360 L570,380 L565,400 L540,410 L525,395 L515,380 L525,365 L525,345"
                  fill={getDistrictFillColor("Nanded")}
                  stroke={getDistrictStrokeColor("Nanded")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Nanded")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="545" y="375" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Nanded")}
                </text>
              </g>

              {/* Beed */}
              <g onClick={() => handleDistrictClick("Beed")}>
                <path
                  d="M350,315 L360,335 L375,350 L395,360 L415,350 L430,355 L445,345 L440,370 L420,385 L395,390 L370,380 L350,355 L345,335 L350,315"
                  fill={getDistrictFillColor("Beed")}
                  stroke={getDistrictStrokeColor("Beed")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Beed")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="390" y="360" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Beed")}
                </text>
              </g>

              {/* Latur */}
              <g onClick={() => handleDistrictClick("Latur")}>
                <path
                  d="M440,370 L455,385 L475,385 L495,385 L505,400 L500,420 L480,430 L455,425 L440,410 L435,390 L440,370"
                  fill={getDistrictFillColor("Latur")}
                  stroke={getDistrictStrokeColor("Latur")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Latur")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="470" y="405" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Latur")}
                </text>
              </g>

              {/* Osmanabad */}
              <g onClick={() => handleDistrictClick("Osmanabad")}>
                <path
                  d="M420,385 L440,370 L435,390 L440,410 L420,425 L400,425 L380,415 L370,400 L380,390 L395,390 L420,385"
                  fill={getDistrictFillColor("Osmanabad")}
                  stroke={getDistrictStrokeColor("Osmanabad")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Osmanabad")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="410" y="405" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Osmanabad")}
                </text>
              </g>

              {/* Solapur */}
              <g onClick={() => handleDistrictClick("Solapur")}>
                <path
                  d="M350,355 L370,380 L370,400 L380,415 L400,425 L420,425 L425,445 L415,465 L385,470 L360,455 L340,435 L335,410 L340,380 L350,355"
                  fill={getDistrictFillColor("Solapur")}
                  stroke={getDistrictStrokeColor("Solapur")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Solapur")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="380" y="430" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Solapur")}
                </text>
              </g>

              {/* Pune */}
              <g onClick={() => handleDistrictClick("Pune")}>
                <path
                  d="M290,340 L320,335 L340,315 L350,315 L345,335 L350,355 L340,380 L335,410 L315,425 L290,415 L270,400 L265,375 L275,355 L290,340"
                  fill={getDistrictFillColor("Pune")}
                  stroke={getDistrictStrokeColor("Pune")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Pune")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="310" y="375" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Pune")}
                </text>
              </g>

              {/* Satara */}
              <g onClick={() => handleDistrictClick("Satara")}>
                <path
                  d="M290,415 L315,425 L335,410 L340,435 L335,455 L315,470 L295,465 L275,450 L265,430 L270,400 L290,415"
                  fill={getDistrictFillColor("Satara")}
                  stroke={getDistrictStrokeColor("Satara")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Satara")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="305" y="435" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Satara")}
                </text>
              </g>

              {/* Raigad */}
              <g onClick={() => handleDistrictClick("Raigad")}>
                <path
                  d="M210,285 L235,290 L260,290 L260,310 L275,325 L275,355 L265,375 L240,385 L220,370 L205,345 L185,325 L175,320 L173,320 L178,300 L185,275 L210,285"
                  fill={getDistrictFillColor("Raigad")}
                  stroke={getDistrictStrokeColor("Raigad")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Raigad")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="230" y="330" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Raigad")}
                </text>
              </g>

              {/* Ratnagiri */}
              <g onClick={() => handleDistrictClick("Ratnagiri")}>
                <path
                  d="M175,320 L185,325 L205,345 L220,370 L240,385 L245,405 L235,430 L215,445 L195,445 L175,420 L160,390 L155,360 L160,330 L175,320"
                  fill={getDistrictFillColor("Ratnagiri")}
                  stroke={getDistrictStrokeColor("Ratnagiri")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Ratnagiri")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="200" y="390" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Ratnagiri")}
                </text>
              </g>

              {/* Sindhudurg */}
              <g onClick={() => handleDistrictClick("Sindhudurg")}>
                <path
                  d="M195,445 L215,445 L235,430 L245,405 L265,430 L275,450 L270,470 L250,490 L225,495 L200,485 L185,465 L175,420 L195,445"
                  fill={getDistrictFillColor("Sindhudurg")}
                  stroke={getDistrictStrokeColor("Sindhudurg")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Sindhudurg")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="230" y="460" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Sindhudurg")}
                </text>
              </g>

              {/* Kolhapur */}
              <g onClick={() => handleDistrictClick("Kolhapur")}>
                <path
                  d="M270,470 L295,465 L315,470 L325,490 L315,510 L295,515 L270,505 L250,490 L270,470"
                  fill={getDistrictFillColor("Kolhapur")}
                  stroke={getDistrictStrokeColor("Kolhapur")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Kolhapur")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="285" y="490" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Kolhapur")}
                </text>
              </g>

              {/* Sangli */}
              <g onClick={() => handleDistrictClick("Sangli")}>
                <path
                  d="M295,465 L315,470 L335,455 L360,455 L370,470 L365,490 L345,505 L325,490 L315,470 L295,465"
                  fill={getDistrictFillColor("Sangli")}
                  stroke={getDistrictStrokeColor("Sangli")}
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDistrict("Sangli")}
                  onMouseLeave={() => setHoveredDistrict(null)}
                  style={{ cursor: 'pointer' }}
                />
                <text x="335" y="480" fontSize="12" textAnchor="middle" fill="#000">
                  {getDistrictDisplayName("Sangli")}
                </text>
              </g>


            </svg>
          </div>
        )}
      </CardContent>
    </Card>
  );
}