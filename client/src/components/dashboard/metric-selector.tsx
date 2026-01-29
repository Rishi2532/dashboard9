import { Droplet, Home, BarChart3 } from "lucide-react";

interface MetricSelectorProps {
  value: 'completion' | 'esr' | 'villages' | 'flow_meter';
  onChange: (value: 'completion' | 'esr' | 'villages' | 'flow_meter') => void;
}

export default function MetricSelector({ value, onChange }: MetricSelectorProps) {
  const handleChange = (newValue: 'completion' | 'esr' | 'villages' | 'flow_meter') => {
    onChange(newValue);
  };

  return (
    <div className="pt-2 pb-4">
      <div className="text-sm text-neutral-500 mb-2">
        Select metric to display on map:
      </div>
      <div className="flex flex-wrap gap-2">
        {/* Button styled metric selectors to match the second image */}
        <button
          onClick={() => handleChange('completion')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
            value === 'completion' 
              ? 'bg-blue-100 border-blue-200 border text-blue-700' 
              : 'bg-gray-50 border-gray-200 border text-gray-700 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Scheme Completion</span>
        </button>
        
        <button
          onClick={() => handleChange('esr')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
            value === 'esr' 
              ? 'bg-blue-100 border-blue-200 border text-blue-700' 
              : 'bg-gray-50 border-gray-200 border text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Droplet className="h-4 w-4" />
          <span>ESR Integration</span>
        </button>
        
        <button
          onClick={() => handleChange('villages')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${
            value === 'villages' 
              ? 'bg-blue-100 border-blue-200 border text-blue-700' 
              : 'bg-gray-50 border-gray-200 border text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Village Integration</span>
        </button>
      </div>
    </div>
  );
}