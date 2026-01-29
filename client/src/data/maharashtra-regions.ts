// Maharashtra regions GeoJSON data with simplified boundaries for key administrative regions
export const maharashtraRegions = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        name: "Nagpur",
        id: "nagpur"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[79.2, 21.4], [79.5, 21.5], [79.8, 21.3], [79.9, 20.9], [79.6, 20.6], [79.1, 20.7], [78.8, 20.9], [78.9, 21.2], [79.2, 21.4]]]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Amravati",
        id: "amravati"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[78.8, 21.2], [79.2, 21.4], [79.5, 21.5], [79.8, 21.3], [80.0, 21.0], [77.8, 20.6], [77.5, 20.9], [77.7, 21.1], [78.8, 21.2]]]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Nashik",
        id: "nashik"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.8, 20.0], [74.2, 20.2], [74.5, 20.0], [74.8, 19.6], [74.5, 19.2], [73.8, 19.4], [73.5, 19.7], [73.8, 20.0]]]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Pune",
        id: "pune"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[73.5, 18.8], [74.0, 19.0], [74.5, 18.7], [74.3, 18.2], [73.8, 18.0], [73.2, 18.3], [73.5, 18.8]]]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Konkan",
        id: "konkan"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[72.7, 19.3], [73.1, 19.5], [73.5, 19.2], [73.2, 18.5], [72.8, 18.8], [72.5, 19.0], [72.7, 19.3]]]
      }
    },
    {
      type: "Feature",
      properties: {
        name: "Chhatrapati Sambhajinagar",
        id: "chhatrapati-sambhajinagar"
      },
      geometry: {
        type: "Polygon",
        coordinates: [[[75.0, 19.7], [75.5, 19.9], [76.0, 19.7], [76.2, 19.2], [75.8, 18.9], [75.3, 19.1], [75.0, 19.7]]]
      }
    }
  ]
};

// State outline for reference
export const maharashtraOutline = {
  type: "Feature",
  properties: {
    name: "Maharashtra",
  },
  geometry: {
    type: "Polygon",
    coordinates: [[[72.5, 19.0], [72.8, 20.0], [73.5, 21.0], [74.5, 21.5], [76.0, 21.8], [77.5, 21.5], [79.5, 21.5], [80.5, 21.0], [81.0, 20.0], [80.0, 19.0], [79.0, 18.0], [78.0, 17.0], [77.0, 17.0], [76.0, 17.5], [74.5, 17.0], [73.5, 17.0], [72.5, 18.0], [72.5, 19.0]]]
  }
};

// Map region names to IDs
export const regionNameToId: Record<string, string> = {
  "Nagpur": "nagpur",
  "Amravati": "amravati",
  "Nashik": "nashik",
  "Pune": "pune",
  "Konkan": "konkan",
  "Chhatrapati Sambhajinagar": "chhatrapati-sambhajinagar"
};