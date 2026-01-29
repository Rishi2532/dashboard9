/**
 * Maharashtra GeoJSON Data
 * This file contains utility data for Maharashtra regions used by the map components
 */

// Simplified GeoJSON data for Maharashtra (minimal version for performant rendering)
export const simplifiedMaharashtraGeoJson = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur",
        "region": "Nagpur",
        "code": "MH09"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[79.10, 21.05], [79.40, 21.10], [79.70, 21.15], [79.90, 21.05], [79.95, 20.85], [79.80, 20.65], [79.60, 20.55], [79.30, 20.55], [79.05, 20.65], [78.95, 20.80], [79.10, 21.05]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Amravati",
        "region": "Amravati",
        "code": "MH04"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[77.75, 21.25], [78.05, 21.30], [78.35, 21.25], [78.55, 21.15], [78.65, 20.90], [78.55, 20.70], [78.35, 20.55], [78.05, 20.50], [77.75, 20.60], [77.60, 20.80], [77.65, 21.05], [77.75, 21.25]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Chhatrapati Sambhajinagar",
        "region": "Chhatrapati Sambhajinagar",
        "code": "MH20"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.10, 20.00], [75.40, 20.05], [75.70, 20.00], [75.90, 19.85], [75.95, 19.65], [75.85, 19.45], [75.65, 19.35], [75.35, 19.30], [75.10, 19.40], [74.95, 19.60], [75.00, 19.80], [75.10, 20.00]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nashik",
        "region": "Nashik",
        "code": "MH15"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.65, 20.15], [74.00, 20.20], [74.35, 20.15], [74.55, 20.00], [74.60, 19.80], [74.50, 19.60], [74.25, 19.45], [73.95, 19.45], [73.65, 19.55], [73.50, 19.75], [73.55, 19.95], [73.65, 20.15]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Pune",
        "region": "Pune",
        "code": "MH12"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.65, 18.65], [74.00, 18.70], [74.35, 18.65], [74.65, 18.50], [74.70, 18.30], [74.60, 18.10], [74.35, 17.95], [74.00, 17.90], [73.65, 18.00], [73.45, 18.20], [73.50, 18.45], [73.65, 18.65]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Konkan",
        "region": "Konkan",
        "code": "MH13"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.75, 19.15], [73.10, 19.15], [73.30, 19.05], [73.35, 18.85], [73.25, 18.65], [73.05, 18.55], [72.80, 18.55], [72.55, 18.65], [72.45, 18.85], [72.55, 19.05], [72.75, 19.15]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Mumbai",
        "region": "Konkan",
        "code": "MH01"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.75, 19.05], [72.95, 19.10], [73.10, 19.05], [73.15, 18.95], [73.10, 18.85], [72.95, 18.80], [72.80, 18.85], [72.70, 18.95], [72.75, 19.05]]]
      }
    }
  ]
};

// Load GeoJSON data from file (async)
export async function loadMaharashtraGeoJson(): Promise<any> {
  try {
    const response = await fetch('/maharashtra_districts.geojson');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error loading Maharashtra GeoJSON:', error);
    return simplifiedMaharashtraGeoJson;
  }
}

// Get features for a specific region
export function getFeaturesByRegion(geoJsonData: any, regionName: string): any[] {
  if (!geoJsonData || !geoJsonData.features) return [];
  
  return geoJsonData.features.filter((feature: any) => 
    feature.properties && feature.properties.region === regionName);
}

// Create a map of region names to their features
export function getRegionToFeatureMap(geoJsonData: any): Record<string, any[]> {
  const map: Record<string, any[]> = {};
  
  regionNames.forEach(region => {
    map[region] = getFeaturesByRegion(geoJsonData, region);
  });
  
  return map;
}

export interface MaharashtraFeatureProperties {
  name: string;
  region: string;
  code: string;
}

// List of region names in Maharashtra
export const regionNames = [
  'Amravati',
  'Nagpur',
  'Chhatrapati Sambhajinagar',
  'Nashik',
  'Pune',
  'Konkan'
];

// Color mapping for Maharashtra regions on the map
export const regionColors: Record<string, string> = {
  'Nashik': '#8CB3E2',         // Light blue
  'Amravati': '#ff7300',       // Orange 
  'Nagpur': '#E2B8B8',         // Light red/pink
  'Chhatrapati Sambhajinagar': '#68A9A9', // Teal green
  'Pune': '#FFC408',           // Yellow
  'Konkan': '#4A77BB'          // Blue
};

// Mapping from district codes to their parent regions
export const districtToRegion: Record<string, string> = {
  // Amravati Region
  'MH04': 'Amravati',
  'MH05': 'Amravati',
  'MH07': 'Amravati',
  'MH19': 'Amravati',
  'MH38': 'Amravati',
  
  // Nagpur Region
  'MH09': 'Nagpur',
  'MH10': 'Nagpur',
  'MH33': 'Nagpur',
  'MH35': 'Nagpur',
  'MH36': 'Nagpur',
  'MH37': 'Nagpur',
  
  // Chhatrapati Sambhajinagar Region
  'MH20': 'Chhatrapati Sambhajinagar',
  'MH21': 'Chhatrapati Sambhajinagar',
  'MH22': 'Chhatrapati Sambhajinagar',
  'MH23': 'Chhatrapati Sambhajinagar',
  'MH24': 'Chhatrapati Sambhajinagar',
  
  // Nashik Region
  'MH15': 'Nashik',
  'MH16': 'Nashik',
  'MH17': 'Nashik',
  'MH18': 'Nashik',
  'MH39': 'Nashik',
  
  // Pune Region
  'MH11': 'Pune',
  'MH12': 'Pune',
  'MH13': 'Pune',
  'MH14': 'Pune',
  'MH42': 'Pune',
  'MH43': 'Pune',
  
  // Konkan Region
  'MH01': 'Konkan',
  'MH02': 'Konkan',
  'MH03': 'Konkan',
  'MH06': 'Konkan',
  'MH08': 'Konkan'
};

// Function to get region color by name
export function getRegionColor(regionName: string): string {
  return regionColors[regionName] || '#cccccc';
}

// Function to get region name from district code
export function getRegionFromDistrict(districtCode: string): string {
  return districtToRegion[districtCode] || 'Unknown';
}

// Calculate the center point of a GeoJSON feature with polygon geometry
export function getFeatureCenter(coordinates: number[][][]): [number, number] {
  if (!coordinates || coordinates.length === 0 || !coordinates[0] || coordinates[0].length === 0) {
    return [76.5, 19.0]; // Default center of Maharashtra
  }
  
  // Get the first polygon (in case of multipolygon)
  const polygon = coordinates[0];
  
  // Calculate centroid
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  
  polygon.forEach((coord: number[]) => {
    sumLng += coord[0];
    sumLat += coord[1];
    count++;
  });
  
  return [sumLng / count, sumLat / count];
}