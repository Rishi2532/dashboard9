import React, { useRef, useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

interface MaharashtraMapProps {
  containerClassName?: string;
  onRegionClick?: (region: string) => void;
}

export default function MaharashtraMap({
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden",
  onRegionClick = () => {}
}: MaharashtraMapProps): JSX.Element {
  const mapRef = useRef<HTMLDivElement>(null);

  // Initialize map only on client-side
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Import Leaflet dynamically to avoid SSR issues
    const initMap = async () => {
      if (!mapRef.current) return;
      
      try {
        // Dynamic import
        const L = (await import('leaflet')).default;
        
        // Fix Leaflet's default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
        
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

        // Create the map with Maharashtra bounds
        const map = L.map(mapRef.current).setView([19.0, 76.5], 7);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);
        
        // Set bounds to focus on Maharashtra
        const bounds = L.latLngBounds(
          L.latLng(14.5, 72.0), // Southwest
          L.latLng(23.0, 82.0)  // Northeast
        );
        map.fitBounds(bounds);
        
        // Add markers for each region
        Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
          const color = regionColors[regionName] || '#cccccc';
          
          // Create a square marker for each region
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          // Add marker with click handler
          const marker = L.marker(coordinates, { icon })
            .addTo(map)
            .on('click', () => {
              console.log(`Region clicked: ${regionName}`);
              if (onRegionClick) onRegionClick(regionName);
            });
          
          // Add tooltip
          marker.bindTooltip(regionName, {
            permanent: false,
            direction: 'top'
          });
        });
        
        // Handle window resize
        const handleResize = () => {
          map.invalidateSize();
        };
        
        window.addEventListener('resize', handleResize);
        
        // Force a map resize after render
        setTimeout(() => {
          map.invalidateSize();
        }, 200);
        
        // Cleanup function
        return () => {
          window.removeEventListener('resize', handleResize);
          map.remove();
        };
      } catch (err) {
        console.error('Error initializing map:', err);
      }
    };
    
    initMap();
  }, [onRegionClick]);

  return (
    <div className="relative">
      <div ref={mapRef} className={containerClassName}></div>
      <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-75 text-xs p-1 text-gray-700 border-t border-gray-300">
        <span>©2023 TomTom ©2023 OSM ©2023 GrabTaxi ©</span>
      </div>
    </div>
  );
}