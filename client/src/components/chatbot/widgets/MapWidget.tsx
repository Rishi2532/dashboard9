import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface MapWidgetProps {
  regions: any[];
  selectedRegion: string;
}

const MapWidget: React.FC<MapWidgetProps> = ({ regions, selectedRegion }) => {
  if (!regions || regions.length === 0) {
    return (
      <div className="map-widget p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
        <p className="text-sm text-gray-500">No map data available.</p>
      </div>
    );
  }

  // For now, we'll just display a simplified version of the map
  // In a full implementation, this could include a small embedded Leaflet map
  return (
    <div className="map-widget mt-2 mb-2">
      <Card className="bg-gray-50 border border-gray-200">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Maharashtra Map</h4>
          <div className="text-center py-3">
            <div className="bg-blue-50 p-3 rounded-md inline-block">
              <svg width="200" height="150" viewBox="0 0 400 300">
                {/* Simplified outline of Maharashtra */}
                <path 
                  d="M120,50 L280,70 L350,150 L300,250 L150,220 L50,180 Z" 
                  fill="#f0f9ff" 
                  stroke="#2563eb" 
                  strokeWidth="2"
                />

                {/* Simplified region locations */}
                <g>
                  {/* Nagpur */}
                  <rect 
                    x="250" 
                    y="100" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Nagpur" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="260" y="135" textAnchor="middle" fontSize="10" fontWeight="bold">Nagpur</text>

                  {/* Amravati */}
                  <rect 
                    x="200" 
                    y="110" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Amravati" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="210" y="145" textAnchor="middle" fontSize="10" fontWeight="bold">Amravati</text>

                  {/* Chhatrapati Sambhajinagar */}
                  <rect 
                    x="180" 
                    y="160" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Chhatrapati Sambhajinagar" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="190" y="195" textAnchor="middle" fontSize="10" fontWeight="bold">C.S. Nagar</text>

                  {/* Nashik */}
                  <rect 
                    x="130" 
                    y="130" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Nashik" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="140" y="165" textAnchor="middle" fontSize="10" fontWeight="bold">Nashik</text>

                  {/* Pune */}
                  <rect 
                    x="140" 
                    y="190" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Pune" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="150" y="225" textAnchor="middle" fontSize="10" fontWeight="bold">Pune</text>

                  {/* Konkan */}
                  <rect 
                    x="80" 
                    y="170" 
                    width="15" 
                    height="15" 
                    fill={selectedRegion === "Konkan" ? "#4f83cc" : "#8bb3e3"} 
                  />
                  <text x="90" y="205" textAnchor="middle" fontSize="10" fontWeight="bold">Konkan</text>
                </g>
              </svg>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            {selectedRegion !== "all" 
              ? `Region ${selectedRegion} is currently selected` 
              : "Click on a region in the dashboard for detailed information"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MapWidget;