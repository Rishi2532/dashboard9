import React, { useState } from 'react';
import MaharashtraMap from '@/components/dashboard/maharashtra';
import { useQuery } from '@tanstack/react-query';
import { Region } from '@/types';

export default function InteractiveMapDemo() {
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [metric, setMetric] = useState<'completion' | 'esr' | 'villages' | 'flow_meter'>('completion');

  // Fetch regions data
  const { data: regions = [], isLoading } = useQuery<Region[]>({
    queryKey: ['/api/regions'],
  });

  const handleRegionClick = (region: string) => {
    setSelectedRegion(region === selectedRegion ? 'all' : region);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">
          Interactive Maharashtra District Map
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Hover over any district to highlight all districts in the same region. 
          Click on districts to filter by region. The colors represent completion percentages based on the selected metric.
        </p>
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 mb-6">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Metric:</label>
          <select 
            value={metric} 
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="completion">Scheme Completion</option>
            <option value="esr">ESR Completion</option>
            <option value="villages">Village Completion</option>
            <option value="flow_meter">Flow Meter Integration</option>
          </select>
        </div>
        
        {selectedRegion !== 'all' && (
          <button
            onClick={() => setSelectedRegion('all')}
            className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Interactive Map */}
      <MaharashtraMap
        regions={regions}
        selectedRegion={selectedRegion}
        onRegionClick={handleRegionClick}
        metric={metric}
        isLoading={isLoading}
      />

      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-800 mb-2">How to use this map:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>Hover</strong> over any district to highlight all districts in the same region</li>
          <li>• <strong>Click</strong> on any district to filter the view to that region only</li>
          <li>• <strong>Change metrics</strong> using the dropdown to see different completion percentages</li>
          <li>• <strong>Colors indicate:</strong> Green (≥75%), Lime (50-74%), Yellow (25-49%), Red (&lt;25%)</li>
          <li>• <strong>Example:</strong> Hover on Kolhapur to highlight all Pune region districts in darker colors</li>
        </ul>
      </div>
    </div>
  );
}