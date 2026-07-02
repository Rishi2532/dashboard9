import pdfMake from "pdfmake/build/pdfmake";
import { ptSerifVfs, ptSerifFonts } from "./ptserif-fonts";
import { csTechLogoBase64 } from "./logo-base64";
import { submittedToLogoBase64 } from "./submitted-to-logo-base64";

// Configure PT Serif fonts for professional report appearance
pdfMake.vfs = ptSerifVfs;
pdfMake.fonts = ptSerifFonts;

const themeColors = {
  darkBlue: "#0A1D56",
  orange: "#FF7A00",
  grey: "#B0B0B0",
  lightGrey: "#E0E0E0",
  white: "#FFFFFF",
  black: "#000000",
  green: "#27AE60",
  red: "#E74C3C",
  yellow: "#F39C12",
  lightBlue: "#EAF0FB",
};

export async function generateMonthlyProgressPDF(
  reportData: any[],
  filters: any,
  startDate: string,
  endDate: string
) {
  const isRegionMode = !filters.scheme_id && !filters.block && !filters.division && !filters.circle;

  const docDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 60, 40, 60],
    defaultStyle: {
      font: "PTSerif",
      fontSize: 10,
    },
    header: function (currentPage: number, pageCount: number) {
      return {
        margin: [40, 20, 40, 0],
        columns: [
          {
            text: "IoT Integrated Water Supply Project",
            fontSize: 12,
            bold: true,
            color: themeColors.darkBlue,
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            alignment: "right",
            fontSize: 10,
            color: "#666",
          },
        ],
      };
    },
    content: [
      {
        text: "Monthly Progress Report",
        fontSize: 20,
        bold: true,
        alignment: "center",
        color: themeColors.darkBlue,
        margin: [0, 0, 0, 5],
      },
      {
        text: `Period: ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        fontSize: 12,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
    ],
    styles: {
      tableHeader: {
        bold: true,
        fontSize: 11,
        color: themeColors.white,
        fillColor: themeColors.darkBlue,
        alignment: "center",
        margin: [0, 4, 0, 4],
      },
      tableCell: {
        margin: [0, 4, 0, 4],
        alignment: "center",
      },
    },
  };

  // Build the table body
  const tableBody = [];

  // Header Row
  const headerRow = [];
  if (isRegionMode) {
    headerRow.push({ text: "Region", style: "tableHeader" });
    headerRow.push({ text: "Schemes\n(Progress)", style: "tableHeader" });
  } else {
    headerRow.push({ text: "Scheme", style: "tableHeader" });
    headerRow.push({ text: "Location", style: "tableHeader" });
  }

  headerRow.push(
    { text: "Villages\n(Progress)", style: "tableHeader" },
    { text: "ESRs\n(Progress)", style: "tableHeader" },
    { text: "Flow Meters\n(Progress)", style: "tableHeader" },
    { text: "RCA\n(Progress)", style: "tableHeader" },
    { text: "Pressure\n(Progress)", style: "tableHeader" }
  );

  tableBody.push(headerRow);

  // Data Rows
  reportData.forEach((row) => {
    const dataRow = [];

    if (isRegionMode) {
      dataRow.push({ text: row.region_name || "Unknown", style: "tableCell" });
      dataRow.push({
        text: `${row.end_schemes || 0} (+${(row.end_schemes || 0) - (row.start_schemes || 0)})`,
        style: "tableCell"
      });
    } else {
      dataRow.push({ text: row.scheme_name || row.scheme_id, style: "tableCell" });
      dataRow.push({ text: `${row.region} > ${row.circle} > ${row.division}`, style: "tableCell", fontSize: 8 });
    }

    dataRow.push(
      { text: `${row.end_villages || 0} (+${(row.end_villages || 0) - (row.start_villages || 0)})`, style: "tableCell" },
      { text: `${row.end_esr || 0} (+${(row.end_esr || 0) - (row.start_esr || 0)})`, style: "tableCell" },
      { text: `${row.end_flow_meters || 0} (+${(row.end_flow_meters || 0) - (row.start_flow_meters || 0)})`, style: "tableCell" },
      { text: `${row.end_rca || 0} (+${(row.end_rca || 0) - (row.start_rca || 0)})`, style: "tableCell" },
      { text: `${row.end_pressure || 0} (+${(row.end_pressure || 0) - (row.start_pressure || 0)})`, style: "tableCell" }
    );

    tableBody.push(dataRow);
  });

  const columnWidths = isRegionMode
    ? ["*", "auto", "auto", "auto", "auto", "auto", "auto"]
    : ["*", "*", "auto", "auto", "auto", "auto", "auto"];

  docDefinition.content.push({
    table: {
      headerRows: 1,
      widths: columnWidths,
      body: tableBody,
    },
    layout: {
      fillColor: function (rowIndex: number) {
        return rowIndex === 0 ? themeColors.darkBlue : rowIndex % 2 === 0 ? "#F8F9FA" : null;
      },
      hLineColor: function (i: number, node: any) {
        return i === 0 || i === node.table.body.length ? themeColors.darkBlue : "#E0E0E0";
      },
      vLineColor: function () {
        return "#E0E0E0";
      },
    },
  });

  // Generate PDF
  const pdfDocGenerator = pdfMake.createPdf(docDefinition);

  return new Promise((resolve, reject) => {
    try {
      pdfDocGenerator.download(
        `Monthly_Progress_Report_${new Date().toISOString().split("T")[0]}.pdf`,
        () => resolve(true)
      );
    } catch (e) {
      reject(e);
    }
  });
}

export interface MonthlyPressureData {
  caseType: string;
  summary: {
    totalSchemesInRegion: number;
    totalEsrIntegrated: number;
    fullyCompletedEsr: number;
    totalVillagesIntegrated: number;
    fullyCompletedVillages: number;
    rcaConnected: number;
    pressureConnected: number;
    flowMetersConnected: number;
    region: string;
    report_month: string;
  };
  monthlySummaryByRegion: Array<{
    region_name: string;
    newly_added_esr: number;
    newly_added_fully_completed_esr: number;
    newly_added_villages: number;
    newly_added_fully_completed_villages: number;
    newly_added_schemes: number;
    newly_added_flow_meters: number;
    newly_added_rca: number;
    newly_added_pt: number;
    total_esr_integrated: number | null;
    fully_completed_esr: number | null;
    partial_esr: number | null;
    total_villages_integrated: number | null;
    fully_completed_villages: number | null;
    total_schemes_integrated: number | null;
    fully_completed_schemes: number | null;
    flow_meter_integrated: number | null;
    rca_integrated: number | null;
    pressure_transmitter_integrated: number | null;
  }>;
  communicationStats: {
    total: number;
    online: number;
    offline: number;
    chlorineOnline: number;
    pressureOnline: number;
    flowOnline: number;
  };
  records: any[];
  pressureCommissionedSchemes: any[];
  lpcdLast14Days?: any[];
  pressureHighlights?: any[];
  newlyAddedSchemes?: string[];
  newlyAddedVillages?: string[];
  chlorineComparison?: any[];
}

function cellCenter(text: string | number, fillColor?: string, color?: string): any {
  const cell: any = {
    text: String(text ?? "-"),
    style: "tableCell",
    alignment: "center",
  };
  if (fillColor) cell.fillColor = fillColor;
  if (color) cell.color = color;
  return cell;
}

function headerCell(text: string, fillColor?: string): any {
  const cell: any = { text, style: "tableHeader" };
  if (fillColor) cell.fillColor = fillColor;
  return cell;
}

function pressureCell(val: any): any {
  const rawVal = parseFloat(String(val ?? 0));
  const v = isNaN(rawVal) ? 0 : rawVal;

  let fill: string | undefined;
  if (v >= 0.2 && v <= 0.7) fill = "#C8E6C9"; // Optimal
  else if (v < 0.2) fill = "#FFF9C4"; // Below
  else fill = "#FFCDD2"; // Above

  // Use fixed-width formatting for numeric values (2 decimal places)
  const displayValue = isNaN(rawVal) ? "-" : rawVal.toFixed(2);

  return {
    text: displayValue,
    style: "tableCell",
    alignment: "center",
    fillColor: fill
  };
}

const abbreviateHeader = (key: string): string => {
  if (key.startsWith('No. of Days') || key.startsWith('Days ')) return key;
  const lowerKey = key.toLowerCase();
  const dateMatch = key.match(/^(\d{1,2})-[a-zA-Z]{3}-(\d{2,4})$/);
  if (dateMatch) return String(parseInt(dateMatch[1], 10));
  const shortDateMatch = key.match(/^(\d{1,2})-[a-zA-Z]{3}$/);
  if (shortDateMatch) return String(parseInt(shortDateMatch[1], 10));
  if (lowerKey.includes('day')) {
    const match = lowerKey.match(/day\s*[_]?\s*(\d+)/);
    if (match) return match[1];
  }
  if (/^\d{1,2}$/.test(key)) return key;
  const isoMatch = key.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return String(parseInt(isoMatch[3], 10));
  if (lowerKey.match(/village/) || lowerKey === 'vil') return 'Vil';
  if (lowerKey === 'id' || lowerKey.includes('scheme id')) return 'ID';
  if (lowerKey === 'scheme' || lowerKey.includes('scheme name')) return 'Scheme';
  if (lowerKey.includes('region')) return 'Region';
  if (lowerKey.includes('sub div')) return 'Sub Div';
  if (lowerKey.includes('circle')) return 'Circle';
  if (lowerKey.includes('division')) return 'Division';
  if (lowerKey.includes('block')) return 'Block';
  if (lowerKey === 'sr' || lowerKey.startsWith('sr ')) return 'Sr';
  if (lowerKey.includes('esr')) return 'ESR';
  if (lowerKey.includes('total village')) return 'Total';
  return String(key).substring(0, 10);
};

export async function generateMonthlyPressureReportPDF(data: MonthlyPressureData) {
  const regionLabel = data.summary.region === "all" ? "All Regions" : data.summary.region;
  const rawMonth = data.summary.report_month;
  const monthLabel = rawMonth === "all" ? "All Time" : rawMonth;
  const monthDisplay = (() => {
    if (!rawMonth || rawMonth === "all") return rawMonth === "all" ? "All Time" : String(rawMonth || "");
    const m = String(rawMonth || "");
    const match = m.match(/^(\d{4})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      const dt = new Date(year, monthIndex, 1);
      try {
        return dt.toLocaleString("en-US", { month: "long", year: "numeric" });
      } catch (e) {
        return m;
      }
    }
    return m;
  })();

  const documentDefinition: any = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 40, 20, 50],
    defaultStyle: { font: "PTSerif", fontSize: 8, color: "#333333" },
    header: (currentPage: number) => {
      if (currentPage > 1) {
        return {
          text: `Monthly Smart Report — ${regionLabel} (${monthLabel})`,
          margin: [30, 18, 30, 0], fontSize: 9, color: themeColors.grey, alignment: "right", font: "PTSerif",
        };
      }
      return { text: " " };
    },
    footer: (currentPage: number, pageCount: number) => {
      return {
        columns: [
          { text: `Page ${currentPage} of ${pageCount}`, alignment: "left", color: themeColors.grey, fontSize: 8, font: "PTSerif" },
          {
            text: `system generated report for ${monthDisplay}\nprivate and confidential`,
            alignment: "right",
            color: themeColors.grey,
            fontSize: 8,
            font: "PTSerif"
          },
        ],
        margin: [20, 15, 20, 10],
      };
    },
    content: [],
    styles: {
      titleHeader: { fontSize: 24, bold: true, color: themeColors.darkBlue, alignment: "center", margin: [0, 80, 0, 10] },
      subtitle: { fontSize: 12, color: themeColors.orange, alignment: "center", margin: [0, 0, 0, 6] },
      pageTitle: { fontSize: 16, bold: true, color: themeColors.darkBlue, alignment: "center", margin: [0, 10, 0, 10] },
      sectionTitle: { fontSize: 14, bold: true, color: themeColors.darkBlue, margin: [0, 14, 0, 8] },
      tableHeader: { bold: true, fontSize: 8, color: themeColors.white, fillColor: themeColors.darkBlue, alignment: "center", margin: [2, 4, 2, 4] },
      tableCell: { fontSize: 8, margin: [2, 3, 2, 3], alignment: "center" },
      coverTitle: { fontSize: 18, bold: true, color: themeColors.darkBlue, alignment: "center", margin: [40, 25, 40, 10] },
      coverSubtitle: { fontSize: 12, color: themeColors.orange, alignment: "center", margin: [0, 0, 0, 10] },
      coverTableLabel: { bold: true, fontSize: 9, color: themeColors.darkBlue, alignment: "left", margin: [5, 5, 5, 5] },
      coverTableCell: { fontSize: 9, color: "#333333", alignment: "left", margin: [5, 5, 5, 5] },
    },
  };
  const content = documentDefinition.content;
  content.push({
    text: `System-Generated Monthly Operations & Maintenance Report – ICCC`,
    fontSize: 20,
    bold: true,
    color: themeColors.orange,
    font: "PTSerif",
    margin: [30, 25, 150, 15]
  });
  content.push({
    image: csTechLogoBase64,
    width: 120,
    absolutePosition: { x: 700, y: 25 }
  });
  content.push({
    text: "Project Name - Appointment of System Integrators (SI’s) for IoT Deployment including Design, Implementation & Maintenance with Centralized IoT Platform for Jal Jeevan Mission Projects in State of Maharashtra",
    fontSize: 14,
    bold: true,
    color: themeColors.darkBlue,
    alignment: "left",
    margin: [30, 0, 150, 10],
    font: "PTSerif"
  });
  content.push({
    text: monthDisplay,
    fontSize: 11,
    bold: true,
    color: themeColors.darkBlue,
    alignment: "left",
    margin: [30, 0, 150, 20],
    font: "PTSerif"
  });
  content.push({
    image: submittedToLogoBase64,
    width: 140,
    alignment: "center",
    margin: [0, 20, 0, 10],
    pageBreak: "after"
  });

  // Table of Contents on the second page
  content.push({ text: "Table of Contents", style: "pageTitle", fontSize: 30, margin: [0, 80, 0, 40] });

  const tocItems = [
    { text: "Monthly Pressure Integrated Schemes Data", margin: [0, 20, 0, 20], fontSize: 18 },
  ];
  content.push({
    ul: tocItems,
    margin: [160, 10, 0, 0], pageBreak: "after",
  });

  const renderLpcdTable = (lpcdData: any[], title: string, description: string, showPageBreak: boolean = true) => {
    content.push({ text: title, style: "pageTitle" });
    content.push({ text: description, alignment: "center", margin: [0, 0, 0, 14], fontSize: 9, color: "#555555" });

    if (!lpcdData || lpcdData.length === 0) {
      const lpcdBody = [
        [headerCell("Sr"), headerCell("Region"), headerCell("Data")],
        [{ text: "No LPCD data available for this section.", colSpan: 3, style: "tableCell", color: themeColors.grey, alignment: "center" }, {}, {}]
      ];
      content.push({
        table: { headerRows: 1, widths: ["auto", "auto", "auto"], body: lpcdBody },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => themeColors.lightGrey, vLineColor: () => themeColors.lightGrey },
        margin: [0, 0, 0, 20], pageBreak: showPageBreak ? "after" : undefined,
      });
      return;
    }

    const isMultiTableFormat = lpcdData.length > 0 && lpcdData[0].headers && Array.isArray(lpcdData[0].rows);
    const tablesToRender = isMultiTableFormat ? lpcdData : [lpcdData];

    tablesToRender.forEach((tableObj, tableIndex) => {
      const lpcdBody: any[] = [];
      let actualHeaders: string[] = [];
      let rowsToRender: any[][] = [];
      let waterSupplyFlags: boolean[] = [];

      if (isMultiTableFormat) {
        const wsColIdx = tableObj.headers.findIndex((h: string) => String(h || "").toLowerCase().trim() === 'water supply');
        const metadataFilter = (h: string) => {
          const lower = String(h || "").toLowerCase().trim();
          return !lower.match(/population/) && lower !== 'pop' && lower !== 'water supply';
        };

        actualHeaders = tableObj.headers.filter(metadataFilter);
        const originalHeaders = tableObj.headers;
        const filteredRows = tableObj.rows.filter((r: any) => r && r.length > 0);
        if (wsColIdx >= 0) {
          filteredRows.forEach((row: any[]) => {
            waterSupplyFlags.push(String(row[wsColIdx] || "").toLowerCase().trim() === 'yes');
          });
        }
        rowsToRender = filteredRows.map((row: any[]) => {
          return row.filter((_: any, i: number) => metadataFilter(originalHeaders[i]));
        });
      } else {
        const metadataFilter = (h: string) => {
          const lower = String(h || "").toLowerCase().trim();
          return !lower.match(/population/) && lower !== 'pop';
        };
        const allKeys = Object.keys(tableObj[0] || {});
        actualHeaders = allKeys.filter(metadataFilter);
        rowsToRender = tableObj.map((s: any) => actualHeaders.map(k => s[k]));
      }

      if (actualHeaders.length === 0 || rowsToRender.length === 0) {
        lpcdBody.push([headerCell("Data")]);
        lpcdBody.push([{ text: "Data is empty or incorrectly formatted.", style: "tableCell", alignment: "center" }]);
      } else {
        const isDense = true;
        const activeFontSize = 6;
        const activeHeaderFontSize = 6;
        lpcdBody.push(actualHeaders.map(key => {
          const keyStr = String(key || "");
          let fillColor: string | undefined;
          if (keyStr.includes("0.2-0.7")) {
            fillColor = themeColors.green;
          } else if (keyStr.includes("< 0.2") || keyStr.includes("> 0.7")) {
            fillColor = themeColors.red;
          }
          const cell = headerCell(abbreviateHeader(keyStr), fillColor);
          cell.fontSize = activeHeaderFontSize;
          cell.margin = isDense ? [1, 2, 1, 2] : [2, 4, 2, 4];
          return cell;
        }));
        rowsToRender.forEach((row, rowIndex) => {
          const isWsHighlighted = waterSupplyFlags.length > 0 && waterSupplyFlags[rowIndex] === true;
          const rowData: any[] = [];
          for (let i = 0; i < actualHeaders.length; i++) {
            const val = row[i];
            const valStr = String(val ?? "-").trim();
            const key = actualHeaders[i];
            const isDateCol = key.match(/^\d{1,2}$/) ||
              key.match(/^\d{1,2}-[a-zA-Z]{3}/) ||
              key.match(/^\d{4}-\d{2}-\d{2}$/);
            let cell;
            if (isDateCol && !isNaN(parseFloat(valStr)) && val !== null && val !== "" && valStr !== "-") {
              cell = pressureCell(val);
            } else {
              const align = key.toLowerCase().includes('scheme') || key.toLowerCase().includes('village') ? 'left' : 'center';
              cell = { text: valStr, style: "tableCell", alignment: align };
              if (isWsHighlighted) {
                cell.fillColor = "#E8F5E9";
              }
            }
            cell.fontSize = activeFontSize;
            cell.margin = isDense ? [1, 2, 1, 2] : [2, 3, 2, 3];
            rowData.push(cell);
          }
          lpcdBody.push(rowData);
        });
      }

      const isLastTable = tableIndex === tablesToRender.length - 1;

      content.push({
        table: {
          headerRows: 1,
          widths: lpcdBody[0] ? lpcdBody[0].map((cell: any) => {
            const text = String(cell.text || "").toLowerCase().trim();
            if (text === "sr") return 15;
            if (text === "circle" || text === "region") return 35;
            if (text === "division") return 35;
            if (text === "sub divis" || text.includes("sub division")) return 40;
            if (text === "block") return 35;
            if (text === "id" || text.includes("scheme id")) return 35;
            if (text === "scheme" || text.includes("scheme name")) return 110;
            if (text === "vil" || text === "village") return 70;
            if (text === "status") return 40;

            const isDayNum = !isNaN(parseInt(text)) && text.length <= 2;
            const isDateLong = text.match(/^\d{1,2}-[a-z]{3}/);

            if (isDayNum || isDateLong) return 18;
            return "auto";
          }) : ["auto"],
          body: lpcdBody,
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => themeColors.lightGrey, vLineColor: () => themeColors.lightGrey },
        margin: [0, 0, 0, 20],
        pageBreak: (isLastTable && showPageBreak) ? "after" : undefined,
      });

      if (!isLastTable) {
        content.push({ text: "Continued (Next Period)...", alignment: "center", margin: [0, 0, 0, 10], fontSize: 10, color: themeColors.darkBlue, italics: true, pageBreak: "before" });
      }
    });
  };

  renderLpcdTable(data.pressureCommissionedSchemes, "Monthly Pressure Integrated Schemes Data", "Pressure data spanning the valid dates for commissioned schemes, displayed in 2-week sub-tables. Values between 0.2 and 0.7 are highlighted green, < 0.2 in yellow, and > 0.7 in red.", false);

  content.push({ text: "End of Report.", alignment: "center", italics: true, color: themeColors.grey, margin: [0, 40, 0, 0], fontSize: 10 });
  return new Promise<void>((resolve, reject) => {
    try {
      const pdfDocGenerator = pdfMake.createPdf(documentDefinition);
      pdfDocGenerator.download(`Monthly_Report_${regionLabel}_${monthLabel}.pdf`);
      resolve();
    } catch (error) {
      console.error("Error generating Monthly Report PDF:", error);
      reject(error);
    }
  });
}
