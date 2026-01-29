// Add this new function to generate analytical insights
function generateKeyInsights(data: SchemeReportData): string[] {
  const insights: string[] = [];
  const { schemeInfo, villagesData } = data;

  // Calculate metrics for insights
  const schemeData = calculateSchemeData(villagesData);
  const waterConsistency = calculateWaterSupplyConsistency(villagesData);
  const chlorineQuality = calculateChlorineQuality(villagesData);
  const metricScores = calculateMetricScores(villagesData);
  const overallScore = calculateSchemeScore(villagesData);

  // Insight 1: Overall Performance Assessment
  if (overallScore >= 8) {
    insights.push(
      "EXCELLENT PERFORMANCE: Scheme demonstrates outstanding operational efficiency with consistent water supply and quality parameters",
    );
  } else if (overallScore >= 6) {
    insights.push(
      "GOOD PERFORMANCE: Scheme operates effectively with minor areas for improvement in specific parameters",
    );
  } else if (overallScore >= 4) {
    insights.push(
      "MODERATE PERFORMANCE: Scheme shows acceptable performance but requires attention to key operational metrics",
    );
  } else {
    insights.push(
      "NEEDS IMPROVEMENT: Significant operational challenges detected requiring immediate intervention and monitoring",
    );
  }

  // Insight 2: LPCD Performance Analysis
  const lpcdAchievementRate =
    (schemeData.villagesAchieving55 / villagesData.length) * 100;
  if (lpcdAchievementRate >= 80) {
    insights.push(
      "HIGH LPCD ACHIEVEMENT: Majority of villages meet or exceed the 55 LPCD benchmark indicating adequate water availability",
    );
  } else if (lpcdAchievementRate >= 60) {
    insights.push(
      "MODERATE LPCD ACHIEVEMENT: More than half of villages meet LPCD standards, focus needed on remaining villages",
    );
  } else {
    insights.push(
      "LPCD GAP IDENTIFIED: Significant portion of villages below 55 LPCD threshold, review water distribution and supply patterns",
    );
  }

  // Insight 3: Water Supply Consistency
  const consistency7Rate =
    (waterConsistency.consistent7Days / waterConsistency.totalVillages) * 100;
  if (consistency7Rate >= 90) {
    insights.push(
      "EXCELLENT SUPPLY RELIABILITY: Near-perfect water supply consistency across the scheme ensuring regular service delivery",
    );
  } else if (consistency7Rate >= 70) {
    insights.push(
      "GOOD SUPPLY RELIABILITY: Generally consistent water supply with occasional interruptions requiring monitoring",
    );
  } else {
    insights.push(
      "SUPPLY IRREGULARITY DETECTED: Frequent water supply interruptions affecting service reliability - investigate root causes",
    );
  }

  // Insight 4: Water Quality Analysis
  if (chlorineQuality.totalESRs > 0) {
    const optimalChlorineRate =
      (chlorineQuality.moderateChlorine / chlorineQuality.totalESRs) * 100;
    if (optimalChlorineRate >= 80) {
      insights.push(
        "OPTIMAL WATER QUALITY: Excellent chlorine management ensuring safe drinking water across most ESRs",
      );
    } else if (optimalChlorineRate >= 60) {
      insights.push(
        "SATISFACTORY WATER QUALITY: Generally acceptable chlorine levels with some ESRs requiring dosage adjustment",
      );
    } else {
      insights.push(
        "WATER QUALITY CONCERN: Significant number of ESRs outside optimal chlorine range - review chlorination processes",
      );
    }
  }

  // Insight 5: Pressure Management
  if (metricScores.pressure >= 8) {
    insights.push(
      "EXCELLENT PRESSURE MANAGEMENT: Optimal pressure levels maintained ensuring efficient water distribution",
    );
  } else if (metricScores.pressure >= 6) {
    insights.push(
      "ADEQUATE PRESSURE MANAGEMENT: Generally acceptable pressure levels with minor fluctuations observed",
    );
  } else {
    insights.push(
      "PRESSURE MANAGEMENT NEEDS ATTENTION: Suboptimal pressure levels detected affecting distribution efficiency",
    );
  }

  // Insight 6: Weekly Performance Trends
  const lpcdVariation =
    ((schemeData.weeklyPeakLpcd - schemeData.weeklyLowLpcd) /
      schemeData.weeklyAvgLpcd) *
    100;
  if (lpcdVariation <= 20) {
    insights.push(
      "STABLE CONSUMPTION PATTERNS: Consistent LPCD levels indicate predictable water demand and stable operations",
    );
  } else if (lpcdVariation <= 40) {
    insights.push(
      "MODERATE CONSUMPTION FLUCTUATIONS: Expected variations in water consumption patterns observed",
    );
  } else {
    insights.push(
      "HIGH CONSUMPTION VARIABILITY: Significant fluctuations in LPCD suggesting irregular water usage patterns",
    );
  }

  // Insight 7: Infrastructure Integration
  const integrationRate =
    ((schemeInfo.total_villages_integrated || 0) / schemeInfo.total_villages) *
    100;
  if (integrationRate >= 90) {
    insights.push(
      "FULLY INTEGRATED OPERATIONS: Comprehensive system integration enabling complete monitoring and control capabilities",
    );
  } else if (integrationRate >= 70) {
    insights.push(
      "PARTIALLY INTEGRATED: Majority of villages integrated with ongoing expansion activities",
    );
  } else {
    insights.push(
      "INTEGRATION IN PROGRESS: Continued efforts needed to achieve full system integration and monitoring coverage",
    );
  }

  // Insight 8: Performance Gap Analysis
  const lowestScore = Math.min(
    metricScores.lpcd,
    metricScores.chlorine,
    metricScores.pressure,
  );
  if (lowestScore === metricScores.lpcd && metricScores.lpcd < 6) {
    insights.push(
      "PRIORITY AREA - LPCD OPTIMIZATION: Focus on improving per capita water availability through distribution optimization",
    );
  } else if (
    lowestScore === metricScores.chlorine &&
    metricScores.chlorine < 6
  ) {
    insights.push(
      "PRIORITY AREA - WATER QUALITY: Enhance chlorination processes to ensure consistent water safety standards",
    );
  } else if (
    lowestScore === metricScores.pressure &&
    metricScores.pressure < 6
  ) {
    insights.push(
      "PRIORITY AREA - PRESSURE MANAGEMENT: Address pressure variations to improve distribution efficiency",
    );
  }

  // Insight 9: Operational Efficiency
  if (
    overallScore >= 7 &&
    schemeData.weeklyAvgLpcd >= 55 &&
    waterConsistency.consistent7Days === waterConsistency.totalVillages
  ) {
    insights.push(
      "OPERATIONAL EXCELLENCE: Scheme demonstrates best practices in water supply management and service delivery",
    );
  }

  // Insight 10: Recommendations Summary
  if (overallScore < 6) {
    insights.push(
      "RECOMMENDATION: Implement comprehensive performance improvement plan focusing on identified operational gaps",
    );
  } else if (overallScore < 8) {
    insights.push(
      "RECOMMENDATION: Continuous improvement initiatives recommended to achieve operational excellence",
    );
  } else {
    insights.push(
      "RECOMMENDATION: Maintain current operational standards and focus on sustainability measures",
    );
  }

  return insights.slice(0, 8); // Return top 8 most relevant insights
}

// --- Chart Bar Colors ---
const chartColors = ["#FF7A00", "#0A1D56", "#B0B0B0"];
let barColorIndex = 0;
function getNextBarColor() {
  const color = chartColors[barColorIndex % chartColors.length];
  barColorIndex++;
  return color;
}

// --- Updated Theme Colors ---
const themeColors = {
  darkBlue: "#0A1D56",
  orange: "#FF7A00",
  grey: "#B0B0B0",
  lightGrey: "#E0E0E0",
  white: "#FFFFFF",
};

// --- Common Styles ---
const sectionHeaderStyle = {
  fontSize: 14,
  bold: true,
  color: themeColors.white,
  fillColor: themeColors.darkBlue,
  margin: [0, 6, 0, 6],
  alignment: "center",
  font: "PTSerif",
};

const metricTextStyle = {
  fontSize: 12,
  color: themeColors.darkBlue,
  margin: [0, 2, 0, 2],
  alignment: "center",
  font: "PTSerif",
};

const valueTextStyle = {
  fontSize: 12,
  bold: true,
  color: themeColors.orange,
  alignment: "center",
  font: "PTSerif",
};

const highlightTextStyle = {
  fontSize: 11,
  color: themeColors.darkBlue,
  margin: [0, 2, 0, 2],
  font: "PTSerif",
};

import pdfMake from "pdfmake/build/pdfmake";
import {
  generateWaterConsumptionChart,
  generateLPCDChart,
  generateChlorineChart,
  generatePressureChart,
  calculateStatistics,
} from "./chart-utils";
import { ptSerifVfs, ptSerifFonts } from "./ptserif-fonts";
import * as d3 from "d3";

// Configure PT Serif fonts for professional report appearance
pdfMake.vfs = ptSerifVfs;
pdfMake.fonts = ptSerifFonts;

interface ESRData {
  esr_name: string;
  time_duration?: string | null;
  esr_capacity?: string | null;
  chlorine: {
    value_1: string | null;
    value_2: string | null;
    value_3: string | null;
    value_4: string | null;
    value_5: string | null;
    value_6: string | null;
    value_7: string | null;
    date_1: string | null;
    date_2: string | null;
    date_3: string | null;
  };
  pressure: {
    value_1: string | null;
    value_2: string | null;
    value_3: string | null;
    value_4: string | null;
    value_5: string | null;
    value_6: string | null;
    value_7: string | null;
    date_1: string | null;
    date_2: string | null;
    date_3: string | null;
  };
  water_consumption?: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
  };
  flow_rate_m3?: string | null;
  flow_meter_connected?: string | null;
  chlorine_connected?: string | null;
  pressure_connected?: string | null;
}

interface VillageData {
  village_name: string;
  population: number;
  water_consumption: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
    date4: string | null;
    date5: string | null;
    date6: string | null;
    date7: string | null;
  };
  lpcd: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1: string | null;
    date2: string | null;
    date3: string | null;
    date4: string | null;
    date5: string | null;
    date6: string | null;
    date7: string | null;
  };
  esrs: ESRData[];
}

interface SchemeReportData {
  schemeInfo: {
    scheme_id: string;
    scheme_name: string;
    region: string;
    circle?: string;
    division: string;
    sub_division?: string;
    block: string;
    agency?: string;
    total_villages: number;
    total_villages_integrated?: number;
    fully_completed_villages?: number;
    no_of_functional_village?: number;
    no_of_partial_village?: number;
    no_of_non_functional_village?: number;
    total_esr: number;
    total_esr_integrated?: number;
    no_fully_completed_esr?: number;
    balance_to_complete_esr?: number;
    flow_meters_connected?: number;
    pressure_transmitter_connected?: number;
    residual_chlorine_analyzer_connected?: number;
    scheme_functional_status?: string;
    fully_completion_scheme_status?: string;
    mjp_commissioned?: string;
    mjp_fully_completed?: string;
    dashboard_url?: string;
  };
  villagesData: VillageData[];
}

function safeParseNumber(value: string | null | undefined): number {
  if (!value || value === "--" || value === "null" || value === "undefined")
    return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function countDaysInRange(
  values: (string | null)[],
  min: number,
  max: number,
): number {
  return values.filter((v) => {
    const num = safeParseNumber(v);
    return num > 0 && num >= min && num <= max;
  }).length;
}

function countDaysAbove(values: (string | null)[], threshold: number): number {
  return values.filter((v) => {
    const num = safeParseNumber(v);
    return num > threshold;
  }).length;
}

function countDaysBelow(values: (string | null)[], threshold: number): number {
  return values.filter((v) => {
    const num = safeParseNumber(v);
    return num > 0 && num < threshold;
  }).length;
}

function parseTimeDurationToDecimal(
  timeDuration: string | null | undefined,
): number {
  if (!timeDuration || timeDuration === "0" || timeDuration === "--") return 0;
  const parsed = parseFloat(timeDuration);
  if (isNaN(parsed)) return 0;
  const hours = Math.floor(parsed);
  const minutes = Math.round((parsed - hours) * 100);
  return hours + minutes / 60;
}

function formatDecimalToTimeDuration(decimalHours: number): string {
  if (decimalHours === 0) return "0";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}.${minutes.toString().padStart(2, "0")}`;
}

function calculateAverageTimeDuration(esrs: ESRData[]): string {
  if (esrs.length === 0) return "0";
  const decimalHours = esrs.map((esr) =>
    parseTimeDurationToDecimal(esr.time_duration),
  );
  const validHours = decimalHours.filter((h) => h > 0);
  if (validHours.length === 0) return "0";
  const average = validHours.reduce((sum, h) => sum + h, 0) / validHours.length;
  return formatDecimalToTimeDuration(average);
}

function calculateTotalESRCapacity(villagesData: VillageData[]): number {
  let total = 0;
  villagesData.forEach((village) => {
    village.esrs.forEach((esr) => {
      const capacity = safeParseNumber(esr.esr_capacity);
      total += capacity;
    });
  });
  return total;
}

// Calculate overall scheme score (0-10 scale)
function calculateSchemeScore(villagesData: VillageData[]): number {
  if (!villagesData || villagesData.length === 0) return 0;

  // Get scheme-level LPCD from calculateSchemeData
  const schemeData = calculateSchemeData(villagesData);
  const schemeLpcdValue = schemeData.schemeLpcdNumbers.day7;

  // LPCD score (weight: 40%) - Using scheme-level latest day (day7)
  const lpcdScore = schemeLpcdValue >= 55 ? 10 : (schemeLpcdValue / 55) * 10;

  // Calculate chlorine and pressure scores across all ESRs in all villages
  let chlorineSum = 0;
  let totalESRs = 0;
  let pressureSum = 0;

  villagesData.forEach((village) => {
    village.esrs.forEach((esr) => {
      totalESRs++;

      // Calculate chlorine score (0 if no data or value is 0)
      const chlorineValue = safeParseNumber(esr.chlorine.value_7);
      if (chlorineValue > 0) {
        const chlorineScore =
          chlorineValue >= 0.2 && chlorineValue <= 0.5
            ? 10
            : chlorineValue > 0.5
              ? 7
              : 5;
        chlorineSum += chlorineScore;
      } else {
        chlorineSum += 0; // No data or 0 value = 0 score
      }

      // Calculate pressure score (0 if no data or value is 0)
      const pressureValue = safeParseNumber(esr.pressure.value_7);
      if (pressureValue > 0) {
        const pressureScore =
          pressureValue >= 0.2 && pressureValue <= 0.7
            ? 10
            : pressureValue > 0.7
              ? 7
              : 5;
        pressureSum += pressureScore;
      } else {
        pressureSum += 0; // No data or 0 value = 0 score
      }
    });
  });

  // Calculate average scores across ALL ESRs
  const avgChlorineScore = totalESRs > 0 ? chlorineSum / totalESRs : 0;
  const avgPressureScore = totalESRs > 0 ? pressureSum / totalESRs : 0;

  // Calculate final scheme score with weights
  const schemeScore =
    lpcdScore * 0.4 + avgChlorineScore * 0.3 + avgPressureScore * 0.3;

  return Math.round(schemeScore * 10) / 10;
}

// Calculate individual metric scores
function calculateMetricScores(villagesData: VillageData[]) {
  // Get scheme-level LPCD from calculateSchemeData
  const schemeData = calculateSchemeData(villagesData);
  const schemeLpcdValue = schemeData.schemeLpcdNumbers.day7;

  // LPCD score - Using scheme-level latest day (day7)
  const lpcdScore = schemeLpcdValue >= 55 ? 10 : (schemeLpcdValue / 55) * 10;

  // Calculate chlorine and pressure scores across all ESRs
  let chlorineTotal = 0;
  let pressureTotal = 0;
  let totalESRs = 0;

  villagesData.forEach((village) => {
    village.esrs.forEach((esr) => {
      totalESRs++;

      // Calculate chlorine score (0 if no data or value is 0)
      const chlorineValue = safeParseNumber(esr.chlorine.value_7);
      if (chlorineValue > 0) {
        chlorineTotal +=
          chlorineValue >= 0.2 && chlorineValue <= 0.5
            ? 10
            : chlorineValue > 0.5
              ? 7
              : 5;
      } else {
        chlorineTotal += 0; // No data or 0 value = 0 score
      }

      // Calculate pressure score (0 if no data or value is 0)
      const pressureValue = safeParseNumber(esr.pressure.value_7);
      if (pressureValue > 0) {
        pressureTotal +=
          pressureValue >= 0.2 && pressureValue <= 0.7
            ? 10
            : pressureValue > 0.7
              ? 7
              : 5;
      } else {
        pressureTotal += 0; // No data or 0 value = 0 score
      }
    });
  });

  return {
    lpcd: Math.round(lpcdScore * 10) / 10,
    chlorine:
      totalESRs > 0 ? Math.round((chlorineTotal / totalESRs) * 10) / 10 : 0,
    pressure:
      totalESRs > 0 ? Math.round((pressureTotal / totalESRs) * 10) / 10 : 0,
  };
}

// Calculate water supply consistency
function calculateWaterSupplyConsistency(villagesData: VillageData[]) {
  let consistent7Days = 0;
  let consistent30Days = 0; // Estimated based on 7-day pattern

  villagesData.forEach((village) => {
    const waterValues = [
      village.water_consumption.day1,
      village.water_consumption.day2,
      village.water_consumption.day3,
      village.water_consumption.day4,
      village.water_consumption.day5,
      village.water_consumption.day6,
      village.water_consumption.day7,
    ];

    const daysWithWater = waterValues.filter(
      (v) => safeParseNumber(v) > 0,
    ).length;

    if (daysWithWater === 7) {
      consistent7Days++;
      consistent30Days++; // If consistent for 7 days, assume consistent for 30
    } else if (daysWithWater >= 5) {
      consistent30Days++; // If 5-6 days, likely consistent for 30 days
    }
  });

  return {
    consistent7Days,
    consistent30Days,
    totalVillages: villagesData.length,
  };
}

// Calculate chlorine quality summary based on value_7 (latest day)
function calculateChlorineQuality(villagesData: VillageData[]) {
  let lowChlorine = 0;
  let moderateChlorine = 0;
  let highChlorine = 0;
  let totalESRs = 0;

  villagesData.forEach((village) => {
    village.esrs.forEach((esr) => {
      const chlorineValue = safeParseNumber(esr.chlorine.value_7);
      totalESRs++;

      if (chlorineValue < 0.2) {
        lowChlorine++;
      } else if (chlorineValue >= 0.2 && chlorineValue <= 0.5) {
        moderateChlorine++;
      } else if (chlorineValue > 0.5) {
        highChlorine++;
      }
    });
  });

  return {
    lowChlorine,
    moderateChlorine,
    highChlorine,
    totalESRs,
  };
}

// Calculate pressure quality summary based on value_7 (latest day)
function calculatePressureQuality(villagesData: VillageData[]) {
  let lowPressure = 0;
  let moderatePressure = 0;
  let highPressure = 0;
  let totalESRs = 0;

  villagesData.forEach((village) => {
    village.esrs.forEach((esr) => {
      const pressureValue = safeParseNumber(esr.pressure.value_7);
      totalESRs++;

      if (pressureValue < 0.2) {
        lowPressure++;
      } else if (pressureValue >= 0.2 && pressureValue <= 0.7) {
        moderatePressure++;
      } else if (pressureValue > 0.7) {
        highPressure++;
      }
    });
  });

  return {
    lowPressure,
    moderatePressure,
    highPressure,
    totalESRs,
  };
}

// Generate key highlights with enhanced context
function generateKeyHighlights(data: SchemeReportData): string[] {
  const highlights: string[] = [];
  const { schemeInfo, villagesData } = data;

  // Calculate enhanced metrics
  const waterConsistency = calculateWaterSupplyConsistency(villagesData);
  const chlorineQuality = calculateChlorineQuality(villagesData);
  const pressureQuality = calculatePressureQuality(villagesData);
  const schemeData = calculateSchemeData(villagesData);

  // // Village completion highlight with tick mark for 100%
  // const completionRate =
  //   schemeInfo.total_villages > 0
  //     ? Math.round(
  //       ((schemeInfo.fully_completed_villages || 0) /
  //         schemeInfo.total_villages) *
  //       100,
  //     )
  //     : 0;
  // const tickMark = completionRate === 100 ? " ✓" : "";
  // highlights.push(
  //   `${completionRate}% village completion rate (${schemeInfo.fully_completed_villages || 0} of ${schemeInfo.total_villages} villages fully completed)${tickMark}`,
  // );

  // LPCD performance
  const lpcdAbove55 = villagesData.filter(
    (v) => safeParseNumber(v.lpcd.day1) >= 55,
  ).length;
  const villagesNotAchieving55 = villagesData.length - lpcdAbove55;
  const lpcdPercentage =
    villagesData.length > 0
      ? Math.round((lpcdAbove55 / villagesData.length) * 100)
      : 0;
  highlights.push(
    `${lpcdPercentage === 0 ? "Zero percent" : lpcdPercentage + "%"} of villages meet LPCD threshold of 55 (${lpcdAbove55} of ${villagesData.length} villages)`,
  );

  // Water supply consistency - 7 days
  const consistency7Rate =
    waterConsistency.totalVillages > 0
      ? Math.round(
          (waterConsistency.consistent7Days / waterConsistency.totalVillages) *
            100,
        )
      : 0;
  highlights.push(
    `Consistent water supply last 7 days: ${consistency7Rate === 0 ? "zero percent" : consistency7Rate + "%"} villages (${waterConsistency.consistent7Days} of ${waterConsistency.totalVillages})`,
  );

  // Water supply consistency - 30 days (estimated)
  const consistency30Rate =
    waterConsistency.totalVillages > 0
      ? Math.round(
          (waterConsistency.consistent30Days / waterConsistency.totalVillages) *
            100,
        )
      : 0;
  highlights.push(
    `Consistent water supply last 30 days: ${consistency30Rate === 0 ? "zero percent" : consistency30Rate + "%"} villages (${waterConsistency.consistent30Days} of ${waterConsistency.totalVillages})`,
  );

  // Chlorine quality summary with detailed breakdown
  if (chlorineQuality.totalESRs > 0) {
    highlights.push(
      `Chlorine (0.2-0.5 mg/L): ${chlorineQuality.moderateChlorine} ESRs`,
    );
    highlights.push(
      `Chlorine (>0.5 mg/L): ${chlorineQuality.highChlorine} ESRs`,
    );
    highlights.push(
      `Chlorine (<0.2 mg/L): ${chlorineQuality.lowChlorine} ESRs`,
    );
  }

  // Pressure quality summary with detailed breakdown
  if (pressureQuality.totalESRs > 0) {
    highlights.push(
      `Pressure (0.2-0.7 bar): ${pressureQuality.moderatePressure} ESRs`,
    );
    highlights.push(
      `Pressure (>0.7 bar): ${pressureQuality.highPressure} ESRs`,
    );
    highlights.push(`Pressure (<0.2 bar): ${pressureQuality.lowPressure} ESRs`);
  }

  // Weekly LPCD performance
  highlights.push(
    `Weekly LPCD range: ${schemeData.weeklyLowLpcd.toFixed(1)}L - ${schemeData.weeklyPeakLpcd.toFixed(1)}L (Avg: ${schemeData.weeklyAvgLpcd.toFixed(1)}L)`,
  );

  return highlights;
}

// Calculate scheme-level aggregated data from all villages
function calculateSchemeData(villagesData: VillageData[]) {
  const totalPopulation = villagesData.reduce(
    (sum, v) => sum + (v.population || 0),
    0,
  );

  // Aggregate water consumption for 7 days (as numbers for calculations)
  const schemeWaterNumbers = {
    day1: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day1),
      0,
    ),
    day2: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day2),
      0,
    ),
    day3: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day3),
      0,
    ),
    day4: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day4),
      0,
    ),
    day5: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day5),
      0,
    ),
    day6: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day6),
      0,
    ),
    day7: villagesData.reduce(
      (sum, v) => sum + safeParseNumber(v.water_consumption.day7),
      0,
    ),
  };

  // For chart generation (as strings)
  const schemeWater = {
    day1: schemeWaterNumbers.day1.toFixed(2),
    day2: schemeWaterNumbers.day2.toFixed(2),
    day3: schemeWaterNumbers.day3.toFixed(2),
    day4: schemeWaterNumbers.day4.toFixed(2),
    day5: schemeWaterNumbers.day5.toFixed(2),
    day6: schemeWaterNumbers.day6.toFixed(2),
    day7: schemeWaterNumbers.day7.toFixed(2),
    date1: villagesData[0]?.water_consumption?.date1 || "",
    date2: villagesData[0]?.water_consumption?.date2 || "",
    date3: villagesData[0]?.water_consumption?.date3 || "",
  };

  // Calculate scheme-level LPCD for 7 days (as numbers for calculations)
  // Formula: ROUND((Water in Lakh Liters * 100,000) / Population, 2) - matches backend
  const schemeLpcdNumbers = {
    day1:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day1 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day2:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day2 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day3:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day3 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day4:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day4 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day5:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day5 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day6:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day6 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
    day7:
      totalPopulation > 0
        ? parseFloat(
            ((schemeWaterNumbers.day7 * 100000) / totalPopulation).toFixed(2),
          )
        : 0,
  };

  // For chart generation (as strings)
  const schemeLpcd = {
    day1: schemeLpcdNumbers.day1.toFixed(2),
    day2: schemeLpcdNumbers.day2.toFixed(2),
    day3: schemeLpcdNumbers.day3.toFixed(2),
    day4: schemeLpcdNumbers.day4.toFixed(2),
    day5: schemeLpcdNumbers.day5.toFixed(2),
    day6: schemeLpcdNumbers.day6.toFixed(2),
    day7: schemeLpcdNumbers.day7.toFixed(2),
    date1: villagesData[0]?.lpcd?.date1 || "",
    date2: villagesData[0]?.lpcd?.date2 || "",
    date3: villagesData[0]?.lpcd?.date3 || "",
  };

  const lpcdValues = [
    schemeLpcdNumbers.day1,
    schemeLpcdNumbers.day2,
    schemeLpcdNumbers.day3,
    schemeLpcdNumbers.day4,
    schemeLpcdNumbers.day5,
    schemeLpcdNumbers.day6,
    schemeLpcdNumbers.day7,
  ].filter((v) => v > 0);
  const waterValues = [
    schemeWaterNumbers.day1,
    schemeWaterNumbers.day2,
    schemeWaterNumbers.day3,
    schemeWaterNumbers.day4,
    schemeWaterNumbers.day5,
    schemeWaterNumbers.day6,
    schemeWaterNumbers.day7,
  ].filter((v) => v > 0);

  const latestLpcd = schemeLpcdNumbers.day1 || 0;
  const weeklyPeakLpcd = lpcdValues.length > 0 ? Math.max(...lpcdValues) : 0;
  const weeklyAvgLpcd =
    lpcdValues.length > 0
      ? lpcdValues.reduce((a, b) => a + b, 0) / lpcdValues.length
      : 0;
  const weeklyLowLpcd = lpcdValues.length > 0 ? Math.min(...lpcdValues) : 0;

  const latestWater = schemeWaterNumbers.day1 || 0;
  const weeklyAvgWater =
    waterValues.length > 0
      ? waterValues.reduce((a, b) => a + b, 0) / waterValues.length
      : 0;

  // Villages achieving 55 LPCD based on lpcd_value_day7 > 55
  const villagesAchieving55 = villagesData.filter(
    (v) => safeParseNumber(v.lpcd.day7) >= 55,
  ).length;
  const villagesNotAchieving55 = villagesData.length - villagesAchieving55;

  // ESRs with water supply based on water_value_day7 > 0
  const esrsWithWater = villagesData
    .filter((v) => safeParseNumber(v.water_consumption.day7) > 0)
    .reduce((sum, v) => sum + v.esrs.length, 0);

  // Calculate LPCD ranges for distribution bar
  const lpcdRanges = {
    below25: lpcdValues.filter((v) => v < 25).length,
    range2540: lpcdValues.filter((v) => v >= 25 && v < 40).length,
    range4055: lpcdValues.filter((v) => v >= 40 && v < 55).length,
    range5580: lpcdValues.filter((v) => v >= 55 && v < 80).length,
    above80: lpcdValues.filter((v) => v >= 80).length,
  };

  return {
    totalPopulation,
    schemeWater, // String version for charts
    schemeWaterNumbers, // Number version for display
    schemeLpcd, // String version for charts
    schemeLpcdNumbers, // Number version for calculations
    latestLpcd,
    weeklyPeakLpcd,
    weeklyAvgLpcd,
    weeklyLowLpcd,
    latestWater,
    weeklyAvgWater,
    villagesAchieving55,
    villagesNotAchieving55,
    esrsWithWater,
    lpcdRanges,
    totalDays: lpcdValues.length,
  };
}

// Define ChartData type
interface ChartData {
  label: string;
  value: number;
}

// Adjust chart dimensions and font styles for better visibility
async function generateD3Chart(
  data: ChartData[],
  title: string,
  xLabel: string,
  yLabel: string,
): Promise<string> {
  const width = 1000; // Increased width
  const height = 700; // Increased height
  const margin = { top: 100, right: 100, bottom: 100, left: 100 }; // Increased margins

  const svg = d3.create("svg").attr("width", width).attr("height", height);

  const x = d3
    .scaleBand()
    .domain(data.map((d: ChartData) => d.label))
    .range([margin.left, width - margin.right])
    .padding(0.1);

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, (d: ChartData) => d.value) || 0])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = (g: any) => {
    g.attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("text-anchor", "end")
      .style("font-size", "24px") // Increased from 14px to 24px (almost 2x)
      .style("fill", "#000") // Black font color
      .attr("transform", "rotate(-45)");
  };

  const yAxis = (g: any) => {
    g.attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "24px") // Increased from 14px to 24px (almost 2x)
      .style("fill", "#000"); // Black font color
  };

  svg
    .append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d: ChartData) => x(d.label) || 0)
    .attr("y", (d: ChartData) => y(d.value))
    .attr("height", (d: ChartData) => y(0) - y(d.value))
    .attr("width", x.bandwidth())
    .attr("fill", "steelblue");

  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  // Add X axis label
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", height - 20)
    .attr("text-anchor", "middle")
    .style("font-size", "28px") // Large font for axis label
    .style("fill", "#000") // Black font color
    .text(xLabel);

  // Add Y axis label
  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "28px") // Large font for axis label
    .style("fill", "#000") // Black font color
    .text(yLabel);

  // Add title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", margin.top / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "32px") // Increased from 22px to 32px
    .style("fill", "#000") // Black font color for title
    .style("font-weight", "bold")
    .text(title);

  // Add data labels on bars
  svg
    .append("g")
    .selectAll("text")
    .data(data)
    .join("text")
    .text((d: ChartData) => d.value)
    .attr("x", (d: ChartData) => (x(d.label) || 0) + x.bandwidth() / 2)
    .attr("y", (d: ChartData) => y(d.value) - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "20px") // Large font for data labels
    .style("fill", "#000") // Black font color
    .style("font-weight", "bold");

  return svg.node()?.outerHTML || "";
}

// Function to calculate triangle position based on weekly LPCD average
// The LPCD distribution table is 40% of page width (535 * 0.4 = 214 points)
// with 5 equal columns (20% each), so each column is 42.8 points wide
function calculateTrianglePosition(weeklyAvgLpcd: number): number {
  const tableWidth = 214; // 40% of 535 page width
  const columnWidth = tableWidth / 5; // 42.8 points per column

  // Return the center position of each range
  if (weeklyAvgLpcd < 25) return columnWidth * 0.5; // Center of range 1: ~21.4
  if (weeklyAvgLpcd < 40) return columnWidth * 1.5; // Center of range 2: ~64.2
  if (weeklyAvgLpcd < 55) return columnWidth * 2.5; // Center of range 3: ~107.0
  if (weeklyAvgLpcd < 80) return columnWidth * 3.5; // Center of range 4: ~149.8
  return columnWidth * 4.5; // Center of range 5: ~192.6
}

// Get yesterday's date in DD/MM/YYYY format
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export async function generateProfessionalSchemePDF(
  data: SchemeReportData,
): Promise<void> {
  const { schemeInfo, villagesData } = data;
  // Debug log to ensure the updated PDF generator is executed
  // This will appear in the browser or server console when PDF generation runs
  // Remove or comment out after verification
  // eslint-disable-next-line no-console
  console.log(
    "[PDF] generateProfessionalSchemePDF called — using updated template",
  );

  // Calculate scores
  const overallScore = calculateSchemeScore(villagesData);
  const metricScores = calculateMetricScores(villagesData);
  const highlights = generateKeyHighlights(data);

  // Calculate scheme-level aggregated data
  const schemeData = calculateSchemeData(villagesData);

  // Generate scheme-level charts
  const schemeLpcdChart = await generateLPCDChart(
    schemeData.schemeLpcd,
    schemeInfo.scheme_name,
  );
  const schemeWaterChart = await generateWaterConsumptionChart(
    schemeData.schemeWater,
    schemeInfo.scheme_name,
  );

  // Generate all village-level charts
  const chartPromises: Promise<any>[] = [];
  const villageCharts: { [key: string]: { water: string; lpcd: string } } = {};
  const esrCharts: {
    [key: string]: { chlorine: string; pressure: string; water?: string };
  } = {};

  for (const village of villagesData) {
    chartPromises.push(
      generateWaterConsumptionChart(
        village.water_consumption,
        village.village_name,
      ).then((img) => {
        if (!villageCharts[village.village_name])
          villageCharts[village.village_name] = { water: "", lpcd: "" };
        villageCharts[village.village_name].water = img;
      }),
      generateLPCDChart(village.lpcd, village.village_name).then((img) => {
        if (!villageCharts[village.village_name])
          villageCharts[village.village_name] = { water: "", lpcd: "" };
        villageCharts[village.village_name].lpcd = img;
      }),
    );

    // In the chart generation section, update the ESR chart calls:

    for (const esr of village.esrs) {
      const esrKey = `${village.village_name}_${esr.esr_name}`;
      chartPromises.push(
        generateChlorineChart(esr.chlorine, esr.esr_name).then((img) => {
          if (!esrCharts[esrKey])
            esrCharts[esrKey] = { chlorine: "", pressure: "" };
          esrCharts[esrKey].chlorine = img;
        }),
        generatePressureChart(esr.pressure, esr.esr_name).then((img) => {
          if (!esrCharts[esrKey])
            esrCharts[esrKey] = { chlorine: "", pressure: "" };
          esrCharts[esrKey].pressure = img;
        }),
      );

      // Generate water consumption chart for ESR if data exists
      if (esr.water_consumption) {
        chartPromises.push(
          generateWaterConsumptionChart(
            esr.water_consumption,
            esr.esr_name,
          ).then((img) => {
            if (!esrCharts[esrKey])
              esrCharts[esrKey] = { chlorine: "", pressure: "", water: "" };
            esrCharts[esrKey].water = img;
          }),
        );
      }
    }
  }

  await Promise.all(chartPromises);

  // Calculate triangle position for weekly LPCD range indicator
  const trianglePosition = calculateTrianglePosition(schemeData.weeklyAvgLpcd);

  // Get yesterday's date for display
  const yesterdayDate = getYesterdayDate();

  // Build PDF content
  const content: any[] = [];

  // Format current date/time
  const now = new Date();
  const dateTimeStr = `${now.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })} ${now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).toUpperCase()}`;

  // FIRST PAGE - Matching the provided image exactly with requested modifications
  content.push(
    // Header - matching image exactly
    {
      text: "STATE WATER AND SANITATION MISSION",
      fontSize: 14,
      bold: true,
      alignment: "center",
      margin: [0, 14, 0, 2],
      font: "PTSerif",
      color: "black",
    },
    {
      text: "Water Supply & Sanitation Dept., Govt. of Maharashtra",
      fontSize: 11,
      alignment: "center",
      margin: [0, 0, 0, 20],
      font: "PTSerif",
      color: "black",
    },
    // Scheme ID and Scheme Name with Report Date - updated layout
    {
      columns: [
        {
          width: "*",
          stack: [
            {
              text: `Scheme ID: ${schemeInfo.scheme_id || ""}`,
              fontSize: 11,
              bold: true,
              margin: [0, 0, 0, 4],
              font: "PTSerif",
              color: "black",
            },
            {
              text: `Scheme Name: ${schemeInfo.scheme_name || ""} | ${schemeInfo.region || ""}`,
              fontSize: 11,
              bold: true,
              margin: [0, 0, 0, 4],
              font: "PTSerif",
              color: "black",
            },
          ],
        },
        {
          width: "auto",
          stack: [
            {
              text: "Report Date",
              fontSize: 9,
              bold: true,
              alignment: "left",
              color: "black",
            },
            {
              text: dateTimeStr,
              fontSize: 9,
              alignment: "left",
              color: "black",
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    },
    // Blue underline below scheme name
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 2,
          color: "#1e40af",
        },
      ],
      margin: [0, 0, 0, 0],
    },
    // Main Metrics Table - 2x6 layout matching image
    {
      table: {
        widths: ["15%", "15%", "15%", "15%", "15%", "15%", "15%"],
        body: [
          // First row - Headers
          [
            {
              text: "Total No. Of ESR",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Total ESR Capacity",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Integrated\nESRs",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Total No. Of\nVillages",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Integrated\nVillages",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: `${yesterdayDate} LPCD`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "No. Of Villages Achieving 55 LPCD",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
          ],
          // Second row - Values
          [
            {
              text: `${schemeInfo.total_esr.toString()}`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${calculateTotalESRCapacity(villagesData).toFixed(2)} LL`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: schemeInfo.total_esr.toString(),
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeInfo.total_villages}`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: schemeInfo.total_villages.toString(),
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.latestLpcd.toFixed(2)} L`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: schemeData.villagesAchieving55.toString(),
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hLineColor: () => "#ffffff",
        vLineColor: () => "#ffffff",
      },
      margin: [0, 0, 0, 8],
    },
    // Second Metrics Table - 2x5 layout
    {
      table: {
        widths: ["15%", "15%", "15%", "15%", "15%", "15%"],
        body: [
          // First row - Headers
          [
            {
              text: "No.Of Villages\nnot Achieving\n55 LPCD",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Weekly Peak\nLPCD",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Weekly Low\nLPCD",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Weekly Average\nLPCD",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: `${yesterdayDate} Water\nConsumption`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
            {
              text: "Weekly Average\nWater Consumption",
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 2],
            },
          ],
          // Second row - Values
          [
            {
              text: schemeData.villagesNotAchieving55.toString(),
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.weeklyPeakLpcd.toFixed(2)} L`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.weeklyLowLpcd.toFixed(2)} L`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.weeklyAvgLpcd.toFixed(2)} L`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.schemeWaterNumbers.day1.toFixed(2)} LL`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
            {
              text: `${schemeData.weeklyAvgWater.toFixed(2)} LL`,
              fontSize: 9,
              bold: true,
              color: "black",
              alignment: "center",
              margin: [2, 2, 2, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        hLineColor: () => "#ffffff",
        vLineColor: () => "#ffffff",
      },
      margin: [0, 0, 0, 10],
    },
    // Blue line separator above charts
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 2,
          color: "#1e40af",
        },
      ],
      margin: [0, 0, 0, 6],
    },
    // Charts Section - Side by side
    {
      columns: [
        {
          width: "50%",
          stack: [
            // Weekly LPCD Title with dark grey background - Reduced thickness
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "WEEKLY LPCD",
                      fontSize: 12,
                      bold: true,
                      alignment: "center",
                      fillColor: "#5b6471",
                      color: "white",
                      margin: [3, 3, 3, 3], // Reduced padding
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 10], // Reduced margin
            },
            {
              image: schemeLpcdChart,
              width: 260,
              alignment: "center",
              margin: [0, 0, 10, 0],
            },
          ],
        },
        {
          width: "50%",
          stack: [
            // Water Consumption Title with dark grey background - Reduced thickness
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "WATER CONSUMPTION",
                      fontSize: 12,
                      bold: true,
                      alignment: "center",
                      fillColor: "#5b6471",
                      color: "white",
                      margin: [3, 3, 3, 3], // Reduced padding
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 10], // Reduced margin
            },
            {
              image: schemeWaterChart,
              width: 260,
              alignment: "center",
              margin: [10, 0, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 12],
    },

    // Blue line separator below charts
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 2,
          color: "#1e40af",
        },
      ],
      margin: [0, 0, 0, 6],
    },

    // Highlights and Weekly LPCD Distribution
    {
      columns: [
        {
          width: "60%",
          stack: [
            // Highlights Title with dark grey background - Reduced thickness
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "Highlights",
                      fontSize: 12,
                      bold: true,
                      alignment: "center",
                      fillColor: "#5b6471",
                      color: "white",
                      margin: [3, 3, 3, 3], // Reduced padding
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 8],
            },
            {
              ul: highlights.map((h) => {
                // Determine color based on chlorine and pressure ranges
                let textColor = "#000000"; // Default black
                // Chlorine coloring
                if (h.includes("Chlorine (0.2-0.5 mg/L)")) {
                  textColor = "#22c55e"; // Green for optimal
                } else if (h.includes("Chlorine (<0.2 mg/L)")) {
                  textColor = "#f59e0b"; // Orange for less than optimal
                } else if (h.includes("Chlorine (>0.5 mg/L)")) {
                  textColor = "#dc2626"; // Red for excess
                }
                // Pressure coloring
                if (h.includes("Pressure (0.2-0.7 bar)")) {
                  textColor = "#22c55e"; // Green for optimal
                } else if (h.includes("Pressure (<0.2 bar)")) {
                  textColor = "#f59e0b"; // Orange for less than optimal
                } else if (h.includes("Pressure (>0.7 bar)")) {
                  textColor = "#dc2626"; // Red for excess
                }
                return {
                  text: h,

                  fontSize: 9,

                  color: textColor,

                  margin: [0, 2, 0, 2], // Reduced space between lines

                  lineHeight: 1.1, // Reduced line height
                };
              }),
              margin: [0, 0, 0, 0],
            },
          ],
        },
        {
          width: "40%",
          stack: [
            // Weekly LPCD Distribution Title with dark grey background - Reduced thickness
            {
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      text: "Weekly LPCD Distribution",
                      fontSize: 12,
                      bold: true,
                      alignment: "center",
                      fillColor: "#5b6471",
                      color: "white",
                      margin: [3, 3, 3, 3], // Reduced padding
                    },
                  ],
                ],
              },
              layout: "noBorders",
              margin: [0, 0, 0, 8],
            },
            {
              stack: [
                // LPCD Range Bars
                {
                  table: {
                    widths: ["20%", "20%", "20%", "20%", "20%"],
                    body: [
                      [
                        {
                          text: "< 25",
                          fontSize: 8,
                          alignment: "center",
                          fillColor: "#dc2626",
                          color: "white",
                          margin: [2, 6, 2, 6],
                        },
                        {
                          text: "25-40",
                          fontSize: 8,
                          alignment: "center",
                          fillColor: "#ea580c",
                          color: "white",
                          margin: [2, 6, 2, 6],
                        },
                        {
                          text: "40-55",
                          fontSize: 8,
                          alignment: "center",
                          fillColor: "#f59e0b",
                          color: "white",
                          margin: [2, 6, 2, 6],
                        },
                        {
                          text: "55-80",
                          fontSize: 8,
                          alignment: "center",
                          fillColor: "#22c55e",
                          color: "white",
                          margin: [2, 6, 2, 6],
                        },
                        {
                          text: ">80",
                          fontSize: 8,
                          alignment: "center",
                          fillColor: "#16a34a",
                          color: "white",
                          margin: [2, 6, 2, 6],
                        },
                      ],
                    ],
                  },
                  layout: "noBorders",
                  margin: [0, 20, 0, 0],
                },
                // Dynamic triangle indicator based on weekly average LPCD
                // {
                //   canvas: [
                //     {
                //       type: "polygon",
                //       points: [
                //         { x: trianglePosition - 8, y: 0 }, // Left point at top
                //         { x: trianglePosition, y: 8 }, // Bottom center point (pointing down)
                //         { x: trianglePosition + 8, y: 0 }, // Right point at top
                //       ],
                //       color: "#000000ff", // Dark blue color for better visibility
                //       lineColor: "#000000ff",
                //       lineWidth: 2,
                //     },
                //   ],
                //   margin: [0, -8, 0, 0],
                // },

                // Dynamic triangle indicator pointing to the LPCD range based on weekly average
                {
                  canvas: [
                    {},
                    {
                      type: "polyline",
                      lineWidth: 0,
                      closePath: true,
                      points: [
                        { x: trianglePosition, y: 0 },
                        { x: trianglePosition - 6, y: 10 },
                        { x: trianglePosition + 6, y: 10 },
                      ],
                      color: "#3b82f6",
                    },
                  ],
                  margin: [0, -2, 0, 0],
                },
              ],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 0],
    },
    { text: "", pageBreak: "after" },
  );

  // VILLAGE COMPARISON - Enhanced Table with reduced header
  content.push(
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 30, // Reduced from 35 to 30
          color: "#5b6471",
        },
      ],
      margin: [0, 0, 0, 0],
    },
    {
      stack: [
        {
          text: "VILLAGE PERFORMANCE REPORT",
          fontSize: 18,
          bold: true,
          color: "white",
          alignment: "center",
          margin: [0, -24, 0, 2], // Adjusted margin for spacing above underline
        },
        {
          canvas: [
            {
              type: "line",
              x1: 0, // starting x-position (adjust as needed)
              y1: 0,
              x2: 285, // ending x-position (adjust as needed)
              y2: 0,
              lineWidth: 2,
              lineColor: "white",
            },
          ],
          margin: [0, -4, 0, 22], // space below underline
        },
      ],
      alignment: "center",
    },
  );

  const comparisonTableBody: any[] = [
    [
      {
        text: "Rank",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        alignment: "center",
        margin: [3, 6, 3, 6],
      },
      {
        text: "Village Name",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        margin: [3, 6, 3, 6],
      },
      {
        text: "Population",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        alignment: "center",
        margin: [3, 6, 3, 6],
      },
      {
        text: "LPCD",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        alignment: "center",
        margin: [3, 6, 3, 6],
      },
      {
        text: "Water (LL)",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        alignment: "center",
        margin: [3, 6, 3, 6],
      },
      {
        text: "Time (Hrs)",
        fillColor: "#5b6471",
        color: "white",
        bold: true,
        fontSize: 9,
        alignment: "center",
        margin: [3, 6, 3, 6],
      },
    ],
  ];

  // Sort villages by LPCD
  const sortedVillages = [...villagesData].sort(
    (a, b) => safeParseNumber(b.lpcd.day1) - safeParseNumber(a.lpcd.day1),
  );

  sortedVillages.forEach((village, index) => {
    const lpcd = safeParseNumber(village.lpcd.day1);
    const water = safeParseNumber(village.water_consumption.day1);
    const avgTimeDuration = calculateAverageTimeDuration(village.esrs);
    const rowColor = index % 2 === 0 ? "#ffffff" : "#f8fafc";

    comparisonTableBody.push([
      {
        text: (index + 1).toString(),
        alignment: "center",
        fontSize: 9,
        bold: true,
        fillColor: rowColor,
        margin: [3, 6, 3, 6],
      },
      {
        text: village.village_name,
        fontSize: 9,
        fillColor: index === 0 ? "#dbeafe" : rowColor,
        bold: index === 0,
        margin: [3, 6, 3, 6],
      },
      {
        text: village.population?.toLocaleString() || "N/A",
        alignment: "center",
        fontSize: 9,
        fillColor: rowColor,
        margin: [3, 6, 3, 6],
      },
      {
        text: lpcd.toFixed(1),
        alignment: "center",
        fontSize: 10,
        bold: true,
        color: "#1e40af",
        fillColor: rowColor,
        margin: [3, 6, 3, 6],
      },
      {
        text: water.toFixed(1),
        alignment: "center",
        fontSize: 9,
        fillColor: rowColor,
        margin: [3, 6, 3, 6],
      },
      {
        text: avgTimeDuration,
        alignment: "center",
        fontSize: 9,
        fillColor: rowColor,
        margin: [3, 6, 3, 6],
      },
    ]);
  });

  content.push(
    {
      table: {
        headerRows: 1,
        widths: [40, "*", 70, 55, 60, 50],
        body: comparisonTableBody,
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#cbd5e1",
        vLineColor: () => "#cbd5e1",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      margin: [0, 0, 0, 18],
    },
    // { text: '', pageBreak: 'after' }
  );

  // DETAILED PERFORMANCE ANALYSIS TABLE - Enhanced with reduced header and new columns
  content.push(
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 30, // Reduced from 35 to 30
          color: "#5b6471",
        },
      ],
      margin: [0, 0, 0, 0],
    },
    {
      text: "DETAILED PERFORMANCE ANALYSIS",
      fontSize: 14,
      bold: true,
      color: "white",
      alignment: "center",
      margin: [0, -24, 0, 18], // Adjusted margin for reduced height
    },
  );

  const detailedTableBody: any[] = [];

  detailedTableBody.push([
    {
      text: "Sr",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 8,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Village",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 8,
      margin: [5, 5, 5, 5],
    },
    {
      text: "ESR",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 8,
      margin: [5, 5, 5, 5],
    },
    {
      text: "ESR Outlet",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      margin: [5, 5, 5, 5],
    },
    {
      text: "Flow Meter",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Water Consumption (m3)",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Chlorine",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Chlorine Value (mg/L)",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Pressure",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Pressure Value (bar)",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
    {
      text: "Time (Hrs)",
      fillColor: "#5b6471",
      color: "white",
      bold: true,
      fontSize: 7,
      alignment: "center",
      margin: [5, 5, 5, 5],
    },
  ]);

  // Helper function to intelligently parse ESR names
  function parseESRName(esrName: string): { baseName: string; outlet: string } {
    const trimmed = esrName.trim();

    const outletPatterns = [
      /[-\s]+Outlet[-\s]+\d+[-\s]*P?\d*/i,
      /[-\s]+Outlet[-\s]+[A-Z]\d*/i,
      /[-\s]+P\d+$/i,
      /[-\s]+[A-Z]\d+$/,
    ];

    for (const pattern of outletPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        const baseName = trimmed.substring(0, match.index).trim();
        const outlet = match[0].trim().replace(/^[-\s]+/, "");
        return { baseName, outlet };
      }
    }

    return { baseName: trimmed, outlet: "" };
  }

  // Group ESRs by village and base ESR name for cell merging
  interface ProcessedESR {
    esr: ESRData;
    baseName: string;
    outlet: string;
  }

  interface ESRGroup {
    baseName: string;
    outlets: ProcessedESR[];
  }

  interface VillageGroup {
    village: VillageData;
    esrGroups: ESRGroup[];
    totalESRCount: number;
  }

  const villageGroups: VillageGroup[] = villagesData.map((village) => {
    const processedESRs: ProcessedESR[] = village.esrs.map((esr) => {
      const parsed = parseESRName(esr.esr_name);
      return {
        esr,
        baseName: parsed.baseName,
        outlet: parsed.outlet || "Single Outlet",
      };
    });

    const esrMap = new Map<string, ProcessedESR[]>();
    processedESRs.forEach((pEsr) => {
      if (!esrMap.has(pEsr.baseName)) {
        esrMap.set(pEsr.baseName, []);
      }
      esrMap.get(pEsr.baseName)!.push(pEsr);
    });

    const esrGroups: ESRGroup[] = Array.from(esrMap.entries()).map(
      ([baseName, outlets]) => ({
        baseName,
        outlets,
      }),
    );

    return {
      village,
      esrGroups,
      totalESRCount: village.esrs.length,
    };
  });

  let villageSerialNo = 1;
  villageGroups.forEach((villageGroup) => {
    const { village, esrGroups, totalESRCount } = villageGroup;
    const rowColor = villageSerialNo % 2 === 0 ? "#ffffff" : "#f8fafc";

    if (totalESRCount === 0) {
      detailedTableBody.push([
        {
          text: villageSerialNo.toString(),
          alignment: "center",
          fontSize: 8,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: village.village_name,
          fontSize: 8,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "No ESR",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
        {
          text: "N/A",
          alignment: "center",
          fontSize: 7,
          fillColor: rowColor,
          margin: [5, 5, 5, 5],
        },
      ]);
      villageSerialNo++;
    } else {
      let isFirstRowOfVillage = true;

      esrGroups.forEach((esrGroup, groupIndex) => {
        const { baseName, outlets } = esrGroup;

        outlets.forEach((processedESR, outletIndex) => {
          const { esr, outlet } = processedESR;
          const esrRowColor = villageSerialNo % 2 === 0 ? "#ffffff" : "#f8fafc";

          const flowMeterStatus =
            esr.flow_meter_connected === "Connected" ? "Connected" : "Not";
          const chlorineStatus =
            esr.chlorine_connected === "Connected" ? "Connected" : "Not";
          const pressureStatus =
            esr.pressure_connected === "Connected" ? "Connected" : "Not";

          const waterConsumptionValue = esr.water_consumption?.day7 ?? "--";
          const chlorineValue = esr.chlorine.value_7 || "--";
          const pressureValue = esr.pressure.value_7 || "--";
          const timeDuration = esr.time_duration || "0";

          const row: any[] = [];

          if (isFirstRowOfVillage) {
            row.push({
              text: villageSerialNo.toString(),
              alignment: "center",
              fontSize: 8,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
              rowSpan: totalESRCount,
            });
            row.push({
              text: village.village_name,
              fontSize: 8,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
              rowSpan: totalESRCount,
              alignment: "center",
            });
            isFirstRowOfVillage = false;
          } else {
            row.push({});
            row.push({});
          }

          if (outletIndex === 0) {
            row.push({
              text: baseName,
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
              rowSpan: outlets.length,
              alignment: "center",
            });
          } else {
            row.push({});
          }

          row.push(
            {
              text: outlet,
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: flowMeterStatus,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: waterConsumptionValue,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: chlorineStatus,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: chlorineValue,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: pressureStatus,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: pressureValue,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
            {
              text: timeDuration,
              alignment: "center",
              fontSize: 7,
              fillColor: esrRowColor,
              margin: [5, 5, 5, 5],
            },
          );

          detailedTableBody.push(row);
        });
      });
      villageSerialNo++;
    }
  });

  content.push(
    {
      table: {
        headerRows: 1,
        widths: [42, 48, 45, 50, 48, 48, 48, 48, 48, 48, 48],
        body: detailedTableBody,
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#cbd5e1",
        vLineColor: () => "#cbd5e1",
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0,
      },
      fontSize: 8,
      margin: [0, 0, 0, 18],
    },
    // { text: '', pageBreak: 'after' }
  );

  // PERFORMANCE CHARTS - Enhanced with Summary Cards and reduced headers
  villagesData.forEach((village, index) => {
    const hasCharts = villageCharts[village.village_name];

    if (hasCharts) {
      // Calculate village stats for summary
      const avgWater =
        (safeParseNumber(village.water_consumption.day1) +
          safeParseNumber(village.water_consumption.day2) +
          safeParseNumber(village.water_consumption.day3) +
          safeParseNumber(village.water_consumption.day4) +
          safeParseNumber(village.water_consumption.day5) +
          safeParseNumber(village.water_consumption.day6) +
          safeParseNumber(village.water_consumption.day7)) /
        7;

      const avgLPCD =
        (safeParseNumber(village.lpcd.day1) +
          safeParseNumber(village.lpcd.day2) +
          safeParseNumber(village.lpcd.day3) +
          safeParseNumber(village.lpcd.day4) +
          safeParseNumber(village.lpcd.day5) +
          safeParseNumber(village.lpcd.day6) +
          safeParseNumber(village.lpcd.day7)) /
        7;

      content.push(
        {
          canvas: [
            {
              type: "rect",
              x: 0,
              y: 0,
              w: 535,
              h: 30, // Reduced from 35 to 30
              color: "#5b6471",
            },
          ],
          margin: [0, 0, 0, 0],
        },
        {
          text: `${village.village_name.toUpperCase()} - VILLAGE PERFORMANCE CHARTS`,
          fontSize: 14,
          bold: true,
          color: "white",
          alignment: "center",
          margin: [0, -24, 0, 18], // Adjusted margin for reduced height
        },
        {
          columns: [
            {
              width: "50%",
              stack: [
                {
                  image: hasCharts.water,
                  width: 245,
                  alignment: "center",
                },
              ],
            },
            {
              width: "50%",
              stack: [
                {
                  image: hasCharts.lpcd,
                  width: 245,
                  alignment: "center",
                },
              ],
            },
          ],
          columnGap: 20,
          margin: [0, 0, 0, 15],
        },
        // Summary Cards Below Charts - Compact Version
        {
          columns: [
            {
              width: "50%",
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: "Average Water Consumption",
                          fontSize: 7, // Reduced from 8
                          color: "#64748b",
                          alignment: "center",
                          margin: [0, 0, 0, 2], // Reduced margin
                        },
                        {
                          text: avgWater.toFixed(1) + " LL",
                          fontSize: 14, // Reduced from 16
                          bold: true,
                          color: "#1e40af",
                          alignment: "center",
                          margin: [0, 0, 0, 0], // Remove margin
                        },
                        {
                          text: "Past 7 Days Average",
                          fontSize: 6, // Reduced from 7
                          color: "#94a3b8",
                          alignment: "center",
                          margin: [0, 2, 0, 0], // Reduced margin
                        },
                      ],
                      fillColor: "#f8fafc",
                      border: [true, true, true, true],
                      margin: [4, 4, 4, 4], // Reduced from [8,8,8,8]
                    },
                  ],
                ],
              },
              layout: {
                hLineColor: () => "#cbd5e1",
                vLineColor: () => "#cbd5e1",
                hLineWidth: () => 1,
                vLineWidth: () => 1,
              },
            },
            {
              width: "50%",
              table: {
                widths: ["*"],
                body: [
                  [
                    {
                      stack: [
                        {
                          text: "Average LPCD (Last 7 Days)",
                          fontSize: 7, // Reduced from 8
                          color: "#64748b",
                          alignment: "center",
                          margin: [0, 0, 0, 2], // Reduced margin
                        },
                        {
                          text: avgLPCD.toFixed(1) + " L",
                          fontSize: 14, // Reduced from 16
                          bold: true,
                          color: avgLPCD >= 55 ? "#059669" : "#f97316",
                          alignment: "center",
                          margin: [0, 0, 0, 0], // Remove margin
                        },
                        {
                          text:
                            avgLPCD >= 55 ? "OPTIMAL RANGE" : "BELOW THRESHOLD",
                          fontSize: 6, // Reduced from 7
                          color: avgLPCD >= 55 ? "#059669" : "#f97316",
                          alignment: "center",
                          bold: true,
                          margin: [0, 2, 0, 0], // Reduced margin
                        },
                      ],
                      fillColor: avgLPCD >= 55 ? "#d1fae5" : "#fef3c7",
                      border: [true, true, true, true],
                      margin: [4, 4, 4, 4], // Reduced from [8,8,8,8]
                    },
                  ],
                ],
              },
              layout: {
                hLineColor: () => "#cbd5e1",
                vLineColor: () => "#cbd5e1",
                hLineWidth: () => 1,
                vLineWidth: () => 1,
              },
            },
          ],
          columnGap: 8, // Reduced from 10
          margin: [0, 0, 0, 12], // Reduced bottom margin
        },
      );

      // Add ESR charts if available
      const esrChartsForVillage = village.esrs
        .map((esr) => {
          // Calculate chlorine stats (7 days)
          const chlorineValues = [
            safeParseNumber(esr.chlorine.value_1),
            safeParseNumber(esr.chlorine.value_2),
            safeParseNumber(esr.chlorine.value_3),
            safeParseNumber(esr.chlorine.value_4),
            safeParseNumber(esr.chlorine.value_5),
            safeParseNumber(esr.chlorine.value_6),
            safeParseNumber(esr.chlorine.value_7),
          ].filter((v) => v > 0);

          const chlorinePeak =
            chlorineValues.length > 0 ? Math.max(...chlorineValues) : 0;
          const chlorineMin =
            chlorineValues.length > 0 ? Math.min(...chlorineValues) : 0;
          const chlorineAvg =
            chlorineValues.length > 0
              ? chlorineValues.reduce((a, b) => a + b, 0) /
                chlorineValues.length
              : 0;

          // Calculate pressure stats (7 days)
          const pressureValues = [
            safeParseNumber(esr.pressure.value_1),
            safeParseNumber(esr.pressure.value_2),
            safeParseNumber(esr.pressure.value_3),
            safeParseNumber(esr.pressure.value_4),
            safeParseNumber(esr.pressure.value_5),
            safeParseNumber(esr.pressure.value_6),
            safeParseNumber(esr.pressure.value_7),
          ].filter((v) => v > 0);

          const pressurePeak =
            pressureValues.length > 0 ? Math.max(...pressureValues) : 0;
          const pressureMin =
            pressureValues.length > 0 ? Math.min(...pressureValues) : 0;
          const pressureAvg =
            pressureValues.length > 0
              ? pressureValues.reduce((a, b) => a + b, 0) /
                pressureValues.length
              : 0;

          // Calculate water consumption stats (7 days) for ESR
          const waterConsumptionValues = [
            safeParseNumber(esr.water_consumption?.day1),
            safeParseNumber(esr.water_consumption?.day2),
            safeParseNumber(esr.water_consumption?.day3),
            safeParseNumber(esr.water_consumption?.day4),
            safeParseNumber(esr.water_consumption?.day5),
            safeParseNumber(esr.water_consumption?.day6),
            safeParseNumber(esr.water_consumption?.day7),
          ].filter((v) => v > 0);

          const waterConsumptionPeak =
            waterConsumptionValues.length > 0
              ? Math.max(...waterConsumptionValues)
              : 0;
          const waterConsumptionMin =
            waterConsumptionValues.length > 0
              ? Math.min(...waterConsumptionValues)
              : 0;
          const waterConsumptionAvg =
            waterConsumptionValues.length > 0
              ? waterConsumptionValues.reduce((a, b) => a + b, 0) /
                waterConsumptionValues.length
              : 0;

          const esrChartsData =
            esrCharts[`${village.village_name}_${esr.esr_name}`];

          return {
            esr_name: esr.esr_name,
            charts: esrChartsData,
            chlorine: safeParseNumber(esr.chlorine.value_1),
            chlorinePeak,
            chlorineMin,
            chlorineAvg,
            pressure: safeParseNumber(esr.pressure.value_1),
            pressurePeak,
            pressureMin,
            pressureAvg,
            waterConsumption: safeParseNumber(esr.water_consumption?.day1),
            waterConsumptionPeak,
            waterConsumptionMin,
            waterConsumptionAvg,
            chlorineConnected: esr.chlorine_connected === "Connected",
            pressureConnected: esr.pressure_connected === "Connected",
            flowConnected: esr.flow_meter_connected === "Connected",
          };
        })
        .filter(
          (item) =>
            item.charts &&
            (item.chlorineConnected ||
              item.pressureConnected ||
              item.flowConnected),
        );

      if (esrChartsForVillage.length > 0) {
        content.push(
          { text: "", pageBreak: "before" }, // Page break before ESR Monitoring Data
          {
            canvas: [
              {
                type: "rect",
                x: 0,
                y: 0,
                w: 535,
                h: 25, // Reduced from 28 to 25
                color: "#64748b",
              },
            ],
            margin: [0, 5, 0, 0],
          },
          {
            text: "ESR MONITORING DATA",
            fontSize: 12,
            bold: true,
            color: "white",
            margin: [10, -19, 0, 15], // Adjusted margin for reduced height
          },
        );

        esrChartsForVillage.forEach((esrItem) => {
          if (esrItem.charts) {
            content.push({
              text: esrItem.esr_name,
              fontSize: 11,
              bold: true,
              color: "#1e40af",
              margin: [0, 4, 0, 2],
            });

            // Add sensor status table (2x3 grid format)
            content.push({
              table: {
                widths: ["33.33%", "33.33%", "33.34%"],
                body: [
                  [
                    {
                      text: "Flow Meter",
                      fontSize: 7,
                      bold: true,
                      color: "#475569",
                      alignment: "center",
                      fillColor: "#f1f5f9",
                      margin: [2, 2, 2, 2],
                    },
                    {
                      text: "Chlorine",
                      fontSize: 7,
                      bold: true,
                      color: "#475569",
                      alignment: "center",
                      fillColor: "#f1f5f9",
                      margin: [2, 2, 2, 2],
                    },
                    {
                      text: "Pressure",
                      fontSize: 7,
                      bold: true,
                      color: "#475569",
                      alignment: "center",
                      fillColor: "#f1f5f9",
                      margin: [2, 2, 2, 2],
                    },
                  ],
                  [
                    {
                      text: esrItem.flowConnected
                        ? "Connected"
                        : "Not Connected",
                      fontSize: 7,
                      color: esrItem.flowConnected ? "#059669" : "#dc2626",
                      alignment: "center",
                      fillColor: "#ffffff",
                      margin: [2, 2, 2, 2],
                    },
                    {
                      text: esrItem.chlorineConnected
                        ? "Connected"
                        : "Not Connected",
                      fontSize: 7,
                      color: esrItem.chlorineConnected ? "#059669" : "#dc2626",
                      alignment: "center",
                      fillColor: "#ffffff",
                      margin: [2, 2, 2, 2],
                    },
                    {
                      text: esrItem.pressureConnected
                        ? "Connected"
                        : "Not Connected",
                      fontSize: 7,
                      color: esrItem.pressureConnected ? "#059669" : "#dc2626",
                      alignment: "center",
                      fillColor: "#ffffff",
                      margin: [2, 2, 2, 2],
                    },
                  ],
                ],
              },
              layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => "#cbd5e1",
                vLineColor: () => "#cbd5e1",
              },
              margin: [0, 0, 0, 8],
            });

            // In the ESR charts layout section, update the image widths:

            // Add water consumption chart if available and flow meter connected
            if (esrItem.charts.water && esrItem.flowConnected) {
              content.push({
                image: esrItem.charts.water,
                width: 220,
                alignment: "center",
                margin: [0, 0, 0, 10],
              });

              // Add water consumption statistics card - centered and same width as chart
              content.push({
                columns: [
                  {
                    width: "*",
                    text: "",
                  },
                  {
                    width: 220, // Match chart width
                    table: {
                      widths: [73, 73, 74], // Equal thirds of 220
                      body: [
                        [
                          {
                            stack: [
                              {
                                text: "Current",
                                fontSize: 6,
                                color: "#64748b",
                                alignment: "center",
                                margin: [0, 0, 0, 1],
                              },
                              {
                                text: esrItem.waterConsumption.toFixed(2),
                                fontSize: 11,
                                bold: true,
                                color: "#1e40af",
                                alignment: "center",
                                margin: [0, 0, 0, 0],
                              },
                              {
                                text: "LL",
                                fontSize: 5,
                                color: "#94a3b8",
                                alignment: "center",
                                margin: [0, 1, 0, 0],
                              },
                            ],
                            fillColor: "#f8fafc",
                            border: [true, true, false, true],
                            margin: [2, 3, 2, 3],
                          },
                          {
                            stack: [
                              {
                                text: "Peak",
                                fontSize: 6,
                                color: "#64748b",
                                alignment: "center",
                                margin: [0, 0, 0, 1],
                              },
                              {
                                text: esrItem.waterConsumptionPeak.toFixed(2),
                                fontSize: 11,
                                bold: true,
                                color: "#1e40af",
                                alignment: "center",
                                margin: [0, 0, 0, 0],
                              },
                              {
                                text: "7-Day",
                                fontSize: 5,
                                color: "#94a3b8",
                                alignment: "center",
                                margin: [0, 1, 0, 0],
                              },
                            ],
                            fillColor: "#f8fafc",
                            border: [false, true, false, true],
                            margin: [2, 3, 2, 3],
                          },
                          {
                            stack: [
                              {
                                text: "Min",
                                fontSize: 6,
                                color: "#64748b",
                                alignment: "center",
                                margin: [0, 0, 0, 1],
                              },
                              {
                                text: esrItem.waterConsumptionMin.toFixed(2),
                                fontSize: 11,
                                bold: true,
                                color: "#1e40af",
                                alignment: "center",
                                margin: [0, 0, 0, 0],
                              },
                              {
                                text: "7-Day",
                                fontSize: 5,
                                color: "#94a3b8",
                                alignment: "center",
                                margin: [0, 1, 0, 0],
                              },
                            ],
                            fillColor: "#f8fafc",
                            border: [false, true, true, true],
                            margin: [2, 3, 2, 3],
                          },
                        ],
                        [
                          {
                            stack: [
                              {
                                text: "Water Consumption (LL)",
                                fontSize: 7,
                                bold: true,
                                color: "#1e293b",
                                alignment: "center",
                                margin: [0, 0, 0, 0],
                              },
                              {
                                text: `Average: ${esrItem.waterConsumptionAvg.toFixed(2)} LL`,
                                fontSize: 6,
                                color: "#64748b",
                                alignment: "center",
                                margin: [0, 1, 0, 0],
                              },
                            ],
                            fillColor: "#ffffff",
                            border: [true, false, true, true],
                            colSpan: 3,
                            margin: [2, 2, 2, 3],
                          },
                        ],
                      ],
                    },
                    layout: {
                      hLineColor: () => "#cbd5e1",
                      vLineColor: () => "#cbd5e1",
                      hLineWidth: () => 1,
                      vLineWidth: () => 1,
                    },
                  },
                  {
                    width: "*",
                    text: "",
                  },
                ],
                margin: [0, 0, 0, 12],
              });
            }

            // Build columns array for chlorine and pressure charts based on connectivity
            const chartColumns: any[] = [];

            if (esrItem.chlorineConnected && esrItem.charts.chlorine) {
              chartColumns.push({
                width: esrItem.pressureConnected ? "50%" : "*",
                stack: [
                  {
                    image: esrItem.charts.chlorine,
                    width: 220, // Reduced from 220
                    alignment: "center",
                  },
                ],
              });
            }

            if (esrItem.pressureConnected && esrItem.charts.pressure) {
              chartColumns.push({
                width: esrItem.chlorineConnected ? "50%" : "*",
                stack: [
                  {
                    image: esrItem.charts.pressure,
                    width: 220, // Reduced from 220
                    alignment: "center",
                  },
                ],
              });
            }

            // Only add charts section if at least one sensor is connected
            if (chartColumns.length > 0) {
              content.push({
                columns: chartColumns,
                columnGap: 20,
                margin: [0, 0, 0, 12],
              });
            }

            // Enhanced ESR Summary Cards with Statistics - Compact Version
            // Make cards centered and same width as charts (220px)
            const summaryCards: any[] = [];

            if (esrItem.chlorineConnected) {
              summaryCards.push({
                width: 220, // Match chart width
                table: {
                  widths: [73, 73, 74], // Equal thirds of 220
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: "Current",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.chlorine.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color:
                              esrItem.chlorine >= 0.2 && esrItem.chlorine <= 0.5
                                ? "#059669"
                                : "#f97316",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "mg/L",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor:
                          esrItem.chlorine >= 0.2 && esrItem.chlorine <= 0.5
                            ? "#d1fae5"
                            : "#fef3c7",
                        border: [true, true, false, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                      {
                        stack: [
                          {
                            text: "Peak",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.chlorinePeak.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color: "#1e40af",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "7-Day",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#f8fafc",
                        border: [false, true, false, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                      {
                        stack: [
                          {
                            text: "Min",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.chlorineMin.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color: "#1e40af",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "7-Day",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#f8fafc",
                        border: [false, true, true, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                    ],
                    [
                      {
                        stack: [
                          {
                            text: "Chlorine Quality (mg/L)",
                            fontSize: 7, // Reduced from 8
                            bold: true,
                            color: "#1e293b",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: `Average: ${esrItem.chlorineAvg.toFixed(2)} mg/L`,
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#ffffff",
                        border: [true, false, true, true],
                        colSpan: 3,
                        margin: [2, 2, 2, 3], // Reduced from [4,4,4,5]
                      },
                    ],
                  ],
                },
                layout: {
                  hLineColor: () => "#cbd5e1",
                  vLineColor: () => "#cbd5e1",
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                },
              });
            }

            if (esrItem.pressureConnected) {
              summaryCards.push({
                width: 220, // Match chart width
                table: {
                  widths: [73, 73, 74], // Equal thirds of 220
                  body: [
                    [
                      {
                        stack: [
                          {
                            text: "Current",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.pressure.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color:
                              esrItem.pressure >= 0.2 && esrItem.pressure <= 0.7
                                ? "#059669"
                                : "#f97316",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "Bar",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor:
                          esrItem.pressure >= 0.2 && esrItem.pressure <= 0.7
                            ? "#d1fae5"
                            : "#fef3c7",
                        border: [true, true, false, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                      {
                        stack: [
                          {
                            text: "Peak",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.pressurePeak.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color: "#1e40af",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "7-Day",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#f8fafc",
                        border: [false, true, false, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                      {
                        stack: [
                          {
                            text: "Min",
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 0, 0, 1], // Reduced margin
                          },
                          {
                            text: esrItem.pressureMin.toFixed(2),
                            fontSize: 11, // Reduced from 13
                            bold: true,
                            color: "#1e40af",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: "7-Day",
                            fontSize: 5, // Reduced from 6
                            color: "#94a3b8",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#f8fafc",
                        border: [false, true, true, true],
                        margin: [2, 3, 2, 3], // Reduced from [4,5,4,5]
                      },
                    ],
                    [
                      {
                        stack: [
                          {
                            text: "Pressure Monitoring (Bar)",
                            fontSize: 7, // Reduced from 8
                            bold: true,
                            color: "#1e293b",
                            alignment: "center",
                            margin: [0, 0, 0, 0], // Remove margin
                          },
                          {
                            text: `Average: ${esrItem.pressureAvg.toFixed(2)} Bar`,
                            fontSize: 6, // Reduced from 7
                            color: "#64748b",
                            alignment: "center",
                            margin: [0, 1, 0, 0], // Reduced margin
                          },
                        ],
                        fillColor: "#ffffff",
                        border: [true, false, true, true],
                        colSpan: 3,
                        margin: [2, 2, 2, 3], // Reduced from [4,4,4,5]
                      },
                    ],
                  ],
                },
                layout: {
                  hLineColor: () => "#cbd5e1",
                  vLineColor: () => "#cbd5e1",
                  hLineWidth: () => 1,
                  vLineWidth: () => 1,
                },
              });
            }

            // Add summary cards centered below charts
            if (summaryCards.length > 0) {
              if (summaryCards.length === 1) {
                // Single card - center it
                content.push({
                  columns: [
                    { width: "*", text: "" },
                    summaryCards[0],
                    { width: "*", text: "" },
                  ],
                  margin: [0, 0, 0, 12],
                });
              } else {
                // Two cards - center them with gap
                content.push({
                  columns: [
                    { width: "*", text: "" },
                    summaryCards[0],
                    { width: 20, text: "" }, // Gap between cards
                    summaryCards[1],
                    { width: "*", text: "" },
                  ],
                  margin: [0, 0, 0, 12],
                });
              }
            }
          }
        });
      }

      // if (index < villagesData.length - 1) {
      //   content.push({ text: '', pageBreak: 'after' });
      // }
    }
  });

  // ... (all the previous code remains the same until the SCHEME PERFORMANCE OVERVIEW section)

  // SCHEME PERFORMANCE OVERVIEW AND KEY INSIGHTS - Moved to last page with page break
  content.push(
    { text: "", pageBreak: "before" }, // Add page break before this section
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 32, // Reduced from 40 to 32
          color: "#5b6471",
        },
      ],
      margin: [0, 0, 0, 0],
    },
    {
      text: "SCHEME PERFORMANCE OVERVIEW",
      fontSize: 17,
      bold: true,
      color: "white",
      alignment: "center",
      margin: [0, -26, 0, 25], // Adjusted margin for reduced height
    },
    // Description Text - Centered and enhanced
    {
      text: "The AVERAGE SCORE combines quantitative analysis of three key performance indicators: LPCD (40% weight), Chlorine Quality (30% weight), and Pressure Quality (30% weight). These metrics are evaluated using standardized benchmarks.",
      fontSize: 10,
      color: "#475569",
      lineHeight: 1.4,
      alignment: "center",
      margin: [0, 0, 0, 25],
    },
    // Metric bars - Enhanced and centered without the score box, with reduced width
    {
      table: {
        widths: ["30%", "70%"],
        body: [
          [
            {
              text: "LPCD Score",
              bold: true,
              fontSize: 12,
              color: "#1e293b",
              border: [false, false, false, true],
              borderColor: ["", "", "", "#e2e8f0"],
              margin: [15, 8, 0, 8],
            },
            {
              columns: [
                {
                  width: "15%",
                  text: metricScores.lpcd.toFixed(1),
                  fontSize: 18,
                  bold: true,
                  color: "#1e40af",
                  alignment: "center",
                  margin: [0, 3, 10, 0],
                },
                {
                  width: "85%",
                  canvas: [
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: 280, // Reduced from 350 to 280 to fit page
                      h: 20,
                      color: "#e2e8f0",
                    },
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: (metricScores.lpcd / 10) * 280, // Adjusted to match new width
                      h: 20,
                      color: "#1e40af",
                    },
                  ],
                },
              ],
              border: [false, false, false, true],
              borderColor: ["", "", "", "#e2e8f0"],
              margin: [0, 4, 0, 4],
            },
          ],
          [
            {
              text: "Chlorine Quality",
              bold: true,
              fontSize: 12,
              color: "#1e293b",
              border: [false, false, false, true],
              borderColor: ["", "", "", "#e2e8f0"],
              margin: [15, 8, 0, 8],
            },
            {
              columns: [
                {
                  width: "15%",
                  text: metricScores.chlorine.toFixed(1),
                  fontSize: 18,
                  bold: true,
                  color: "#1e40af",
                  alignment: "center",
                  margin: [0, 3, 10, 0],
                },
                {
                  width: "85%",
                  canvas: [
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: 280, // Reduced from 350 to 280 to fit page
                      h: 20,
                      color: "#e2e8f0",
                    },
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: (metricScores.chlorine / 10) * 280, // Adjusted to match new width
                      h: 20,
                      color: "#1e40af",
                    },
                  ],
                },
              ],
              border: [false, false, false, true],
              borderColor: ["", "", "", "#e2e8f0"],
              margin: [0, 4, 0, 4],
            },
          ],
          [
            {
              text: "Pressure Quality",
              bold: true,
              fontSize: 12,
              color: "#1e293b",
              border: [false, false, false, false],
              margin: [15, 8, 0, 8],
            },
            {
              columns: [
                {
                  width: "15%",
                  text: metricScores.pressure.toFixed(1),
                  fontSize: 18,
                  bold: true,
                  color: "#1e40af",
                  alignment: "center",
                  margin: [0, 3, 10, 0],
                },
                {
                  width: "85%",
                  canvas: [
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: 280, // Reduced from 350 to 280 to fit page
                      h: 20,
                      color: "#e2e8f0",
                    },
                    {
                      type: "rect",
                      x: 0,
                      y: 7,
                      w: (metricScores.pressure / 10) * 280, // Adjusted to match new width
                      h: 20,
                      color: "#1e40af",
                    },
                  ],
                },
              ],
              border: [false, false, false, false],
              margin: [0, 4, 0, 4],
            },
          ],
        ],
      },
      layout: "noBorders",
      margin: [0, 0, 0, 30],
    },
    // Overall Score Display - Simple and clean without the blue box
    {
      stack: [
        {
          text: `Overall Scheme Score: ${Math.round(overallScore * 10) / 10}`,
          fontSize: 16,
          bold: true,
          color: "#1e40af",
          alignment: "center",
          margin: [0, 0, 0, 8],
        },
        {
          text: "Based on weighted average of LPCD, Chlorine Quality, and Pressure Quality metrics",
          fontSize: 9,
          color: "#64748b",
          alignment: "center",
          italic: true,
          margin: [0, 0, 0, 0],
        },
      ],
      margin: [0, 0, 0, 25],
    },
    // KEY INSIGHTS Section - Now with analytical insights instead of highlights
    {
      canvas: [
        {
          type: "rect",
          x: 0,
          y: 0,
          w: 535,
          h: 25, // Reduced from 28 to 25
          color: "#5b6471",
        },
      ],
      margin: [0, 10, 0, 0],
    },
    {
      text: "KEY INSIGHTS & RECOMMENDATIONS",
      fontSize: 12,
      bold: true,
      color: "white",
      margin: [10, -19, 0, 12], // Adjusted margin for reduced height
    },
    {
      ul: generateKeyInsights(data).map((insight) => ({
        text: insight,
        fontSize: 9,
        margin: [0, 2, 0, 2],
      })),
      margin: [20, 5, 0, 15],
      fontSize: 9,
      lineHeight: 1.6,
      color: "#1e293b",
    },
  );

  // Define styles
  const styles = {
    coverTitle: {
      fontSize: 26,
      bold: true,
      color: "#1e293b",
    },
    sectionTitle: {
      fontSize: 16,
      bold: true,
      color: "#1e40af",
    },
    sectionHeader: {
      fontSize: 13,
      bold: true,
      color: "#ffffff",
      fillColor: "#5b6471",
    },
    tableHeader: {
      fontSize: 9,
      bold: true,
      alignment: "center",
    },
  };

  // Generate PDF
  const docDefinition: any = {
    content,
    styles,
    pageSize: "A4",
    pageMargins: [30, 30, 30, 40],
    defaultStyle: {
      font: "PTSerif",
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          {
            text: `Maharashtra Water Infrastructure Platform | ${dateTimeStr}`,
            alignment: "left",
            fontSize: 8,
            color: "#64748b",
            margin: [30, 10, 0, 0],
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            fontSize: 8,
            color: "#64748b",
            margin: [0, 10, 30, 0],
          },
        ],
      };
    },
  };

  pdfMake
    .createPdf(docDefinition)
    .download(`${schemeInfo.scheme_name}_Performance_Report.pdf`);
}
