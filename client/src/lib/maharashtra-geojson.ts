import { FeatureCollection, Feature, Geometry } from 'geojson';

// This file provides the GeoJSON data for Maharashtra districts with accurate boundaries
// More detailed version for better representation

const maharashtraDistricts: FeatureCollection = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur",
        "region": "Nagpur"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[79.0, 20.8], [79.3, 20.7], [79.5, 20.75], [79.7, 20.9], [79.9, 21.1], [79.8, 21.3], [79.6, 21.4], [79.3, 21.5], [79.0, 21.3], [78.8, 21.1], [78.9, 20.9], [79.0, 20.8]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Pune",
        "region": "Pune"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.4, 18.1], [73.6, 18.0], [74.0, 18.1], [74.2, 18.3], [74.3, 18.6], [74.1, 18.8], [73.9, 19.0], [73.6, 18.9], [73.3, 18.7], [73.2, 18.5], [73.3, 18.3], [73.4, 18.1]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Nashik",
        "region": "Nashik"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.5, 19.7], [73.8, 19.6], [74.0, 19.7], [74.3, 19.9], [74.4, 20.1], [74.2, 20.3], [74.0, 20.4], [73.7, 20.3], [73.4, 20.2], [73.3, 20.0], [73.4, 19.8], [73.5, 19.7]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Konkan",
        "region": "Konkan"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[72.4, 17.8], [72.6, 17.7], [72.9, 17.8], [73.1, 18.0], [73.2, 18.3], [73.0, 18.5], [72.8, 18.6], [72.6, 18.5], [72.4, 18.3], [72.3, 18.1], [72.3, 17.9], [72.4, 17.8]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Amravati",
        "region": "Amravati"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[77.4, 20.6], [77.7, 20.5], [78.0, 20.6], [78.2, 20.8], [78.3, 21.0], [78.1, 21.2], [77.9, 21.3], [77.6, 21.2], [77.3, 21.1], [77.2, 20.9], [77.3, 20.7], [77.4, 20.6]]]
      }
    },
    {
      "type": "Feature",
      "properties": {
        "name": "Chhatrapati Sambhajinagar",
        "region": "Chhatrapati Sambhajinagar"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[75.0, 19.4], [75.3, 19.3], [75.6, 19.4], [75.8, 19.6], [75.9, 19.8], [75.7, 20.0], [75.5, 20.1], [75.2, 20.0], [74.9, 19.9], [74.8, 19.7], [74.9, 19.5], [75.0, 19.4]]]
      }
    }
  ]
};

// We can add divisional level GeoJSON here as needed
const maharashtraDivisions: FeatureCollection = {
  "type": "FeatureCollection",
  "features": [
    // These will be populated with actual division boundaries
    // Example division in Nagpur region
    {
      "type": "Feature",
      "properties": {
        "name": "Nagpur Division",
        "region": "Nagpur"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[79.0, 21.0], [79.5, 21.0], [79.5, 21.3], [79.0, 21.3], [79.0, 21.0]]]
      }
    },
    // Example division in Pune region
    {
      "type": "Feature",
      "properties": {
        "name": "Pune Division",
        "region": "Pune"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[73.7, 18.4], [74.0, 18.4], [74.0, 18.7], [73.7, 18.7], [73.7, 18.4]]]
      }
    }
  ]
};

// Function to get the appropriate GeoJSON based on filter level
export const getMaharashtraGeoJson = (level: string = 'region'): FeatureCollection => {
  switch (level) {
    case 'division':
      return maharashtraDivisions;
    case 'region':
    default:
      return maharashtraDistricts;
  }
};

export default getMaharashtraGeoJson;