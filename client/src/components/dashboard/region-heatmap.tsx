import { useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RegionSummary } from "@/types";
import { 
  ComposableMap, 
  Geographies, 
  Geography, 
  ZoomableGroup,
  GeographyProps 
} from "react-simple-maps";
import { 
  maharashtraRegions, 
  maharashtraOutline,
  regionNameToId 
} from "@/data/maharashtra-regions";

interface RegionHeatmapProps {
  regionSummary?: RegionSummary;
  regions?: any[];
  selectedRegion?: string;
  onRegionClick?: (regionName: string) => void;
  metric?: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading: boolean;
}

export default function RegionHeatmap({ 
  regionSummary, 
  regions = [], 
  selectedRegion = "all",
  onRegionClick,
  metric = 'completion',
  isLoading 
}: RegionHeatmapProps) {
  const mapRef = useRef<SVGSVGElement>(null);

  // Determine color based on completion percentage for each region
  const getRegionData = useMemo(() => {
    if (!regions || regions.length === 0) return {};

    return regions.reduce((acc: Record<string, any>, region) => {
      const id = regionNameToId[region.region_name] || 'unknown';
      
      // Calculate percentages for different metrics
      let value = 0;
      let label = '';
      
      if (metric === 'completion') {
        // Calculate scheme completion percentage
        const total = region.total_schemes_integrated || 0;
        const completed = region.fully_completed_schemes || 0;
        value = total > 0 ? (completed / total) * 100 : 0;
        label = `${completed}/${total} schemes completed`;
      } 
      else if (metric === 'esr') {
        // Calculate ESR integration percentage
        const total = region.total_esr_integrated || 0;
        const completed = region.fully_completed_esr || 0;
        value = total > 0 ? (completed / total) * 100 : 0;
        label = `${completed}/${total} ESRs completed`;
      }
      else if (metric === 'villages') {
        // Calculate village integration percentage
        const total = region.total_villages_integrated || 0;
        const completed = region.fully_completed_villages || 0;
        value = total > 0 ? (completed / total) * 100 : 0;
        label = `${completed}/${total} villages completed`;
      }
      else if (metric === 'flow_meter') {
        // Flow meter status
        const total = region.total_schemes_integrated || 0;
        const flow_meter = region.flow_meter_integrated || 0;
        value = total > 0 ? (flow_meter / total) * 100 : 0;
        label = `${flow_meter} flow meters`;
      }
      
      acc[id] = {
        value: value,
        label: label,
        name: region.region_name,
        isSelected: selectedRegion === region.region_name
      };
      
      return acc;
    }, {});
  }, [regions, metric, selectedRegion]);

  // Get color based on completion percentage
  const getRegionColor = (regionId: string) => {
    const regionData = getRegionData[regionId];
    
    if (!regionData) return "#e0e0e0"; // Default gray for unknown regions
    
    // Selected region gets a blue highlight
    if (regionData.isSelected) return "#3b82f6"; // blue-500
    
    const value = regionData.value;
    
    // Color scale based on percentage
    if (value >= 75) return "#10b981"; // green-500 for high completion
    if (value >= 50) return "#22c55e"; // green-400 for good completion
    if (value >= 25) return "#f59e0b"; // amber-500 for medium completion
    return "#f97316"; // orange-500 for low completion
  };

  const getMetricTitle = () => {
    switch (metric) {
      case 'completion': return "Scheme Completion";
      case 'esr': return "ESR Integration";
      case 'villages': return "Villages Integration";
      case 'flow_meter': return "Flow Meter Status";
      default: return "Region Status";
    }
  };

  return (
    <Card className="bg-white">
      <CardContent className="p-5">
        <h3 className="text-lg leading-6 font-medium text-neutral-900">{getMetricTitle()}</h3>
        <div className="mt-1 text-sm text-neutral-500">
          Regional distribution across Maharashtra
        </div>
        <div className="mt-4 h-[250px] w-full">
          {isLoading ? (
            <div className="animate-pulse h-full w-full bg-gray-200 rounded"></div>
          ) : (
            <ComposableMap
              projection="geoMercator"
              projectionConfig={{
                scale: 2500,
                center: [76, 19]
              }}
              width={500}
              height={250}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup zoom={1} center={[76, 19]}>
                {/* State outline */}
                <Geography
                  geography={maharashtraOutline}
                  fill="#f1f5f9"
                  stroke="#cbd5e1"
                  strokeWidth={0.5}
                />
                
                {/* Individual regions */}
                <Geographies geography={maharashtraRegions}>
                  {({ geographies }: { geographies: any[] }) =>
                    geographies.map((geo: any) => {
                      const regionId = geo.properties.id;
                      const regionData = getRegionData[regionId] || {};
                      
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={getRegionColor(regionId)}
                          stroke="#ffffff"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", fill: "#3b82f6" },
                            pressed: { outline: "none" },
                          }}
                          onClick={() => {
                            if (onRegionClick && regionData.name) {
                              onRegionClick(regionData.name);
                            }
                          }}
                        />
                      );
                    })
                  }
                </Geographies>
                
                {/* Region labels */}
                {Object.entries(getRegionData).map(([regionId, data]: [string, any]) => {
                  const feature = maharashtraRegions.features.find(
                    (f: any) => f.properties.id === regionId
                  );
                  
                  if (!feature) return null;
                  
                  // Calculate center point of the region
                  const coordinates = feature.geometry.coordinates[0];
                  const xSum = coordinates.reduce((sum: number, point: number[]) => sum + point[0], 0);
                  const ySum = coordinates.reduce((sum: number, point: number[]) => sum + point[1], 0);
                  const centerX = xSum / coordinates.length;
                  const centerY = ySum / coordinates.length;
                  
                  return (
                    <g key={regionId}>
                      <text
                        x={centerX}
                        y={centerY}
                        textAnchor="middle"
                        fontSize={8}
                        fontWeight="bold"
                        fill="#ffffff"
                      >
                        {data.name}
                      </text>
                      <text
                        x={centerX}
                        y={centerY + 10}
                        textAnchor="middle"
                        fontSize={6}
                        fill="#ffffff"
                      >
                        {data.label}
                      </text>
                    </g>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>
          )}
        </div>
        {/* Legend */}
        <div className="mt-2 flex justify-center items-center gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-sm mr-1"></div>
            <span>0-25%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-amber-500 rounded-sm mr-1"></div>
            <span>25-50%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-sm mr-1"></div>
            <span>50-75%</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-sm mr-1"></div>
            <span>75-100%</span>
          </div>
          {selectedRegion !== "all" && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}