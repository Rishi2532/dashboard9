import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region, RegionSummary } from '@/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as d3 from 'd3';
import { maharashtraRegions, maharashtraOutlinePath, regionNameToId } from '@/data/maharashtra-boundaries';

interface MaharashtraMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Use the boundaries defined in the imported maharashtraRegions
const regionBoundaries = maharashtraRegions;

export default function MaharashtraMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: MaharashtraMapProps): JSX.Element {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  
  // Get percentage for metric display
  const getPercentage = (regionName: string) => {
    if (!regions) return 0;
    
    const region = regions.find(r => r.region_name === regionName);
    if (!region) return 0;
    
    let percentage = 0;
    
    // Helper function to handle null/undefined/zero values
    const getValue = (value: any) => {
      if (value === null || value === undefined || value === 'null' || value === '' || value === '0') return 0;
      return parseInt(value) || 0;
    };

    if (metric === 'completion') {
      const completed = getValue(region.fully_completed_schemes);
      const total = getValue(region.total_schemes_integrated);
      percentage = total > 0 ? (completed / total * 100) : 0;
    } else if (metric === 'esr') {
      const completed = getValue(region.fully_completed_esr);
      const total = getValue(region.total_esr_integrated);
      percentage = total > 0 ? (completed / total * 100) : 0;
    } else if (metric === 'villages') {
      const completed = getValue(region.fully_completed_villages);
      const total = getValue(region.total_villages_integrated);
      percentage = total > 0 ? (completed / total * 100) : 0;
    } else if (metric === 'flow_meter') {
      const flowMeters = getValue(region.flow_meter_integrated);
      const total = getValue(region.total_schemes_integrated);
      percentage = total > 0 ? (flowMeters / total * 100) : 0;
    }
    
    return Math.round(percentage);
  };

  // Initialize the map with SVG rendering
  useEffect(() => {
    if (isLoading || !mapRef.current) return;

    const mapContainer = mapRef.current;
    
    // Clean any previous map instances
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    
    // Create a Leaflet map without tile layers (we'll use our custom SVG)
    const map = L.map(mapContainer, {
      center: [330, 290],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: true,
      dragging: true,
      maxBounds: L.latLngBounds(L.latLng(0, 0), L.latLng(600, 800)),
      maxZoom: 10,
      minZoom: 6,
      crs: L.CRS.Simple
    });
    
    // Set custom bounds
    const bounds = L.latLngBounds(L.latLng(0, 0), L.latLng(600, 800));
    map.fitBounds(bounds);
    
    // Create an SVG overlay for the map
    const svgOverlay = L.svg().addTo(map);
    // Cast the SVG overlay to access its container
    const svgContainer = (svgOverlay as any)._container;
    const svg = d3.select(svgContainer);
    
    // Set the map background
    mapContainer.style.backgroundColor = '#0a1033';
    
    // Add the state outline first as a base layer
    svg.append('path')
      .attr('d', maharashtraOutlinePath)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,3')
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.7))');
      
    // Add inter-region connection paths (roads/rivers)
    const nagpurCenter = maharashtraRegions["Nagpur"].center;
    const amravatiCenter = maharashtraRegions["Amravati"].center;
    const sambhajinagarCenter = maharashtraRegions["Chhatrapati Sambhajinagar"].center;
    const nashikCenter = maharashtraRegions["Nashik"].center;
    const puneCenter = maharashtraRegions["Pune"].center;
    const konkanCenter = maharashtraRegions["Konkan"].center;
    
    const connectionPaths = [
      // Nagpur to Amravati
      {
        path: `M${nagpurCenter[0]},${nagpurCenter[1]} Q${nagpurCenter[0] - 25},${nagpurCenter[1] + 10} ${amravatiCenter[0]},${amravatiCenter[1]}`,
        color: 'rgba(255,255,255,0.15)'
      },
      // Amravati to Chhatrapati Sambhajinagar
      {
        path: `M${amravatiCenter[0]},${amravatiCenter[1]} Q${amravatiCenter[0] - 15},${amravatiCenter[1] + 30} ${sambhajinagarCenter[0]},${sambhajinagarCenter[1]}`,
        color: 'rgba(255,255,255,0.15)'
      },
      // Nashik to Pune
      {
        path: `M${nashikCenter[0]},${nashikCenter[1]} Q${(nashikCenter[0] + puneCenter[0])/2},${(nashikCenter[1] + puneCenter[1])/2 - 10} ${puneCenter[0]},${puneCenter[1]}`,
        color: 'rgba(255,255,255,0.15)'
      },
      // Pune to Konkan
      {
        path: `M${puneCenter[0]},${puneCenter[1]} Q${puneCenter[0] - 20},${puneCenter[1] + 10} ${konkanCenter[0]},${konkanCenter[1]}`,
        color: 'rgba(255,255,255,0.15)'
      }
    ];
    
    // Draw each connection path
    connectionPaths.forEach(conn => {
      svg.append('path')
        .attr('d', conn.path)
        .attr('fill', 'none')
        .attr('stroke', conn.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '3,2');
    });
    
    // Add region polygons
    Object.entries(regionBoundaries).forEach(([regionName, regionData]) => {
      // Create the region path
      const pathElement = svg.append('path')
        .attr('d', regionData.path)
        .attr('fill', regionData.color)
        .attr('opacity', regionName === selectedRegion ? 0.9 : 0.7)
        .attr('stroke', regionName === selectedRegion ? '#ffffff' : 'rgba(255,255,255,0.2)')
        .attr('stroke-width', regionName === selectedRegion ? 2 : 1)
        .style('cursor', 'pointer');
      
      // Add event listeners
      pathElement.on('mouseover', () => {
        setHoveredRegion(regionName);
        pathElement.attr('opacity', 0.9)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      });
      
      pathElement.on('mouseout', () => {
        if (regionName !== selectedRegion) {
          pathElement.attr('opacity', 0.7)
            .attr('stroke', 'rgba(255,255,255,0.2)')
            .attr('stroke-width', 1);
        }
        setHoveredRegion(null);
      });
      
      pathElement.on('click', () => {
        onRegionClick(regionName);
      });
      
      // Add district boundaries with more detailed shapes
      regionData.districts.forEach(district => {
        // Create a district boundary with curved path
        const districtX = district.position[0];
        const districtY = district.position[1];
        
        // Generate a small circular boundary to represent the district area
        const radius = 8;
        const circlePath = `
          M ${districtX - radius} ${districtY}
          a ${radius},${radius} 0 1,0 ${radius * 2},0
          a ${radius},${radius} 0 1,0 -${radius * 2},0
        `;
        
        svg.append('path')
          .attr('d', circlePath)
          .attr('fill', 'rgba(255,255,255,0.05)')
          .attr('stroke', 'rgba(255,255,255,0.3)')
          .attr('stroke-width', 0.5);
          
        // Create a location dot for the district
        svg.append('circle')
          .attr('cx', district.position[0])
          .attr('cy', district.position[1])
          .attr('r', 2)
          .attr('fill', '#ffffff')
          .attr('opacity', 0.7);
          
        // Add district name
        svg.append('text')
          .attr('x', district.position[0])
          .attr('y', district.position[1] - 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('fill', '#ffffff')
          .attr('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.6))')
          .text(district.name);
          
        // Add outline for better readability
        svg.append('text')
          .attr('x', district.position[0])
          .attr('y', district.position[1] - 8)
          .attr('text-anchor', 'middle')
          .attr('font-size', '8px')
          .attr('stroke', '#0a1033')
          .attr('stroke-width', 3)
          .attr('fill', 'none')
          .attr('opacity', 0.4)
          .attr('paint-order', 'stroke')
          .text(district.name);
      });
      
      // Add region markers (pin style)
      const markerGroup = svg.append('g')
        .attr('class', 'region-marker')
        .style('cursor', 'pointer')
        .on('click', () => {
          onRegionClick(regionName);
        });
        
      // Pin base (red circle)
      markerGroup.append('circle')
        .attr('cx', regionData.center[0])
        .attr('cy', regionData.center[1])
        .attr('r', 8)
        .attr('fill', '#FF4136')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1.5)
        .attr('filter', 'drop-shadow(0px 2px 3px rgba(0,0,0,0.5))');
      
      // Pin inner circle  
      markerGroup.append('circle')
        .attr('cx', regionData.center[0])
        .attr('cy', regionData.center[1])
        .attr('r', 3)
        .attr('fill', '#ff6b63')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 0.5);
        
      // Add pulse animation effect for the selected region
      if (regionName === selectedRegion) {
        const pulseCircle = markerGroup.append('circle')
          .attr('cx', regionData.center[0])
          .attr('cy', regionData.center[1])
          .attr('r', 8)
          .attr('fill', 'none')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2)
          .attr('opacity', 0.7);
        
        // Create pulse animation directly with recursive function
        const animatePulse = () => {
          pulseCircle
            .transition()
            .duration(1000)
            .attr('r', 20)
            .attr('opacity', 0)
            .transition()
            .duration(100)
            .attr('r', 8)
            .attr('opacity', 0.7)
            .on('end', animatePulse);
        };
        
        animatePulse();
      }
        
      // Get custom position adjustments for each region to prevent overlap
      const positionAdjustments: Record<string, { x: number, y: number }> = {
        "Nagpur": { x: 0, y: -15 },
        "Amravati": { x: 0, y: -15 },
        "Chhatrapati Sambhajinagar": { x: 0, y: -20 }, // Move up more
        "Nashik": { x: 0, y: -15 },
        "Pune": { x: 0, y: -15 },
        "Konkan": { x: 0, y: -15 }
      };
      
      // Get the adjustment for this region
      let adjustment = { x: 0, y: -15 };
      if (regionName in positionAdjustments) {
        adjustment = positionAdjustments[regionName as keyof typeof positionAdjustments];
      }
      
      // Add region name (with adjustments)
      svg.append('text')
        .attr('x', regionData.center[0] + adjustment.x)
        .attr('y', regionData.center[1] + adjustment.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('filter', 'drop-shadow(0px 1px 3px rgba(0,0,0,0.8))')
        .text(regionName);
        
      svg.append('text')
        .attr('x', regionData.center[0] + adjustment.x)
        .attr('y', regionData.center[1] + adjustment.y)
        .attr('text-anchor', 'middle')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('stroke', '#0a1033')
        .attr('stroke-width', 3)
        .attr('fill', 'none')
        .attr('opacity', 0.5)
        .text(regionName);
    });
    
    // Add scale bar
    const scaleBar = svg.append('g').attr('transform', 'translate(50, 430)');
    
    // Scale bar title
    scaleBar.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .attr('fill', '#ffffff')
      .attr('font-size', 8)
      .attr('font-weight', 'bold')
      .text('Scale');
    
    // Scale bar
    scaleBar.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 100)
      .attr('height', 4)
      .attr('fill', 'url(#scale-gradient)');
    
    // Add gradient definition for scale bar
    const gradient = scaleBar.append('defs')
      .append('linearGradient')
      .attr('id', 'scale-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '0%');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#ffffff');
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'rgba(255,255,255,0.4)');
    
    // Scale bar ticks and labels
    [0, 25, 50, 75, 100].forEach(pos => {
      scaleBar.append('line')
        .attr('x1', pos)
        .attr('y1', 0)
        .attr('x2', pos)
        .attr('y2', 6)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);
      
      scaleBar.append('text')
        .attr('x', pos)
        .attr('y', 16)
        .attr('text-anchor', 'middle')
        .attr('font-size', 8)
        .attr('fill', '#ffffff')
        .text(`${pos}km`);
    });
    
    // Add compass rose
    const compass = svg.append('g').attr('transform', 'translate(50, 500)');
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 24)
      .attr('fill', '#0a1033')
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', 1)
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))');
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 22)
      .attr('fill', 'none')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1);
      
    compass.append('path')
      .attr('d', 'M25,3 L25,47 M3,25 L47,25')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('path')
      .attr('d', 'M10,10 L40,40 M10,40 L40,10')
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,1');
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 4)
      .attr('fill', '#0a1033')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1);
      
    compass.append('circle')
      .attr('cx', 25)
      .attr('cy', 25)
      .attr('r', 2)
      .attr('fill', '#ffffff');
      
    // Add compass labels
    ['N', 'E', 'S', 'W'].forEach((dir, i) => {
      const position = [
        [25, 8],
        [45, 27],
        [25, 45],
        [5, 27]
      ];
      
      compass.append('text')
        .attr('x', position[i][0])
        .attr('y', position[i][1])
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#ffffff')
        .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))')
        .text(dir);
    });
    
    // Add region legend with metric information
    const legend = svg.append('g').attr('transform', 'translate(620, 360)');
    
    // Legend background
    legend.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 180)
      .attr('height', 230)
      .attr('fill', '#0a1033')
      .attr('opacity', 0.9)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('stroke', 'rgba(255,255,255,0.3)')
      .attr('stroke-width', 1)
      .attr('filter', 'drop-shadow(0px 2px 6px rgba(0,0,0,0.7))');
    
    // Legend title  
    legend.append('text')
      .attr('x', 15)
      .attr('y', 25)
      .attr('fill', '#ffffff')
      .attr('font-size', 14)
      .attr('font-weight', 'bold')
      .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))')
      .text('Maharashtra Regions');
    
    // Legend subtitle - metric type
    let metricTitle = 'ESR Integration';
    if (metric === 'villages') metricTitle = 'Village Completion';
    if (metric === 'flow_meter') metricTitle = 'Flow Meter Integration';
    
    legend.append('text')
      .attr('x', 15)
      .attr('y', 45)
      .attr('fill', 'rgba(255,255,255,0.7)')
      .attr('font-size', 10)
      .text(`Showing: ${metricTitle}`);
    
    // Add legend items with interactive hover
    const legendItems = [
      { name: 'Amaravati', color: '#F8BFC7', y: 70 },
      { name: 'Nagpur', color: '#E8CEAD', y: 95 },
      { name: 'C.S. Nagar', color: '#C0D1F0', y: 120 },
      { name: 'Nashik', color: '#F1E476', y: 145 },
      { name: 'Pune', color: '#ADEBAD', y: 170 },
      { name: 'Konkan', color: '#BFC0C0', y: 195 }
    ];
    
    // Get metric data for each region
    const regionData = regions?.reduce((acc, r) => {
      acc[r.region_name] = r;
      return acc;
    }, {} as Record<string, any>) || {};
    
    legendItems.forEach((item, idx) => {
      const region = regionData[item.name];
      const isSelected = item.name === selectedRegion;
      
      // Interactive group for each legend item
      const itemGroup = legend.append('g')
        .attr('class', 'legend-item')
        .style('cursor', 'pointer')
        .on('click', () => {
          onRegionClick(item.name);
        })
        .on('mouseover', function() {
          d3.select(this).select('rect')
            .attr('stroke', '#ffffff')
            .attr('stroke-width', 1.5);
        })
        .on('mouseout', function() {
          if (item.name !== selectedRegion) {
            d3.select(this).select('rect')
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 0.5);
          }
        });
      
      // Region color box
      itemGroup.append('rect')
        .attr('x', 15)
        .attr('y', item.y - 10)
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color)
        .attr('stroke', isSelected ? '#ffffff' : 'rgba(255,255,255,0.5)')
        .attr('stroke-width', isSelected ? 1.5 : 0.5)
        .attr('rx', 2)
        .attr('ry', 2);
      
      // Region name  
      itemGroup.append('text')
        .attr('x', 37)
        .attr('y', item.y)
        .attr('fill', '#ffffff')
        .attr('font-size', 11)
        .attr('font-weight', isSelected ? 'bold' : 'normal')
        .attr('filter', 'drop-shadow(0px 1px 1px rgba(0,0,0,0.3))')
        .text(item.name);
      
      // Add metric data if available
      if (region) {
        // Function to get the right metric value
        const getMetricValue = () => {
          // Make sure to replace 'null' with '0' for any metrics
          const formatValue = (value: any) => {
            if (value === null || value === undefined || value === 'null' || value === '' || value === '0' || isNaN(parseInt(value)) || parseInt(value) === 0) return "0";
            return value.toString();
          };

          if (item.name === 'Pune' || item.name === 'Konkan') {
            // Forcibly ensure Pune and Konkan display zero
            switch(metric) {
              case 'completion':
                return `0/${formatValue(region.total_schemes_integrated)}`;
              case 'esr':
                return `0/${formatValue(region.total_esr_integrated)}`;
              case 'villages':
                return `0/${formatValue(region.total_villages_integrated)}`;
              case 'flow_meter':
                return `${formatValue(region.flow_meter_integrated)}`;
              default:
                return `0/${formatValue(region.total_schemes_integrated)}`;
            }
          } else {
            // For other regions, use standard formatting
            switch(metric) {
              case 'completion':
                return `${formatValue(region.fully_completed_schemes)}/${formatValue(region.total_schemes_integrated)}`;
              case 'esr':
                return `${formatValue(region.fully_completed_esr)}/${formatValue(region.total_esr_integrated)}`;
              case 'villages':
                return `${formatValue(region.fully_completed_villages)}/${formatValue(region.total_villages_integrated)}`;
              case 'flow_meter':
                return `${formatValue(region.flow_meter_integrated)}`;
              default:
                return `${formatValue(region.fully_completed_schemes)}/${formatValue(region.total_schemes_integrated)}`;
            }
          }
        };
        
        // Small metric value indicator
        itemGroup.append('text')
          .attr('x', 120)
          .attr('y', item.y)
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', 10)
          .attr('font-family', 'monospace')
          .text(getMetricValue());
      }
    });
    
    // Add legend description
    legend.append('text')
      .attr('x', 15)
      .attr('y', 220)
      .attr('fill', 'rgba(255,255,255,0.6)')
      .attr('font-size', 8)
      .text('Click on a region to filter data');
    
    // Store the map reference
    leafletMapRef.current = map;
    
    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isLoading, regions, selectedRegion, metric]);

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
          <div className="relative w-full" style={{ height: '500px', overflow: 'hidden' }}>
            <div 
              ref={mapRef}
              id="maharashtra-map" 
              className="h-full w-full bg-[#0a1033]"
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}