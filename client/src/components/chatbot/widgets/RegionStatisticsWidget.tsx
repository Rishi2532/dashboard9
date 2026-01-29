import React from 'react';

interface RegionStatisticsWidgetProps {
  regions: any[];
  regionSummary: any;
}

const RegionStatisticsWidget: React.FC<RegionStatisticsWidgetProps> = ({ regions, regionSummary }) => {
  if (!regions || regions.length === 0) {
    return (
      <div className="region-statistics-widget p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
        <p className="text-sm text-gray-500">No region data available.</p>
      </div>
    );
  }

  // Calculate percentages and prepare data for display
  const regionsWithPercentages = regions.map(region => {
    const schemeCompletionPercentage = ((region.fully_completed_schemes / region.total_schemes_integrated) * 100) || 0;
    const esrCompletionPercentage = ((region.fully_completed_esr / region.total_esr_integrated) * 100) || 0;
    const villageCompletionPercentage = ((region.fully_completed_villages / region.total_villages_integrated) * 100) || 0;
    
    return {
      ...region,
      schemeCompletionPercentage: Math.round(schemeCompletionPercentage),
      esrCompletionPercentage: Math.round(esrCompletionPercentage),
      villageCompletionPercentage: Math.round(villageCompletionPercentage)
    };
  });

  return (
    <div className="region-statistics-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            Region Statistics
          </h3>
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {regionsWithPercentages.map((region, index) => (
            <div 
              key={region.region_id} 
              className={`px-4 py-3 ${index !== regionsWithPercentages.length - 1 ? 'border-b border-gray-200' : ''}`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-blue-700">{region.region_name}</h4>
              </div>
              
              <div className="mt-2 space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Scheme Completion:</span>
                    <span>{region.fully_completed_schemes}/{region.total_schemes_integrated} ({region.schemeCompletionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full" 
                      style={{ width: `${region.schemeCompletionPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">ESR Integration:</span>
                    <span>{region.fully_completed_esr}/{region.total_esr_integrated} ({region.esrCompletionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-green-600 h-1.5 rounded-full" 
                      style={{ width: `${region.esrCompletionPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Village Integration:</span>
                    <span>{region.fully_completed_villages}/{region.total_villages_integrated} ({region.villageCompletionPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-yellow-600 h-1.5 rounded-full" 
                      style={{ width: `${region.villageCompletionPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-xs">
                    <span className="text-gray-500">Flow Meters:</span> {region.flow_meter_integrated}
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500">Pressure Transmitters:</span> {region.pressure_transmitter_integrated}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {regionSummary && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
            <h4 className="text-xs font-medium text-blue-700 mb-2">Overall Progress</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div className="text-xs">
                <span className="text-gray-600">Total Schemes:</span> {regionSummary.total_schemes_integrated}
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Completed Schemes:</span> {regionSummary.fully_completed_schemes}
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Total Villages:</span> {regionSummary.total_villages_integrated}
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Completed Villages:</span> {regionSummary.fully_completed_villages}
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Total ESR:</span> {regionSummary.total_esr_integrated}
              </div>
              <div className="text-xs">
                <span className="text-gray-600">Completed ESR:</span> {regionSummary.fully_completed_esr}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegionStatisticsWidget;