import React from 'react';

interface SchemeStatusWidgetProps {
  schemes: any[];
  selectedRegion: string;
}

const SchemeStatusWidget: React.FC<SchemeStatusWidgetProps> = ({ schemes, selectedRegion }) => {
  if (!schemes || schemes.length === 0) {
    return (
      <div className="scheme-status-widget p-3 bg-gray-50 rounded-md border border-gray-200 mt-2">
        <p className="text-sm text-gray-500">No scheme data available.</p>
      </div>
    );
  }

  // Display a maximum of 5 schemes to avoid cluttering the chat
  const schemesToDisplay = schemes.slice(0, 5);
  const hasMoreSchemes = schemes.length > 5;

  return (
    <div className="scheme-status-widget mt-2 mb-2">
      <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-100 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700">
            {selectedRegion !== "all" ? `${selectedRegion} Region Schemes` : "Scheme Data"}
          </h3>
        </div>

        <div className="max-h-[300px] overflow-y-auto">
          {schemesToDisplay.map((scheme, index) => (
            <div 
              key={scheme.scheme_id} 
              className={`px-4 py-3 ${index !== schemesToDisplay.length - 1 ? 'border-b border-gray-200' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700">{scheme.scheme_name}</h4>
                  <p className="text-xs text-gray-500">ID: {scheme.scheme_id}</p>
                </div>
                <div className="flex items-center">
                  <span 
                    className={`
                      text-xs px-2 py-1 rounded-full font-medium 
                      ${scheme.fully_completion_scheme_status === 'Fully Completed' ? 'bg-green-100 text-green-800' : 
                      scheme.fully_completion_scheme_status === 'Not-Completed' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-blue-100 text-blue-800'}
                    `}
                  >
                    {scheme.fully_completion_scheme_status || scheme.scheme_functional_status || 'Not Specified'}
                  </span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="text-xs">
                  <span className="text-gray-500">Region:</span> {scheme.region}
                </div>
                <div className="text-xs">
                  <span className="text-gray-500">Agency:</span> {scheme.agency || 'Not Specified'}
                </div>
                <div className="text-xs">
                  <span className="text-gray-500">Villages:</span> {scheme.fully_completed_villages}/{scheme.total_villages_integrated}
                </div>
                <div className="text-xs">
                  <span className="text-gray-500">ESR:</span> {scheme.no_fully_completed_esr}/{scheme.total_esr_integrated}
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMoreSchemes && (
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {schemes.length - 5} more schemes not shown. Please use the dashboard for a complete view.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchemeStatusWidget;