import ExcelJS from 'exceljs';
import path from 'path';

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Attributes List', {
    views: [{ showGridLines: true }]
  });

  // Define columns
  worksheet.columns = [
    { header: 'Category', key: 'category', width: 25 },
    { header: 'Attribute / Field Name', key: 'name', width: 40 },
    { header: 'Data Type', key: 'type', width: 15 },
    { header: 'Description', key: 'description', width: 65 },
    { header: 'Database Table / Source', key: 'source', width: 35 },
  ];

  // Define attributes data
  const data = [
    // Category: Geographic Hierarchy
    {
      category: 'Geographic Hierarchy',
      name: 'region / region_name',
      type: 'Text',
      description: 'Geographic region in Maharashtra (e.g., Pune, Nagpur, Nashik, Amravati, Aurangabad, Konkan). Used as the primary filter level.',
      source: 'region, scheme_status, water_scheme_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'circle',
      type: 'Text',
      description: 'Administrative circle representing a cluster of divisions.',
      source: 'scheme_status, water_scheme_data, chlorine_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'division',
      type: 'Text',
      description: 'Administrative division representing a cluster of sub-divisions.',
      source: 'scheme_status, water_scheme_data, chlorine_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'sub_division',
      type: 'Text',
      description: 'Administrative sub-division under a division.',
      source: 'scheme_status, water_scheme_data, chlorine_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'block',
      type: 'Text',
      description: 'Local administrative block or Taluka containing villages and schemes.',
      source: 'scheme_status, water_scheme_data, chlorine_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'village_name',
      type: 'Text',
      description: 'The name of the individual village where water is consumed or distributed.',
      source: 'water_scheme_data, chlorine_data, pressure_data'
    },
    {
      category: 'Geographic Hierarchy',
      name: 'esr_name',
      type: 'Text',
      description: 'The name of the Elevated Service Reservoir (overhead tank) monitored by IoT.',
      source: 'chlorine_data, pressure_data, communication_status'
    },

    // Category: Scheme Vitals
    {
      category: 'Scheme Vitals',
      name: 'scheme_id',
      type: 'Text',
      description: 'Unique system identifier for the water supply scheme (e.g., SCM-7940695). Used to link records across all dashboards.',
      source: 'scheme_status, water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Scheme Vitals',
      name: 'scheme_name',
      type: 'Text',
      description: 'Descriptive name of the Water Supply Scheme (e.g., Bidgaon Tarodi WSS).',
      source: 'scheme_status, water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Scheme Vitals',
      name: 'agency',
      type: 'Text',
      description: 'The specific government department or agency managing the scheme.',
      source: 'scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'agency_type',
      type: 'Text',
      description: 'Type of agency managing the scheme. Common values: MJP (Maharashtra Jeevan Pradhikaran), ZP (Zilla Parishad).',
      source: 'scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'mjp_commissioned',
      type: 'Text / Yes/No',
      description: 'Indicates whether the water scheme has been officially commissioned by MJP.',
      source: 'scheme_status, scheme_lpcd_data_history'
    },
    {
      category: 'Scheme Vitals',
      name: 'mjp_fully_completed',
      type: 'Text',
      description: 'Indicates completion status of construction and installation (e.g., Fully Completed, In Progress).',
      source: 'scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'water_supply_status',
      type: 'Text',
      description: 'Operational water supply status tier (e.g., Full, Partial, No).',
      source: 'scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'population / total_population',
      type: 'Integer',
      description: 'Design population or census count served by the village/scheme.',
      source: 'water_scheme_data, scheme_lpcd, scheme_lpcd_data_history'
    },
    {
      category: 'Scheme Vitals',
      name: 'number_of_village / total_villages',
      type: 'Integer',
      description: 'Total number of villages supplied with water by this scheme.',
      source: 'scheme_status, scheme_lpcd'
    },
    {
      category: 'Scheme Vitals',
      name: 'total_number_of_esr / number_of_esr',
      type: 'Integer',
      description: 'Total overhead reservoirs planned or constructed under the scheme/village.',
      source: 'scheme_status, water_scheme_data'
    },
    {
      category: 'Scheme Vitals',
      name: 'total_esr_integrated',
      type: 'Integer',
      description: 'Number of Elevated Service Reservoirs successfully connected and transmitting telemetry to IoT platform.',
      source: 'region, scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'fully_completed_esr / no_fully_completed_esr',
      type: 'Integer',
      description: 'Number of Elevated Service Reservoirs fully constructed and operational.',
      source: 'region, scheme_status'
    },
    {
      category: 'Scheme Vitals',
      name: 'balance_to_complete_esr',
      type: 'Integer',
      description: 'Remaining number of planned ESRs currently incomplete or undergoing construction.',
      source: 'scheme_status'
    },

    // Category: Sensor Integration & Status
    {
      category: 'Sensor Integration & Status',
      name: 'flow_meter_connected / flow_meters_connected',
      type: 'Integer / Yes/No',
      description: 'Number or status indicator representing connected and integrated water flow meters.',
      source: 'region, scheme_status, communication_status'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'pressure_transmitter_connected / pressure_connected',
      type: 'Integer / Yes/No',
      description: 'Number or status indicator representing connected and integrated water pressure transmitters.',
      source: 'region, scheme_status, communication_status'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'residual_chlorine_analyzer_connected / chlorine_connected',
      type: 'Integer / Yes/No',
      description: 'Number or status indicator representing connected and integrated residual chlorine sensors.',
      source: 'region, scheme_status, communication_status'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'flow_meter_status',
      type: 'Text',
      description: 'Current real-time operational status of flow meter telemetry (e.g., Online, Offline).',
      source: 'communication_status, esr_monitoring'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'pressure_status',
      type: 'Text',
      description: 'Current real-time operational status of pressure sensor telemetry (e.g., Online, Offline).',
      source: 'communication_status, esr_monitoring'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'chlorine_status',
      type: 'Text',
      description: 'Current real-time operational status of chlorine analyzer telemetry (e.g., Online, Offline).',
      source: 'communication_status, esr_monitoring'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'overall_status',
      type: 'Text',
      description: 'Combined system telemetry status across all active sensors at the ESR (e.g., Online, Offline, 0h-72h, >72h).',
      source: 'communication_status, esr_monitoring'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'last_seen',
      type: 'Timestamp',
      description: 'The last date and time telemetry was successfully received from the chlorine analyzer or overall ESR station.',
      source: 'communication_status'
    },
    {
      category: 'Sensor Integration & Status',
      name: 'pressure_last_seen',
      type: 'Timestamp',
      description: 'The last date and time telemetry was successfully received from the pressure transmitter sensor.',
      source: 'communication_status'
    },

    // Category: Operational Measurements
    {
      category: 'Operational Measurements',
      name: 'flow_rate_m3',
      type: 'Decimal',
      description: 'Measured instantaneous rate of water flow in cubic meters per hour (m³/h).',
      source: 'water_consumption_data (CSV Import)'
    },
    {
      category: 'Operational Measurements',
      name: 'water_value_day1 to water_value_day7',
      type: 'Decimal',
      description: 'Water consumption volumes (in liters or KL) recorded daily over a rolling 7-day period.',
      source: 'water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Operational Measurements',
      name: 'water_date_day1 to water_date_day7',
      type: 'Text / Date',
      description: 'Dates corresponding to the rolling 7-day daily water consumption measurements.',
      source: 'water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Operational Measurements',
      name: 'lpcd_value_day1 to lpcd_value_day7',
      type: 'Decimal',
      description: 'Calculated daily water supply in Liters Per Capita Per Day (LPCD) over a rolling 7-day period.',
      source: 'water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Operational Measurements',
      name: 'lpcd_date_day1 to lpcd_date_day7',
      type: 'Text / Date',
      description: 'Dates corresponding to the rolling 7-day LPCD supply calculations.',
      source: 'water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Operational Measurements',
      name: 'chlorine_value_1 to chlorine_value_7',
      type: 'Decimal',
      description: 'Residual chlorine concentration values (measured in mg/l) recorded daily over a rolling 7-day period.',
      source: 'chlorine_data'
    },
    {
      category: 'Operational Measurements',
      name: 'chlorine_date_day_1 to chlorine_date_day_7',
      type: 'Text / Date',
      description: 'Dates corresponding to the rolling 7-day residual chlorine measurements.',
      source: 'chlorine_data'
    },
    {
      category: 'Operational Measurements',
      name: 'pressure_value_1 to pressure_value_7',
      type: 'Decimal',
      description: 'Water pressure readings (measured in bar) recorded daily over a rolling 7-day period.',
      source: 'pressure_data'
    },

    // Category: Analytical & Performance Metrics
    {
      category: 'Analytical & Performance Metrics',
      name: 'consistent_zero_lpcd_for_a_week',
      type: 'Integer / Bool',
      description: 'Flag/count indicating that the LPCD values remained at exactly 0.0 for 7 consecutive days (no water supply).',
      source: 'water_scheme_data, scheme_lpcd'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'below_55_lpcd_count',
      type: 'Integer',
      description: 'The number of days (out of the last 7) or number of villages where supply fell below the standard 55 LPCD benchmark.',
      source: 'water_scheme_data, scheme_lpcd, scheme_lpcd_data_history'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'above_55_lpcd_count',
      type: 'Integer',
      description: 'The number of days (out of the last 7) or number of villages where supply met or exceeded the standard 55 LPCD benchmark.',
      source: 'water_scheme_data, scheme_lpcd, scheme_lpcd_data_history'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'number_of_consistent_zero_value_in_chlorine',
      type: 'Integer',
      description: 'The number of days (out of the last 7) that the residual chlorine value was exactly 0.0 mg/l (un-chlorinated water).',
      source: 'chlorine_data'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'chlorine_less_than_02_mgl',
      type: 'Decimal',
      description: 'Calculated count or percentage representing days when residual chlorine fell below the safe minimum (< 0.2 mg/l).',
      source: 'chlorine_data'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'chlorine_between_02_05_mgl',
      type: 'Decimal',
      description: 'Calculated count or percentage representing days when residual chlorine was in the optimal range (0.2 to 0.5 mg/l).',
      source: 'chlorine_data'
    },
    {
      category: 'Analytical & Performance Metrics',
      name: 'chlorine_greater_than_05_mgl',
      type: 'Decimal',
      description: 'Calculated count or percentage representing days when residual chlorine exceeded the safe maximum (> 0.5 mg/l).',
      source: 'chlorine_data'
    },

    // Category: System & Integration Fields
    {
      category: 'System & Integration Fields',
      name: 'dashboard_url',
      type: 'Text',
      description: 'Dynamically generated hyperlink pointing directly to the corresponding PI Vision dashboard for deep telemetry analysis.',
      source: 'scheme_status, water_scheme_data, chlorine_data, pressure_data'
    },
    {
      category: 'System & Integration Fields',
      name: 'upload_batch_id',
      type: 'Text',
      description: 'Unique transaction identifier linking all records uploaded in a specific CSV import session. Crucial for rollbacks.',
      source: 'water_scheme_data_history, chlorine_history'
    }
  ];

  // Add rows
  worksheet.addRows(data);

  // Formatting headers
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F497D' }, // Slate Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      left: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF000000' } },
    };
  });

  // Apply row formatting
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    row.height = 22;
    const isEven = rowNumber % 2 === 0;
    const rowColor = isEven ? 'FFF2F6FA' : 'FFFFFFFF'; // Light alternating background

    row.eachCell((cell, colNumber) => {
      // Font style
      if (colNumber === 2) {
        // Monospace for attribute names
        cell.font = { name: 'Consolas', size: 10, bold: true, color: { argb: 'FF2B4C7E' } };
      } else {
        cell.font = { name: 'Segoe UI', size: 10 };
      }

      // Alternating background fill
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowColor },
      };

      // Alignment
      if (colNumber === 1 || colNumber === 3) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 4) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Grow row height if text is long
        const len = cell.value ? cell.value.toString().length : 0;
        if (len > 80) {
          row.height = Math.max(row.height, 35);
        }
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }

      // Thin borders
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      };
    });
  });

  // Save the workbook
  const outputPath = path.resolve('c:/Users/12626/dashboard8/mahajal_attributes.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Successfully generated attributes list Excel workbook at: ${outputPath}`);
}

generateExcel().catch(console.error);
