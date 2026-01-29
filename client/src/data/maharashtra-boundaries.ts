// Detailed paths for Maharashtra regions with more realistic boundaries
export const maharashtraRegions = {
  "Nagpur": {
    path: "M420,180 C430,175 438,173 445,178 C455,186 460,180 470,175 C480,170 490,175 495,185 C500,195 490,210 485,215 C480,220 470,225 460,220 C450,215 440,210 435,205 C425,200 415,195 420,180 Z",
    color: "#E8CEAD",
    center: [460, 190],
    districts: [
      { name: "Nagpur", position: [455, 195] },
      { name: "Wardha", position: [435, 205] },
      { name: "Bhandara", position: [475, 185] },
      { name: "Gondia", position: [490, 180] },
      { name: "Chandrapur", position: [450, 220] },
      { name: "Gadchiroli", position: [470, 230] }
    ]
  },
  "Amravati": {
    path: "M370,170 C380,165 390,160 400,165 C410,170 420,175 425,180 C430,190 425,200 420,205 C410,215 400,210 390,205 C380,200 370,195 365,185 C360,175 360,175 370,170 Z",
    color: "#F8BFC7",
    center: [395, 180],
    districts: [
      { name: "Amravati", position: [395, 175] },
      { name: "Yavatmal", position: [405, 195] },
      { name: "Akola", position: [375, 180] },
      { name: "Washim", position: [385, 190] },
      { name: "Buldhana", position: [365, 190] }
    ]
  },
  "Chhatrapati Sambhajinagar": {
    path: "M320,220 C330,215 340,215 350,220 C360,225 365,235 360,245 C355,255 345,255 335,250 C325,245 318,235 320,220 Z",
    color: "#C0D1F0",
    center: [340, 235],
    districts: [
      { name: "Chhatrapati Sambhajinagar", position: [340, 230] },
      { name: "Jalna", position: [330, 245] },
      { name: "Beed", position: [345, 255] },
      { name: "Osmanabad", position: [355, 250] },
      { name: "Nanded", position: [365, 235] },
      { name: "Hingoli", position: [350, 225] },
      { name: "Parbhani", position: [335, 240] },
      { name: "Latur", position: [355, 260] }
    ]
  },
  "Nashik": {
    path: "M260,200 C270,195 280,195 290,200 C300,205 305,215 300,225 C295,235 285,235 275,230 C265,225 255,215 260,200 Z",
    color: "#F1E476",
    center: [280, 210],
    districts: [
      { name: "Nashik", position: [280, 205] },
      { name: "Dhule", position: [260, 195] },
      { name: "Jalgaon", position: [290, 195] },
      { name: "Ahmednagar", position: [290, 220] },
      { name: "Nandurbar", position: [245, 195] }
    ]
  },
  "Pune": {
    path: "M240,270 C250,265 260,265 270,270 C280,275 285,285 280,295 C275,305 265,305 255,300 C245,295 235,285 240,270 Z",
    color: "#ADEBAD",
    center: [260, 285],
    districts: [
      { name: "Pune", position: [260, 280] },
      { name: "Satara", position: [255, 295] },
      { name: "Sangli", position: [250, 310] },
      { name: "Solapur", position: [275, 305] },
      { name: "Kolhapur", position: [240, 315] }
    ]
  },
  "Konkan": {
    path: "M200,290 C210,285 220,285 230,290 C235,300 235,310 230,320 C225,330 215,330 205,325 C195,320 190,300 200,290 Z",
    color: "#BFC0C0",
    center: [215, 305],
    districts: [
      { name: "Mumbai City", position: [205, 285] },
      { name: "Mumbai Suburban", position: [208, 278] },
      { name: "Thane", position: [215, 275] },
      { name: "Palghar", position: [195, 270] },
      { name: "Raigad", position: [220, 295] },
      { name: "Ratnagiri", position: [210, 315] },
      { name: "Sindhudurg", position: [205, 330] }
    ]
  }
};

// SVG paths for a more realistic Maharashtra outline
export const maharashtraOutlinePath = "M195,260 C205,250 220,245 235,250 C245,255 255,260 265,255 C275,250 285,245 295,250 C305,255 315,260 325,255 C335,250 345,245 355,250 C365,255 375,260 385,255 C395,250 405,245 415,250 C425,255 435,260 445,255 C455,250 465,245 475,250 C485,255 495,260 485,270 C475,280 465,285 455,280 C445,275 435,270 425,275 C415,280 405,285 395,280 C385,275 375,270 365,275 C355,280 345,285 335,280 C325,275 315,270 305,275 C295,280 285,285 275,280 C265,275 255,270 245,275 C235,280 225,285 215,280 C205,275 195,270 195,260 Z";

// Add state boundaries and district paths for more accurate representation
export const districtPaths = {
  "Nagpur": "M455,195 C460,190 465,190 470,195 C475,200 475,205 470,210 C465,215 460,215 455,210 C450,205 450,200 455,195 Z",
  "Wardha": "M435,205 C440,200 445,200 450,205 C455,210 455,215 450,220 C445,225 440,225 435,220 C430,215 430,210 435,205 Z",
  "Amravati": "M395,175 C400,170 405,170 410,175 C415,180 415,185 410,190 C405,195 400,195 395,190 C390,185 390,180 395,175 Z",
  "Pune": "M260,280 C265,275 270,275 275,280 C280,285 280,290 275,295 C270,300 265,300 260,295 C255,290 255,285 260,280 Z",
  "Mumbai City": "M205,285 C208,282 211,282 214,285 C217,288 217,291 214,294 C211,297 208,297 205,294 C202,291 202,288 205,285 Z"
};

// Create a mapping between region names and their standardized IDs
export const regionNameToId: Record<string, string> = {
  "Nagpur": "nagpur",
  "Amravati": "amravati",
  "Nashik": "nashik",
  "Pune": "pune",
  "Konkan": "konkan",
  "Chhatrapati Sambhajinagar": "chhatrapati-sambhajinagar"
};