import express from 'express';
import * as db from '../db';
import pg from 'pg';

const router = express.Router();

// Get scheme LPCD data - aggregated from village LPCD data
router.get('/', async (req, res) => {
  try {
    const { region, minLpcd, maxLpcd, mjpCommissioned } = req.query;

    // Use pg directly for this route to perform complex aggregation
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Build the SQL query to join water_scheme_data with scheme_status
      // and aggregate the data by scheme

      let baseQuery = `
        -- First, get a clean, deduplicated view of the raw village data with correct LPCD counts
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        
        -- Create deduplicated village data with only one row per village
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            village_name,
            population,
            lpcd_value_day7,
            water_value_day1,
            water_value_day2,
            water_value_day3,
            water_value_day4,
            water_value_day5,
            water_value_day6,
            water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        
        -- First summarize by village to get single status per village
        village_status AS (
          SELECT
            scheme_id,
            block,
            village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        
        -- Then aggregate to scheme/block level
        lpcd_aggregation AS (
          SELECT
            scheme_id,
            block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),

        -- Now aggregate the deduplicated data with correct village counts
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            wsd.circle,
            wsd.division,
            wsd.sub_division,
            wsd.block,
            SUM(wsd.population) as total_population,
            
            -- Water supply aggregation for ALL 7 days
            SUM(wsd.water_value_day1) as total_water_day1,
            SUM(wsd.water_value_day2) as total_water_day2,
            SUM(wsd.water_value_day3) as total_water_day3,
            SUM(wsd.water_value_day4) as total_water_day4,
            SUM(wsd.water_value_day5) as total_water_day5,
            SUM(wsd.water_value_day6) as total_water_day6,
            SUM(wsd.water_value_day7) as total_water_day7,
            
            -- Keep the date values (will be the same per scheme)
            MAX(ws.water_date_day1) as water_date_day1,
            MAX(ws.water_date_day2) as water_date_day2,
            MAX(ws.water_date_day3) as water_date_day3,
            MAX(ws.water_date_day4) as water_date_day4,
            MAX(ws.water_date_day5) as water_date_day5,
            MAX(ws.water_date_day6) as water_date_day6,
            MAX(ws.water_date_day7) as water_date_day7,
            MAX(ws.lpcd_date_day1) as lpcd_date_day1,
            MAX(ws.lpcd_date_day2) as lpcd_date_day2,
            MAX(ws.lpcd_date_day3) as lpcd_date_day3,
            MAX(ws.lpcd_date_day4) as lpcd_date_day4,
            MAX(ws.lpcd_date_day5) as lpcd_date_day5,
            MAX(ws.lpcd_date_day6) as lpcd_date_day6,
            MAX(ws.lpcd_date_day7) as lpcd_date_day7,
            
            -- Use the pre-calculated village counts from lpcd_aggregation
            la.total_villages,
            la.villages_below_55,
            la.villages_above_55,
            la.villages_zero_supply,
            
            -- Additional scheme info from scheme_status
            -- Additional scheme info from scheme_status
            MAX(ss.dashboard_url) as dashboard_url,
            MAX(ss.mjp_commissioned) as mjp_commissioned,
            MAX(ss.fully_completed_villages) as fully_completed_villages,
            MAX(ss.total_villages_integrated) as total_villages_integrated,
            MAX(ss.total_number_of_esr) as total_number_of_esr,
            MAX(ss.total_esr_integrated) as total_esr_integrated,
            MAX(ss.no_fully_completed_esr) as no_fully_completed_esr,
            MAX(ss.fully_completion_scheme_status) as fully_completion_scheme_status,
            MAX(ss.scheme_functional_status) as scheme_functional_status,
            MAX(ss.flow_meters_connected) as flow_meters_connected,
            MAX(ss.pressure_transmitter_connected) as pressure_transmitter_connected,
            MAX(ss.residual_chlorine_analyzer_connected) as residual_chlorine_analyzer_connected,
            MAX(ss.agency) as agency
          FROM 
            deduplicated_villages wsd
          JOIN
            lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          LEFT JOIN
            water_scheme_data ws ON 
              wsd.scheme_id = ws.scheme_id AND 
              wsd.block = ws.block AND 
              wsd.village_name = ws.village_name
          LEFT JOIN
            scheme_status ss ON wsd.scheme_id = ss.scheme_id
          GROUP BY 
            wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block,
            la.total_villages, la.villages_below_55, la.villages_above_55, la.villages_zero_supply
        )
        
        -- Calculate the LPCD values for each scheme using the formula:
        -- (Total water supply * 100000) / Total population
        SELECT 
          scheme_id,
          scheme_name,
          region,
          circle,
          division,
          sub_division,
          block,
          total_population,
          total_villages,
          villages_below_55,
          villages_above_55,
          villages_zero_supply,
          
          -- Calculate the LPCD values for each day
          CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day2 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day2,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day3 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day3,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day4 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day4,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day5 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day5,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day6 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day6,
          -- For day7, calculate using total_water_day7 (FIXED - was using day6 before)
          CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
          
          -- Keep water supply totals for ALL 7 days
          total_water_day1,
          total_water_day2,
          total_water_day3,
          total_water_day4,
          total_water_day5,
          total_water_day6,
          total_water_day7,
          
          -- Dates for ALL 7 days
          water_date_day1,
          water_date_day2,
          water_date_day3,
          water_date_day4,
          water_date_day5,
          water_date_day6,
          water_date_day7,
          lpcd_date_day1,
          lpcd_date_day2,
          lpcd_date_day3,
          lpcd_date_day4,
          lpcd_date_day5,
          lpcd_date_day6,
          lpcd_date_day7,
          
          -- Additional scheme info
          dashboard_url,
          mjp_commissioned,
          -- NEW: Add these columns to support CombinedSchemesWidget
          fully_completed_villages,
          total_villages_integrated,
          total_number_of_esr,
          total_esr_integrated,
          no_fully_completed_esr,
          fully_completion_scheme_status,
          scheme_functional_status,
          flow_meters_connected,
          pressure_transmitter_connected,
          residual_chlorine_analyzer_connected,
          agency
        FROM 
          scheme_aggregation
      `;

      // Add WHERE clause for filtering
      const conditions: string[] = [];
      const queryParams: any[] = [];

      // Region filter
      if (region && region !== 'all') {
        conditions.push('region = $' + (queryParams.length + 1));
        queryParams.push(region);
      }

      // LPCD minimum filter
      if (minLpcd) {
        conditions.push('CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END >= $' + (queryParams.length + 1));
        queryParams.push(Number(minLpcd));
      }

      // LPCD maximum filter
      if (maxLpcd) {
        conditions.push('CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END < $' + (queryParams.length + 1));
        queryParams.push(Number(maxLpcd));
      }

      // MJP Commissioned filter
      if (mjpCommissioned === 'Yes' || mjpCommissioned === 'No') {
        conditions.push('mjp_commissioned = $' + (queryParams.length + 1));
        queryParams.push(mjpCommissioned);
      }

      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        baseQuery += ' WHERE ' + conditions.join(' AND ');
      }

      // Add ordering
      baseQuery += ' ORDER BY region, scheme_name';

      console.log('Executing Scheme LPCD Query:', baseQuery);
      console.log('Query Params:', queryParams);

      // Execute the query
      const result = await client.query(baseQuery, queryParams);
      console.log(`Query successful, returning ${result.rows.length} rows`);

      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme LPCD data:', error);
    res.status(500).json({ error: 'Failed to fetch scheme LPCD data' });
  }
});

// Get scheme LPCD statistics
router.get('/lpcd-stats', async (req, res) => {
  try {
    const { region } = req.query;

    // Use pg directly for this route
    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // First, get aggregated scheme data
      let aggregatedDataQuery = `
        WITH scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day1) as total_water_day1
          FROM 
            water_scheme_data wsd
          GROUP BY 
            wsd.scheme_id, wsd.scheme_name, wsd.region
        )
        
        SELECT 
          scheme_id,
          scheme_name,
          region,
          total_population,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day1 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day1
        FROM 
          scheme_aggregation
      `;

      // Add WHERE clause for region filtering
      const queryParams: any[] = [];
      if (region && region !== 'all') {
        aggregatedDataQuery += ' WHERE region = $1';
        queryParams.push(region);
      }

      // Execute the aggregation query
      const schemeData = await client.query(aggregatedDataQuery, queryParams);

      // Calculate statistics from the result
      const stats = {
        above_55_count: 0,
        below_40_count: 0,
        between_40_55_count: 0,
        zero_lpcd_count: 0,
        total_schemes: schemeData.rows.length
      };

      // Count schemes in different LPCD ranges
      schemeData.rows.forEach((scheme) => {
        const lpcdValue = parseFloat(scheme.lpcd_value_day1);

        if (lpcdValue === 0) {
          stats.zero_lpcd_count += 1;
        } else if (lpcdValue > 55) {
          stats.above_55_count += 1;
        } else if (lpcdValue < 40) {
          stats.below_40_count += 1;
        } else { // Between 40-55
          stats.between_40_55_count += 1;
        }
      });

      res.json(stats);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme LPCD statistics:', error);
    res.status(500).json({ error: 'Failed to fetch scheme LPCD statistics' });
  }
});

// Get scheme LPCD historical data with date range functionality
router.get('/history', async (req, res) => {
  try {
    const { scheme_id, start_date, end_date, region, block, limit = '1000', offset = '0' } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          h.*
        FROM scheme_lpcd_data_history h
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (scheme_id) {
        query += ` AND h.scheme_id = $${paramIndex}`;
        queryParams.push(scheme_id);
        paramIndex++;
      }

      if (block) {
        query += ` AND h.block = $${paramIndex}`;
        queryParams.push(block);
        paramIndex++;
      }

      if (region && region !== 'all') {
        query += ` AND h.region = $${paramIndex}`;
        queryParams.push(region);
        paramIndex++;
      }

      if (start_date) {
        // Dynamically parse date: use full date if present, otherwise append year from uploaded_at
        query += ` AND (
          CASE 
            WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
            WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
            ELSE TO_DATE(h.data_date || '-' || TO_CHAR(uploaded_at, 'YYYY'), 'DD-Mon-YYYY')
          END
        ) >= $${paramIndex}::date`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        // Dynamically parse date: use full date if present, otherwise append year from uploaded_at
        query += ` AND (
          CASE 
            WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
            WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
            ELSE TO_DATE(h.data_date || '-' || TO_CHAR(uploaded_at, 'YYYY'), 'DD-Mon-YYYY')
          END
        ) <= $${paramIndex}::date`;
        queryParams.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY data_date DESC, scheme_id`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(parseInt(limit as string));
      queryParams.push(parseInt(offset as string));

      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme LPCD history:', error);
    res.status(500).json({ error: 'Failed to fetch scheme LPCD history' });
  }
});

// Export scheme LPCD historical data with streaming for large datasets
router.get('/export/history', async (req, res) => {
  try {
    const { scheme_id, start_date, end_date, region, block, format = 'xlsx' } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          h.scheme_id,
          h.scheme_name,
          h.region,
          h.circle,
          h.division,
          h.sub_division,
          h.block,
          h.total_population,
          h.total_villages,
          h.villages_below_55,
          h.villages_above_55,
          h.villages_zero_supply,
          h.data_date,
          h.water_value,
          h.lpcd_value,
          h.dashboard_url,
          h.mjp_commissioned
        FROM scheme_lpcd_data_history h
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      if (scheme_id) {
        query += ` AND h.scheme_id = $${paramIndex}`;
        queryParams.push(scheme_id);
        paramIndex++;
      }

      if (block) {
        query += ` AND h.block = $${paramIndex}`;
        queryParams.push(block);
        paramIndex++;
      }

      if (region && region !== 'all') {
        query += ` AND h.region = $${paramIndex}`;
        queryParams.push(region);
        paramIndex++;
      }

      if (start_date) {
        // Dynamically parse date: use full date if present, otherwise append year from uploaded_at
        query += ` AND (
          CASE 
            WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
            WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
            ELSE TO_DATE(h.data_date || '-' || TO_CHAR(h.uploaded_at, 'YYYY'), 'DD-Mon-YYYY')
          END
        ) >= $${paramIndex}::date`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        // Dynamically parse date: use full date if present, otherwise append year from uploaded_at
        query += ` AND (
          CASE 
            WHEN h.data_date ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN h.data_date::date
            WHEN h.data_date ~ '^[0-9]+-[A-Za-z]+-[0-9]+$' THEN TO_DATE(h.data_date, 'DD-Mon-YY')
            ELSE TO_DATE(h.data_date || '-' || TO_CHAR(h.uploaded_at, 'YYYY'), 'DD-Mon-YYYY')
          END
        ) <= $${paramIndex}::date`;
        queryParams.push(end_date);
        paramIndex++;
      }

      query += ` ORDER BY h.data_date DESC, h.scheme_id`;

      console.log('[SCHEME EXPORT] Query:', query);
      console.log('[SCHEME EXPORT] Params:', queryParams);
      const result = await client.query(query, queryParams);
      console.log('[SCHEME EXPORT] Result count:', result.rows.length);

      // Get unique dates and sort them
      const dates = result.rows.map(r => r.data_date).filter(Boolean);
      const uniqueDatesSet = new Set(dates);
      const uniqueDates = Array.from(uniqueDatesSet).sort();

      console.log('[SCHEME EXPORT] Unique dates found:', uniqueDates);

      // Create scheme lookup map for consolidation (by scheme_id + block)
      const schemeMap = new Map();

      result.rows.forEach(row => {
        const key = `${row.scheme_id}_${row.block}`;
        if (!schemeMap.has(key)) {
          schemeMap.set(key, {
            scheme_id: row.scheme_id,
            scheme_name: row.scheme_name,
            region: row.region,
            circle: row.circle,
            division: row.division,
            sub_division: row.sub_division,
            block: row.block,
            total_population: row.total_population,
            total_villages: row.total_villages,
            mjp_commissioned: row.mjp_commissioned,
            dashboard_url: row.dashboard_url,
            dateData: {}
          });
        }

        const scheme = schemeMap.get(key);
        scheme.dateData[row.data_date] = {
          water_value: row.water_value,
          lpcd_value: row.lpcd_value,
          villages_below_55: row.villages_below_55,
          villages_above_55: row.villages_above_55,
          villages_zero_supply: row.villages_zero_supply
        };
      });

      const schemeData = Array.from(schemeMap.values());

      if (format === 'xlsx') {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.book_new();

        // Create the pivot table structure manually
        const pivotRows = [];

        // Build header row with dates as columns
        const headerRow = [
          'Scheme ID', 'Scheme Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block',
          'Total Population', 'Total Villages', 'MJP Commissioned'
        ];

        uniqueDates.forEach(date => {
          headerRow.push(`${date} Water Value`);
          headerRow.push(`${date} LPCD Value`);
          headerRow.push(`${date} Below 55`);
          headerRow.push(`${date} Above 55`);
          headerRow.push(`${date} Zero Supply`);
        });

        pivotRows.push(headerRow);

        // Build data rows
        schemeData.forEach((scheme) => {
          const dataRow = [
            scheme.scheme_id,
            scheme.scheme_name,
            scheme.region,
            scheme.circle,
            scheme.division,
            scheme.sub_division,
            scheme.block,
            scheme.total_population,
            scheme.total_villages,
            scheme.mjp_commissioned || ''
          ];

          uniqueDates.forEach(date => {
            const dateData = scheme.dateData[date];
            if (dateData) {
              dataRow.push(dateData.water_value || '');
              dataRow.push(dateData.lpcd_value || '');
              dataRow.push(dateData.villages_below_55 || '');
              dataRow.push(dateData.villages_above_55 || '');
              dataRow.push(dateData.villages_zero_supply || '');
            } else {
              dataRow.push('', '', '', '', ''); // Empty values for missing dates
            }
          });

          pivotRows.push(dataRow);
        });

        console.log(`[SCHEME EXPORT] FINAL PIVOT: ${pivotRows.length - 1} schemes, ${headerRow.length} columns total`);

        // Create worksheet from the pivot array
        const ws = XLSX.utils.aoa_to_sheet(pivotRows);

        // Set column widths
        const colWidths = [
          { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
          { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 }
        ];

        uniqueDates.forEach(() => {
          colWidths.push({ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 });
        });

        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Scheme LPCD History');

        const filename = `scheme_lpcd_history_${start_date || 'all'}_to_${end_date || 'all'}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.send(buffer);
      } else {
        // CSV format with pivot structure
        const headerRow = [
          'Scheme ID', 'Scheme Name', 'Region', 'Circle', 'Division', 'Sub Division', 'Block',
          'Total Population', 'Total Villages', 'MJP Commissioned'
        ];

        uniqueDates.forEach(date => {
          headerRow.push(`${date} Water Value`);
          headerRow.push(`${date} LPCD Value`);
          headerRow.push(`${date} Below 55`);
          headerRow.push(`${date} Above 55`);
          headerRow.push(`${date} Zero Supply`);
        });

        const filename = `scheme_lpcd_history_${start_date || 'all'}_to_${end_date || 'all'}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write headers
        res.write(headerRow.join(',') + '\n');

        // Write data rows
        schemeData.forEach((scheme) => {
          const dataRow = [
            scheme.scheme_id,
            `"${(scheme.scheme_name || '').replace(/"/g, '""')}"`,
            scheme.region,
            scheme.circle,
            scheme.division,
            scheme.sub_division,
            scheme.block,
            scheme.total_population,
            scheme.total_villages,
            scheme.mjp_commissioned || ''
          ];

          uniqueDates.forEach(date => {
            const dateData = scheme.dateData[date];
            if (dateData) {
              dataRow.push(dateData.water_value || '');
              dataRow.push(dateData.lpcd_value || '');
              dataRow.push(dateData.villages_below_55 || '');
              dataRow.push(dateData.villages_above_55 || '');
              dataRow.push(dateData.villages_zero_supply || '');
            } else {
              dataRow.push('', '', '', '', '');
            }
          });

          res.write(dataRow.join(',') + '\n');
        });

        res.end();
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error exporting scheme LPCD history:', error);
    res.status(500).json({ error: 'Failed to export scheme LPCD history' });
  }
});

// Populate scheme_lpcd_data_history from ALL days in water_scheme_data
router.post('/populate-history', async (req, res) => {
  try {
    console.log('📊 Populating scheme_lpcd_data_history from ALL days in water_scheme_data');

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      const uploadBatchId = `backfill_all_days_${Date.now()}`;
      let totalInserted = 0;

      // Process each day (1 through 7)
      for (let day = 1; day <= 7; day++) {
        console.log(`\n📅 Processing Day ${day}...`);

        const schemeQuery = `
          WITH deduplicated_villages AS (
            SELECT DISTINCT ON (scheme_id, block, village_name)
              scheme_id,
              scheme_name,
              region,
              circle,
              division,
              sub_division,
              block,
              village_name,
              population,
              lpcd_value_day${day},
              water_value_day${day},
              water_date_day${day},
              dashboard_url
            FROM water_scheme_data
            WHERE water_date_day${day} IS NOT NULL
            ORDER BY scheme_id, block, village_name, lpcd_value_day${day} DESC NULLS LAST
          ),
          scheme_aggregation AS (
            SELECT 
              wsd.scheme_id,
              wsd.scheme_name,
              wsd.region,
              wsd.circle,
              wsd.division,
              wsd.sub_division,
              wsd.block,
              SUM(wsd.population) as total_population,
              COUNT(DISTINCT wsd.village_name) as total_villages,
              COUNT(DISTINCT CASE WHEN wsd.lpcd_value_day${day} < 55 AND wsd.lpcd_value_day${day} > 0 THEN wsd.village_name END) as villages_below_55,
              COUNT(DISTINCT CASE WHEN wsd.lpcd_value_day${day} >= 55 THEN wsd.village_name END) as villages_above_55,
              COUNT(DISTINCT CASE WHEN wsd.lpcd_value_day${day} = 0 OR wsd.lpcd_value_day${day} IS NULL THEN wsd.village_name END) as villages_zero_supply,
              SUM(wsd.water_value_day${day}) as total_water,
              MAX(wsd.water_date_day${day}) as data_date,
              MAX(wsd.dashboard_url) as dashboard_url,
              MAX(ss.mjp_commissioned) as mjp_commissioned
            FROM deduplicated_villages wsd
            LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
            GROUP BY 
              wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, 
              wsd.division, wsd.sub_division, wsd.block
          )
          SELECT 
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            total_population,
            total_villages,
            villages_below_55,
            villages_above_55,
            villages_zero_supply,
            data_date,
            total_water as water_value,
            CASE 
              WHEN total_population > 0 
              THEN ROUND((total_water * 100000) / total_population, 2) 
              ELSE 0 
            END as lpcd_value,
            dashboard_url,
            mjp_commissioned
          FROM scheme_aggregation
          WHERE data_date IS NOT NULL
          ORDER BY scheme_id, block
        `;

        const result = await client.query(schemeQuery);
        console.log(`Found ${result.rows.length} scheme records for Day ${day}`);

        if (result.rows.length > 0) {
          let dayInserted = 0;
          const batchSize = 50;

          for (let i = 0; i < result.rows.length; i += batchSize) {
            const batch = result.rows.slice(i, i + batchSize);

            for (const record of batch) {
              try {
                const insertQuery = `
                  INSERT INTO scheme_lpcd_data_history 
                  (region, circle, division, sub_division, block, scheme_id, scheme_name,
                   total_population, total_villages, villages_below_55, villages_above_55, 
                   villages_zero_supply, data_date, water_value, lpcd_value, upload_batch_id, 
                   dashboard_url, mjp_commissioned)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                  ON CONFLICT (scheme_id, block, data_date) DO NOTHING
                `;

                const values = [
                  record.region,
                  record.circle,
                  record.division,
                  record.sub_division,
                  record.block,
                  record.scheme_id,
                  record.scheme_name,
                  record.total_population,
                  record.total_villages,
                  record.villages_below_55,
                  record.villages_above_55,
                  record.villages_zero_supply,
                  record.data_date,
                  record.water_value,
                  record.lpcd_value,
                  uploadBatchId,
                  record.dashboard_url,
                  record.mjp_commissioned
                ];

                await client.query(insertQuery, values);
                dayInserted++;
              } catch (insertError) {
                console.error(`Error inserting Day ${day} scheme history record:`, insertError);
              }
            }
          }

          console.log(`✅ Inserted ${dayInserted} records for Day ${day}`);
          totalInserted += dayInserted;
        }
      }

      console.log(`\n✅ Successfully populated ${totalInserted} total scheme historical records across all days`);

      res.json({
        success: true,
        message: `Successfully populated ${totalInserted} scheme historical records across 7 days`,
        recordsInserted: totalInserted,
        uploadBatchId
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error populating scheme history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to populate scheme history'
    });
  }
});

// GET schemes above 55 LPCD
router.get('/above-55', async (req, res) => {
  try {
    const { region, schemeId } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      const query = `
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        village_status AS (
          SELECT
            scheme_id,
            block,
            village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        lpcd_aggregation AS (
          SELECT
            scheme_id,
            block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            village_name,
            population,
            water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            wsd.circle,
            wsd.division,
            wsd.sub_division,
            wsd.block,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day7) as total_water_day7,
            la.total_villages,
            la.villages_below_55,
            la.villages_above_55,
            la.villages_zero_supply,
            MAX(ss.dashboard_url) as dashboard_url,
            MAX(ss.mjp_commissioned) as mjp_commissioned
          FROM deduplicated_villages wsd
          JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
          GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block,
                   la.total_villages, la.villages_below_55, la.villages_above_55, la.villages_zero_supply
        )
        SELECT 
          scheme_id,
          scheme_name,
          region,
          circle,
          division,
          sub_division,
          block,
          total_population,
          total_villages,
          villages_below_55,
          villages_above_55,
          villages_zero_supply,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
          dashboard_url,
          mjp_commissioned
        FROM scheme_aggregation
        WHERE CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END >= 55
        ${region && region !== 'all' ? 'AND region = $1' : ''}
        ${schemeId && schemeId !== 'all' ? `AND scheme_id = $${region && region !== 'all' ? '2' : '1'}` : ''}
        ORDER BY lpcd_value_day7 DESC
      `;

      const params: any[] = [];
      if (region && region !== 'all') params.push(region);
      if (schemeId && schemeId !== 'all') params.push(schemeId);

      const result = await client.query(query, params);
      res.json({ success: true, data: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching schemes above 55 LPCD:', error);
    res.status(500).json({ error: 'Failed to fetch schemes above 55 LPCD' });
  }
});

// GET schemes below 55 LPCD
router.get('/below-55', async (req, res) => {
  try {
    const { region, schemeId } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      const query = `
        WITH village_counts AS (
          SELECT 
            scheme_id,
            block,
            village_name,
            CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
            CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
            CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
          FROM water_scheme_data
        ),
        village_status AS (
          SELECT
            scheme_id,
            block,
            village_name,
            MAX(is_above_55) as has_above_55,
            MAX(is_below_55) as has_below_55,
            MAX(is_zero_supply) as has_zero_supply
          FROM village_counts
          GROUP BY scheme_id, block, village_name
        ),
        lpcd_aggregation AS (
          SELECT
            scheme_id,
            block,
            COUNT(DISTINCT village_name) as total_villages,
            SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
            SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
            SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
          FROM village_status
          GROUP BY scheme_id, block
        ),
        deduplicated_villages AS (
          SELECT DISTINCT ON (scheme_id, block, village_name)
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            village_name,
            population,
            water_value_day7
          FROM water_scheme_data
          ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
        ),
        scheme_aggregation AS (
          SELECT 
            wsd.scheme_id,
            wsd.scheme_name,
            wsd.region,
            wsd.circle,
            wsd.division,
            wsd.sub_division,
            wsd.block,
            SUM(wsd.population) as total_population,
            SUM(wsd.water_value_day7) as total_water_day7,
            la.total_villages,
            la.villages_below_55,
            la.villages_above_55,
            la.villages_zero_supply,
            MAX(ss.dashboard_url) as dashboard_url,
            MAX(ss.mjp_commissioned) as mjp_commissioned
          FROM deduplicated_villages wsd
          JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
          LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
          GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block,
                   la.total_villages, la.villages_below_55, la.villages_above_55, la.villages_zero_supply
        )
        SELECT 
          scheme_id,
          scheme_name,
          region,
          circle,
          division,
          sub_division,
          block,
          total_population,
          total_villages,
          villages_below_55,
          villages_above_55,
          villages_zero_supply,
          CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
          dashboard_url,
          mjp_commissioned
        FROM scheme_aggregation
        WHERE CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END < 55
          AND CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END > 0
        ${region && region !== 'all' ? 'AND region = $1' : ''}
        ${schemeId && schemeId !== 'all' ? `AND scheme_id = $${region && region !== 'all' ? '2' : '1'}` : ''}
        ORDER BY lpcd_value_day7 ASC
      `;

      const params: any[] = [];
      if (region && region !== 'all') params.push(region);
      if (schemeId && schemeId !== 'all') params.push(schemeId);

      const result = await client.query(query, params);
      res.json({ success: true, data: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching schemes below 55 LPCD:', error);
    res.status(500).json({ error: 'Failed to fetch schemes below 55 LPCD' });
  }
});

// GET combined scheme LPCD status (above + below 55)
router.get('/combined-lpcd', async (req, res) => {
  try {
    const { region, schemeId } = req.query;

    const { Pool } = pg;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Fetch both above and below 55 schemes in parallel
      const [above55Result, below55Result] = await Promise.all([
        client.query(`
          WITH village_counts AS (
            SELECT 
              scheme_id,
              block,
              village_name,
              CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
              CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
              CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
            FROM water_scheme_data
          ),
          village_status AS (
            SELECT
              scheme_id,
              block,
              village_name,
              MAX(is_above_55) as has_above_55,
              MAX(is_below_55) as has_below_55,
              MAX(is_zero_supply) as has_zero_supply
            FROM village_counts
            GROUP BY scheme_id, block, village_name
          ),
          lpcd_aggregation AS (
            SELECT
              scheme_id,
              block,
              COUNT(DISTINCT village_name) as total_villages,
              SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
              SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
              SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
            FROM village_status
            GROUP BY scheme_id, block
          ),
          deduplicated_villages AS (
            SELECT DISTINCT ON (scheme_id, block, village_name)
              scheme_id,
              scheme_name,
              region,
              circle,
              division,
              sub_division,
              block,
              village_name,
              population,
              water_value_day7
            FROM water_scheme_data
            ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
          ),
          scheme_aggregation AS (
            SELECT 
              wsd.scheme_id,
              wsd.scheme_name,
              wsd.region,
              wsd.circle,
              wsd.division,
              wsd.sub_division,
              wsd.block,
              SUM(wsd.population) as total_population,
              SUM(wsd.water_value_day7) as total_water_day7,
              la.total_villages,
              la.villages_below_55,
              la.villages_above_55,
              la.villages_zero_supply,
              MAX(ss.dashboard_url) as dashboard_url,
              MAX(ss.mjp_commissioned) as mjp_commissioned
            FROM deduplicated_villages wsd
            JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
            LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
            GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block,
                     la.total_villages, la.villages_below_55, la.villages_above_55, la.villages_zero_supply
          )
          SELECT 
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            total_population,
            total_villages,
            villages_below_55,
            villages_above_55,
            villages_zero_supply,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
            dashboard_url,
            mjp_commissioned
          FROM scheme_aggregation
          WHERE CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END >= 55
          ${region && region !== 'all' ? 'AND LOWER(region) = LOWER($1)' : ''}
          ${schemeId && schemeId !== 'all' ? `AND scheme_id = $${region && region !== 'all' ? '2' : '1'}` : ''}
          ORDER BY lpcd_value_day7 DESC
        `, (() => {
          const params: any[] = [];
          if (region && region !== 'all') params.push(region);
          if (schemeId && schemeId !== 'all') params.push(schemeId);
          return params;
        })()),
        client.query(`
          WITH village_counts AS (
            SELECT 
              scheme_id,
              block,
              village_name,
              CASE WHEN lpcd_value_day7 >= 55 THEN 1 ELSE 0 END as is_above_55,
              CASE WHEN lpcd_value_day7 < 55 AND lpcd_value_day7 > 0 THEN 1 ELSE 0 END as is_below_55,
              CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 ELSE 0 END as is_zero_supply
            FROM water_scheme_data
          ),
          village_status AS (
            SELECT
              scheme_id,
              block,
              village_name,
              MAX(is_above_55) as has_above_55,
              MAX(is_below_55) as has_below_55,
              MAX(is_zero_supply) as has_zero_supply
            FROM village_counts
            GROUP BY scheme_id, block, village_name
          ),
          lpcd_aggregation AS (
            SELECT
              scheme_id,
              block,
              COUNT(DISTINCT village_name) as total_villages,
              SUM(CASE WHEN has_above_55 > 0 THEN 1 ELSE 0 END) as villages_above_55,
              SUM(CASE WHEN has_below_55 > 0 THEN 1 ELSE 0 END) as villages_below_55,
              SUM(CASE WHEN has_above_55 = 0 AND has_below_55 = 0 THEN 1 ELSE 0 END) as villages_zero_supply
            FROM village_status
            GROUP BY scheme_id, block
          ),
          deduplicated_villages AS (
            SELECT DISTINCT ON (scheme_id, block, village_name)
              scheme_id,
              scheme_name,
              region,
              circle,
              division,
              sub_division,
              block,
              village_name,
              population,
              water_value_day7
            FROM water_scheme_data
            ORDER BY scheme_id, block, village_name, lpcd_value_day7 DESC NULLS LAST
          ),
          scheme_aggregation AS (
            SELECT 
              wsd.scheme_id,
              wsd.scheme_name,
              wsd.region,
              wsd.circle,
              wsd.division,
              wsd.sub_division,
              wsd.block,
              SUM(wsd.population) as total_population,
              SUM(wsd.water_value_day7) as total_water_day7,
              la.total_villages,
              la.villages_below_55,
              la.villages_above_55,
              la.villages_zero_supply,
              MAX(ss.dashboard_url) as dashboard_url,
              MAX(ss.mjp_commissioned) as mjp_commissioned
            FROM deduplicated_villages wsd
            JOIN lpcd_aggregation la ON wsd.scheme_id = la.scheme_id AND wsd.block = la.block
            LEFT JOIN scheme_status ss ON wsd.scheme_id = ss.scheme_id
            GROUP BY wsd.scheme_id, wsd.scheme_name, wsd.region, wsd.circle, wsd.division, wsd.sub_division, wsd.block,
                     la.total_villages, la.villages_below_55, la.villages_above_55, la.villages_zero_supply
          )
          SELECT 
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            total_population,
            total_villages,
            villages_below_55,
            villages_above_55,
            villages_zero_supply,
            CASE WHEN total_population > 0 THEN ROUND((total_water_day7 * 100000) / total_population, 2) ELSE 0 END as lpcd_value_day7,
            dashboard_url,
            mjp_commissioned
          FROM scheme_aggregation
          WHERE CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END < 55
            AND CASE WHEN total_population > 0 THEN (total_water_day7 * 100000) / total_population ELSE 0 END > 0
          ${region && region !== 'all' ? 'AND LOWER(region) = LOWER($1)' : ''}
          ${schemeId && schemeId !== 'all' ? `AND scheme_id = $${region && region !== 'all' ? '2' : '1'}` : ''}
          ORDER BY lpcd_value_day7 ASC
        `, (() => {
          const params: any[] = [];
          if (region && region !== 'all') params.push(region);
          if (schemeId && schemeId !== 'all') params.push(schemeId);
          return params;
        })())
      ]);

      res.json({
        success: true,
        filter: {
          region: region || 'all',
          schemeId: schemeId || 'all'
        },
        counts: {
          above55LPCD: above55Result.rows.length,
          below55LPCD: below55Result.rows.length,
          total: above55Result.rows.length + below55Result.rows.length
        },
        data: {
          schemesAbove55LPCD: above55Result.rows,
          schemesBelow55LPCD: below55Result.rows
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching combined scheme LPCD status:', error);
    res.status(500).json({ error: 'Failed to fetch combined scheme LPCD status' });
  }
});

export default router;