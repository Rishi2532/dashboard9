import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Region, RegionSummary } from '@/types';
import L, { PathOptions } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  regionColors, 
  regionNames,
  MaharashtraFeatureProperties,
  simplifiedMaharashtraGeoJson
} from '@/data/maharashtra-geojson';

interface DetailedMaharashtraMapProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Define the type for GeoJSON features and their properties
interface MaharashtraDistrictProperties {
  name: string;
  region: string;
  code: string;
}

interface GeoJSONFeature {
  type: "Feature";
  properties: MaharashtraDistrictProperties;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

// Using `as const` to properly type string literals
type FeatureType = "Feature";
type PolygonType = "Polygon";
type FeatureCollectionType = "FeatureCollection";

interface GeoJSONCollection {
  type: FeatureCollectionType;
  features: Array<{
    type: FeatureType;
    properties: MaharashtraDistrictProperties;
    geometry: {
      type: PolygonType;
      coordinates: number[][][];
    };
  }>;
}

export default function DetailedMaharashtraMap({
  regionSummary,
  regions,
  selectedRegion,
  onRegionClick,
  metric,
  isLoading = false,
}: DetailedMaharashtraMapProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [geoJsonData, setGeoJsonData] = useState<GeoJSONCollection | null>(null);
  
  // Get percentage for metric display
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
    
    return Math.min(Math.round(percentage), 100);
  };
  
  // Get metric value for tooltip
  const getMetricValue = (regionName: string) => {
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

  // Load GeoJSON data
  useEffect(() => {
    // Use the embedded simplified data directly
    const simplifiedData = {
      "type": "FeatureCollection" as const,
      "features": [
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Nagpur",
            "region": "Nagpur",
            "code": "MH09"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[79.10, 21.05], [79.40, 21.10], [79.70, 21.15], [79.90, 21.05], [79.95, 20.85], [79.80, 20.65], [79.60, 20.55], [79.30, 20.55], [79.05, 20.65], [78.95, 20.80], [79.10, 21.05]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Amravati",
            "region": "Amravati",
            "code": "MH04"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[77.75, 21.25], [78.05, 21.30], [78.35, 21.25], [78.55, 21.15], [78.65, 20.90], [78.55, 20.70], [78.35, 20.55], [78.05, 20.50], [77.75, 20.60], [77.60, 20.80], [77.65, 21.05], [77.75, 21.25]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Chhatrapati Sambhajinagar",
            "region": "Chhatrapati Sambhajinagar",
            "code": "MH20"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[75.10, 20.00], [75.40, 20.05], [75.70, 20.00], [75.90, 19.85], [75.95, 19.65], [75.85, 19.45], [75.65, 19.35], [75.35, 19.30], [75.10, 19.40], [74.95, 19.60], [75.00, 19.80], [75.10, 20.00]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Nashik",
            "region": "Nashik",
            "code": "MH15"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[73.65, 20.15], [74.00, 20.20], [74.35, 20.15], [74.55, 20.00], [74.60, 19.80], [74.50, 19.60], [74.25, 19.45], [73.95, 19.45], [73.65, 19.55], [73.50, 19.75], [73.55, 19.95], [73.65, 20.15]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Pune",
            "region": "Pune",
            "code": "MH12"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[73.65, 18.65], [74.00, 18.70], [74.35, 18.65], [74.65, 18.50], [74.70, 18.30], [74.60, 18.10], [74.35, 17.95], [74.00, 17.90], [73.65, 18.00], [73.45, 18.20], [73.50, 18.45], [73.65, 18.65]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Konkan",
            "region": "Konkan",
            "code": "MH13"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[72.75, 19.15], [73.10, 19.15], [73.30, 19.05], [73.35, 18.85], [73.25, 18.65], [73.05, 18.55], [72.80, 18.55], [72.55, 18.65], [72.45, 18.85], [72.55, 19.05], [72.75, 19.15]]]
          }
        },
        {
          "type": "Feature" as const,
          "properties": {
            "name": "Mumbai",
            "region": "Konkan",
            "code": "MH01"
          },
          "geometry": {
            "type": "Polygon" as const,
            "coordinates": [[[72.75, 19.05], [72.95, 19.10], [73.10, 19.05], [73.15, 18.95], [73.10, 18.85], [72.95, 18.80], [72.80, 18.85], [72.70, 18.95], [72.75, 19.05]]]
          }
        }
      ]
    };
    
    setGeoJsonData(simplifiedData);
  }, []);
  
  // Initialize and update map when data changes
  useEffect(() => {
    if (isLoading || !mapRef.current || !geoJsonData) return;
    
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
    }
    
    // Create the map centered on Maharashtra
    const map = L.map(mapRef.current, {
      center: [19.0, 76.5], // Maharashtra's center
      zoom: 7,
      minZoom: 6.5,
      maxZoom: 9,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: true,
      wheelDebounceTime: 40,
      wheelPxPerZoomLevel: 40, 
      maxBounds: L.latLngBounds(
        L.latLng(15.5, 72.5),  // Southwest coordinates
        L.latLng(22.5, 81.5)   // Northeast coordinates
      ),
    });
    
    // Add a light basemap
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    
    // Add GeoJSON data with detailed boundary lines
    const geoJsonLayer = L.geoJSON(geoJsonData, {
      style: (feature) => {
        if (!feature || !feature.properties) return {};
        
        const regionName = feature.properties.region;
        const isSelected = regionName === selectedRegion;
        const percentage = getPercentage(regionName);
        
        return {
          fillColor: getColor(regionName),
          weight: isSelected ? 2 : 1,
          opacity: 1,
          color: isSelected ? '#0066cc' : '#666',
          dashArray: isSelected ? '' : '3',
          fillOpacity: 0.5,
          className: 'region-polygon' + (isSelected ? ' region-selected' : '')
        };
      },
      onEachFeature: (feature, layer) => {
        if (!feature.properties) return;
        
        const regionName = feature.properties.region;
        const districtName = feature.properties.name;
        
        // Add tooltip
        layer.bindTooltip(`
          <div style="text-align: center;">
            <strong>${districtName}</strong><br>
            Region: ${regionName}<br>
            ${metric === 'esr' ? 'ESR Integration' : 
              metric === 'villages' ? 'Village Completion' : 
              metric === 'flow_meter' ? 'Flow Meter Installation' :
              'Scheme Completion'}: ${getMetricValue(regionName)}
          </div>
        `, {
          permanent: false,
          direction: 'top',
          className: 'custom-tooltip'
        });
        
        // Add click event
        layer.on({
          click: () => {
            onRegionClick(regionName);
          },
          mouseover: () => {
            // Cast to Polygon to access setStyle
            const polygonLayer = layer as L.Polygon;
            polygonLayer.setStyle({
              weight: 3,
              color: '#0066cc',
              dashArray: '',
              fillOpacity: 0.7
            });
          },
          mouseout: () => {
            if (regionName !== selectedRegion) {
              geoJsonLayer.resetStyle(layer);
            }
          }
        });
      }
    }).addTo(map);
    
    geojsonLayerRef.current = geoJsonLayer;
    
    // Add region labels for better readability
    regionNames.forEach(regionName => {
      // Find center points for each region
      const regionFeatures = geoJsonData.features.filter(f => f.properties.region === regionName);
      
      if (regionFeatures.length > 0) {
        // Calculate the centroid of all polygons in a region
        let sumLat = 0;
        let sumLng = 0;
        let count = 0;
        
        regionFeatures.forEach(feature => {
          const coords = feature.geometry.coordinates[0];
          coords.forEach((coord: number[]) => {
            sumLng += coord[0];
            sumLat += coord[1];
            count++;
          });
        });
        
        const centerLat = sumLat / count;
        const centerLng = sumLng / count;
        
        // Create a label for the region
        const labelIcon = L.divIcon({
          className: 'region-label',
          html: `<div style="color: #333; font-weight: bold; text-shadow: 0 1px 1px rgba(255,255,255,0.8), 0 -1px 1px rgba(255,255,255,0.8), 1px 0 1px rgba(255,255,255,0.8), -1px 0 1px rgba(255,255,255,0.8); font-size: 16px; white-space: nowrap;">${regionName}</div>`,
          iconSize: [140, 20],
          iconAnchor: [70, 10]
        });
        
        L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(map);
      }
    });
    
    // Add scale bar
    new L.Control.Scale({
      position: 'bottomleft',
      imperial: false,
      maxWidth: 200
    }).addTo(map);
    
    // Add custom zoom controls
    const zoomControl = new L.Control({ position: 'topright' });
    zoomControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'custom-zoom-control');
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      div.style.padding = '6px';
      div.style.borderRadius = '4px';
      div.style.boxShadow = '0 1px 5px rgba(0,0,0,0.2)';
      div.style.margin = '10px';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.gap = '6px';
      
      const zoomInButton = document.createElement('button');
      zoomInButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">+</div>
      `;
      zoomInButton.style.backgroundColor = 'white';
      zoomInButton.style.border = '1px solid rgba(0,0,0,0.2)';
      zoomInButton.style.borderRadius = '4px';
      zoomInButton.style.cursor = 'pointer';
      zoomInButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      zoomInButton.title = 'Zoom in';
      
      const zoomOutButton = document.createElement('button');
      zoomOutButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">−</div>
      `;
      zoomOutButton.style.backgroundColor = 'white';
      zoomOutButton.style.border = '1px solid rgba(0,0,0,0.2)';
      zoomOutButton.style.borderRadius = '4px';
      zoomOutButton.style.cursor = 'pointer';
      zoomOutButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      zoomOutButton.title = 'Zoom out';
      
      const resetButton = document.createElement('button');
      resetButton.innerHTML = `
        <div style="width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 14px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
        </div>
      `;
      resetButton.style.backgroundColor = 'white';
      resetButton.style.border = '1px solid rgba(0,0,0,0.2)';
      resetButton.style.borderRadius = '4px';
      resetButton.style.cursor = 'pointer';
      resetButton.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
      resetButton.title = 'Reset view';
      
      div.appendChild(zoomInButton);
      div.appendChild(zoomOutButton);
      div.appendChild(resetButton);
      
      // Add event listeners
      L.DomEvent.on(zoomInButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.zoomIn();
      });
      
      L.DomEvent.on(zoomOutButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.zoomOut();
      });
      
      L.DomEvent.on(resetButton, 'click', (e) => {
        L.DomEvent.stopPropagation(e);
        map.setView([19.0, 76.5], 7); // Reset to initial view
      });
      
      // Prevent clicks from propagating to the map
      L.DomEvent.disableClickPropagation(div);
      
      return div;
    };
    zoomControl.addTo(map);
    
    // Add legend
    const legendControl = new L.Control({ position: 'bottomright' });
    legendControl.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
      div.style.padding = '10px';
      div.style.borderRadius = '6px';
      div.style.color = '#333333';
      div.style.minWidth = '180px';
      div.style.boxShadow = '0 1px 4px rgba(0,0,0,0.2)';
      
      // Legend title
      div.innerHTML = '<h4 style="margin: 0 0 10px 0; font-size: 14px;">Maharashtra Regions</h4>';
      
      // Metric type
      const metricTitle = metric === 'esr' ? 'ESR Integration' : 
                        metric === 'villages' ? 'Village Completion' : 
                        metric === 'flow_meter' ? 'Flow Meter Installation' : 
                        'Scheme Completion';
      
      div.innerHTML += `<div style="font-size: 10px; margin-bottom: 15px; color: rgba(0,0,0,0.6);">Showing: ${metricTitle}</div>`;
      
      // Region items
      const regionItems = [
        { name: 'Amravati', color: getColor('Amravati') },
        { name: 'Nagpur', color: getColor('Nagpur') },
        { name: 'C.S. Nagar', color: getColor('Chhatrapati Sambhajinagar') },
        { name: 'Nashik', color: getColor('Nashik') },
        { name: 'Pune', color: getColor('Pune') },
        { name: 'Konkan', color: getColor('Konkan') }
      ];
      
      regionItems.forEach(item => {
        const isSelected = item.name === selectedRegion || 
          (item.name === 'C.S. Nagar' && selectedRegion === 'Chhatrapati Sambhajinagar');
        const displayName = item.name === 'C.S. Nagar' ? 'Chhatrapati Sambhajinagar' : item.name;
        
        div.innerHTML += `
          <div class="legend-item" style="display: flex; align-items: center; margin-bottom: 5px; cursor: pointer;"
            onclick="document.dispatchEvent(new CustomEvent('region-legend-click', {detail: '${displayName}'}))">
            <div style="width: 15px; height: 15px; background-color: ${item.color}; border-radius: 2px; 
              margin-right: 8px; border: ${isSelected ? '1.5px' : '0.5px'} solid ${isSelected ? '#2563eb' : 'rgba(0,0,0,0.2)'};">
            </div>
            <span style="font-size: 11px; ${isSelected ? 'font-weight: bold;' : ''}">${item.name}</span>
            <span style="font-size: 10px; margin-left: auto; font-family: monospace;">${getMetricValue(displayName)}</span>
          </div>
        `;
      });
      
      div.innerHTML += `<div style="font-size: 8px; margin-top: 10px; color: rgba(0,0,0,0.5);">Click on a region to filter data</div>`;
      
      return div;
    };
    legendControl.addTo(map);
    
    // Custom event handler for legend clicks
    document.addEventListener('region-legend-click', ((e: CustomEvent) => {
      onRegionClick(e.detail);
    }) as EventListener);
    
    leafletMapRef.current = map;
    
    return () => {
      document.removeEventListener('region-legend-click', (() => {}) as EventListener);
      
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [isLoading, regions, selectedRegion, metric, onRegionClick, geoJsonData]);

  return (
    <div className={`h-full ${isLoading ? "opacity-50" : ""}`}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm sm:text-base font-medium text-neutral-700">
          Maharashtra Administrative Boundaries
        </h3>
        {selectedRegion !== "all" && (
          <div className="text-xs sm:text-sm text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded-md">
            Region: {selectedRegion}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 flex-1">
          <Skeleton className="h-full w-full rounded-md" style={{ minHeight: '450px' }} />
        </div>
      ) : (
        <div className="relative w-full h-full flex-1" style={{ overflow: 'hidden', height: '450px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <div 
            ref={mapRef}
            id="detailed-maharashtra-map" 
            className="h-full w-full bg-[#f8f9fa]"
          ></div>
        </div>
      )}
    </div>
  );
}