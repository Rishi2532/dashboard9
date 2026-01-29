import React, { useEffect, useState } from "react";

/**
 * This component listens for custom component type filter events
 * and highlights relevant elements on the dashboard
 */
interface ComponentTypeFilterProps {
  onFilterChange?: (componentType: string | null) => void;
}

const ComponentTypeFilter: React.FC<ComponentTypeFilterProps> = ({ onFilterChange }) => {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Listen for custom component type filter events
  useEffect(() => {
    const handleComponentTypeFilter = (event: Event) => {
      const customEvent = event as CustomEvent;
      const componentType = customEvent.detail?.componentType || null;
      console.log(`ComponentTypeFilter received event with type: ${componentType}`);
      
      setActiveFilter(componentType);
      
      // Call callback if provided
      if (onFilterChange) {
        onFilterChange(componentType);
      }
      
      // Apply visual highlighting to relevant dashboard elements
      if (componentType) {
        // Find all elements related to this component type
        const elements = document.querySelectorAll(`[data-component-type="${componentType}"]`);
        
        // First reset all highlights
        document.querySelectorAll('[data-component-type]').forEach(el => {
          el.classList.remove('filter-highlight');
          el.classList.add('filter-dimmed');
        });
        
        // Then highlight the selected component type
        elements.forEach(el => {
          el.classList.add('filter-highlight');
          el.classList.remove('filter-dimmed');
        });
        
        console.log(`Applied highlighting to ${elements.length} ${componentType} elements`);
      } else {
        // Reset all highlighting if no filter
        document.querySelectorAll('[data-component-type]').forEach(el => {
          el.classList.remove('filter-highlight');
          el.classList.remove('filter-dimmed');
        });
        console.log('Reset all component highlighting');
      }
    };

    // Register event listener
    document.addEventListener('filter:componentType', handleComponentTypeFilter);
    
    // Cleanup
    return () => {
      document.removeEventListener('filter:componentType', handleComponentTypeFilter);
    };
  }, [onFilterChange]);

  // If an active filter is set, add a button to clear it
  if (activeFilter) {
    return (
      <div className="fixed top-20 right-4 p-2 bg-blue-100 rounded-md z-50 shadow-md">
        <div className="text-sm text-blue-800 font-medium mb-1">
          Filtering: {activeFilter === 'chlorine' ? 'Chlorine Analyzers' : activeFilter}
        </div>
        <button 
          onClick={() => {
            // Reset filter
            setActiveFilter(null);
            
            // Reset all highlighting
            document.querySelectorAll('[data-component-type]').forEach(el => {
              el.classList.remove('filter-highlight');
              el.classList.remove('filter-dimmed');
            });
            
            // Call callback if provided
            if (onFilterChange) {
              onFilterChange(null);
            }
          }}
          className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        >
          Clear Filter
        </button>
      </div>
    );
  }

  // Render nothing if no active filter
  return null;
};

export default ComponentTypeFilter;