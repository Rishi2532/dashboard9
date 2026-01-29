import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Region, RegionSummary } from '@/types';

// Define the props for the OpenStreetMapView component
interface OpenStreetMapViewProps {
  regionSummary?: RegionSummary;
  regions?: Region[];
  selectedRegion: string;
  onRegionClick: (region: string) => void;
  metric?: 'completion' | 'esr' | 'villages' | 'flow_meter';
  isLoading?: boolean;
}

// Define Maharashtra regions and their approximate coordinates
const regionCoordinates: Record<string, [number, number]> = {
  'Nagpur': [21.1458, 79.0882],
  'Amravati': [20.9320, 77.7523],
  'Chhatrapati Sambhajinagar': [19.8762, 75.3433],
  'Nashik': [19.9975, 73.7898],
  'Pune': [18.5204, 73.8567],
  'Konkan': [19.0760, 72.8777],
};

// Export the OpenStreetMapView component
export default function OpenStreetMapView({
  regionSummary,
  regions = [],
  selectedRegion = 'all',
  onRegionClick,
  metric = 'completion',
  isLoading = false,
}: OpenStreetMapViewProps): JSX.Element {
  // Create refs for the map container and map instance
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  // Custom colors for each region to match the example image
  const regionColors: Record<string, string> = {
    'Nashik': '#8CB3E2',         // Light blue
    'Amravati': '#FF7300',       // Orange 
    'Nagpur': '#E2B8B8',         // Light red/pink
    'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
    'Pune': '#FFC408',           // Yellow
    'Konkan': '#4A77BB',         // Blue
  };

  // Get color for a region based on selection state
  const getRegionColor = (regionName: string): string => {
    if (selectedRegion === regionName || hoveredRegion === regionName) {
      // Use a slightly darker shade for selected/hovered regions
      const baseColor = regionColors[regionName] || '#CCCCCC';
      return baseColor;
    }
    return regionColors[regionName] || '#CCCCCC';
  };

  // Initialize the map when the component mounts
  useEffect(() => {
    if (!mapContainerRef.current || isLoading) return;

    // Clean up any existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Fix for Leaflet default icon in bundlers
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    });

    // Create a new map instance
    const map = L.map(mapContainerRef.current, {
      center: [19.7515, 75.7139], // Center of Maharashtra
      zoom: 7,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      dragging: true,
    });

    // Add OpenStreetMap tile layer to match the example image
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Create a layer group for markers
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;

    // Add square markers for each region
    Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
      const color = getRegionColor(regionName);
      
      // Create a square marker for each region
      const squareIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 15px; height: 15px; border: 1px solid #fff;"></div>`,
        iconSize: [15, 15],
        iconAnchor: [8, 8],
      });

      // Create marker with the square icon
      const marker = L.marker(coordinates, { icon: squareIcon })
        .addTo(markersLayer)
        .on('click', () => onRegionClick(regionName))
        .on('mouseover', () => setHoveredRegion(regionName))
        .on('mouseout', () => setHoveredRegion(null));

      // Add a tooltip to show region name
      marker.bindTooltip(regionName, {
        permanent: false,
        direction: 'top',
        className: 'region-tooltip',
      });
    });

    // Save the map instance for cleanup
    mapInstanceRef.current = map;

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isLoading, selectedRegion, hoveredRegion]);

  // Update markers when selected region changes
  useEffect(() => {
    if (!markersLayerRef.current || isLoading) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Re-add markers with updated styles
    Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
      const color = getRegionColor(regionName);
      
      // Create a square marker for each region
      const squareIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 15px; height: 15px; border: 1px solid #fff;"></div>`,
        iconSize: [15, 15],
        iconAnchor: [8, 8],
      });

      // Create marker with the square icon
      const marker = L.marker(coordinates, { icon: squareIcon })
        .addTo(markersLayerRef.current!)
        .on('click', () => onRegionClick(regionName))
        .on('mouseover', () => setHoveredRegion(regionName))
        .on('mouseout', () => setHoveredRegion(null));

      // Add a tooltip to show region name
      marker.bindTooltip(regionName, {
        permanent: false,
        direction: 'top',
        className: 'region-tooltip',
      });
    });
  }, [selectedRegion, hoveredRegion]);

  // Handle zoom in
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1);
    }
  };

  // Handle zoom out
  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-[400px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-4 relative">
        <div className="absolute top-6 right-6 z-10 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={handleZoomIn}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-white"
            onClick={handleZoomOut}
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Map container */}
        <div
          ref={mapContainerRef}
          className="h-[400px] w-full rounded-md"
          style={{ zIndex: 0 }}
        />
        
        {/* Add styling for tooltips */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .region-tooltip {
            background-color: rgba(255, 255, 255, 0.9);
            border: 1px solid #ccc;
            border-radius: 3px;
            padding: 2px 5px;
            font-size: 12px;
            font-weight: 500;
          }
          .leaflet-container {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          }
          `
        }} />
      </CardContent>
    </Card>
  );
}