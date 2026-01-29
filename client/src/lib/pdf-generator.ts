import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// Set up fonts (vfs_fonts exports the vfs object directly)
pdfMake.vfs = pdfFonts;

interface ESRData {
  esr_name: string;
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
  };
  esrs: ESRData[];
}

interface SchemeReportData {
  schemeInfo: {
    scheme_id: string;
    scheme_name: string;
    region: string;
    division: string;
    block: string;
    total_villages: number;
    total_esr: number;
  };
  villagesData: VillageData[];
}

// Helper function to get color based on value
function getChlorineColor(value: string | null): string {
  if (!value || value === "0" || parseFloat(value) === 0) return "#FF6B6B"; // Red
  const numValue = parseFloat(value);
  if (numValue >= 0.3 && numValue <= 1.0) return "#90EE90"; // Green
  if (numValue >= 0.2 && numValue < 0.3) return "#FFD700"; // Yellow
  if (numValue < 0.2) return "#FF6B6B"; // Red
  return "#D3D3D3"; // Gray for no data
}

function getPressureColor(value: string | null): string {
  if (!value || value === "0" || parseFloat(value) === 0) return "#FF6B6B"; // Red
  const numValue = parseFloat(value);
  if (numValue >= 0.7) return "#90EE90"; // Green
  if (numValue >= 0.2 && numValue < 0.7) return "#FFD700"; // Yellow
  if (numValue < 0.2) return "#FF6B6B"; // Red
  return "#D3D3D3"; // Gray
}

function getLPCDColor(value: string | null): string {
  if (!value) return "#D3D3D3"; // Gray
  const numValue = parseFloat(value);
  if (numValue >= 55) return "#90EE90"; // Green
  if (numValue >= 40 && numValue < 55) return "#FFD700"; // Yellow
  if (numValue < 40) return "#FF6B6B"; // Red
  return "#D3D3D3"; // Gray
}

function getStatus(
  chlorine: string | null,
  pressure: string | null,
  lpcd: string | null,
): string {
  // Helper to safely parse number, return null if invalid
  const safeParseFloat = (val: string | null): number | null => {
    if (!val || val === "--") return null;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const chlorineVal = safeParseFloat(chlorine);
  const pressureVal = safeParseFloat(pressure);
  const lpcdVal = safeParseFloat(lpcd);

  // No data available
  if (chlorineVal === null && pressureVal === null) {
    return "⚫ No Data";
  }

  // Critical conditions (any critical value makes status critical)
  if (
    (chlorineVal !== null && chlorineVal < 0.2) ||
    (pressureVal !== null && pressureVal < 0.2) ||
    (lpcdVal !== null && lpcdVal < 40)
  ) {
    return "🔴 Critical";
  }

  // Alert conditions (zero values)
  if (chlorineVal === 0 || pressureVal === 0) {
    return "🔴 Alert";
  }

  // Warning conditions
  if (
    (chlorineVal !== null && chlorineVal < 0.3) ||
    (pressureVal !== null && pressureVal < 0.7) ||
    (lpcdVal !== null && lpcdVal < 55)
  ) {
    return "🟡 Moderate";
  }

  return "🟢 Good";
}

// Safe number parser that handles null, undefined, "--", and NaN
function safeParseNumber(value: string | null | undefined): number {
  if (!value || value === "--" || value === "null" || value === "undefined")
    return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

export async function generateSchemePDF(data: SchemeReportData): Promise<void> {
  const { schemeInfo, villagesData } = data;

  // Build table body with merged cells
  const tableBody: any[] = [];

  // Header row
  tableBody.push([
    {
      text: "Sr No",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Village Name",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "ESR Name",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Water Consumption\n(Day 1-3 in KL)",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Total Water\n(7 Days KL)",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "LPCD\n(Average)",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Chlorine\n(mg/L)",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Pressure\n(Bar)",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
    {
      text: "Status",
      style: "tableHeader",
      fillColor: "#4472C4",
      color: "white",
    },
  ]);

  // Data rows
  let srNo = 1;
  villagesData.forEach((village) => {
    const esrCount = village.esrs.length || 1;

    // Calculate water consumption total (all 7 days)
    const waterDay1 = safeParseNumber(village.water_consumption.day1);
    const waterDay2 = safeParseNumber(village.water_consumption.day2);
    const waterDay3 = safeParseNumber(village.water_consumption.day3);
    const waterDay4 = safeParseNumber(village.water_consumption.day4);
    const waterDay5 = safeParseNumber(village.water_consumption.day5);
    const waterDay6 = safeParseNumber(village.water_consumption.day6);
    const waterDay7 = safeParseNumber(village.water_consumption.day7);
    const totalWater =
      waterDay1 +
      waterDay2 +
      waterDay3 +
      waterDay4 +
      waterDay5 +
      waterDay6 +
      waterDay7;

    // Calculate average LPCD (all 7 days)
    const lpcdDay1 = safeParseNumber(village.lpcd.day1);
    const lpcdDay2 = safeParseNumber(village.lpcd.day2);
    const lpcdDay3 = safeParseNumber(village.lpcd.day3);
    const lpcdDay4 = safeParseNumber(village.lpcd.day4);
    const lpcdDay5 = safeParseNumber(village.lpcd.day5);
    const lpcdDay6 = safeParseNumber(village.lpcd.day6);
    const lpcdDay7 = safeParseNumber(village.lpcd.day7);
    const avgLPCD =
      (lpcdDay1 +
        lpcdDay2 +
        lpcdDay3 +
        lpcdDay4 +
        lpcdDay5 +
        lpcdDay6 +
        lpcdDay7) /
      7;

    // Water consumption text (showing first 3 days for brevity in PDF)
    const waterConsumptionText = `Day 1: ${waterDay1.toFixed(2)}\nDay 2: ${waterDay2.toFixed(2)}\nDay 3: ${waterDay3.toFixed(2)}`;

    // If village has ESRs, create rows for each ESR
    if (village.esrs.length > 0) {
      village.esrs.forEach((esr, esrIndex) => {
        const chlorineValue = esr.chlorine.value_1 || "--";
        const pressureValue = esr.pressure.value_1 || "--";
        const status = getStatus(
          esr.chlorine.value_1,
          esr.pressure.value_1,
          avgLPCD.toString(),
        );

        if (esrIndex === 0) {
          // First ESR row with merged cells
          tableBody.push([
            {
              text: srNo.toString(),
              rowSpan: esrCount,
              style: "tableCell",
              alignment: "center",
            },
            {
              text: `${village.village_name}\n(Pop: ${village.population?.toLocaleString() || "N/A"})`,
              rowSpan: esrCount,
              style: "tableCell",
              bold: true,
            },
            {
              text: esr.esr_name || "Unknown ESR",
              style: "tableCell",
              fontSize: 9,
            },
            {
              text: waterConsumptionText,
              rowSpan: esrCount,
              fillColor: "#E7E6E6",
              fontSize: 8,
              alignment: "center",
            },
            {
              text: totalWater.toFixed(2),
              rowSpan: esrCount,
              fillColor: totalWater > 0 ? "#90EE90" : "#FF6B6B",
              bold: true,
              alignment: "center",
            },
            {
              text: avgLPCD.toFixed(2),
              rowSpan: esrCount,
              fillColor: getLPCDColor(avgLPCD.toString()),
              bold: true,
              alignment: "center",
            },
            {
              text: chlorineValue,
              fillColor: getChlorineColor(esr.chlorine.value_1),
              color: chlorineValue !== "--" ? "white" : "black",
              bold: true,
              alignment: "center",
            },
            {
              text: pressureValue,
              fillColor: getPressureColor(esr.pressure.value_1),
              alignment: "center",
            },
            { text: status, fontSize: 9, alignment: "center" },
          ]);
        } else {
          // Subsequent ESR rows (merged cells are empty)
          tableBody.push([
            {},
            {}, // Empty cells for merged Sr No and Village Name
            {
              text: esr.esr_name || "Unknown ESR",
              style: "tableCell",
              fontSize: 9,
            },
            {},
            {},
            {}, // Empty cells for merged consumption, total, LPCD
            {
              text: chlorineValue,
              fillColor: getChlorineColor(esr.chlorine.value_1),
              color: chlorineValue !== "--" ? "white" : "black",
              bold: true,
              alignment: "center",
            },
            {
              text: pressureValue,
              fillColor: getPressureColor(esr.pressure.value_1),
              alignment: "center",
            },
            { text: status, fontSize: 9, alignment: "center" },
          ]);
        }
      });
    } else {
      // Village with no ESRs
      tableBody.push([
        { text: srNo.toString(), style: "tableCell", alignment: "center" },
        {
          text: `${village.village_name}\n(Pop: ${village.population?.toLocaleString() || "N/A"})`,
          style: "tableCell",
          bold: true,
        },
        { text: "No ESR Data", style: "tableCell", fillColor: "#D3D3D3" },
        {
          text: waterConsumptionText,
          fillColor: "#E7E6E6",
          fontSize: 8,
          alignment: "center",
        },
        {
          text: totalWater.toFixed(2),
          fillColor: totalWater > 0 ? "#90EE90" : "#FF6B6B",
          bold: true,
          alignment: "center",
        },
        {
          text: avgLPCD.toFixed(2),
          fillColor: getLPCDColor(avgLPCD.toString()),
          bold: true,
          alignment: "center",
        },
        { text: "--", fillColor: "#D3D3D3", alignment: "center" },
        { text: "--", fillColor: "#D3D3D3", alignment: "center" },
        { text: "⚫ No Data", fontSize: 9, alignment: "center" },
      ]);
    }

    srNo++;
  });

  // Create PDF document definition
  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 60, 20, 40],
    header: {
      margin: [20, 20, 20, 0],
      columns: [
        {
          text: "Maharashtra Water Infrastructure Management Platform",
          style: "header",
          alignment: "center",
        },
      ],
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        margin: [20, 0, 20, 10],
        columns: [
          {
            text: `Generated on: ${new Date().toLocaleDateString()}`,
            fontSize: 8,
            alignment: "left",
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 8,
            alignment: "right",
          },
        ],
      };
    },
    content: [
      // Scheme Overview
      {
        text: "SCHEME LEVEL SMART REPORT",
        style: "title",
        alignment: "center",
        margin: [0, 0, 0, 10],
      },
      {
        table: {
          widths: ["25%", "25%", "25%", "25%"],
          body: [
            [
              { text: "Scheme Name:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.scheme_name, colSpan: 3 },
              {},
              {},
            ],
            [
              { text: "Scheme ID:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.scheme_id },
              { text: "Region:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.region },
            ],
            [
              { text: "Division:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.division },
              { text: "Block:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.block },
            ],
            [
              { text: "Total Villages:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.total_villages.toString() },
              { text: "Total ESRs:", bold: true, fillColor: "#E7E6E6" },
              { text: schemeInfo.total_esr.toString() },
            ],
          ],
        },
        margin: [0, 0, 0, 15],
      },
      // Main Data Table
      {
        text: "DETAILED ESR & VILLAGE PERFORMANCE",
        style: "subheader",
        margin: [0, 10, 0, 10],
      },
      {
        table: {
          headerRows: 1,
          widths: [30, 90, 95, 60, 50, 45, 50, 50, 60],
          body: tableBody,
        },
        layout: {
          fillColor: (rowIndex: number) => {
            return rowIndex === 0 ? "#4472C4" : null;
          },
        },
      },
      // Color Legend
      {
        text: "COLOR CODING LEGEND",
        style: "subheader",
        margin: [0, 15, 0, 5],
      },
      {
        columns: [
          {
            width: "50%",
            stack: [
              {
                text: "Chlorine Levels:",
                bold: true,
                fontSize: 9,
                margin: [0, 0, 0, 3],
              },
              { text: "🟢 Green (0.3-1.0 mg/L): Optimal", fontSize: 8 },
              { text: "🟡 Yellow (0.2-0.3 mg/L): Below optimal", fontSize: 8 },
              { text: "🔴 Red (< 0.2 mg/L): Critical", fontSize: 8 },
            ],
          },
          {
            width: "50%",
            stack: [
              {
                text: "Pressure Levels:",
                bold: true,
                fontSize: 9,
                margin: [0, 0, 0, 3],
              },
              { text: "🟢 Green (≥ 0.7 bar): Good", fontSize: 8 },
              { text: "🟡 Yellow (0.2-0.7 bar): Moderate", fontSize: 8 },
              { text: "🔴 Red (< 0.2 bar): Low", fontSize: 8 },
            ],
          },
        ],
      },
    ],
    styles: {
      header: {
        fontSize: 16,
        bold: true,
        color: "#2E5090",
      },
      title: {
        fontSize: 14,
        bold: true,
        color: "#2E5090",
      },
      subheader: {
        fontSize: 12,
        bold: true,
        color: "#2E5090",
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        alignment: "center",
      },
      tableCell: {
        fontSize: 9,
      },
    },
  };

  // Generate and download PDF
  pdfMake
    .createPdf(docDefinition)
    .download(`${schemeInfo.scheme_name}_Smart_Report.pdf`);
}
 