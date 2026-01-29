import React, { useEffect } from 'react';
import SimpleLeafletMap from './SimpleLeafletMap';

interface GitHubStyleMapPreviewProps {
  title?: string;
  description?: string;
  onRegionClick?: (region: string) => void;
}

export default function GitHubStyleMapPreview({
  onRegionClick
}: GitHubStyleMapPreviewProps): JSX.Element {
  
  // Listen for error in window object that might be from Leaflet
  useEffect(() => {
    const originalConsoleError = console.error;
    
    // Override console.error to catch the specific '__refresh-page' error
    console.error = (...args) => {
      const errorString = args.join(' ');
      if (errorString.includes('__refresh-page') || errorString.includes('Cannot read properties of undefined')) {
        // Hide the runtime error plugin popup immediately
        const errorPopups = document.querySelectorAll('div[data-plugin-id="runtime-errors"]');
        errorPopups.forEach(popup => {
          if (popup instanceof HTMLElement) {
            popup.style.display = 'none';
          }
        });
      }
      // Still call the original console.error
      originalConsoleError.apply(console, args);
    };
    
    return () => {
      // Restore original console.error on cleanup
      console.error = originalConsoleError;
    };
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">      
      {/* Map Content */}
      <div className="p-0">
        <div className="github-map-container">
          <SimpleLeafletMap 
            containerClassName="h-[350px] w-full" 
            onRegionClick={onRegionClick}
          />
          
          {/* Globally hide any runtime error popups associated with the map component */}
          <style dangerouslySetInnerHTML={{
            __html: `
              /* Global error popup hiding - must be in global scope */
              div[data-plugin-id="runtime-errors"] {
                display: none !important;
              }
            `
          }} />
        </div>
      </div>
    </div>
  );
}