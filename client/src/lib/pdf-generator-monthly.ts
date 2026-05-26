import pdfMake from "pdfmake/build/pdfmake";
import { ptSerifVfs, ptSerifFonts } from "./ptserif-fonts";

pdfMake.vfs = ptSerifVfs;
pdfMake.fonts = ptSerifFonts;

const themeColors = {
  darkBlue: "#0A1D56",
  orange: "#FF7A00",
  lightGrey: "#E0E0E0",
  white: "#FFFFFF",
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
