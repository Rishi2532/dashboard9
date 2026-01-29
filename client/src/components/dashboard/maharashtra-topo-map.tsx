import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { geoPath, geoMercator } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection } from 'topojson-specification';
import { Region, RegionSummary } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { regionColors } from '@/data/maharashtra-geojson';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

interface MaharashtraTopoMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

export default function MaharashtraTopoMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraTopoMapProps): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [topoData, setTopoData] = useState<any>(null);
  const [viewBox, setViewBox] = useState<string>("0 0 800 600");
  const [zoom, setZoom] = useState<number>(1);
  const [position, setPosition] = useState<[number, number]>([400, 300]);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  });
  
  // Get percentage for metric display
  const getPercentage = (regionName: string): number => {
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
    
    return Math.min(Math.round(percentage), 100);
  };
  
  // Get metric value for tooltip
  const getMetricValue = (regionName: string): string => {
    if (!regions) return '';
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return '';
    
    if (metric === 'completion') {
      return `${region.fully_completed_schemes}/${region.total_schemes_integrated}`;
    } else if (metric === 'esr') {
      return `${region.fully_completed_esr}/${region.total_esr_integrated}`;
    } else if (metric === 'villages') {
      return `${region.fully_completed_villages}/${region.total_villages_integrated}`;
    } else if (metric === 'flow_meter') {
      return `${region.flow_meter_integrated}/${region.total_schemes_integrated}`;
    }
    
    return '';
  };
  
  // Get color based on region name
  const getColor = (regionName: string): string => {
    // Custom vibrant colors matching the reference image
    const regionColorMap: Record<string, string> = {
      'Nashik': '#8CB3E2',         // Light blue
      'Amravati': '#ff7300',       // Orange 
      'Nagpur': '#E2B8B8',         // Light red/pink
      'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
      'Pune': '#FFC408',           // Yellow
      'Konkan': '#4A77BB'          // Blue
    };
    
    return regionColorMap[regionName] || '#cccccc';
  };
  
  // Get metric color based on percentage
  const getMetricColor = (percentage: number): string => {
    if (percentage >= 80) return '#4CAF50'; // Green
    if (percentage >= 60) return '#8BC34A'; // Light Green
    if (percentage >= 40) return '#FFEB3B'; // Yellow
    if (percentage >= 20) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load topo data
  useEffect(() => {
    async function loadTopoData() {
      try {
        console.log('Attempting to load topo data...');
        
        // Try the enhanced topo file first
        try {
          let response = await fetch('/enhanced-maharashtra.topo.json');
          if (response.ok) {
            const data = await response.json();
            console.log('Successfully loaded enhanced TopoJSON data');
            setTopoData(data);
            return;
          } else {
            console.log('Enhanced file not found, trying original file...');
          }
        } catch (enhancedError) {
          console.error('Error loading enhanced file:', enhancedError);
        }
        
        // Fall back to original file
        let response = await fetch('/maharashtra.topo.json');
        if (!response.ok) {
          console.error('Could not load Maharashtra topo data, status:', response.status);
          
          // Create minimal fallback data directly if all files fail
          console.log('Using minimal fallback data');
          const fallbackData = {
            type: "Topology",
            objects: {
              maharashtra: {
                type: "GeometryCollection",
                geometries: [
                  {
                    type: "Polygon",
                    properties: { name: "Nagpur", region: "Nagpur", code: "MH09" },
                    arcs: [[0]]
                  },
                  {
                    type: "Polygon",
                    properties: { name: "Amravati", region: "Amravati", code: "MH04" },
                    arcs: [[1]]
                  }
                ]
              }
            },
            arcs: [
              [[79.10, 21.05], [79.40, 21.10], [79.70, 21.15], [79.90, 21.05], [79.10, 21.05]],
              [[77.75, 21.25], [78.05, 21.30], [78.35, 21.25], [77.75, 21.25]]
            ],
            transform: { scale: [0.002, 0.002], translate: [72.5, 16.0] }
          };
          setTopoData(fallbackData);
          return;
        }
        
        const data = await response.json();
        console.log('Successfully loaded original TopoJSON data');
        setTopoData(data);
      } catch (error) {
        console.error('Error loading Maharashtra topo data:', error);
      }
    }
    
    loadTopoData();
  }, []);

  // Render map
  useEffect(() => {
    if (!topoData || !svgRef.current || isLoading) {
      console.log('Skipping render - topoData, svg or loading state issue');
      return;
    }
    
    try {
      console.log('Starting map render with topoData:', topoData);
      
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // Clear previous elements
      
      // Extract features from topoJSON
      console.log('Extracting features from topoJSON:', topoData.objects);
      const maharashtraFeatures = feature(topoData, topoData.objects.maharashtra as any);
      console.log('Features extracted:', maharashtraFeatures);
      
      // Set up projection and path generator
      const width = containerRef.current?.clientWidth || 800;
      const height = containerRef.current?.clientHeight || 600;
      console.log(`Container size: ${width}x${height}`);
      
      const projection = geoMercator()
        .fitSize([width, height], maharashtraFeatures as any)
        .center([76.8, 19.0])  // Center coordinates for Maharashtra
        .scale(1500 * zoom)
        .translate([width/2, height/2]);
      
      const pathGenerator = geoPath().projection(projection);
      
      // Create a container group for the map
      const g = svg.append("g")
        .attr("class", "map-container");
      
      // Add a base layer for water/background
      g.append("rect")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "#f0f8ff") // Light blue background
        .attr("rx", 10)
        .attr("ry", 10);
      
      // Add boundary lines with a subtle shadow
      g.append("filter")
        .attr("id", "drop-shadow")
        .append("feDropShadow")
        .attr("dx", 1)
        .attr("dy", 1)
        .attr("stdDeviation", 1.5)
        .attr("flood-opacity", 0.3);
      
      // Draw the regions
      g.selectAll("path")
        .data(maharashtraFeatures.features)
        .enter()
        .append("path")
        .attr("d", (d: any) => pathGenerator(d))
        .attr("stroke", "#fff")
        .attr("stroke-width", (d: any) => {
          // Get the region name from properties
          const regionName = d.properties.region;
          return regionName === selectedRegion ? 2 : 0.5;
        })
        .attr("fill", (d: any) => {
          // Get the region name from properties
          const regionName = d.properties.region;
          return getColor(regionName);
        })
        .attr("opacity", 0.85)
        .attr("filter", "url(#drop-shadow)")
        .attr("class", (d: any) => {
          const regionName = d.properties.region;
          return `region ${regionName === selectedRegion ? "selected" : ""}`;
        })
        .on("click", (event, d: any) => {
          const regionName = d.properties.region;
          onRegionClick(regionName);
        })
        .on("mouseover", (event, d: any) => {
          const regionName = d.properties.region;
          
          // Highlight the region
          d3.select(event.currentTarget)
            .attr("stroke-width", 2)
            .attr("opacity", 1);
          
          // Show tooltip
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`);
          
          const districtName = d.properties.name || regionName;
          const metricName = 
            metric === 'esr' ? 'ESR Integration' : 
            metric === 'villages' ? 'Village Completion' : 
            metric === 'flow_meter' ? 'Flow Meter Installation' :
            'Scheme Completion';
          
          tooltip.html(`
            <div class="tooltip-content">
              <strong>${districtName}</strong><br>
              Region: ${regionName}<br>
              ${metricName}: ${getMetricValue(regionName)}
            </div>
          `);
        })
        .on("mousemove", (event) => {
          // Update tooltip position
          const tooltip = d3.select(tooltipRef.current);
          tooltip.style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`);
        })
        .on("mouseout", (event, d: any) => {
          const regionName = d.properties.region;
          
          // Restore normal appearance if not selected
          if (regionName !== selectedRegion) {
            d3.select(event.currentTarget)
              .attr("stroke-width", 0.5)
              .attr("opacity", 0.85);
          }
          
          // Hide tooltip
          d3.select(tooltipRef.current).style("display", "none");
        });
      
      // Add region labels
      g.selectAll("text")
        .data(maharashtraFeatures.features)
        .enter()
        .append("text")
        .attr("x", (d: any) => {
          const [x, y] = pathGenerator.centroid(d);
          return x;
        })
        .attr("y", (d: any) => {
          const [x, y] = pathGenerator.centroid(d);
          return y;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .attr("pointer-events", "none")
        .text((d: any) => d.properties.region)
        .attr("style", "text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white, 0 0 3px white;");
      
      // Adjust the viewbox to match the container
      setViewBox(`0 0 ${width} ${height}`);
    } catch (error) {
      console.error('Error rendering map:', error);
    }
  }, [topoData, svgRef, selectedRegion, isLoading, zoom, position, windowSize, metric, onRegionClick, regions]);

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev * 0.8, 0.5));
  };

  // Handle reset
  const handleReset = () => {
    setZoom(1);
    setPosition([400, 300]);
  };

  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }
  
  // If no topo data, show error
  if (!topoData) {
    return (
      <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm flex items-center justify-center flex-col">
        <div className="text-red-500 mb-2">
          <RefreshCw size={40} className="animate-spin" />
        </div>
        <p className="text-gray-500 text-sm">
          Loading map data...
        </p>
        <p className="text-gray-400 text-xs mt-2">
          If the map doesn't appear, please refresh the page
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm" ref={containerRef}>
      <svg 
        ref={svgRef} 
        className="w-full h-full"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
      />
      
      {/* Tooltip */}
      <div 
        ref={tooltipRef} 
        className="absolute hidden bg-white p-2 rounded shadow-lg border border-gray-200 text-sm z-50"
        style={{ pointerEvents: "none" }}
      ></div>
      
      {/* Controls */}
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white" 
          onClick={handleZoomIn}
        >
          <ZoomIn size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white" 
          onClick={handleZoomOut}
        >
          <ZoomOut size={16} />
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-white" 
          onClick={handleReset}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-2 right-2 bg-white p-2 rounded-md shadow-md text-xs">
        <div className="font-semibold mb-1">Maharashtra Regions</div>
        <div className="text-[10px] mb-2 text-gray-500">
          {metric === 'esr' ? 'ESR Integration' : 
          metric === 'villages' ? 'Village Completion' : 
          metric === 'flow_meter' ? 'Flow Meter Installation' : 
          'Scheme Completion'}
        </div>
        {['Nashik', 'Amravati', 'Nagpur', 'Chhatrapati Sambhajinagar', 'Pune', 'Konkan'].map(region => (
          <div 
            key={region} 
            className="flex items-center gap-2 mb-1 cursor-pointer" 
            onClick={() => onRegionClick(region)}
          >
            <div 
              className="w-3 h-3 rounded"
              style={{ 
                backgroundColor: getColor(region),
                border: region === selectedRegion ? '1.5px solid #2563eb' : '0.5px solid rgba(0,0,0,0.2)'
              }}
            ></div>
            <span className={region === selectedRegion ? "font-semibold" : ""}>
              {region === 'Chhatrapati Sambhajinagar' ? 'C.S. Nagar' : region}
            </span>
            <span className="ml-auto font-mono">{getMetricValue(region)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}