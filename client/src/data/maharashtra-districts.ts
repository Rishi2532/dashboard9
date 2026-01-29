// Maharashtra districts mapping to administrative regions
// This maps individual districts to their administrative regions

export const districtToRegionMapping: Record<string, string> = {
  // Nagpur Region
  "Nagpur": "Nagpur",
  "Wardha": "Nagpur",
  "Gadchiroli": "Nagpur",
  "Chandrapur": "Nagpur",
  "Gondia": "Nagpur",
  "Yavatmal": "Nagpur",
  
  // Amravati Region
  "Amravati": "Amravati",
  "Akola": "Amravati",
  "Buldhana": "Amravati",
  "Washim": "Amravati",
  
  // Nashik Region
  "Nashik": "Nashik",
  "Dhule": "Nashik",
  "Nandurbar": "Nashik", 
  "Jalgaon": "Nashik",
  "Ahmadnagar": "Nashik",
  
  // Pune Region
  "Pune": "Pune",
  "Satara": "Pune",
  "Sangli": "Pune",
  "Solapur": "Pune",
  "Kolhapur": "Pune",
  
  // Konkan Region
  "Mumbai City": "Konkan",
  "Mumbai Suburban": "Konkan",
  "Thane": "Konkan",
  "Palghar": "Konkan",
  "Raigad": "Konkan",
  "Ratnagiri": "Konkan",
  "Sindhudurg": "Konkan",
  
  // Chhatrapati Sambhajinagar (Aurangabad) Region
  "Aurangabad": "Chhatrapati Sambhajinagar",
  "Jalna": "Chhatrapati Sambhajinagar",
  "Parbhani": "Chhatrapati Sambhajinagar",
  "Hingoli": "Chhatrapati Sambhajinagar",
  "Beed": "Chhatrapati Sambhajinagar",
  "Nanded": "Chhatrapati Sambhajinagar",
  "Osmanabad": "Chhatrapati Sambhajinagar",
  "Latur": "Chhatrapati Sambhajinagar",
};

// Color mapping for regions based on your image
export const regionColorMap: Record<string, string> = {
  "Nagpur": "#e8c19a",       // Light orange/tan color
  "Amravati": "#f8b4b4",     // Pink color
  "Chhatrapati Sambhajinagar": "#cbd5e8", // Light blue/purple
  "Nashik": "#f0e68c",       // Yellow color
  "Pune": "#a8e4a0",         // Green color
  "Konkan": "#c0c0c0"        // Grey color
};

// District color mapping based on the provided image
export const districtColorMap: Record<string, string> = {
  // Nagpur Region - Light orange/tan
  "Nagpur": "#e8c19a",
  "Wardha": "#e8c19a",
  "Gadchiroli": "#e8c19a",
  "Chandrapur": "#e8c19a",
  "Gondia": "#e8c19a",
  "Yavatmal": "#e8c19a",
  
  // Amravati Region - Pink
  "Amravati": "#f8b4b4",
  "Akola": "#f8b4b4",
  "Buldhana": "#f8b4b4",
  "Washim": "#f8b4b4",
  
  // Nashik Region - Yellow
  "Nashik": "#f0e68c",
  "Dhule": "#f0e68c",
  "Nandurbar": "#f0e68c", 
  "Jalgaon": "#f0e68c",
  "Ahmadnagar": "#f0e68c",
  
  // Pune Region - Green
  "Pune": "#a8e4a0",
  "Satara": "#a8e4a0",
  "Sangli": "#a8e4a0",
  "Solapur": "#a8e4a0",
  "Kolhapur": "#a8e4a0",
  
  // Konkan Region - Grey
  "Mumbai City": "#c0c0c0",
  "Mumbai Suburban": "#c0c0c0",
  "Thane": "#c0c0c0",
  "Palghar": "#c0c0c0",
  "Raigad": "#c0c0c0",
  "Ratnagiri": "#c0c0c0",
  "Sindhudurg": "#c0c0c0",
  
  // Chhatrapati Sambhajinagar (Aurangabad) Region - Light blue/purple
  "Aurangabad": "#cbd5e8",
  "Jalna": "#cbd5e8",
  "Parbhani": "#cbd5e8",
  "Hingoli": "#cbd5e8",
  "Beed": "#cbd5e8",
  "Nanded": "#cbd5e8",
  "Osmanabad": "#cbd5e8",
  "Latur": "#cbd5e8"
};