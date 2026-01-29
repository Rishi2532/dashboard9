export type Language = "en" | "hi" | "mr";

export interface TranslationStrings {
  [key: string]: string;
}

export const regionNames: Record<Language, Record<string, string>> = {
  en: {
    "Amravati": "Amravati",
    "Nagpur": "Nagpur",
    "Nashik": "Nashik",
    "Pune": "Pune",
    "Konkan": "Konkan",
    "Chhatrapati Sambhajinagar": "Chhatrapati Sambhajinagar",
    "Mumbai": "Mumbai",
    "all": "all regions",
  },
  hi: {
    "Amravati": "अमरावती",
    "Nagpur": "नागपूर",
    "Nashik": "नासिक",
    "Pune": "पुणे",
    "Konkan": "कोंकण",
    "Chhatrapati Sambhajinagar": "छत्रपति संभाजीनगर",
    "Mumbai": "मुंबई",
    "all": "सभी क्षेत्रों",
  },
  mr: {
    "Amravati": "अमरावती",
    "Nagpur": "नागपूर",
    "Nashik": "नाशिक",
    "Pune": "पुणे",
    "Konkan": "कोकण",
    "Chhatrapati Sambhajinagar": "छत्रपती संभाजीनगर",
    "Mumbai": "मुंबई",
    "all": "सर्व प्रदेश",
  }
};

export function translateRegionName(regionName: string, lang: Language): string {
  if (!regionName || regionName === "all") {
    return regionNames[lang]?.["all"] || regionNames.en["all"];
  }
  const normalizedRegion = regionName.charAt(0).toUpperCase() + regionName.slice(1).toLowerCase();
  for (const [key, value] of Object.entries(regionNames.en)) {
    if (key.toLowerCase() === regionName.toLowerCase()) {
      return regionNames[lang]?.[key] || regionNames.en[key] || regionName;
    }
  }
  return regionName;
}

export const translations: Record<Language, TranslationStrings> = {
  en: {
    "common.region": "Region",
    "common.scheme": "Scheme",
    "common.village": "Village",
    "common.population": "Population",
    "common.status": "Status",
    "common.location": "Location",
    "common.total": "Total",
    "common.average": "Average",
    "common.count": "Count",
    "common.date": "Date",
    "common.value": "Value",
    "common.excel": "Excel",
    "common.export": "Export",
    "common.download": "Download",
    "common.more": "more",
    "common.moreNotShown": "more not shown. Use the Excel export button above for the complete list.",
    "common.lastUpdated": "Last Updated",
    "common.loading": "Loading...",
    "common.noData": "No data available",
    "common.error": "Error loading data",
    
    "esr.title": "ESR Summary",
    "esr.titleForRegion": "ESR Summary for {region} Region",
    "esr.titleForScheme": "ESR Summary for {scheme}",
    "esr.totalIntegrated": "Total ESRs Integrated",
    "esr.functional": "Functional",
    "esr.nonFunctional": "Non-Functional",
    "esr.capacity": "ESR Capacity",
    "esr.capacityInLL": "ESR Capacity (LL)",
    "esr.name": "ESR Name",
    "esr.count": "ESR Count",
    "esr.totalCapacity": "Total ESR Capacity",
    
    "lpcd.title": "LPCD Data",
    "lpcd.latestLpcd": "Latest LPCD",
    "lpcd.averageLpcd": "Average LPCD",
    "lpcd.above55": "Above 55 LPCD",
    "lpcd.below55": "Below 55 LPCD",
    "lpcd.villagesAbove55": "Villages Above 55 LPCD",
    "lpcd.villagesBelow55": "Villages Below 55 LPCD",
    "lpcd.villagesAbove55ForRegion": "{region} Region - Villages Above 55 LPCD",
    "lpcd.villagesBelow55ForRegion": "{region} Region - Villages Below 55 LPCD",
    "lpcd.villagesAbove55ForScheme": "{scheme} - Villages Above 55 LPCD",
    "lpcd.villagesBelow55ForScheme": "{scheme} - Villages Below 55 LPCD",
    "lpcd.consistentAbove55": "Consistent Above 55 LPCD",
    "lpcd.consistentBelow55": "Consistent Below 55 LPCD",
    "lpcd.averageAbove55": "Average Above 55 LPCD",
    "lpcd.averageBelow55": "Average Below 55 LPCD",
    
    "chlorine.title": "Chlorine Data",
    "chlorine.optimal": "Optimal Chlorine (0.2-0.5 mg/L)",
    "chlorine.above": "Above 0.5 mg/L",
    "chlorine.below": "Below 0.2 mg/L",
    "chlorine.level": "Chlorine Level",
    "chlorine.analyzers": "Chlorine Analyzers",
    "chlorine.status": "Chlorine Status",
    "chlorine.optimalRange": "Optimal Range",
    "chlorine.belowOptimal": "Below Optimal",
    "chlorine.aboveOptimal": "Above Optimal",
    
    "pressure.title": "Pressure Data",
    "pressure.optimal": "Optimal Pressure (0.2-0.7 bar)",
    "pressure.above": "Above 0.7 bar",
    "pressure.below": "Below 0.2 bar",
    "pressure.level": "Pressure Level",
    "pressure.transmitters": "Pressure Transmitters",
    "pressure.status": "Pressure Status",
    "pressure.optimalRange": "Optimal Range",
    "pressure.belowOptimal": "Below Optimal",
    "pressure.aboveOptimal": "Above Optimal",
    
    "water.title": "Water Supply Data",
    "water.consumption": "Water Consumption",
    "water.villagesWithWater": "Villages with Water Supply",
    "water.villagesNoWater": "Villages without Water Supply",
    "water.consistentSupply": "Consistent Water Supply",
    "water.reliableSupply": "Reliable Water Supply",
    "water.abruptConsumption": "Abrupt Water Consumption",
    "water.consumptionPercent": "Consumption %",
    
    "scheme.title": "Scheme Information",
    "scheme.name": "Scheme Name",
    "scheme.id": "Scheme ID",
    "scheme.fullyCompleted": "Fully Completed Schemes",
    "scheme.partial": "Partial Schemes",
    "scheme.inProgress": "In Progress Schemes",
    "scheme.status": "Scheme Status",
    "scheme.completionStatus": "Completion Status",
    "scheme.functionalStatus": "Functional Status",
    "scheme.villagesInScheme": "Villages in Scheme",
    "scheme.villagesIntegrated": "Villages Integrated",
    
    "village.title": "Village Information",
    "village.name": "Village Name",
    "village.fullyCompleted": "Fully Completed Villages",
    "village.partial": "Partial Villages",
    "village.functional": "Functional Villages",
    "village.nonFunctional": "Non-Functional Villages",
    
    "equipment.flowMeters": "Flow Meters",
    "equipment.esrs": "ESRs",
    "equipment.chlorineAnalyzers": "Chlorine Analyzers",
    "equipment.pressureTransmitters": "Pressure Transmitters",
    "equipment.sensors": "Sensors",
    "equipment.integrated": "Integrated",
    "equipment.online": "Online",
    "equipment.offline": "Offline",
    
    "summary.title": "Summary Statistics",
    "summary.totalSchemes": "Total Schemes",
    "summary.totalVillages": "Total Villages",
    "summary.totalESRs": "Total ESRs",
    "summary.areaCoverage": "Area Coverage",
    
    "chart.title": "Chart",
    "chart.lpcdTrend": "LPCD Trend",
    "chart.chlorineTrend": "Chlorine Trend",
    "chart.pressureTrend": "Pressure Trend",
    "chart.waterConsumption": "Water Consumption Chart",
    
    "response.esrSummary": "ESR Summary for {location}:",
    "response.totalEsrsIntegrated": "Total ESRs Integrated",
    "response.showingVillages": "Showing {count} villages",
    "response.foundVillages": "Found {count} villages",
    "response.noVillagesFound": "No villages found matching your criteria",
    "response.hereIsData": "Here is the data you requested:",
    "response.dataFor": "Data for {location}",
    
    "water.hasWater": "Has Water",
    "water.noWater": "No Water",
    "water.villagesWithWaterForRegion": "{region} Region - Villages with Water",
    "water.villagesWithWaterForScheme": "{scheme} - Villages with Water",
    "water.villagesNoWaterForRegion": "{region} Region - Villages without Water",
    "water.villagesNoWaterForScheme": "{scheme} - Villages without Water",
    "water.latestReading": "Latest Reading",
    "water.zeroDays": "Zero Days",
    "water.allWeek": "All week",
    
    "chlorine.esrsOptimal": "ESRs with Optimal Chlorine",
    "chlorine.esrsOptimalForRegion": "{region} Region - ESRs with Optimal Chlorine",
    "chlorine.esrsOptimalForScheme": "{scheme} - ESRs with Optimal Chlorine",
    "chlorine.esrsAbove": "ESRs with Chlorine Above 0.5 mg/L",
    "chlorine.esrsBelow": "ESRs with Chlorine Below 0.2 mg/L",
    "chlorine.esrsAboveForRegion": "{region} Region - ESRs with Chlorine Above 0.5 mg/L",
    "chlorine.esrsBelowForRegion": "{region} Region - ESRs with Chlorine Below 0.2 mg/L",
    "chlorine.latestChlorine": "Latest Chlorine",
    "chlorine.sensorId": "Sensor ID",
    "chlorine.connection": "Connection",
    "chlorine.optimalStatus": "Optimal (0.2-0.5 mg/L)",
    "chlorine.aboveStatus": "Above 0.5 mg/L",
    "chlorine.belowStatus": "Below 0.2 mg/L",
    "chlorine.averageChlorine": "Average Chlorine",
    "chlorine.chlorineStatus": "Chlorine Status",
    "chlorine.connectionStatus": "Connection Status",
    "chlorine.notAvailable": "Not available",
    "chlorine.unknown": "Unknown",
    
    "pressure.esrsOptimal": "ESRs with Optimal Pressure",
    "pressure.esrsOptimalForRegion": "{region} Region - ESRs with Optimal Pressure",
    "pressure.esrsOptimalForScheme": "{scheme} - ESRs with Optimal Pressure",
    "pressure.esrsAbove": "ESRs with Pressure Above 0.7 bar",
    "pressure.esrsBelow": "ESRs with Pressure Below 0.2 bar",
    "pressure.latestPressure": "Latest Pressure",
    "pressure.optimalStatus": "Optimal (0.2-0.7 bar)",
    "pressure.aboveStatus": "Above 0.7 bar",
    "pressure.belowStatus": "Below 0.2 bar",
    
    "equipment.flowMeter": "Flow Meter",
    "equipment.flowMeterConnected": "Flow Meter Connected",
    
    "common.notAvailable": "N/A",
    "common.moreEsrsNotShown": "more ESRs not shown. Use the Excel export button above for the complete list.",
  },
  
  hi: {
    "common.region": "क्षेत्र",
    "common.scheme": "योजना",
    "common.village": "गांव",
    "common.population": "जनसंख्या",
    "common.status": "स्थिति",
    "common.location": "स्थान",
    "common.total": "कुल",
    "common.average": "औसत",
    "common.count": "संख्या",
    "common.date": "तारीख",
    "common.value": "मूल्य",
    "common.excel": "एक्सेल",
    "common.export": "निर्यात",
    "common.download": "डाउनलोड",
    "common.more": "और",
    "common.moreNotShown": "और दिखाए नहीं गए। पूर्ण सूची के लिए ऊपर एक्सेल निर्यात बटन का उपयोग करें।",
    "common.lastUpdated": "अंतिम अपडेट",
    "common.loading": "लोड हो रहा है...",
    "common.noData": "कोई डेटा उपलब्ध नहीं",
    "common.error": "डेटा लोड करने में त्रुटि",
    
    "esr.title": "ESR सारांश",
    "esr.titleForRegion": "{region} क्षेत्र के लिए ESR सारांश",
    "esr.titleForScheme": "{scheme} के लिए ESR सारांश",
    "esr.totalIntegrated": "कुल ESR एकीकृत",
    "esr.functional": "कार्यात्मक",
    "esr.nonFunctional": "गैर-कार्यात्मक",
    "esr.capacity": "ESR क्षमता",
    "esr.capacityInLL": "ESR क्षमता (LL)",
    "esr.name": "ESR नाम",
    "esr.count": "ESR संख्या",
    "esr.totalCapacity": "कुल ESR क्षमता",
    
    "lpcd.title": "LPCD डेटा",
    "lpcd.latestLpcd": "नवीनतम LPCD",
    "lpcd.averageLpcd": "औसत LPCD",
    "lpcd.above55": "55 LPCD से ऊपर",
    "lpcd.below55": "55 LPCD से नीचे",
    "lpcd.villagesAbove55": "55 LPCD से ऊपर वाले गांव",
    "lpcd.villagesBelow55": "55 LPCD से नीचे वाले गांव",
    "lpcd.villagesAbove55ForRegion": "{region} क्षेत्र - 55 LPCD से ऊपर वाले गांव",
    "lpcd.villagesBelow55ForRegion": "{region} क्षेत्र - 55 LPCD से नीचे वाले गांव",
    "lpcd.villagesAbove55ForScheme": "{scheme} - 55 LPCD से ऊपर वाले गांव",
    "lpcd.villagesBelow55ForScheme": "{scheme} - 55 LPCD से नीचे वाले गांव",
    "lpcd.consistentAbove55": "लगातार 55 LPCD से ऊपर",
    "lpcd.consistentBelow55": "लगातार 55 LPCD से नीचे",
    "lpcd.averageAbove55": "औसत 55 LPCD से ऊपर",
    "lpcd.averageBelow55": "औसत 55 LPCD से नीचे",
    
    "chlorine.title": "क्लोरीन डेटा",
    "chlorine.optimal": "इष्टतम क्लोरीन (0.2-0.5 mg/L)",
    "chlorine.above": "0.5 mg/L से ऊपर",
    "chlorine.below": "0.2 mg/L से नीचे",
    "chlorine.level": "क्लोरीन स्तर",
    "chlorine.analyzers": "क्लोरीन विश्लेषक",
    "chlorine.status": "क्लोरीन स्थिति",
    "chlorine.optimalRange": "इष्टतम सीमा",
    "chlorine.belowOptimal": "इष्टतम से नीचे",
    "chlorine.aboveOptimal": "इष्टतम से ऊपर",
    
    "pressure.title": "दबाव डेटा",
    "pressure.optimal": "इष्टतम दबाव (0.2-0.7 bar)",
    "pressure.above": "0.7 bar से ऊपर",
    "pressure.below": "0.2 bar से नीचे",
    "pressure.level": "दबाव स्तर",
    "pressure.transmitters": "दबाव ट्रांसमीटर",
    "pressure.status": "दबाव स्थिति",
    "pressure.optimalRange": "इष्टतम सीमा",
    "pressure.belowOptimal": "इष्टतम से नीचे",
    "pressure.aboveOptimal": "इष्टतम से ऊपर",
    
    "water.title": "जल आपूर्ति डेटा",
    "water.consumption": "जल खपत",
    "water.villagesWithWater": "जल आपूर्ति वाले गांव",
    "water.villagesNoWater": "जल आपूर्ति के बिना गांव",
    "water.consistentSupply": "नियमित जल आपूर्ति",
    "water.reliableSupply": "विश्वसनीय जल आपूर्ति",
    "water.abruptConsumption": "असामान्य जल खपत",
    "water.consumptionPercent": "खपत %",
    
    "scheme.title": "योजना जानकारी",
    "scheme.name": "योजना का नाम",
    "scheme.id": "योजना ID",
    "scheme.fullyCompleted": "पूर्ण रूप से पूर्ण योजनाएं",
    "scheme.partial": "आंशिक योजनाएं",
    "scheme.inProgress": "प्रगति में योजनाएं",
    "scheme.status": "योजना स्थिति",
    "scheme.completionStatus": "पूर्णता स्थिति",
    "scheme.functionalStatus": "कार्यात्मक स्थिति",
    "scheme.villagesInScheme": "योजना में गांव",
    "scheme.villagesIntegrated": "एकीकृत गांव",
    
    "village.title": "गांव जानकारी",
    "village.name": "गांव का नाम",
    "village.fullyCompleted": "पूर्ण रूप से पूर्ण गांव",
    "village.partial": "आंशिक गांव",
    "village.functional": "कार्यात्मक गांव",
    "village.nonFunctional": "गैर-कार्यात्मक गांव",
    
    "equipment.flowMeters": "फ्लो मीटर",
    "equipment.esrs": "ESR",
    "equipment.chlorineAnalyzers": "क्लोरीन विश्लेषक",
    "equipment.pressureTransmitters": "दबाव ट्रांसमीटर",
    "equipment.sensors": "सेंसर",
    "equipment.integrated": "एकीकृत",
    "equipment.online": "ऑनलाइन",
    "equipment.offline": "ऑफलाइन",
    
    "summary.title": "सारांश सांख्यिकी",
    "summary.totalSchemes": "कुल योजनाएं",
    "summary.totalVillages": "कुल गांव",
    "summary.totalESRs": "कुल ESR",
    "summary.areaCoverage": "क्षेत्र कवरेज",
    
    "chart.title": "चार्ट",
    "chart.lpcdTrend": "LPCD रुझान",
    "chart.chlorineTrend": "क्लोरीन रुझान",
    "chart.pressureTrend": "दबाव रुझान",
    "chart.waterConsumption": "जल खपत चार्ट",
    
    "response.esrSummary": "{location} के लिए ESR सारांश:",
    "response.totalEsrsIntegrated": "कुल ESR एकीकृत",
    "response.showingVillages": "{count} गांव दिखा रहे हैं",
    "response.foundVillages": "{count} गांव मिले",
    "response.noVillagesFound": "आपके मानदंडों से मेल खाने वाला कोई गांव नहीं मिला",
    "response.hereIsData": "यहां आपका अनुरोधित डेटा है:",
    "response.dataFor": "{location} के लिए डेटा",
    
    "water.hasWater": "पानी उपलब्ध",
    "water.noWater": "पानी नहीं",
    "water.villagesWithWaterForRegion": "{region} क्षेत्र - पानी वाले गांव",
    "water.villagesWithWaterForScheme": "{scheme} - पानी वाले गांव",
    "water.villagesNoWaterForRegion": "{region} क्षेत्र - बिना पानी के गांव",
    "water.villagesNoWaterForScheme": "{scheme} - बिना पानी के गांव",
    "water.latestReading": "नवीनतम रीडिंग",
    "water.zeroDays": "शून्य दिन",
    "water.allWeek": "पूरा सप्ताह",
    
    "chlorine.esrsOptimal": "इष्टतम क्लोरीन वाले ESR",
    "chlorine.esrsOptimalForRegion": "{region} क्षेत्र - इष्टतम क्लोरीन वाले ESR",
    "chlorine.esrsOptimalForScheme": "{scheme} - इष्टतम क्लोरीन वाले ESR",
    "chlorine.esrsAbove": "0.5 mg/L से ऊपर क्लोरीन वाले ESR",
    "chlorine.esrsBelow": "0.2 mg/L से नीचे क्लोरीन वाले ESR",
    "chlorine.esrsAboveForRegion": "{region} क्षेत्र - 0.5 mg/L से ऊपर क्लोरीन वाले ESR",
    "chlorine.esrsBelowForRegion": "{region} क्षेत्र - 0.2 mg/L से नीचे क्लोरीन वाले ESR",
    "chlorine.latestChlorine": "नवीनतम क्लोरीन",
    "chlorine.sensorId": "सेंसर ID",
    "chlorine.connection": "कनेक्शन",
    "chlorine.optimalStatus": "इष्टतम (0.2-0.5 mg/L)",
    "chlorine.aboveStatus": "0.5 mg/L से ऊपर",
    "chlorine.belowStatus": "0.2 mg/L से नीचे",
    "chlorine.averageChlorine": "औसत क्लोरीन",
    "chlorine.chlorineStatus": "क्लोरीन स्थिति",
    "chlorine.connectionStatus": "कनेक्शन स्थिति",
    "chlorine.notAvailable": "उपलब्ध नहीं",
    "chlorine.unknown": "अज्ञात",
    
    "pressure.esrsOptimal": "इष्टतम दबाव वाले ESR",
    "pressure.esrsOptimalForRegion": "{region} क्षेत्र - इष्टतम दबाव वाले ESR",
    "pressure.esrsOptimalForScheme": "{scheme} - इष्टतम दबाव वाले ESR",
    "pressure.esrsAbove": "0.7 bar से ऊपर दबाव वाले ESR",
    "pressure.esrsBelow": "0.2 bar से नीचे दबाव वाले ESR",
    "pressure.latestPressure": "नवीनतम दबाव",
    "pressure.optimalStatus": "इष्टतम (0.2-0.7 bar)",
    "pressure.aboveStatus": "0.7 bar से ऊपर",
    "pressure.belowStatus": "0.2 bar से नीचे",
    
    "equipment.flowMeter": "फ्लो मीटर",
    "equipment.flowMeterConnected": "फ्लो मीटर कनेक्टेड",
    
    "common.notAvailable": "उपलब्ध नहीं",
    "common.moreEsrsNotShown": "और ESR नहीं दिखाए गए। पूर्ण सूची के लिए ऊपर एक्सेल निर्यात बटन का उपयोग करें।",
  },
  
  mr: {
    "common.region": "प्रदेश",
    "common.scheme": "योजना",
    "common.village": "गाव",
    "common.population": "लोकसंख्या",
    "common.status": "स्थिती",
    "common.location": "स्थान",
    "common.total": "एकूण",
    "common.average": "सरासरी",
    "common.count": "संख्या",
    "common.date": "तारीख",
    "common.value": "मूल्य",
    "common.excel": "एक्सेल",
    "common.export": "निर्यात",
    "common.download": "डाउनलोड",
    "common.more": "अधिक",
    "common.moreNotShown": "अधिक दाखवलेले नाहीत. संपूर्ण यादीसाठी वरील एक्सेल निर्यात बटण वापरा.",
    "common.lastUpdated": "शेवटचे अपडेट",
    "common.loading": "लोड होत आहे...",
    "common.noData": "डेटा उपलब्ध नाही",
    "common.error": "डेटा लोड करण्यात त्रुटी",
    
    "esr.title": "ESR सारांश",
    "esr.titleForRegion": "{region} प्रदेशासाठी ESR सारांश",
    "esr.titleForScheme": "{scheme} साठी ESR सारांश",
    "esr.totalIntegrated": "एकूण ESR एकात्मिक",
    "esr.functional": "कार्यरत",
    "esr.nonFunctional": "अकार्यरत",
    "esr.capacity": "ESR क्षमता",
    "esr.capacityInLL": "ESR क्षमता (LL)",
    "esr.name": "ESR नाव",
    "esr.count": "ESR संख्या",
    "esr.totalCapacity": "एकूण ESR क्षमता",
    
    "lpcd.title": "LPCD डेटा",
    "lpcd.latestLpcd": "नवीनतम LPCD",
    "lpcd.averageLpcd": "सरासरी LPCD",
    "lpcd.above55": "55 LPCD च्या वर",
    "lpcd.below55": "55 LPCD च्या खाली",
    "lpcd.villagesAbove55": "55 LPCD च्या वर असलेली गावे",
    "lpcd.villagesBelow55": "55 LPCD च्या खाली असलेली गावे",
    "lpcd.villagesAbove55ForRegion": "{region} प्रदेश - 55 LPCD च्या वर असलेली गावे",
    "lpcd.villagesBelow55ForRegion": "{region} प्रदेश - 55 LPCD च्या खाली असलेली गावे",
    "lpcd.villagesAbove55ForScheme": "{scheme} - 55 LPCD च्या वर असलेली गावे",
    "lpcd.villagesBelow55ForScheme": "{scheme} - 55 LPCD च्या खाली असलेली गावे",
    "lpcd.consistentAbove55": "सातत्याने 55 LPCD च्या वर",
    "lpcd.consistentBelow55": "सातत्याने 55 LPCD च्या खाली",
    "lpcd.averageAbove55": "सरासरी 55 LPCD च्या वर",
    "lpcd.averageBelow55": "सरासरी 55 LPCD च्या खाली",
    
    "chlorine.title": "क्लोरीन डेटा",
    "chlorine.optimal": "इष्टतम क्लोरीन (0.2-0.5 mg/L)",
    "chlorine.above": "0.5 mg/L च्या वर",
    "chlorine.below": "0.2 mg/L च्या खाली",
    "chlorine.level": "क्लोरीन पातळी",
    "chlorine.analyzers": "क्लोरीन विश्लेषक",
    "chlorine.status": "क्लोरीन स्थिती",
    "chlorine.optimalRange": "इष्टतम श्रेणी",
    "chlorine.belowOptimal": "इष्टतम च्या खाली",
    "chlorine.aboveOptimal": "इष्टतम च्या वर",
    
    "pressure.title": "दाब डेटा",
    "pressure.optimal": "इष्टतम दाब (0.2-0.7 bar)",
    "pressure.above": "0.7 bar च्या वर",
    "pressure.below": "0.2 bar च्या खाली",
    "pressure.level": "दाब पातळी",
    "pressure.transmitters": "दाब ट्रान्समीटर",
    "pressure.status": "दाब स्थिती",
    "pressure.optimalRange": "इष्टतम श्रेणी",
    "pressure.belowOptimal": "इष्टतम च्या खाली",
    "pressure.aboveOptimal": "इष्टतम च्या वर",
    
    "water.title": "पाणी पुरवठा डेटा",
    "water.consumption": "पाणी वापर",
    "water.villagesWithWater": "पाणी पुरवठा असलेली गावे",
    "water.villagesNoWater": "पाणी पुरवठा नसलेली गावे",
    "water.consistentSupply": "नियमित पाणी पुरवठा",
    "water.reliableSupply": "विश्वसनीय पाणी पुरवठा",
    "water.abruptConsumption": "असामान्य पाणी वापर",
    "water.consumptionPercent": "वापर %",
    
    "scheme.title": "योजना माहिती",
    "scheme.name": "योजनेचे नाव",
    "scheme.id": "योजना ID",
    "scheme.fullyCompleted": "पूर्णपणे पूर्ण झालेल्या योजना",
    "scheme.partial": "अंशतः पूर्ण योजना",
    "scheme.inProgress": "प्रगतीपथावर असलेल्या योजना",
    "scheme.status": "योजना स्थिती",
    "scheme.completionStatus": "पूर्णता स्थिती",
    "scheme.functionalStatus": "कार्यात्मक स्थिती",
    "scheme.villagesInScheme": "योजनेतील गावे",
    "scheme.villagesIntegrated": "एकात्मिक गावे",
    
    "village.title": "गाव माहिती",
    "village.name": "गावाचे नाव",
    "village.fullyCompleted": "पूर्णपणे पूर्ण झालेली गावे",
    "village.partial": "अंशतः पूर्ण गावे",
    "village.functional": "कार्यरत गावे",
    "village.nonFunctional": "अकार्यरत गावे",
    
    "equipment.flowMeters": "फ्लो मीटर",
    "equipment.esrs": "ESR",
    "equipment.chlorineAnalyzers": "क्लोरीन विश्लेषक",
    "equipment.pressureTransmitters": "दाब ट्रान्समीटर",
    "equipment.sensors": "सेन्सर",
    "equipment.integrated": "एकात्मिक",
    "equipment.online": "ऑनलाइन",
    "equipment.offline": "ऑफलाइन",
    
    "summary.title": "सारांश आकडेवारी",
    "summary.totalSchemes": "एकूण योजना",
    "summary.totalVillages": "एकूण गावे",
    "summary.totalESRs": "एकूण ESR",
    "summary.areaCoverage": "क्षेत्र व्याप्ती",
    
    "chart.title": "आलेख",
    "chart.lpcdTrend": "LPCD कल",
    "chart.chlorineTrend": "क्लोरीन कल",
    "chart.pressureTrend": "दाब कल",
    "chart.waterConsumption": "पाणी वापर आलेख",
    
    "response.esrSummary": "{location} साठी ESR सारांश:",
    "response.totalEsrsIntegrated": "एकूण ESR एकात्मिक",
    "response.showingVillages": "{count} गावे दाखवत आहे",
    "response.foundVillages": "{count} गावे सापडली",
    "response.noVillagesFound": "तुमच्या निकषांशी जुळणारी गावे सापडली नाहीत",
    "response.hereIsData": "येथे तुमचा विनंती केलेला डेटा आहे:",
    "response.dataFor": "{location} साठी डेटा",
    
    "water.hasWater": "पाणी उपलब्ध",
    "water.noWater": "पाणी नाही",
    "water.villagesWithWaterForRegion": "{region} प्रदेश - पाणी असलेली गावे",
    "water.villagesWithWaterForScheme": "{scheme} - पाणी असलेली गावे",
    "water.villagesNoWaterForRegion": "{region} प्रदेश - पाणी नसलेली गावे",
    "water.villagesNoWaterForScheme": "{scheme} - पाणी नसलेली गावे",
    "water.latestReading": "नवीनतम वाचन",
    "water.zeroDays": "शून्य दिवस",
    "water.allWeek": "संपूर्ण आठवडा",
    
    "chlorine.esrsOptimal": "इष्टतम क्लोरीन असलेले ESR",
    "chlorine.esrsOptimalForRegion": "{region} प्रदेश - इष्टतम क्लोरीन असलेले ESR",
    "chlorine.esrsOptimalForScheme": "{scheme} - इष्टतम क्लोरीन असलेले ESR",
    "chlorine.esrsAbove": "0.5 mg/L च्या वर क्लोरीन असलेले ESR",
    "chlorine.esrsBelow": "0.2 mg/L च्या खाली क्लोरीन असलेले ESR",
    "chlorine.esrsAboveForRegion": "{region} प्रदेश - 0.5 mg/L च्या वर क्लोरीन असलेले ESR",
    "chlorine.esrsBelowForRegion": "{region} प्रदेश - 0.2 mg/L च्या खाली क्लोरीन असलेले ESR",
    "chlorine.latestChlorine": "नवीनतम क्लोरीन",
    "chlorine.sensorId": "सेन्सर ID",
    "chlorine.connection": "कनेक्शन",
    "chlorine.optimalStatus": "इष्टतम (0.2-0.5 mg/L)",
    "chlorine.aboveStatus": "0.5 mg/L च्या वर",
    "chlorine.belowStatus": "0.2 mg/L च्या खाली",
    "chlorine.averageChlorine": "सरासरी क्लोरीन",
    "chlorine.chlorineStatus": "क्लोरीन स्थिती",
    "chlorine.connectionStatus": "कनेक्शन स्थिती",
    "chlorine.notAvailable": "उपलब्ध नाही",
    "chlorine.unknown": "अज्ञात",
    
    "pressure.esrsOptimal": "इष्टतम दाब असलेले ESR",
    "pressure.esrsOptimalForRegion": "{region} प्रदेश - इष्टतम दाब असलेले ESR",
    "pressure.esrsOptimalForScheme": "{scheme} - इष्टतम दाब असलेले ESR",
    "pressure.esrsAbove": "0.7 bar च्या वर दाब असलेले ESR",
    "pressure.esrsBelow": "0.2 bar च्या खाली दाब असलेले ESR",
    "pressure.latestPressure": "नवीनतम दाब",
    "pressure.optimalStatus": "इष्टतम (0.2-0.7 bar)",
    "pressure.aboveStatus": "0.7 bar च्या वर",
    "pressure.belowStatus": "0.2 bar च्या खाली",
    
    "equipment.flowMeter": "फ्लो मीटर",
    "equipment.flowMeterConnected": "फ्लो मीटर जोडलेला",
    
    "common.notAvailable": "उपलब्ध नाही",
    "common.moreEsrsNotShown": "अधिक ESR दाखवलेले नाहीत. संपूर्ण यादीसाठी वरील एक्सेल निर्यात बटण वापरा.",
  }
};

export function t(key: string, lang: Language = "en", params?: Record<string, string | number>): string {
  let text = translations[lang]?.[key] || translations.en[key] || key;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    });
  }
  
  return text;
}

export function detectLanguageFromText(text: string): Language {
  const hindiPattern = /[\u0900-\u097F]/;
  const marathiPattern = /[\u0900-\u097F]/;
  
  const hindiKeywords = ["क्या", "कैसे", "कितने", "दिखाओ", "बताओ", "कहाँ", "में", "के", "की", "को", "है", "हैं", "वाले", "वाली"];
  const marathiKeywords = ["कसे", "किती", "दाखव", "सांग", "कुठे", "मध्ये", "चे", "ची", "ला", "आहे", "आहेत", "असलेली", "असलेले", "साठी", "प्रदेश", "गावे", "योजना"];
  
  const lowerText = text.toLowerCase();
  
  let marathiScore = 0;
  let hindiScore = 0;
  
  marathiKeywords.forEach(keyword => {
    if (text.includes(keyword)) marathiScore += 2;
  });
  
  hindiKeywords.forEach(keyword => {
    if (text.includes(keyword)) hindiScore += 2;
  });
  
  if (marathiPattern.test(text)) {
    if (marathiScore > hindiScore) return "mr";
    if (hindiScore > marathiScore) return "hi";
    
    if (text.includes("ळ") || text.includes("ऱ")) return "mr";
    
    return marathiScore >= 2 ? "mr" : "hi";
  }
  
  if (hindiPattern.test(text)) {
    return hindiScore > marathiScore ? "hi" : "mr";
  }
  
  return "en";
}

export function getLanguageLabel(lang: Language): string {
  switch (lang) {
    case "hi": return "हिंदी";
    case "mr": return "मराठी";
    default: return "English";
  }
}

export const responseTemplates: Record<Language, Record<string, string>> = {
  en: {
    esrSummaryIntro: "Here is the ESR Summary for {location}:",
    villageListIntro: "Here are the villages matching your query:",
    dataFound: "Found {count} records:",
    noDataFound: "No data found for your query.",
    chlorineStatus: "Here is the chlorine status for {location}:",
    pressureStatus: "Here is the pressure status for {location}:",
    lpcdStatus: "Here is the LPCD status for {location}:",
    schemeInfo: "Here is the scheme information:",
    equipmentCount: "Here is the equipment count for {location}:",
    flowMeterCount: "Total Flow Meters: {count}",
    esrCount: "Total ESRs: {count}",
  },
  hi: {
    esrSummaryIntro: "यहां {location} के लिए ESR सारांश है:",
    villageListIntro: "यहां आपकी क्वेरी से मेल खाने वाले गांव हैं:",
    dataFound: "{count} रिकॉर्ड मिले:",
    noDataFound: "आपकी क्वेरी के लिए कोई डेटा नहीं मिला।",
    chlorineStatus: "यहां {location} के लिए क्लोरीन स्थिति है:",
    pressureStatus: "यहां {location} के लिए दबाव स्थिति है:",
    lpcdStatus: "यहां {location} के लिए LPCD स्थिति है:",
    schemeInfo: "यहां योजना की जानकारी है:",
    equipmentCount: "यहां {location} के लिए उपकरण संख्या है:",
    flowMeterCount: "कुल फ्लो मीटर: {count}",
    esrCount: "कुल ESR: {count}",
  },
  mr: {
    esrSummaryIntro: "येथे {location} साठी ESR सारांश आहे:",
    villageListIntro: "येथे तुमच्या क्वेरीशी जुळणारी गावे आहेत:",
    dataFound: "{count} रेकॉर्ड सापडले:",
    noDataFound: "तुमच्या क्वेरीसाठी डेटा सापडला नाही.",
    chlorineStatus: "येथे {location} साठी क्लोरीन स्थिती आहे:",
    pressureStatus: "येथे {location} साठी दाब स्थिती आहे:",
    lpcdStatus: "येथे {location} साठी LPCD स्थिती आहे:",
    schemeInfo: "येथे योजनेची माहिती आहे:",
    equipmentCount: "येथे {location} साठी उपकरणांची संख्या आहे:",
    flowMeterCount: "एकूण फ्लो मीटर: {count}",
    esrCount: "एकूण ESR: {count}",
  }
};

export function getResponseTemplate(templateKey: string, lang: Language, params?: Record<string, string | number>): string {
  let text = responseTemplates[lang]?.[templateKey] || responseTemplates.en[templateKey] || templateKey;
  
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(value));
    });
  }
  
  return text;
}
