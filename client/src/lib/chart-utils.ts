// Chart generation utilities for PDF reports using canvas
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

// Helper to safely parse numbers
function safeParseNumber(value: string | null | undefined): number {
  if (!value || value === "--" || value === "null" || value === "undefined")
    return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

// Calculate avg, min, max from array of values
function calculateStats(values: number[]) {
  const validValues = values.filter((v) => v > 0);
  if (validValues.length === 0) return { avg: 0, min: 0, max: 0 };

  const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
  const min = Math.min(...validValues);
  const max = Math.max(...validValues);

  return { avg, min, max };
}

// Format date for display
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

// Generate complete date labels for all 7 days, calculating missing dates
function generateDateLabels(dates: {
  date1?: string | null;
  date2?: string | null;
  date3?: string | null;
  date4?: string | null;
  date5?: string | null;
  date6?: string | null;
  date7?: string | null;
}): string[] {
  const labels: string[] = [];

  // Find the first valid date to use as reference
  let referenceDate: Date | null = null;
  let referenceDayIndex = -1;

  for (let i = 1; i <= 7; i++) {
    const dateKey = `date${i}` as keyof typeof dates;
    if (dates[dateKey]) {
      try {
        referenceDate = new Date(dates[dateKey]!);
        referenceDayIndex = i - 1;
        break;
      } catch {
        continue;
      }
    }
  }

  // If we found a reference date, calculate all 7 dates
  if (referenceDate && referenceDayIndex >= 0) {
    // Calculate the date for day 1 by subtracting days from reference
    const day1Date = new Date(referenceDate);
    day1Date.setDate(day1Date.getDate() - referenceDayIndex);

    // Generate all 7 dates starting from day 1
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(day1Date);
      currentDate.setDate(currentDate.getDate() + i);
      labels.push(
        currentDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      );
    }
  } else {
    // Fallback: try to use whatever dates we have, fill rest with Day X
    for (let i = 1; i <= 7; i++) {
      const dateKey = `date${i}` as keyof typeof dates;
      labels.push(formatDate(dates[dateKey]) || `Day ${i}`);
    }
  }

  return labels;
}

// Generate complete date labels for chlorine/pressure data (uses date_1, date_2 naming)
function generateDateLabelsUnderscore(dates: {
  date_1?: string | null;
  date_2?: string | null;
  date_3?: string | null;
  date_4?: string | null;
  date_5?: string | null;
  date_6?: string | null;
  date_7?: string | null;
}): string[] {
  const labels: string[] = [];

  // Find the first valid date to use as reference
  let referenceDate: Date | null = null;
  let referenceDayIndex = -1;

  for (let i = 1; i <= 7; i++) {
    const dateKey = `date_${i}` as keyof typeof dates;
    if (dates[dateKey]) {
      try {
        referenceDate = new Date(dates[dateKey]!);
        referenceDayIndex = i - 1;
        break;
      } catch {
        continue;
      }
    }
  }

  // If we found a reference date, calculate all 7 dates
  if (referenceDate && referenceDayIndex >= 0) {
    // Calculate the date for day 1 by subtracting days from reference
    const day1Date = new Date(referenceDate);
    day1Date.setDate(day1Date.getDate() - referenceDayIndex);

    // Generate all 7 dates starting from day 1
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(day1Date);
      currentDate.setDate(currentDate.getDate() + i);
      labels.push(
        currentDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }),
      );
    }
  } else {
    // Fallback: try to use whatever dates we have, fill rest with Day X
    for (let i = 1; i <= 7; i++) {
      const dateKey = `date_${i}` as keyof typeof dates;
      labels.push(formatDate(dates[dateKey]) || `Day ${i}`);
    }
  }

  return labels;
}

// Generate bar chart for water consumption (7 days) with avg/min/max
export async function generateWaterConsumptionChart(
  data: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1?: string | null;
    date2?: string | null;
    date3?: string | null;
    date4?: string | null;
    date5?: string | null;
    date6?: string | null;
    date7?: string | null;
  },
  villageName: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 350;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    const values = [
      safeParseNumber(data.day1),
      safeParseNumber(data.day2),
      safeParseNumber(data.day3),
      safeParseNumber(data.day4),
      safeParseNumber(data.day5),
      safeParseNumber(data.day6),
      safeParseNumber(data.day7),
    ];

    const stats = calculateStats(values);

    // Create labels using actual dates from database, calculating missing dates
    const labels = generateDateLabels(data);

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Water Consumption (LL)",
            data: values,
            backgroundColor: "#3b82f6",
            borderColor: "#1e40af",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        animation: {
          onComplete: () => {
            setTimeout(() => {
              resolve(canvas.toDataURL("image/png"));
              chart.destroy();
            }, 100);
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${villageName} - Water Consumption (7 Days)`,
            font: { size: 24, weight: "bold" },
            color: "#1e40af",
            padding: { bottom: 18 },
          },
          subtitle: {
            display: true,
            text: `Avg: ${stats.avg.toFixed(1)} LL | Min: ${stats.min.toFixed(1)} LL | Max: ${stats.max.toFixed(1)} LL`,
            font: { size: 18, weight: "bold" },
            color: "#64748b",
            padding: { bottom: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Water (LL)",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
          x: {
            ticks: { font: { size: 16, weight: "bold" } },
          },
        },
      },
    });
  });
}

// Generate bar chart for LPCD (7 days) with avg/min/max
export async function generateLPCDChart(
  data: {
    day1: string | null;
    day2: string | null;
    day3: string | null;
    day4: string | null;
    day5: string | null;
    day6: string | null;
    day7: string | null;
    date1?: string | null;
    date2?: string | null;
    date3?: string | null;
    date4?: string | null;
    date5?: string | null;
    date6?: string | null;
    date7?: string | null;
  },
  villageName: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 350;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    const values = [
      safeParseNumber(data.day1),
      safeParseNumber(data.day2),
      safeParseNumber(data.day3),
      safeParseNumber(data.day4),
      safeParseNumber(data.day5),
      safeParseNumber(data.day6),
      safeParseNumber(data.day7),
    ];

    const stats = calculateStats(values);

    // Color code based on threshold (55 LPCD)
    const backgroundColors = values.map((v) =>
      v >= 55 ? "#10b981" : "#ef4444",
    );
    const borderColors = values.map((v) => (v >= 55 ? "#059669" : "#dc2626"));

    // Create labels using actual dates from database, calculating missing dates
    const labels = generateDateLabels(data);

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "LPCD",
            data: values,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        animation: {
          onComplete: () => {
            setTimeout(() => {
              resolve(canvas.toDataURL("image/png"));
              chart.destroy();
            }, 100);
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${villageName} - LPCD Analysis (7 Days)`,
            font: { size: 24, weight: "bold" },
            color: "#1e40af",
            padding: { bottom: 18 },
          },
          subtitle: {
            display: true,
            text: `Avg: ${stats.avg.toFixed(1)} | Min: ${stats.min.toFixed(1)} | Max: ${stats.max.toFixed(1)}`,
            font: { size: 18, weight: "bold" },
            color: "#64748b",
            padding: { bottom: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "LPCD",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
          x: {
            ticks: { font: { size: 16, weight: "bold" } },
          },
        },
      },
    });
  });
}

// Generate line chart for chlorine (7 days) with avg/min/max
export async function generateChlorineChart(
  data: {
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
    date_4?: string | null;
    date_5?: string | null;
    date_6?: string | null;
    date_7?: string | null;
  },
  esrName: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 350;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    const values = [
      safeParseNumber(data.value_1),
      safeParseNumber(data.value_2),
      safeParseNumber(data.value_3),
      safeParseNumber(data.value_4),
      safeParseNumber(data.value_5),
      safeParseNumber(data.value_6),
      safeParseNumber(data.value_7),
    ];

    const stats = calculateStats(values);

    // Create labels using actual dates from database, calculating missing dates
    const labels = generateDateLabelsUnderscore(data);

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Chlorine (mg/L)",
            data: values,
            borderColor: "#8b5cf6",
            backgroundColor: "transparent",
            borderWidth: 3,
            borderDash: [8, 4],
            pointRadius: 6,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: false,
        animation: {
          onComplete: () => {
            setTimeout(() => {
              resolve(canvas.toDataURL("image/png"));
              chart.destroy();
            }, 100);
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${esrName} - Chlorine Levels (7 Days)`,
            font: { size: 24, weight: "bold" },
            color: "#1e40af",
            padding: { bottom: 18 },
          },
          subtitle: {
            display: true,
            text: `Avg: ${stats.avg.toFixed(2)} mg/L | Min: ${stats.min.toFixed(2)} mg/L | Max: ${stats.max.toFixed(2)} mg/L`,
            font: { size: 18, weight: "bold" },
            color: "#64748b",
            padding: { bottom: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Chlorine (mg/L)",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
          x: {
            title: {
              display: true,
              text: "Date",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
        },
      },
    });
  });
}

// Generate line chart for pressure (7 days) with avg/min/max
export async function generatePressureChart(
  data: {
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
    date_4?: string | null;
    date_5?: string | null;
    date_6?: string | null;
    date_7?: string | null;
  },
  esrName: string,
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 700;
    canvas.height = 350;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      resolve("");
      return;
    }

    const values = [
      safeParseNumber(data.value_1),
      safeParseNumber(data.value_2),
      safeParseNumber(data.value_3),
      safeParseNumber(data.value_4),
      safeParseNumber(data.value_5),
      safeParseNumber(data.value_6),
      safeParseNumber(data.value_7),
    ];

    const stats = calculateStats(values);

    // Create labels using actual dates from database, calculating missing dates
    const labels = generateDateLabelsUnderscore(data);

    const chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Pressure (Bar)",
            data: values,
            borderColor: "#f97316",
            backgroundColor: "transparent",
            borderWidth: 3,
            borderDash: [8, 4],
            pointRadius: 6,
            pointBackgroundColor: "#f97316",
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: false,
        animation: {
          onComplete: () => {
            setTimeout(() => {
              resolve(canvas.toDataURL("image/png"));
              chart.destroy();
            }, 100);
          },
        },
        plugins: {
          title: {
            display: true,
            text: `${esrName} - Pressure Levels (7 Days)`,
            font: { size: 24, weight: "bold" },
            color: "#1e40af",
            padding: { bottom: 18 },
          },
          subtitle: {
            display: true,
            text: `Avg: ${stats.avg.toFixed(2)} Bar | Min: ${stats.min.toFixed(2)} Bar | Max: ${stats.max.toFixed(2)} Bar`,
            font: { size: 18, weight: "bold" },
            color: "#64748b",
            padding: { bottom: 14 },
          },
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Pressure (Bar)",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
          x: {
            title: {
              display: true,
              text: "Date",
              font: { size: 18, weight: "bold" },
            },
            ticks: { font: { size: 16, weight: "bold" } },
          },
        },
      },
    });
  });
}

// Calculate statistics for summary table
export function calculateStatistics(villagesData: any[]) {
  let totalLPCDAbove55 = 0;
  let totalLPCDBelow55 = 0;
  let totalChlorineOptimal = 0;
  let totalChlorineAbove = 0;
  let totalChlorineBelow = 0;
  let totalPressureOptimal = 0;
  let totalPressureAbove = 0;
  let totalPressureBelow = 0;

  villagesData.forEach((village) => {
    // LPCD statistics
    const lpcdValues = [
      safeParseNumber(village.lpcd.day1),
      safeParseNumber(village.lpcd.day2),
      safeParseNumber(village.lpcd.day3),
      safeParseNumber(village.lpcd.day4),
      safeParseNumber(village.lpcd.day5),
      safeParseNumber(village.lpcd.day6),
      safeParseNumber(village.lpcd.day7),
    ];
    lpcdValues.forEach((val) => {
      if (val > 0) {
        if (val >= 55) totalLPCDAbove55++;
        else totalLPCDBelow55++;
      }
    });

    // Chlorine and Pressure statistics from ESRs
    village.esrs.forEach((esr: any) => {
      const chlorineValues = [
        safeParseNumber(esr.chlorine.value_1),
        safeParseNumber(esr.chlorine.value_2),
        safeParseNumber(esr.chlorine.value_3),
        safeParseNumber(esr.chlorine.value_4),
        safeParseNumber(esr.chlorine.value_5),
        safeParseNumber(esr.chlorine.value_6),
        safeParseNumber(esr.chlorine.value_7),
      ];
      chlorineValues.forEach((val) => {
        if (val > 0) {
          if (val >= 0.2 && val <= 0.5) totalChlorineOptimal++;
          else if (val > 0.5) totalChlorineAbove++;
          else totalChlorineBelow++;
        }
      });

      const pressureValues = [
        safeParseNumber(esr.pressure.value_1),
        safeParseNumber(esr.pressure.value_2),
        safeParseNumber(esr.pressure.value_3),
        safeParseNumber(esr.pressure.value_4),
        safeParseNumber(esr.pressure.value_5),
        safeParseNumber(esr.pressure.value_6),
        safeParseNumber(esr.pressure.value_7),
      ];
      pressureValues.forEach((val) => {
        if (val > 0) {
          if (val >= 0.2 && val <= 0.7) totalPressureOptimal++;
          else if (val > 0.7) totalPressureAbove++;
          else totalPressureBelow++;
        }
      });
    });
  });

  return {
    lpcd: { above55: totalLPCDAbove55, below55: totalLPCDBelow55 },
    chlorine: {
      optimal: totalChlorineOptimal,
      above: totalChlorineAbove,
      below: totalChlorineBelow,
    },
    pressure: {
      optimal: totalPressureOptimal,
      above: totalPressureAbove,
      below: totalPressureBelow,
    },
  };
}
