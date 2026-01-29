import { useQuery } from '@tanstack/react-query';
import { useGeoFilter } from '@/contexts/GeoFilterContext';
import { SchemeStatus } from '@/types';

/**
 * Hook to fetch scheme data filtered by geographic area
 * This uses our GeoFilterContext to determine which geographic filters to apply
 */
export const useGeographicFilteredSchemes = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery<SchemeStatus[]>({
    queryKey: ['/api/schemes/geographic', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/schemes/geographic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered schemes');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};

/**
 * Hook to fetch village data filtered by geographic area
 */
export const useGeographicFilteredVillages = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['/api/villages/geographic', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/villages/geographic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered villages');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};

/**
 * Hook to fetch LPCD (Liters Per Capita per Day) data filtered by geographic area
 */
export const useGeographicFilteredLpcdData = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['/api/lpcd/geographic', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/lpcd/geographic?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered LPCD data');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};

/**
 * Hook to fetch chlorine data filtered by geographic area
 */
export const useGeographicFilteredChlorineData = () => {
  const { filter, isFiltering } = useGeoFilter();
  
  return useQuery({
    queryKey: ['/api/chlorine/geographic', filter],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filter.region) params.append('region', filter.region);
      if (filter.division) params.append('division', filter.division);
      if (filter.subdivision) params.append('subdivision', filter.subdivision);
      if (filter.circle) params.append('circle', filter.circle);
      if (filter.block) params.append('block', filter.block);
      if (filter.village) params.append('village', filter.village);
      
      params.append('level', filter.level);
      
      const response = await fetch(`/api/chlorine?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch filtered chlorine data');
      }
      
      return response.json();
    },
    enabled: isFiltering,
  });
};