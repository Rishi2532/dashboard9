import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Region, RegionSummary } from '@/types';

interface MaharashtraOfficialMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Map the SVG names to our database region names
const SVG_TO_DB_REGION_MAP: Record<string, string> = {
  'Amaravati Division': 'Amravati',
  'Aurangabad Division': 'Chhatrapati Sambhajinagar',
  'Konkan Division': 'Konkan',
  'Nagpur Division': 'Nagpur',
  'Nashik Division': 'Nashik',
  'Pune Division': 'Pune'
};

// Map our database region names to SVG ids
const DB_TO_SVG_REGION_MAP: Record<string, string> = {
  'Amravati': 'Amaravati Division',
  'Chhatrapati Sambhajinagar': 'Aurangabad Division',
  'Konkan': 'Konkan Division',
  'Nagpur': 'Nagpur Division',
  'Nashik': 'Nashik Division',
  'Pune': 'Pune Division'
};

export default function MaharashtraOfficialMap({
  regionSummary,
  regions = [],
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraOfficialMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // District to region mapping
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
    if (districtName) {
      const region = districtToRegion[districtName];
      setHoveredRegion(region);
    } else {
      setHoveredRegion(null);
    }
  };

  // Load the SVG content
  useEffect(() => {
    const fetchSvg = async () => {
      try {
        const response = await fetch('/maharashtra-divisions.svg');
        if (!response.ok) {
          throw new Error('Failed to load Maharashtra map SVG');
        }
        const svgText = await response.text();
        setSvgContent(svgText);
      } catch (err) {
        setError('Could not load the Maharashtra map');
        console.error(err);
      }
    };

    fetchSvg();
  }, []);

  // Get color based on metric value and district highlighting
  const getDistrictColor = (districtName: string, regionName: string) => {
    const dbRegionName = SVG_TO_DB_REGION_MAP[regionName] || regionName;
    
    // Check if this district should be highlighted (part of hovered district's region)
    const isHighlighted = hoveredDistrict && districtToRegion[hoveredDistrict] === dbRegionName;
    
    if (selectedRegion === dbRegionName || isHighlighted) {
      // Get base color then darken it for highlighting
      const baseColor = getBaseRegionColor(dbRegionName);
      return darkenColor(baseColor, isHighlighted ? 0.3 : 0.1);
    }

    return getBaseRegionColor(dbRegionName);
  };

  // Get base color for region based on metric
  const getBaseRegionColor = (regionName: string) => {
    // Find the region in the regions data
    const regionData = regions.find(r => r.region_name === regionName);
    if (!regionData) {
      return '#E5E7EB'; // gray-200 if region not found
    }

    // Calculate color based on metric
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

  // Create detailed Maharashtra district map matching the reference image
  const createDetailedMaharashtraMap = () => {
    return (
      <div className="relative w-full h-full bg-white rounded-lg overflow-hidden border">
        <svg 
          viewBox="0 0 650 500" 
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        >
          {/* Background */}
          <rect width="650" height="500" fill="#f0f9ff"/>
          
          {/* NASHIK DIVISION (Yellow) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Nashik')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Nashik')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Nashik' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Nandurbar */}
            <path d="M 175,62 L 220,62 L 220,112 L 175,112 Z" 
                  data-district="Nandurbar"
                  data-region="Nashik"
                  fill={getDistrictColor('Nandurbar', 'Nashik')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Nandurbar')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="197" y="87" textAnchor="middle" fontSize="10" fill="#000">Nandurbar</text>
            
            {/* Dhule */}
            <path d="M 175,112 L 250,112 L 250,162 L 175,162 Z" 
                  data-district="Dhule"
                  data-region="Nashik"
                  fill={getDistrictColor('Dhule', 'Nashik')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Dhule')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="212" y="137" textAnchor="middle" fontSize="10" fill="#000">Dhule</text>
            
            {/* Jalgaon */}
            <path d="M 250,112 L 325,112 L 325,162 L 250,162 Z" 
                  data-district="Jalgaon"
                  data-region="Nashik"
                  fill={getDistrictColor('Jalgaon', 'Nashik')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Jalgaon')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="287" y="137" textAnchor="middle" fontSize="10" fill="#000">Jalgaon</text>
            
            {/* Nashik */}
            <path d="M 175,162 L 250,162 L 250,212 L 175,212 Z" 
                  data-district="Nashik"
                  data-region="Nashik"
                  fill={getDistrictColor('Nashik', 'Nashik')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Nashik')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="212" y="187" textAnchor="middle" fontSize="10" fill="#000">Nashik</text>
            
            {/* Ahmednagar */}
            <path d="M 250,212 L 325,212 L 325,262 L 250,262 Z" 
                  data-district="Ahmednagar"
                  data-region="Nashik"
                  fill={getDistrictColor('Ahmednagar', 'Nashik')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Ahmednagar')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="287" y="237" textAnchor="middle" fontSize="10" fill="#000">Ahmednagar</text>
          </g>

          {/* AMRAVATI DIVISION (Pink) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Amravati')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Amravati')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Amravati' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Amravati */}
            <path d="M 400,112 L 475,112 L 475,162 L 400,162 Z" 
                  data-district="Amravati"
                  data-region="Amravati"
                  fill={getDistrictColor('Amravati', 'Amravati')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Amravati')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="437" y="137" textAnchor="middle" fontSize="10" fill="#000">Amravati</text>
            
            {/* Akola */}
            <path d="M 325,112 L 400,112 L 400,162 L 325,162 Z" 
                  data-district="Akola"
                  data-region="Amravati"
                  fill={getDistrictColor('Akola', 'Amravati')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Akola')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="362" y="137" textAnchor="middle" fontSize="10" fill="#000">Akola</text>
            
            {/* Buldhana */}
            <path d="M 325,162 L 400,162 L 400,212 L 325,212 Z" 
                  data-district="Buldhana"
                  data-region="Amravati"
                  fill={getDistrictColor('Buldhana', 'Amravati')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Buldhana')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="362" y="187" textAnchor="middle" fontSize="10" fill="#000">Buldhana</text>
            
            {/* Washim */}
            <path d="M 400,162 L 475,162 L 475,212 L 400,212 Z" 
                  data-district="Washim"
                  data-region="Amravati"
                  fill={getDistrictColor('Washim', 'Amravati')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Washim')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="437" y="187" textAnchor="middle" fontSize="10" fill="#000">Washim</text>
            
            {/* Yavatmal */}
            <path d="M 475,162 L 550,162 L 550,212 L 475,212 Z" 
                  data-district="Yavatmal"
                  data-region="Amravati"
                  fill={getDistrictColor('Yavatmal', 'Amravati')} 
                  stroke="#fff" strokeWidth="1"
                  className="district-path cursor-pointer transition-all duration-200"
                  onMouseEnter={() => handleDistrictHover('Yavatmal')}
                  onMouseLeave={() => handleDistrictHover(null)}/>
            <text x="512" y="187" textAnchor="middle" fontSize="10" fill="#000">Yavatmal</text>
          </g>

          {/* NAGPUR DIVISION (Green) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Nagpur')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Nagpur')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Nagpur' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Nagpur */}
            <path d="M 475,62 L 550,62 L 550,112 L 475,112 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="512" y="87" textAnchor="middle" fontSize="10" fill="#000">Nagpur</text>
            
            {/* Bhandara */}
            <path d="M 550,62 L 600,62 L 600,112 L 550,112 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="575" y="87" textAnchor="middle" fontSize="10" fill="#000">Bhandara</text>
            
            {/* Gondia */}
            <path d="M 600,62 L 650,62 L 650,112 L 600,112 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="625" y="87" textAnchor="middle" fontSize="10" fill="#000">Gondia</text>
            
            {/* Wardha */}
            <path d="M 475,112 L 550,112 L 550,162 L 475,162 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="512" y="137" textAnchor="middle" fontSize="10" fill="#000">Wardha</text>
            
            {/* Chandrapur */}
            <path d="M 550,212 L 600,212 L 600,262 L 550,262 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="575" y="237" textAnchor="middle" fontSize="10" fill="#000">Chandrapur</text>
            
            {/* Gadchiroli */}
            <path d="M 600,212 L 650,212 L 650,300 L 600,300 Z" 
                  fill={getRegionColor('Nagpur')} stroke="#fff" strokeWidth="1"/>
            <text x="625" y="256" textAnchor="middle" fontSize="10" fill="#000">Gadchiroli</text>
          </g>

          {/* CHHATRAPATI SAMBHAJINAGAR DIVISION (Blue) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Chhatrapati Sambhajinagar')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Chhatrapati Sambhajinagar')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Chhatrapati Sambhajinagar' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Chhatrapati Sambhajinagar */}
            <path d="M 250,162 L 325,162 L 325,212 L 250,212 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="287" y="187" textAnchor="middle" fontSize="9" fill="#000">Chhatrapati Sambhajinagar</text>
            
            {/* Jalna */}
            <path d="M 325,212 L 400,212 L 400,262 L 325,262 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="362" y="237" textAnchor="middle" fontSize="10" fill="#000">Jalna</text>
            
            {/* Parbhani */}
            <path d="M 400,212 L 475,212 L 475,262 L 400,262 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="437" y="237" textAnchor="middle" fontSize="10" fill="#000">Parbhani</text>
            
            {/* Hingoli */}
            <path d="M 475,212 L 550,212 L 550,262 L 475,262 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="512" y="237" textAnchor="middle" fontSize="10" fill="#000">Hingoli</text>
            
            {/* Beed */}
            <path d="M 325,262 L 400,262 L 400,312 L 325,312 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="362" y="287" textAnchor="middle" fontSize="10" fill="#000">Beed</text>
            
            {/* Nanded */}
            <path d="M 475,262 L 550,262 L 550,312 L 475,312 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="512" y="287" textAnchor="middle" fontSize="10" fill="#000">Nanded</text>
            
            {/* Latur */}
            <path d="M 400,312 L 475,312 L 475,362 L 400,362 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="437" y="337" textAnchor="middle" fontSize="10" fill="#000">Latur</text>
            
            {/* Dharashiv (Osmanabad) */}
            <path d="M 325,312 L 400,312 L 400,362 L 325,362 Z" 
                  fill={getRegionColor('Chhatrapati Sambhajinagar')} stroke="#fff" strokeWidth="1"/>
            <text x="362" y="337" textAnchor="middle" fontSize="9" fill="#000">Dharashiv</text>
          </g>

          {/* PUNE DIVISION (Light Green) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Pune')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Pune')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Pune' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Pune */}
            <path d="M 175,312 L 250,312 L 250,362 L 175,362 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="212" y="337" textAnchor="middle" fontSize="10" fill="#000">Pune</text>
            
            {/* Ahmednagar (part of Pune division in some schemes) */}
            <path d="M 250,262 L 325,262 L 325,312 L 250,312 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="287" y="287" textAnchor="middle" fontSize="9" fill="#000">Ahmednagar</text>
            
            {/* Solapur */}
            <path d="M 250,312 L 325,312 L 325,362 L 250,362 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="287" y="337" textAnchor="middle" fontSize="10" fill="#000">Solapur</text>
            
            {/* Satara */}
            <path d="M 175,362 L 250,362 L 250,412 L 175,412 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="212" y="387" textAnchor="middle" fontSize="10" fill="#000">Satara</text>
            
            {/* Sangli */}
            <path d="M 175,412 L 250,412 L 250,462 L 175,462 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="212" y="437" textAnchor="middle" fontSize="10" fill="#000">Sangli</text>
            
            {/* Kolhapur */}
            <path d="M 175,462 L 250,462 L 250,500 L 175,500 Z" 
                  fill={getRegionColor('Pune')} stroke="#fff" strokeWidth="1"/>
            <text x="212" y="481" textAnchor="middle" fontSize="10" fill="#000">Kolhapur</text>
          </g>

          {/* KONKAN DIVISION (Gray) */}
          <g 
            className="region-group cursor-pointer transition-all duration-300"
            onMouseEnter={() => setHoveredRegion('Konkan')}
            onMouseLeave={() => setHoveredRegion(null)}
            onClick={() => onRegionClick('Konkan')}
            style={{ filter: selectedRegion !== 'all' && selectedRegion !== 'Konkan' ? 'opacity(0.3) blur(1px)' : 'none' }}
          >
            {/* Palghar */}
            <path d="M 125,212 L 175,212 L 175,262 L 125,262 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="150" y="237" textAnchor="middle" fontSize="10" fill="#000">Palghar</text>
            
            {/* Thane */}
            <path d="M 75,262 L 125,262 L 125,312 L 75,312 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="100" y="287" textAnchor="middle" fontSize="10" fill="#000">Thane</text>
            
            {/* Mumbai Suburban */}
            <path d="M 25,262 L 75,262 L 75,312 L 25,312 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="50" y="280" textAnchor="middle" fontSize="8" fill="#000">Mumbai</text>
            <text x="50" y="292" textAnchor="middle" fontSize="8" fill="#000">Suburban</text>
            
            {/* Mumbai City */}
            <path d="M 25,312 L 75,312 L 75,362 L 25,362 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="50" y="330" textAnchor="middle" fontSize="8" fill="#000">Mumbai</text>
            <text x="50" y="342" textAnchor="middle" fontSize="8" fill="#000">City</text>
            
            {/* Raigad */}
            <path d="M 75,312 L 125,312 L 125,362 L 75,362 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="100" y="337" textAnchor="middle" fontSize="10" fill="#000">Raigad</text>
            
            {/* Ratnagiri */}
            <path d="M 25,362 L 75,362 L 75,412 L 25,412 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="50" y="387" textAnchor="middle" fontSize="9" fill="#000">Ratnagiri</text>
            
            {/* Sindhudurg */}
            <path d="M 25,412 L 75,412 L 75,462 L 25,462 Z" 
                  fill={getRegionColor('Konkan')} stroke="#fff" strokeWidth="1"/>
            <text x="50" y="437" textAnchor="middle" fontSize="9" fill="#000">Sindhudurg</text>
          </g>

          {/* Arabian Sea */}
          <rect x="0" y="0" width="25" height="500" fill="#e0f2fe"/>
          <text x="12" y="250" textAnchor="middle" fontSize="12" fill="#0369a1" transform="rotate(-90 12 250)">Arabian Sea</text>

          {/* Legend */}
          <g transform="translate(450, 350)">
            <rect x="0" y="0" width="180" height="140" fill="rgba(255,255,255,0.9)" stroke="#ccc" rx="5"/>
            <text x="10" y="18" fill="#000" fontSize="12" fontWeight="bold">Maharashtra Divisions</text>
            
            <rect x="10" y="25" width="12" height="12" fill="#facc15"/>
            <text x="28" y="35" fill="#000" fontSize="10">Nashik Division</text>
            
            <rect x="10" y="40" width="12" height="12" fill="#fbbf24"/>
            <text x="28" y="50" fill="#000" fontSize="10">Amravati Division</text>
            
            <rect x="10" y="55" width="12" height="12" fill="#4ade80"/>
            <text x="28" y="65" fill="#000" fontSize="10">Nagpur Division</text>
            
            <rect x="10" y="70" width="12" height="12" fill="#38bdf8"/>
            <text x="28" y="80" fill="#000" fontSize="10">Aurangabad Division</text>
            
            <rect x="10" y="85" width="12" height="12" fill="#a3e635"/>
            <text x="28" y="95" fill="#000" fontSize="10">Pune Division</text>
            
            <rect x="10" y="100" width="12" height="12" fill="#9ca3af"/>
            <text x="28" y="110" fill="#000" fontSize="10">Konkan Division</text>
          </g>

          {/* Hover Effect */}
          {hoveredRegion && (
            <text x="325" y="30" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#1f2937">
              {hoveredRegion} Division
            </text>
          )}
        </svg>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
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

        <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
          {createDetailedMaharashtraMap()}
        </div>
      </CardContent>
    </Card>
  );
}