import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import {
  generateWaterConsumptionChart,
  generateLPCDChart,
  generateChlorineChart,
  generatePressureChart,
  calculateStatistics
} from "./chart-utils";

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
  if (!value || value === "--" || value === "null" || value === "undefined") return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function countDaysInRange(values: (string | null)[], min: number, max: number): number {
  return values.filter(v => {
    const num = safeParseNumber(v);
    return num > 0 && num >= min && num <= max;
  }).length;
}

function countDaysAbove(values: (string | null)[], threshold: number): number {
  return values.filter(v => {
    const num = safeParseNumber(v);
    return num > threshold;
  }).length;
}

function countDaysBelow(values: (string | null)[], threshold: number): number {
  return values.filter(v => {
    const num = safeParseNumber(v);
    return num > 0 && num < threshold;
  }).length;
}

function generateSchemeSummary(schemeInfo: any): string {
  const completionStatus = schemeInfo.fully_completion_scheme_status || 'Status not available';
  const mjpStatus = schemeInfo.mjp_fully_completed || 'Not specified';
  const functionalStatus = schemeInfo.scheme_functional_status || 'Unknown';
  
  return `The ${schemeInfo.scheme_name} (Scheme ID: ${schemeInfo.scheme_id}) is located in ${schemeInfo.region} region, ${schemeInfo.division} division, ${schemeInfo.block} block. ` +
    `The scheme is managed by ${schemeInfo.agency || 'Maharashtra Water Supply Department'} and serves ${schemeInfo.total_villages || 0} villages with a total of ${schemeInfo.total_esr || 0} ESRs (Elevated Storage Reservoirs). ` +
    `Current completion status: ${completionStatus}. ` +
    `Out of ${schemeInfo.total_villages || 0} villages, ${schemeInfo.fully_completed_villages || 0} are fully completed, ${schemeInfo.no_of_functional_village || 0} are functional, ${schemeInfo.no_of_partial_village || 0} are partially functional, and ${schemeInfo.no_of_non_functional_village || 0} are non-functional. ` +
    `The scheme has ${schemeInfo.total_esr_integrated || 0} ESRs integrated with IoT monitoring systems, with ${schemeInfo.no_fully_completed_esr || 0} fully completed. ` +
    `Infrastructure includes ${schemeInfo.flow_meters_connected || 0} flow meters, ${schemeInfo.pressure_transmitter_connected || 0} pressure transmitters, and ${schemeInfo.residual_chlorine_analyzer_connected || 0} residual chlorine analyzers. ` +
    `Functional Status: ${functionalStatus}. MJP Completion: ${mjpStatus}.`;
}

export async function generateEnhancedSchemePDF(data: SchemeReportData): Promise<void> {
  const { schemeInfo, villagesData } = data;

  // Generate all charts
  const chartPromises: Promise<any>[] = [];
  const villageCharts: { [key: string]: { water: string; lpcd: string } } = {};
  const esrCharts: { [key: string]: { chlorine: string; pressure: string } } = {};

  // Generate village charts
  for (const village of villagesData) {
    chartPromises.push(
      generateWaterConsumptionChart(village.water_consumption, village.village_name).then(img => {
        if (!villageCharts[village.village_name]) villageCharts[village.village_name] = { water: '', lpcd: '' };
        villageCharts[village.village_name].water = img;
      }),
      generateLPCDChart(village.lpcd, village.village_name).then(img => {
        if (!villageCharts[village.village_name]) villageCharts[village.village_name] = { water: '', lpcd: '' };
        villageCharts[village.village_name].lpcd = img;
      })
    );

    // Generate ESR charts
    for (const esr of village.esrs) {
      const esrKey = `${village.village_name}_${esr.esr_name}`;
      chartPromises.push(
        generateChlorineChart(esr.chlorine, esr.esr_name).then(img => {
          if (!esrCharts[esrKey]) esrCharts[esrKey] = { chlorine: '', pressure: '' };
          esrCharts[esrKey].chlorine = img;
        }),
        generatePressureChart(esr.pressure, esr.esr_name).then(img => {
          if (!esrCharts[esrKey]) esrCharts[esrKey] = { chlorine: '', pressure: '' };
          esrCharts[esrKey].pressure = img;
        })
      );
    }
  }

  await Promise.all(chartPromises);

  // Calculate statistics
  const stats = calculateStatistics(villagesData);

  // Build detailed table
  const detailedTableBody: any[] = [];
  
  detailedTableBody.push([
    { text: 'Sr No', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Village Name', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'ESR Name', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Latest Water\n(KL)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Latest\nLPCD', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Days LPCD\n>55', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Latest Chlorine\n(mg/L)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Chlorine Optimal\n(0.2-0.5)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Chlorine Above\n(>0.5)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Chlorine Below\n(<0.2)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Latest Pressure\n(Bar)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Pressure Optimal\n(0.2-0.7)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Pressure Above\n(>0.7)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
    { text: 'Pressure Below\n(<0.2)', style: 'tableHeader', fillColor: '#00324d', color: 'white', bold: true },
  ]);

  let srNo = 1;
  villagesData.forEach((village) => {
    const latestWater = safeParseNumber(village.water_consumption.day1);
    const latestLPCD = safeParseNumber(village.lpcd.day1);
    
    const lpcdValues = [
      village.lpcd.day1, village.lpcd.day2, village.lpcd.day3, 
      village.lpcd.day4, village.lpcd.day5, village.lpcd.day6, village.lpcd.day7
    ];
    const daysAbove55 = countDaysAbove(lpcdValues, 55);

    const esrCount = village.esrs.length || 1;

    if (village.esrs.length > 0) {
      village.esrs.forEach((esr, esrIndex) => {
        const latestChlorine = safeParseNumber(esr.chlorine.value_1);
        const latestPressure = safeParseNumber(esr.pressure.value_1);

        const chlorineValues = [
          esr.chlorine.value_1, esr.chlorine.value_2, esr.chlorine.value_3,
          esr.chlorine.value_4, esr.chlorine.value_5, esr.chlorine.value_6, esr.chlorine.value_7
        ];
        const chlorineOptimal = countDaysInRange(chlorineValues, 0.2, 0.5);
        const chlorineAbove = countDaysAbove(chlorineValues, 0.5);
        const chlorineBelow = countDaysBelow(chlorineValues, 0.2);

        const pressureValues = [
          esr.pressure.value_1, esr.pressure.value_2, esr.pressure.value_3,
          esr.pressure.value_4, esr.pressure.value_5, esr.pressure.value_6, esr.pressure.value_7
        ];
        const pressureOptimal = countDaysInRange(pressureValues, 0.2, 0.7);
        const pressureAbove = countDaysAbove(pressureValues, 0.7);
        const pressureBelow = countDaysBelow(pressureValues, 0.2);

        if (esrIndex === 0) {
          detailedTableBody.push([
            { text: srNo.toString(), rowSpan: esrCount, alignment: 'center', fontSize: 9 },
            { text: `${village.village_name}\n(Pop: ${village.population?.toLocaleString() || 'N/A'})`, rowSpan: esrCount, bold: true, fontSize: 9 },
            { text: esr.esr_name, fontSize: 8 },
            { text: latestWater.toFixed(1), rowSpan: esrCount, alignment: 'center', fontSize: 9, fillColor: latestWater > 0 ? '#d1fae5' : '#fee2e2' },
            { text: latestLPCD.toFixed(1), rowSpan: esrCount, alignment: 'center', fontSize: 9, fillColor: latestLPCD >= 55 ? '#d1fae5' : '#fef3c7' },
            { text: `${daysAbove55}/7`, rowSpan: esrCount, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
            { text: latestChlorine.toFixed(2), alignment: 'center', fontSize: 9, fillColor: latestChlorine >= 0.2 && latestChlorine <= 0.5 ? '#d1fae5' : latestChlorine > 0.5 ? '#fef3c7' : '#fee2e2' },
            { text: `${chlorineOptimal}/7`, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
            { text: `${chlorineAbove}/7`, alignment: 'center', fontSize: 9, fillColor: '#fef3c7' },
            { text: `${chlorineBelow}/7`, alignment: 'center', fontSize: 9, fillColor: '#fee2e2' },
            { text: latestPressure.toFixed(2), alignment: 'center', fontSize: 9, fillColor: latestPressure >= 0.2 && latestPressure <= 0.7 ? '#d1fae5' : latestPressure > 0.7 ? '#fef3c7' : '#fee2e2' },
            { text: `${pressureOptimal}/7`, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
            { text: `${pressureAbove}/7`, alignment: 'center', fontSize: 9, fillColor: '#fef3c7' },
            { text: `${pressureBelow}/7`, alignment: 'center', fontSize: 9, fillColor: '#fee2e2' },
          ]);
        } else {
          detailedTableBody.push([
            {}, {},
            { text: esr.esr_name, fontSize: 8 },
            {}, {}, {},
            { text: latestChlorine.toFixed(2), alignment: 'center', fontSize: 9, fillColor: latestChlorine >= 0.2 && latestChlorine <= 0.5 ? '#d1fae5' : latestChlorine > 0.5 ? '#fef3c7' : '#fee2e2' },
            { text: `${chlorineOptimal}/7`, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
            { text: `${chlorineAbove}/7`, alignment: 'center', fontSize: 9, fillColor: '#fef3c7' },
            { text: `${chlorineBelow}/7`, alignment: 'center', fontSize: 9, fillColor: '#fee2e2' },
            { text: latestPressure.toFixed(2), alignment: 'center', fontSize: 9, fillColor: latestPressure >= 0.2 && latestPressure <= 0.7 ? '#d1fae5' : latestPressure > 0.7 ? '#fef3c7' : '#fee2e2' },
            { text: `${pressureOptimal}/7`, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
            { text: `${pressureAbove}/7`, alignment: 'center', fontSize: 9, fillColor: '#fef3c7' },
            { text: `${pressureBelow}/7`, alignment: 'center', fontSize: 9, fillColor: '#fee2e2' },
          ]);
        }
      });
    } else {
      detailedTableBody.push([
        { text: srNo.toString(), alignment: 'center', fontSize: 9 },
        { text: `${village.village_name}\n(Pop: ${village.population?.toLocaleString() || 'N/A'})`, bold: true, fontSize: 9 },
        { text: 'No ESR', fontSize: 8, fillColor: '#e5e7eb' },
        { text: latestWater.toFixed(1), alignment: 'center', fontSize: 9, fillColor: latestWater > 0 ? '#d1fae5' : '#fee2e2' },
        { text: latestLPCD.toFixed(1), alignment: 'center', fontSize: 9, fillColor: latestLPCD >= 55 ? '#d1fae5' : '#fef3c7' },
        { text: `${daysAbove55}/7`, alignment: 'center', fontSize: 9, fillColor: '#e0e7ff' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
        { text: '--', alignment: 'center', fontSize: 9, fillColor: '#e5e7eb' },
      ]);
    }

    srNo++;
  });

  // Build PDF content with charts
  const content: any[] = [
    // Title with decorative line
    {
      text: 'SCHEME PERFORMANCE REPORT',
      style: 'mainTitle',
      alignment: 'center',
      margin: [0, 0, 0, 5],
      color: '#00324d'
    },
    {
      canvas: [
        {
          type: 'line',
          x1: 200, y1: 0,
          x2: 570, y2: 0,
          lineWidth: 3,
          lineColor: '#00324d'
        }
      ],
      margin: [0, 0, 0, 15]
    },

    // Scheme Summary
    {
      text: 'EXECUTIVE SUMMARY',
      style: 'sectionHeader',
      margin: [0, 10, 0, 8],
      color: '#00324d'
    },
    {
      text: generateSchemeSummary(schemeInfo),
      style: 'summaryText',
      alignment: 'justify',
      margin: [0, 0, 0, 15],
      lineHeight: 1.3
    },

    // Scheme Details Table
    {
      text: 'SCHEME DETAILS',
      style: 'sectionHeader',
      margin: [0, 15, 0, 8],
      color: '#00324d'
    },
    {
      table: {
        widths: ['25%', '25%', '25%', '25%'],
        body: [
          [
            { text: 'Scheme Name:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.scheme_name, colSpan: 3, fontSize: 10, margin: [5, 3] },
            {}, {}
          ],
          [
            { text: 'Scheme ID:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.scheme_id, fontSize: 10 },
            { text: 'Region:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.region, fontSize: 10 }
          ],
          [
            { text: 'Division:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.division, fontSize: 10 },
            { text: 'Block:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.block, fontSize: 10 }
          ],
          [
            { text: 'Total Villages:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.total_villages?.toString() || '0', fontSize: 10 },
            { text: 'Total ESRs:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.total_esr?.toString() || '0', fontSize: 10 }
          ],
          [
            { text: 'Completion Status:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.fully_completion_scheme_status || 'N/A', fontSize: 10 },
            { text: 'Functional Status:', bold: true, fillColor: '#f0f4f8', fontSize: 10, color: '#00324d' },
            { text: schemeInfo.scheme_functional_status || 'N/A', fontSize: 10 }
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1'
      },
      margin: [0, 0, 0, 15]
    },

    // Detailed Performance Table
    {
      text: 'DETAILED PERFORMANCE ANALYSIS',
      style: 'sectionHeader',
      margin: [0, 10, 0, 10],
      color: '#00324d',
      pageBreak: 'before'
    },
    {
      table: {
        headerRows: 1,
        widths: [25, 65, 60, 35, 30, 30, 35, 35, 30, 30, 35, 35, 30, 30],
        body: detailedTableBody,
      },
      layout: {
        fillColor: (rowIndex: number) => rowIndex === 0 ? '#00324d' : (rowIndex % 2 === 0 ? '#f8fafc' : null),
        hLineWidth: (i: number, node: any) => i === 0 || i === 1 || i === node.table.body.length ? 0.5 : 0.25,
        vLineWidth: () => 0.25,
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1'
      },
      fontSize: 8
    },
  ];

  // Add charts for each village
  villagesData.forEach((village, index) => {
    content.push(
      {
        text: `${village.village_name.toUpperCase()} - PERFORMANCE CHARTS`,
        style: 'sectionHeader',
        margin: [0, 15, 0, 10],
        color: '#00324d',
        pageBreak: index > 0 ? 'before' : undefined
      }
    );

    const charts = villageCharts[village.village_name];
    if (charts) {
      content.push({
        columns: [
          { image: charts.water, width: 260 },
          { image: charts.lpcd, width: 260 }
        ],
        columnGap: 15,
        margin: [0, 0, 0, 15]
      });
    }

    // Add ESR charts
    village.esrs.forEach(esr => {
      const esrKey = `${village.village_name}_${esr.esr_name}`;
      const esrChart = esrCharts[esrKey];
      if (esrChart) {
        content.push(
          {
            text: `${esr.esr_name} - Chlorine & Pressure Trends`,
            style: 'subHeader',
            margin: [0, 10, 0, 8],
            color: '#475569'
          },
          {
            columns: [
              { image: esrChart.chlorine, width: 260 },
              { image: esrChart.pressure, width: 260 }
            ],
            columnGap: 15,
            margin: [0, 0, 0, 12]
          }
        );
      }
    });
  });

  // Legend
  content.push({
    text: 'COLOR CODING REFERENCE',
    style: 'sectionHeader',
    margin: [0, 15, 0, 8],
    color: '#00324d',
    pageBreak: 'before'
  });

  content.push({
    table: {
      widths: ['*', '*', '*'],
      body: [
        [
          { text: '● Green', color: '#059669', fontSize: 11, bold: true, border: [false, false, false, false] },
          { text: 'Optimal/Good range', fontSize: 10, border: [false, false, false, false] },
          { text: '● Blue', color: '#2563eb', fontSize: 11, bold: true, border: [false, false, false, false] }
        ],
        [
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: 'Statistical information', fontSize: 10, border: [false, false, false, false] }
        ],
        [
          { text: '● Yellow', color: '#d97706', fontSize: 11, bold: true, border: [false, false, false, false] },
          { text: 'Warning/Moderate range', fontSize: 10, border: [false, false, false, false] },
          { text: '● Gray', color: '#6b7280', fontSize: 11, bold: true, border: [false, false, false, false] }
        ],
        [
          { text: '', border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] },
          { text: 'No data available', fontSize: 10, border: [false, false, false, false] }
        ],
        [
          { text: '● Red', color: '#dc2626', fontSize: 11, bold: true, border: [false, false, false, false] },
          { text: 'Critical/Below threshold', fontSize: 10, border: [false, false, false, false] },
          { text: '', border: [false, false, false, false] }
        ]
      ]
    },
    margin: [0, 0, 0, 10]
  });

  // Create PDF document
  const docDefinition: any = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [30, 70, 30, 50],
    header: {
      margin: [0, 15, 0, 10],
      stack: [
        {
          canvas: [
            {
              type: 'rect',
              x: 0, y: 0,
              w: 842, h: 50,
              color: '#00324d'
            }
          ]
        },
        {
          text: 'MAHARASHTRA WATER INFRASTRUCTURE MANAGEMENT',
          absolutePosition: { x: 0, y: 20 },
          alignment: 'center',
          fontSize: 15,
          bold: true,
          color: 'white',
          letterSpacing: 1
        },
        {
          text: 'Smart Report Analytics',
          absolutePosition: { x: 0, y: 38 },
          alignment: 'center',
          fontSize: 9,
          color: '#cbd5e1'
        }
      ]
    },
    footer: (currentPage: number, pageCount: number) => ({
      margin: [30, 15, 30, 0],
      stack: [
        {
          canvas: [
            {
              type: 'line',
              x1: 0, y1: 0,
              x2: 782, y2: 0,
              lineWidth: 0.5,
              lineColor: '#cbd5e1'
            }
          ]
        },
        {
          columns: [
            { 
              text: `Report Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, 
              fontSize: 9, 
              color: '#64748b',
              margin: [0, 5, 0, 0]
            },
            { 
              text: `Page ${currentPage} of ${pageCount}`, 
              fontSize: 9, 
              alignment: 'right', 
              color: '#64748b',
              margin: [0, 5, 0, 0]
            }
          ]
        }
      ]
    }),
    content: content,
    styles: {
      headerText: {
        fontSize: 16,
        bold: true,
        letterSpacing: 0.5
      },
      mainTitle: {
        fontSize: 22,
        bold: true,
        letterSpacing: 1.5
      },
      sectionHeader: {
        fontSize: 13,
        bold: true,
        letterSpacing: 0.8
      },
      subHeader: {
        fontSize: 11,
        bold: true
      },
      summaryText: {
        fontSize: 10,
        lineHeight: 1.4
      },
      tableHeader: {
        fontSize: 9,
        bold: true,
        alignment: 'center'
      }
    },
    defaultStyle: {
      font: 'Roboto'
    }
  };

  pdfMake.createPdf(docDefinition).download(`${schemeInfo.scheme_name.replace(/[^a-zA-Z0-9]/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}
