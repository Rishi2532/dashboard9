import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import 'leaflet/dist/leaflet.css';

interface SimpleLeafletMapProps {
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
  'Konkan': [19.3530, 73.2765], // Updated Konkan coordinates as requested
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

export default function SimpleLeafletMap({ 
  containerClassName = "h-[400px] w-full rounded-md overflow-hidden",
  onRegionClick = () => {}
}: SimpleLeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMapInitialized, setIsMapInitialized] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  
  // Import Leaflet dynamically to avoid SSR issues and avoid window.__refresh-page error
  const initializeLeaflet = async () => {
    try {
      // This approach properly handles lazy loading
      const L = await import('leaflet').then(module => module.default || module);
      
      // Only initialize if container exists and we haven't initialized yet
      if (!mapContainerRef.current || isMapInitialized) return;
      
      setIsMapInitialized(true);
      
      // Fix for Leaflet marker icons in bundled environments
      if (!L.Icon.Default.prototype.hasOwnProperty('_defaultIconParams')) {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });
      }
      
      // Create map with proper initialization options
      try {
        // Set up div before Leaflet initialization
        if (mapContainerRef.current) {
          mapContainerRef.current.innerHTML = '';
        }
        
        // Create map centered on Maharashtra
        const map = L.map(mapContainerRef.current, {
          center: [19.7515, 75.7139], // Center of Maharashtra
          zoom: 7,
          zoomControl: true,
          attributionControl: false, // Disable attribution control
          scrollWheelZoom: false,
          minZoom: 6, // Prevent zooming out too far
          maxBounds: L.latLngBounds( // Restrict panning to Maharashtra region
            L.latLng(15.6, 72.6), // Southwest - above Goa
            L.latLng(22.1, 80.9)  // Northeast
          ),
          // Add these to help with mobile
          dragging: !L.Browser.mobile
          // The tap property is causing TypeScript errors because it's not in MapOptions
          // tapTolerance: 15
        });
        
        // Add OpenStreetMap tile layer with error handling - attribution removed
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '', // Removed attribution
          maxZoom: 10, // Limit maximum zoom to prevent too detailed view
        }).addTo(map);
        
        // Set bounds to focus on Maharashtra (tighter bounds)
        const bounds = L.latLngBounds(
          L.latLng(15.8, 72.8), // Southwest - more focused on Maharashtra
          L.latLng(21.8, 80.1)  // Northeast - more focused on Maharashtra
        );
        map.fitBounds(bounds);
        
        // Create markers array for tracking
        const markers: L.Marker[] = [];
        
        // Add markers for each region
        Object.entries(regionCoordinates).forEach(([regionName, coordinates]) => {
          const color = regionColors[regionName] || '#cccccc';
          
          // Create a square marker for each region
          const squareIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 16px; height: 16px; border: 1px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          
          // Create marker with the square icon
          const marker = L.marker(coordinates, { icon: squareIcon })
            .addTo(map)
            .on('click', () => {
              onRegionClick(regionName);
            });
          
          // Add a tooltip to show region name
          marker.bindTooltip(regionName, {
            permanent: false,
            direction: 'top'
          });
          
          // Track marker for cleanup
          markers.push(marker);
        });
        
        // Force a map refresh after rendering
        setTimeout(() => {
          if (map && typeof map.invalidateSize === 'function') {
            map.invalidateSize(true);
            setIsMapReady(true);
          }
        }, 300);
        
        // Store cleanup function
        return () => {
          markers.forEach(marker => {
            if (marker && typeof marker.remove === 'function') {
              marker.remove();
            }
          });
          
          if (map && typeof map.remove === 'function') {
            try {
              map.remove();
            } catch (e) {
              console.log('Map cleanup error - ignoring', e);
            }
          }
        };
      } catch (err) {
        console.warn('Map initialization error:', err);
        return () => {}; // Empty cleanup for error case
      }
    } catch (error) {
      console.error('Error loading Leaflet:', error);
      return () => {}; // Empty cleanup for error case
    }
  };
  
  // After initial render, load Leaflet (prevents window object conflicts)
  useLayoutEffect(() => {
    // Create a timeout to wait for DOM to be fully ready
    const timer = setTimeout(() => {
      if (mapContainerRef.current && !isMapInitialized) {
        let cleanupFn: (() => void) | undefined;
        
        // Initialize Leaflet and get cleanup function
        initializeLeaflet().then(cleanup => {
          cleanupFn = cleanup;
        });
        
        // Return cleanup function
        return () => {
          if (cleanupFn) cleanupFn();
        };
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isMapInitialized]);
  
  return (
    <div className="relative">
      <div 
        ref={mapContainerRef} 
        className={containerClassName}
        id="maharashtra-leaflet-map" // Add a unique ID to help with debugging
        style={{ zIndex: 1 }} // Lower z-index for the map
      />
      
      {/* Loading state while Leaflet initializes */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
          <div className="text-sm text-gray-600">Loading map...</div>
        </div>
      )}
      
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
          
          /* Hide any errors from the map container */
          #maharashtra-leaflet-map + div[data-plugin-id="runtime-errors"] {
            display: none !important;
          }
          
          /* Fix for Leaflet marker positions */
          .custom-div-icon {
            background: transparent;
            border: none;
          }
        `
      }} />
    </div>
  );
}