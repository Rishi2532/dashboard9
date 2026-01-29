import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MaharashtraOpenStreetMapProps {
  containerClassName?: string;
  onRegionClick?: (region: string) => void;
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

// Custom colors for each region
const regionColors: Record<string, string> = {
  'Nashik': '#8CB3E2',         // Light blue
  'Amravati': '#FF7300',       // Orange 
  'Nagpur': '#E2B8B8',         // Light red/pink
  'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
  'Pune': '#FFC408',           // Yellow
  'Konkan': '#4A77BB',         // Blue
};

export default function MaharashtraOpenStreetMap({ 
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden",
  onRegionClick = () => {}
}: MaharashtraOpenStreetMapProps): JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Initialize the map
  useEffect(() => {
    // Exit early if container not available or not in browser environment
    if (!mapContainerRef.current || typeof window === 'undefined') {
      return;
    }

    // Fix for Leaflet marker icons in bundled environments
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      });
    } catch (e) {
      console.warn('Failed to set up Leaflet icon defaults:', e);
    }

    // Clean up any existing map instance to avoid duplicates
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Wrap map creation in try/catch for error handling
    try {
      // Create a new Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [19.0, 76.5], // Maharashtra's center
        zoom: 7,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false, // Disable scroll zoom to match reference image
        dragging: true,
      });

      // Set bounds to focus on Maharashtra exactly like the reference image
      const bounds = L.latLngBounds(
        L.latLng(14.5, 72.0), // Southwest - Adjusted to match reference image
        L.latLng(23.0, 82.0)  // Northeast - Adjusted to match reference image
      );
      map.fitBounds(bounds);

      // Add OpenStreetMap tile layer to match the example image exactly
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©',
        maxZoom: 19,
      }).addTo(map);

      // Add markers for each Maharashtra region
      Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
        const color = regionColors[regionName] || '#cccccc';
        
        // Create a square marker for each region
        const squareIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        // Create marker with the square icon
        const marker = L.marker(coordinates, { icon: squareIcon })
          .addTo(map)
          .on('click', () => {
            console.log(`Region clicked: ${regionName}`);
            onRegionClick(regionName);
          });

        // Add a tooltip to show region name
        marker.bindTooltip(regionName, {
          permanent: false,
          direction: 'top',
          className: 'region-tooltip',
        });
      });

      // Store the map instance for cleanup
      mapInstanceRef.current = map;

      // Force a map refresh after rendering
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing map:', error);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map:', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [containerClassName, onRegionClick]);

  return (
    <div className="relative">
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className={containerClassName}
      />
      
      {/* Optional: Add GitHub-like file info as in the reference image */}
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 text-xs p-1 text-gray-700 border-t border-gray-300">
        <span>©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©</span>
      </div>
    </div>
  );
}