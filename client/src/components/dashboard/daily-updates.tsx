import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { AlertCircle, Calendar, Check, DropletIcon, Gauge, Activity, Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface DailyUpdateItem {
  type: 'village' | 'esr' | 'scheme' | 'flow_meter' | 'rca' | 'pressure_transmitter';
  count: number;
  name?: string; // Only for completed items that have a name
  status: 'new' | 'completed';
  region?: string; // Region name for the update
  scheme?: string; // Scheme name for component updates (flow meters, RCA, etc.)
}

interface DailyUpdatesProps {
  isLoading: boolean;
}

export default function DailyUpdates({ isLoading }: DailyUpdatesProps) {
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const tickerRef = useRef<HTMLDivElement>(null);

  // Fetch today's updates using TanStack Query
  const { 
    data: todayUpdates = [],
    isLoading: isLoadingUpdates,
    error: queryError
  } = useQuery<DailyUpdateItem[]>({
    queryKey: ['/api/updates/today'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/updates/today');
        if (!response.ok) {
          throw new Error('Failed to fetch today\'s updates');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching today\'s updates:', error);
        setError('Failed to load today\'s updates. Please try again later.');
        return [];
      }
    },
    // Stale time set to 5 minutes since daily updates don't change often
    staleTime: 5 * 60 * 1000,
  });

  // Helper function to get the icon for the update type
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'village':
        return <div className="w-4 h-4 text-amber-500">🏘️</div>;
      case 'esr':
        return <div className="w-4 h-4 text-purple-500">🏗️</div>;
      case 'scheme':
        return <div className="w-4 h-4 text-blue-500">🌊</div>;
      case 'flow_meter':
        return <Gauge className="w-4 h-4 text-emerald-500" />;
      case 'rca':
        return <DropletIcon className="w-4 h-4 text-cyan-500" />;
      case 'pressure_transmitter':
        return <Activity className="w-4 h-4 text-pink-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  // Helper function to format the update text
  const formatUpdateText = (item: DailyUpdateItem) => {
    const countText = formatNumber(item.count);
    const regionInfo = item.region ? ` in ${item.region}` : '';
    const schemeInfo = item.scheme ? ` for ${item.scheme}` : '';
    
    if (item.status === 'new') {
      switch (item.type) {
        case 'village':
          return `${countText} new ${item.count === 1 ? 'village' : 'villages'} added${regionInfo}`;
        case 'esr':
          return `${countText} new ${item.count === 1 ? 'ESR' : 'ESRs'} added${regionInfo}`;
        case 'scheme':
          return `${countText} new ${item.count === 1 ? 'scheme' : 'schemes'} added${regionInfo}`;
        case 'flow_meter':
          return `${countText} new flow ${item.count === 1 ? 'meter' : 'meters'} added${schemeInfo}${regionInfo}`;
        case 'rca':
          return `${countText} new chlorine ${item.count === 1 ? 'analyzer' : 'analyzers'} added${schemeInfo}${regionInfo}`;
        case 'pressure_transmitter':
          return `${countText} new pressure ${item.count === 1 ? 'transmitter' : 'transmitters'} added${schemeInfo}${regionInfo}`;
        default:
          return `${countText} new ${item.type} added${regionInfo}`;
      }
    } else {
      // For completed items
      switch (item.type) {
        case 'village':
          return item.name 
            ? `Village "${item.name}" fully completed${regionInfo}` 
            : `${countText} ${item.count === 1 ? 'village' : 'villages'} fully completed${regionInfo}`;
        case 'esr':
          return item.name 
            ? `ESR "${item.name}" fully completed${regionInfo}` 
            : `${countText} ${item.count === 1 ? 'ESR' : 'ESRs'} fully completed${regionInfo}`;
        case 'scheme':
          return item.name 
            ? `Scheme "${item.name}" fully completed${regionInfo}` 
            : `${countText} ${item.count === 1 ? 'scheme' : 'schemes'} fully completed${regionInfo}`;
        default:
          return `${countText} ${item.type} ${item.count === 1 ? 'is' : 'are'} now operational${schemeInfo}${regionInfo}`;
      }
    }
  };

  // Set up automatic rotation between updates
  useEffect(() => {
    if (!todayUpdates || todayUpdates.length === 0) return;
    
    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % todayUpdates.length);
    }, 5000); // Change every 5 seconds
    
    return () => clearInterval(interval);
  }, [todayUpdates]);

  // Format date for display
  const today = new Date();
  const formattedDate = format(today, 'MMMM d, yyyy');

  if (isLoading) {
    return (
      <div className="bg-white border shadow-sm mb-4 sm:mb-6 h-16 rounded-md overflow-hidden flex items-center">
        <div className="bg-blue-50 border-r border-blue-100 h-full flex items-center justify-center px-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full mx-3" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-red-200 shadow-sm mb-4 sm:mb-6 h-16 rounded-md overflow-hidden flex items-center">
        <div className="bg-red-50 border-r border-red-100 h-full flex items-center justify-center px-3">
          <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
          <span className="text-sm font-medium text-red-700">Error</span>
        </div>
        <div className="text-red-600 text-sm mx-3">
          Failed to load today's updates
        </div>
      </div>
    );
  }

  // If no updates, show a simple message
  if (!isLoadingUpdates && (!todayUpdates || todayUpdates.length === 0)) {
    return (
      <div className="bg-white border shadow-sm mb-4 sm:mb-6 h-16 rounded-md overflow-hidden flex items-center">
        <div className="bg-blue-50 border-r border-blue-100 h-full flex items-center justify-center px-3">
          <Bell className="w-5 h-5 text-blue-500 mr-2" />
          <span className="text-base font-medium text-blue-800">Updates</span>
        </div>
        <div className="text-neutral-500 text-base mx-3">
          No new updates for today
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 shadow-sm mb-4 sm:mb-6 h-16 rounded-md overflow-hidden">
      {isLoadingUpdates ? (
        <div className="flex items-center h-full">
          <div className="bg-blue-100 border-r border-blue-200 h-full flex items-center justify-center px-3">
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full mx-3" />
        </div>
      ) : (
        <div className="flex items-center h-full">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 border-r border-blue-300 h-full flex items-center justify-center px-3">
            <Badge className="bg-white/20 backdrop-blur-sm px-2.5 py-1" variant="default">
              <Calendar className="h-4 w-4 mr-1 text-white" />
              <span className="text-sm font-medium text-white">TODAY</span>
            </Badge>
          </div>
          
          <div className="flex-grow relative overflow-hidden">
            <div 
              ref={tickerRef} 
              className="flex items-center h-full transition-transform duration-500 ease-in-out"
              style={{
                transform: `translateX(-${activeIndex * 100}%)`
              }}
            >
              {todayUpdates.map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center flex-shrink-0 w-full h-full px-3"
                >
                  <span className="flex-shrink-0 mr-2">
                    {getItemIcon(item.type)}
                  </span>
                  <span 
                    className={`text-base whitespace-nowrap font-medium ${
                      item.status === 'completed' 
                        ? 'text-green-600' 
                        : item.type === 'village' 
                          ? 'text-amber-600'
                          : item.type === 'esr'
                            ? 'text-purple-600'
                            : item.type === 'scheme'
                              ? 'text-blue-600'
                              : item.type === 'flow_meter'
                                ? 'text-emerald-600'
                                : item.type === 'rca'
                                  ? 'text-cyan-600'
                                  : 'text-indigo-600'
                    }`}
                  >
                    {formatUpdateText(item)}
                    {item.status === 'completed' && (
                      <Check className="inline-block ml-1 h-3.5 w-3.5 text-green-500" />
                    )}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Navigation dots */}
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {todayUpdates.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    activeIndex === idx ? 'bg-indigo-500' : 'bg-blue-200'
                  }`}
                  aria-label={`Show update ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}