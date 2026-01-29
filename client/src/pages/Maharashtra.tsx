import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MaharashtraProps {
  onRegionClick?: (regionName: string) => void;
  selectedRegion?: string;
  showLabels?: boolean;
}

export const Maharashtra = ({ 
  onRegionClick = () => {}, 
  selectedRegion = "all",
  showLabels = true 
}: MaharashtraProps): JSX.Element => {
  const [hoveredRegion, setHoveredRegion] = React.useState<string | null>(null);

  // Region grouping for hover effects
  const regionGroups = {
    "Konkan": ["Mumbai City", "Mumbai Suburban", "Thane", "Palghar", "Raigad", "Ratnagiri", "Sindhudurg"],
    "Pune": ["Pune", "Satara", "Sangli", "Kolhapur", "Solapur"],
    "Nashik": ["Nashik", "Nandurbar", "Dhule", "Jalgaon", "Ahmednagar"],
    "Chhatrapati Sambhajinagar": ["Chhatrapati Sambhajinagar", "Jalna", "Beed", "Parbhani", "Hingoli", "Latur", "Osmanabad", "Nanded"],
    "Amravati": ["Akola", "Amravati", "Buldhana", "Washim", "Yavatmal"],
    "Nagpur": ["Nagpur", "Wardha", "Chandrapur", "Gadchiroli", "Gondia", "Bhandara"]
  };

  // Create reverse mapping: district -> region
  const districtToRegion: { [key: string]: string } = {};
  Object.entries(regionGroups).forEach(([region, districts]) => {
    districts.forEach(district => {
      districtToRegion[district] = region;
    });
  });

  // Map path IDs to district names (based on the SVG structure)
  const pathToDistrict: { [key: string]: string } = {
    "path3109": "Pune",
    "path3113": "Solapur", 
    "path3117": "Satara",
    "path3121": "Sangli",
    "path3125": "Kolhapur",
    "path3129": "Ratnagiri",
    "path3133": "Sindhudurg",
    "path3137": "Raigad",
    "path3141": "Mumbai Suburban",
    "path3145": "Mumbai City",
    "path3149": "Ahmednagar",
    "path3153": "Nashik",
    "path3157": "Dhule",
    "path3161": "Nandurbar",
    "path3165": "Jalgaon",
    "path3169": "Chhatrapati Sambhajinagar",
    "path3173": "Jalna",
    "path3177": "Parbhani",
    "path3181": "Beed",
    "path3185": "Hingoli",
    "path3189": "Nanded",
    "path3193": "Latur",
    "path3197": "Osmanabad",
    "path3201": "Akola",
    "path3205": "Washim",
    "path3209": "Amravati",
    "path3213": "Buldhana",
    "path3217": "Yavatmal",
    "path3221": "Wardha",
    "path3225": "Nagpur",
    "path3229": "Chandrapur",
    "path3233": "Gadchiroli",
    "path3237": "Gondia",
    "path3241": "Bhandara",
    "path3245": "Thane",
    "path3249": "Palghar",
    // Additional district paths
    "path3381": "Ratnagiri",
    "path3385": "Raigad", 
    "path3381-8": "Bhandara"
  };

  // Region colors (normal and highlighted)
  const regionColors = {
    "Konkan": { normal: "#3B82F6", dark: "#1E40AF" }, // Blue
    "Pune": { normal: "#10B981", dark: "#047857" }, // Green
    "Nashik": { normal: "#F59E0B", dark: "#D97706" }, // Amber
    "Chhatrapati Sambhajinagar": { normal: "#EF4444", dark: "#DC2626" }, // Red
    "Amravati": { normal: "#8B5CF6", dark: "#7C3AED" }, // Purple
    "Nagpur": { normal: "#06B6D4", dark: "#0891B2" } // Cyan
  };

  const handleDistrictClick = (districtName: string) => {
    const region = districtToRegion[districtName];
    if (region && onRegionClick) {
      onRegionClick(region);
    }
  };

  const handleDistrictHover = (districtName: string | null) => {
    if (districtName) {
      const region = districtToRegion[districtName];
      setHoveredRegion(region);
    } else {
      setHoveredRegion(null);
    }
  };

  // Helper function to determine district styling based on region
  const getRegionStyling = (districtName: string): string => {
    const region = districtToRegion[districtName];
    const baseClasses = "district-image cursor-pointer transition-all duration-300 ease-in-out";
    
    if (!hoveredRegion || !region) {
      return `${baseClasses} hover:brightness-110`;
    }
    
    if (hoveredRegion === region) {
      // Only highlight districts in the same region - others remain normal
      return `${baseClasses} district-hover-region`;
    } else {
      // Keep other regions at normal appearance, not faded
      return `${baseClasses} hover:brightness-110`;
    }
  };

  // Get region for a district
  const getDistrictRegion = (districtName: string): string => {
    return districtToRegion[districtName] || '';
  };





  // Data for divisions to enable mapping over repeated elements
  const divisions = [
    { name: "Amaravati Division" },
    { name: "Aurangabad Division" },
    { name: "Konkan Division" },
    { name: "Nagpur Division" },
    { name: "Nashik Division" },
    { name: "Pune Division" },
  ];

  // Data for district paths
  const districtPaths = [
    {
      id: "path2997",
      alt: "Path",
      src: "/figmaAssets/path2997.svg",
      className: "absolute w-[772px] h-[2432px] top-0 left-0",
    },
    {
      id: "path3001",
      alt: "Path",
      src: "/figmaAssets/path3001.svg",
      className: "absolute w-[773px] h-[2453px] top-0 left-0",
    },
    {
      id: "path3109",
      alt: "Path",
      src: "/figmaAssets/path3109.svg",
      className: "absolute w-[619px] h-[508px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3113",
      alt: "Path",
      src: "/figmaAssets/path3113.svg",
      className: "absolute w-[635px] h-[492px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3117",
      alt: "Path",
      src: "/figmaAssets/path3117.svg",
      className: "absolute w-[465px] h-[383px] top-[-3px] -left-1",
    },
    {
      id: "path3121",
      alt: "Path",
      src: "/figmaAssets/path3121.svg",
      className: "absolute w-[689px] h-[312px] -top-1 left-[-5px]",
    },
    {
      id: "path3125",
      alt: "Path",
      src: "/figmaAssets/path3125.svg",
      className: "absolute w-[367px] h-[496px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3129",
      alt: "Path",
      src: "/figmaAssets/path3129.svg",
      className: "absolute w-[105px] h-[147px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3133",
      alt: "Path",
      src: "/figmaAssets/path3133.svg",
      className: "absolute w-[242px] h-[515px] top-[-3px] -left-1",
    },
    {
      id: "path3137",
      alt: "Path",
      src: "/figmaAssets/path3137.svg",
      className: "absolute w-64 h-[446px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3141",
      alt: "Path",
      src: "/figmaAssets/path3141.svg",
      className: "absolute w-[250px] h-[332px] -top-0.5 left-[-3px]",
    },
    {
      id: "path3145",
      alt: "Path",
      src: "/figmaAssets/path3145.svg",
      className: "absolute w-[260px] h-[301px] top-0 left-0",
    },
    {
      id: "path3149",
      alt: "Path",
      src: "/figmaAssets/path3149.svg",
      className: "absolute w-[541px] h-[413px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3153",
      alt: "Path",
      src: "/figmaAssets/path3153.svg",
      className: "absolute w-[583px] h-[424px] top-[-3px] -left-1",
    },
    {
      id: "path3157",
      alt: "Path",
      src: "/figmaAssets/path3157.svg",
      className: "absolute w-[674px] h-[570px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3161",
      alt: "Path",
      src: "/figmaAssets/path3161.svg",
      className: "absolute w-[390px] h-[360px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3165",
      alt: "Path",
      src: "/figmaAssets/path3165.svg",
      className: "absolute w-[427px] h-[357px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3169",
      alt: "Path",
      src: "/figmaAssets/path3169.svg",
      className: "absolute w-[429px] h-[441px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3173",
      alt: "Path",
      src: "/figmaAssets/path3173.svg",
      className: "absolute w-[263px] h-[467px] top-[-3px] left-[-5px]",
    },
    {
      id: "path3177",
      alt: "Path",
      src: "/figmaAssets/path3177.svg",
      className: "absolute w-[488px] h-[568px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3181",
      alt: "Path",
      src: "/figmaAssets/path3181.svg",
      className: "absolute w-[648px] h-[311px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3185",
      alt: "Path",
      src: "/figmaAssets/path3185.svg",
      className: "absolute w-[373px] h-[348px] top-[-3px] -left-0.5",
    },
    {
      id: "path3189",
      alt: "Path",
      src: "/figmaAssets/path3189.svg",
      className: "absolute w-[506px] h-[368px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3193",
      alt: "Path",
      src: "/figmaAssets/path3193.svg",
      className: "absolute w-[287px] h-[396px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3197",
      alt: "Path",
      src: "/figmaAssets/path3197.svg",
      className: "absolute w-[286px] h-[374px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3201",
      alt: "Path",
      src: "/figmaAssets/path3201.svg",
      className: "absolute w-[610px] h-[425px] top-[-3px] -left-0.5",
    },
    {
      id: "path3205",
      alt: "Path",
      src: "/figmaAssets/path3205.svg",
      className: "absolute w-[307px] h-[497px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3209",
      alt: "Path",
      src: "/figmaAssets/path3209.svg",
      className: "absolute w-[618px] h-[426px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3213",
      alt: "Path",
      src: "/figmaAssets/path3213.svg",
      className: "absolute w-[325px] h-[344px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3217",
      alt: "Path",
      src: "/figmaAssets/path3217.svg",
      className: "absolute w-[365px] h-[313px] -top-1.5 -left-1",
    },
    {
      id: "path3221",
      alt: "Path",
      src: "/figmaAssets/path3221.svg",
      className: "absolute w-[470px] h-[403px] -top-0.5 -left-1",
    },
    {
      id: "path3225",
      alt: "Path",
      src: "/figmaAssets/path3225.svg",
      className: "absolute w-[417px] h-[377px] -top-0.5 left-[-3px]",
    },
    {
      id: "path3229",
      alt: "Path",
      src: "/figmaAssets/path3229.svg",
      className: "absolute w-[360px] h-[749px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3233",
      alt: "Path",
      src: "/figmaAssets/path3233.svg",
      className: "absolute w-[391px] h-[436px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3237",
      alt: "Path",
      src: "/figmaAssets/path3237.svg",
      className: "absolute w-[214px] h-[326px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3241",
      alt: "Path",
      src: "/figmaAssets/path3241.svg",
      className: "absolute w-[291px] h-[331px] top-[-3px] left-[-3px]",
    },
    {
      id: "path3381",
      alt: "Path",
      src: "/figmaAssets/path3381.svg",
      className: "absolute w-[115px] h-[54px] -top-0.5 -left-px",
    },
    {
      id: "path3385",
      alt: "Path",
      src: "/figmaAssets/path3385.svg",
      className: "absolute w-[122px] h-[92px] -top-0.5 -left-px",
    },
    {
      id: "path3381-8",
      alt: "Path",
      src: "/figmaAssets/path3381-8.svg",
      className: "absolute w-[52px] h-[129px] -top-px left-[-3px]",
    },
  ];

  // Data for districts
  const districts = [
    {
      name: "Wardha",
      className:
        "absolute w-[202px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Hingoli",
      className:
        "w-[182px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Nandurbar",
      className:
        "absolute w-[282px] top-0 left-[734px] [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Dhule",
      className:
        "absolute w-[152px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Jalgaon",
      className:
        "absolute w-52 top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Jalna",
      className:
        "absolute w-[140px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Ahilyanagar",
      className:
        "absolute w-[311px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Pune",
      className:
        "absolute w-[134px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Nashik",
      className:
        "absolute w-[180px] top-[500px] left-[680px] [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Satara",
      className:
        "absolute w-[172px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Kolhapur",
      className:
        "w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Usmanabad",
      className:
        "absolute w-[317px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Buldhana",
      className:
        "absolute w-[246px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Thane",
      className:
        "absolute w-[166px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Raigad",
      className:
        "w-[182px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Ratnagiri",
      className:
        "w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Sindhudurg",
      className:
        "absolute w-[304px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Sangli",
      className:
        "absolute w-[161px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Solapur",
      className:
        "absolute w-[202px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Beed",
      className:
        "absolute w-[137px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Parbhani",
      className:
        "w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Nanded",
      className:
        "absolute w-[209px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Latur",
      className:
        "absolute w-[137px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Palaghar",
      className:
        "absolute w-[232px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Akola",
      className:
        "absolute w-[146px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Amaravati",
      className:
        "absolute w-[265px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Washim",
      className:
        "absolute w-[207px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Yavatmal",
      className:
        "absolute w-60 top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Chandrapur",
      className:
        "absolute w-[313px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Bhandara",
      className:
        "absolute w-[253px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Gondia",
      className:
        "absolute w-[188px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Gadchiroli",
      className:
        "absolute w-[266px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
    {
      name: "Nagpur",
      className:
        "absolute w-[196px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
    },
  ];

  // Special cases for Mumbai
  const mumbaiDistricts = [
    {
      name: "Mumbai Suburban",
      className: "relative w-[260px] h-[123px]",
      textClasses: [
        "absolute w-[211px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
        "absolute w-64 top-[70px] left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
      ],
    },
    {
      name: "Mumbai City",
      className: "relative w-[215px] h-[123px]",
      textClasses: [
        "absolute w-[211px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
        "absolute w-[106px] top-[70px] left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
      ],
    },
  ];

  // Data for Chhatrapati Sambhajinagar (special case with line break)
  const sambhajinagar = {
    name: "Chhatrapati Sambhajinagar",
    className:
      "absolute w-[393px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px]",
  };

  return (
    <Card className="bg-transparent w-full">
      <CardContent className="flex flex-row justify-center p-0">
        {/* CSS for district hover effects */}
        <style>
          {`
          .district-image {
            transition: all 0.2s ease-in-out;
            cursor: pointer;
            pointer-events: auto;
          }
          
          .district-hover-region {
            filter: brightness(1.4) saturate(1.5) contrast(1.15) drop-shadow(0 0 8px rgba(255,255,255,0.6));
            transform: scale(1.015);
            z-index: 30;
            position: relative;
          }
          
          .district-image:hover {
            filter: brightness(1.2) saturate(1.3);
            transform: scale(1.008);
          }
          
          .maharashtra-map {
            transform-style: preserve-3d;
          }
          
          .maharashtra-map > div {
            position: relative;
          }
          
          /* Enhanced hover areas */
          .maharashtra-map [class*="absolute"]:hover {
            z-index: 25;
          }
          `}
        </style>
        <div className="relative w-[3105.78px] h-[2453.01px] maharashtra-map">
          <div className="relative w-[3101px] h-[2452px] top-px">
            <div className="relative h-[2452px]">
              {/* Map district paths */}
              {districtPaths.map((path, index) => (
                <div
                  key={`path-${index}`}
                  className={
                    path.id.includes("path3145")
                      ? "absolute w-[352px] h-[392px] top-[729px] left-[352px]"
                      : ""
                  }
                >
                  {path.id === "path3001" ? (
                    <div className="absolute w-[772px] h-[2452px] top-0 left-0">
                      <img
                        className={path.className}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3109" ? (
                    <div 
                      className="absolute w-[614px] h-[503px] top-[1020px] left-[540px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3113" ? (
                    <div 
                      className="absolute w-[626px] h-[486px] top-[1311px] left-[970px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3117" ? (
                    <div 
                      className="absolute w-[458px] h-[377px] top-[1427px] left-[615px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3121" ? (
                    <div 
                      className="absolute w-[681px] h-[306px] top-[1623px] left-[656px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3125" ? (
                    <div 
                      className="absolute w-[361px] h-[491px] top-[1768px] left-[641px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3129" ? (
                    <div 
                      className="absolute w-[100px] h-[142px] top-[1039px] left-[390px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3133" ? (
                    <div 
                      className="absolute w-[235px] h-[510px] top-[1469px] left-[473px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3137" ? (
                    <div 
                      className="absolute w-[251px] h-[441px] top-[1094px] left-[399px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3141" ? (
                    <div 
                      className="absolute w-[243px] h-[327px] top-[1959px] left-[562px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3145" ? (
                    <div 
                      className="relative w-[357px] h-[397px] top-[-3px] -left-0.5"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className="absolute w-[17px] h-[9px] top-[303px] left-[57px]"
                        alt="Path"
                        src="/figmaAssets/path1026.svg"
                      />
                      <img
                        className="absolute w-2 h-2.5 top-[257px] left-[22px]"
                        alt="Path"
                        src="/figmaAssets/path1024.svg"
                      />
                      <img
                        className="absolute w-[326px] h-[223px] top-[174px] left-[31px]"
                        alt="Path"
                        src="/figmaAssets/path1022.svg"
                      />
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3149" ? (
                    <div 
                      className="absolute w-[536px] h-[404px] top-[340px] left-[1045px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3153" ? (
                    <div 
                      className="absolute w-[577px] h-[420px] top-[537px] left-[522px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3157" ? (
                    <div 
                      className="absolute w-[669px] h-[564px] top-[822px] left-[646px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3161" ? (
                    <div 
                      className="absolute w-96 h-[354px] top-[126px] left-[665px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3165" ? (
                    <div 
                      className="absolute w-[420px] h-[352px] top-[268px] left-[759px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3169" ? (
                    <div 
                      className="absolute w-[423px] h-[435px] top-[604px] left-[993px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3173" ? (
                    <div 
                      className="absolute w-[257px] h-[456px] top-[614px] left-[1314px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3177" ? (
                    <div 
                      className="absolute w-[483px] h-[563px] top-[850px] left-[1756px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3181" ? (
                    <div 
                      className="absolute w-[642px] h-[305px] top-[1028px] left-[1049px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3185" ? (
                    <div 
                      className="absolute w-[368px] h-[343px] top-[1205px] left-[1532px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3189" ? (
                    <div 
                      className="absolute w-[501px] h-[363px] top-[1260px] left-[1204px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3193" ? (
                    <div 
                      className="absolute w-[282px] h-[390px] top-[847px] left-[1508px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3197" ? (
                    <div 
                      className="absolute w-[281px] h-[368px] top-[815px] left-[1672px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3201" ? (
                    <div 
                      className="absolute w-[605px] h-[419px] top-[226px] left-[1660px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3205" ? (
                    <div 
                      className="absolute w-[302px] h-[491px] top-[389px] left-[1421px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3209" ? (
                    <div 
                      className="absolute w-[611px] h-[421px] top-[599px] left-[1893px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3213" ? (
                    <div 
                      className="absolute w-80 h-[337px] top-[406px] left-[1679px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3217" ? (
                    <div 
                      className="absolute w-[358px] h-[305px] top-[565px] left-[1659px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3221" ? (
                    <div 
                      className="absolute w-[464px] h-[393px] top-[235px] left-[2196px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3225" ? (
                    <div 
                      className="absolute w-[411px] h-[370px] top-[365px] left-[2129px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3229" ? (
                    <div 
                      className="absolute w-[355px] h-[743px] top-[516px] left-[2746px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={getDistrictRegion(pathToDistrict[path.id])}
                      />
                    </div>
                  ) : path.id === "path3233" ? (
                    <div 
                      className="absolute w-[386px] h-[431px] top-[569px] left-[2393px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3237" ? (
                    <div 
                      className="absolute w-52 h-[321px] top-[270px] left-[2603px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3241" ? (
                    <div 
                      className="absolute w-[284px] h-[326px] top-[255px] left-[2723px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3381" ? (
                    <div 
                      className="absolute w-[113px] h-[49px] top-[1156px] left-[289px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3385" ? (
                    <div 
                      className="absolute w-[119px] h-[88px] top-[996px] left-[300px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : path.id === "path3381-8" ? (
                    <div 
                      className="absolute w-[46px] h-[127px] top-[222px] left-[2694px]"
                      onClick={() => handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                    >
                      <img
                        className={`${path.className} ${getRegionStyling(pathToDistrict[path.id])}`}
                        alt={path.alt}
                        src={path.src}
                      />
                    </div>
                  ) : (
                    <div 
                      className="absolute inset-0 cursor-pointer hover:z-30"
                      onClick={() => pathToDistrict[path.id] && handleDistrictClick(pathToDistrict[path.id])}
                      onMouseEnter={() => pathToDistrict[path.id] && handleDistrictHover(pathToDistrict[path.id])}
                      onMouseLeave={() => handleDistrictHover(null)}
                      style={{ 
                        padding: '10px',
                        margin: '-10px',
                        minWidth: '50px',
                        minHeight: '50px'
                      }}
                    >
                      <img
                        className={`${path.className} ${pathToDistrict[path.id] ? getRegionStyling(pathToDistrict[path.id]) : 'district-image'}`}
                        alt={path.alt}
                        src={path.src}
                        data-district={pathToDistrict[path.id]}
                        data-region={pathToDistrict[path.id] ? getDistrictRegion(pathToDistrict[path.id]) : ''}
                        style={{ pointerEvents: 'none' }}
                      />
                    </div>
                  )}
                </div>
              ))}


              {/* Additional strategic hover areas for better district coverage */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Konkan Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[1000px] left-[200px] pointer-events-auto cursor-pointer hover:z-40" 
                     onClick={() => handleDistrictClick("Ratnagiri")}
                     onMouseEnter={() => handleDistrictHover("Ratnagiri")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Ratnagiri" />
                
                <div className="absolute w-32 h-32 top-[800px] left-[300px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Raigad")}
                     onMouseEnter={() => handleDistrictHover("Raigad")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Raigad" />
                
                <div className="absolute w-32 h-32 top-[600px] left-[200px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Thane")}
                     onMouseEnter={() => handleDistrictHover("Thane")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Thane" />
                
                <div className="absolute w-32 h-32 top-[400px] left-[100px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Palghar")}
                     onMouseEnter={() => handleDistrictHover("Palghar")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Palghar" />
                
                {/* Pune Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[1200px] left-[600px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Pune")}
                     onMouseEnter={() => handleDistrictHover("Pune")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Pune" />
                
                <div className="absolute w-32 h-32 top-[1100px] left-[800px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Satara")}
                     onMouseEnter={() => handleDistrictHover("Satara")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Satara" />
                
                {/* Nashik Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[600px] left-[800px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Nashik")}
                     onMouseEnter={() => handleDistrictHover("Nashik")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Nashik" />
                
                <div className="absolute w-32 h-32 top-[400px] left-[600px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Dhule")}
                     onMouseEnter={() => handleDistrictHover("Dhule")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Dhule" />
                
                {/* Amravati Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[800px] left-[1600px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Amravati")}
                     onMouseEnter={() => handleDistrictHover("Amravati")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Amravati" />
                
                <div className="absolute w-32 h-32 top-[600px] left-[1700px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Akola")}
                     onMouseEnter={() => handleDistrictHover("Akola")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Akola" />
                
                {/* Nagpur Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[600px] left-[2200px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Nagpur")}
                     onMouseEnter={() => handleDistrictHover("Nagpur")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Nagpur" />
                
                <div className="absolute w-32 h-32 top-[800px] left-[2400px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Chandrapur")}
                     onMouseEnter={() => handleDistrictHover("Chandrapur")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Chandrapur" />
                
                {/* Chhatrapati Sambhajinagar Region Enhanced Hover Areas */}
                <div className="absolute w-32 h-32 top-[1000px] left-[1200px] pointer-events-auto cursor-pointer hover:z-40"
                     onClick={() => handleDistrictClick("Chhatrapati Sambhajinagar")}
                     onMouseEnter={() => handleDistrictHover("Chhatrapati Sambhajinagar")}
                     onMouseLeave={() => handleDistrictHover(null)}
                     title="Chhatrapati Sambhajinagar" />
              </div>



              {/* Districts section */}
              <div className="absolute w-[3025px] h-[1964px] top-[154px] left-[37px]">
                <div className="absolute w-[2403px] h-[1910px] top-[54px] left-0">
                  {/* Wardha district */}
                  <div className="absolute w-[204px] h-[53px] top-[346px] left-[2199px]">
                    <div className="absolute w-[202px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                      Wardha
                    </div>
                  </div>

                  <div className="absolute w-[2290px] h-[1910px] top-0 left-0">
                    <div className="absolute w-[2095px] h-[1910px] top-0 left-0">
                      {/* Hingoli district */}
                      <div className="absolute w-[184px] h-[53px] top-[734px] left-[1705px]">
                        <div className="w-[182px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Hingoli
                        </div>
                      </div>

                      <div className="absolute w-[1998px] h-[1910px] top-0 left-0">
                        {/* Nandurbar district */}
                        <div className="absolute w-[282px] top-0 left-[734px] [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Nandurbar
                        </div>

                        {/* Dhule district */}
                        <div className="absolute w-[154px] h-[53px] top-[231px] left-[863px]">
                          <div className="absolute w-[152px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Dhule
                          </div>
                        </div>

                        {/* Jalgaon district */}
                        <div className="absolute w-[210px] h-[53px] top-[286px] left-[1140px]">
                          <div className="absolute w-52 top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Jalgaon
                          </div>
                        </div>

                        {/* Chhatrapati Sambhajinagar and Jalna districts */}
                        <div className="absolute w-[476px] h-[136px] top-[591px] left-[991px]">
                          <div className="absolute w-[395px] h-[106px] top-0 left-0">
                            <div className="absolute w-[393px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              Chhatrapati
                              <br />
                              Sambhajinagar
                            </div>
                          </div>
                          <div className="absolute w-[142px] h-[53px] top-[83px] left-[334px]">
                            <div className="absolute w-[140px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              Jalna
                            </div>
                          </div>
                        </div>

                        {/* Ahilyanagar district */}
                        <div className="absolute w-[313px] h-[53px] top-[783px] left-[831px]">
                          <div className="absolute w-[311px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Ahilyanagar
                          </div>
                        </div>

                        {/* Pune district */}
                        <div className="absolute w-[136px] h-[53px] top-[1054px] left-[648px]">
                          <div className="absolute w-[134px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Pune
                          </div>
                        </div>

                        {/* Nashik district */}
                        <div className="absolute w-[180px] top-[500px] left-[680px] [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Nashik
                        </div>

                        {/* Satara district */}
                        <div className="absolute w-[174px] h-[53px] top-[1383px] left-[694px]">
                          <div className="absolute w-[172px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Satara
                          </div>
                        </div>

                        {/* Kolhapur district */}
                        <div className="absolute w-[236px] h-[53px] top-[1809px] left-[703px]">
                          <div className="w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Kolhapur
                          </div>
                        </div>

                        {/* Usmanabad district */}
                        <div className="absolute w-[319px] h-[53px] top-[1294px] left-[1480px]">
                          <div className="absolute w-[317px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Usmanabad
                          </div>
                        </div>

                        {/* Buldhana district */}
                        <div className="absolute w-[248px] h-[53px] top-[426px] left-[1420px]">
                          <div className="absolute w-[246px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Buldhana
                          </div>
                        </div>

                        {/* Thane district */}
                        <div className="absolute w-[168px] h-[53px] top-[784px] left-[440px]">
                          <div className="absolute w-[166px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Thane
                          </div>
                        </div>

                        {/* Mumbai Suburban district */}
                        <div className="absolute w-64 h-[123px] top-[654px] left-0">
                          <div className="relative w-[260px] h-[123px]">
                            <div className="absolute w-[211px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              Mumbai
                            </div>
                            <div className="absolute w-64 top-[70px] left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              Suburban
                            </div>
                          </div>
                        </div>

                        {/* Mumbai City district */}
                        <div className="absolute w-[211px] h-[123px] top-[997px] left-[34px]">
                          <div className="relative w-[215px] h-[123px]">
                            <div className="absolute w-[211px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              Mumbai
                            </div>
                            <div className="absolute w-[106px] top-[70px] left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                              City
                            </div>
                          </div>
                        </div>

                        {/* Raigad district */}
                        <div className="absolute w-[184px] h-[53px] top-[1123px] left-[306px]">
                          <div className="w-[182px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Raigad
                          </div>
                        </div>

                        {/* Ratnagiri district */}
                        <div className="absolute w-[236px] h-[53px] top-[1426px] left-[343px]">
                          <div className="w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Ratnagiri
                          </div>
                        </div>

                        {/* Sindhudurg district */}
                        <div className="absolute w-[306px] h-[53px] top-[1857px] left-[337px]">
                          <div className="absolute w-[304px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Sindhudurg
                          </div>
                        </div>

                        {/* Sangli district */}
                        <div className="absolute w-[163px] h-[53px] top-[1577px] left-[868px]">
                          <div className="absolute w-[161px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Sangli
                          </div>
                        </div>

                        {/* Solapur district */}
                        <div className="absolute w-[204px] h-[53px] top-[1334px] left-[1120px]">
                          <div className="absolute w-[202px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Solapur
                          </div>
                        </div>

                        {/* Beed district */}
                        <div className="absolute w-[139px] h-[53px] top-[923px] left-[1300px]">
                          <div className="absolute w-[137px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Beed
                          </div>
                        </div>

                        {/* Parbhani district */}
                        <div className="absolute w-[236px] h-[53px] top-[786px] left-[1477px]">
                          <div className="w-[234px] absolute top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Parbhani
                          </div>
                        </div>

                        {/* Nanded district */}
                        <div className="absolute w-[211px] h-[53px] top-[960px] left-[1785px]">
                          <div className="absolute w-[209px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Nanded
                          </div>
                        </div>

                        {/* Latur district */}
                        <div className="absolute w-[139px] h-[53px] top-[1149px] left-[1611px]">
                          <div className="absolute w-[137px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Latur
                          </div>
                        </div>

                        {/* Palaghar district */}
                        <div className="absolute w-[234px] h-[53px] top-[635px] left-[314px]">
                          <div className="absolute w-[232px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                            Palaghar
                          </div>
                        </div>
                      </div>

                      {/* Akola district */}
                      <div className="absolute w-[148px] h-[53px] top-[326px] left-[1677px]">
                        <div className="absolute w-[146px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Akola
                        </div>
                      </div>

                      {/* Amaravati district */}
                      <div className="absolute w-[267px] h-[53px] top-[246px] left-[1828px]">
                        <div className="absolute w-[265px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Amaravati
                        </div>
                      </div>

                      {/* Washim district */}
                      <div className="absolute w-[209px] h-[53px] top-[503px] left-[1728px]">
                        <div className="absolute w-[207px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                          Washim
                        </div>
                      </div>
                    </div>

                    {/* Yavatmal district */}
                    <div className="absolute w-[242px] h-[53px] top-[529px] left-[2048px]">
                      <div className="absolute w-60 top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                        Yavatmal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chandrapur district */}
                <div className="absolute w-[315px] h-[53px] top-[557px] left-[2414px]">
                  <div className="absolute w-[313px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                    Chandrapur
                  </div>
                </div>

                {/* Bhandara district */}
                <div className="absolute w-[255px] h-[53px] top-0 left-[2588px]">
                  <div className="absolute w-[253px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                    Bhandara
                  </div>
                </div>

                {/* Gondia district */}
                <div className="absolute w-[190px] h-[53px] top-[183px] left-[2751px]">
                  <div className="absolute w-[188px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                    Gondia
                  </div>
                </div>

                {/* Gadchiroli district */}
                <div className="absolute w-[268px] h-[53px] top-[777px] left-[2759px]">
                  <div className="absolute w-[266px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                    Gadchiroli
                  </div>
                </div>

                {/* Nagpur district */}
                <div className="absolute w-[198px] h-[53px] top-[237px] left-[2354px]">
                  <div className="absolute w-[196px] top-0 left-0 [font-family:'Inter',Helvetica] font-normal text-black text-[44px] tracking-[0] leading-[normal]">
                    Nagpur
                  </div>
                </div>
              </div>


            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
