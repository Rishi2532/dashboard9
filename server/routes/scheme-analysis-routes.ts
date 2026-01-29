import express from 'express';
import pg from 'pg';
import ExcelJS from 'exceljs';
import path from 'path';

const router = express.Router();
const { Pool } = pg;

// Get all schemes for overview
router.get('/all', async (req, res) => {
  try {
    const { region } = req.query;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = `
        SELECT 
          scheme_id,
          scheme_name,
          region,
          circle,
          division,
          sub_division,
          block,
          agency,
          COALESCE(number_of_village, '0') as number_of_village,
          COALESCE(total_villages_integrated, '0') as total_villages_integrated,
          COALESCE(fully_completed_villages, '0') as fully_completed_villages,
          COALESCE(total_number_of_esr, '0') as total_number_of_esr,
          COALESCE(total_esr_integrated, '0') as total_esr_integrated,
          COALESCE(no_fully_completed_esr, '0') as no_fully_completed_esr,
          COALESCE(flow_meters_connected, '0') as flow_meters_connected,
          COALESCE(pressure_transmitter_connected, '0') as pressure_transmitter_connected,
          COALESCE(residual_chlorine_analyzer_connected, '0') as residual_chlorine_analyzer_connected,
          mjp_commissioned,
          mjp_fully_completed,
          fully_completion_scheme_status,
          scheme_functional_status
        FROM scheme_status
      `;

      const params: any[] = [];
      if (region && typeof region === 'string' && region !== 'all') {
        query += ` WHERE region ILIKE $1`;
        params.push(region);
      }

      query += ` ORDER BY scheme_name ASC`;

      const result = await client.query(query, params);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching all schemes:', error);
    res.status(500).json({ error: 'Failed to fetch all schemes' });
  }
});

// Search for schemes by name or ID with fuzzy matching
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters long' });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Improved search for schemes by name or ID with better exact matching
      const searchQuery = `
        SELECT 
          scheme_id, 
          scheme_name, 
          region, 
          COUNT(*) as blocks_count,
          CASE 
            WHEN LOWER(scheme_name) = LOWER($3) THEN 1  -- Exact match gets highest priority
            WHEN LOWER(scheme_id) = LOWER($3) THEN 2    -- Exact ID match
            WHEN scheme_name ILIKE $2 THEN 3            -- Starts with pattern
            WHEN scheme_id ILIKE $2 THEN 4              -- ID starts with pattern  
            WHEN scheme_name ILIKE $1 THEN 5            -- Contains pattern in name
            WHEN scheme_id ILIKE $1 THEN 6              -- Contains pattern in ID
            ELSE 7
          END as priority_order
        FROM scheme_status 
        WHERE 
          LOWER(scheme_name) = LOWER($3)                -- Exact match first
          OR LOWER(scheme_id) = LOWER($3)               -- Exact ID match
          OR scheme_name ILIKE $2                       -- Starts with pattern
          OR scheme_id ILIKE $2                         -- ID starts with pattern
          OR scheme_name ILIKE $1                       -- Contains pattern in name
          OR scheme_id ILIKE $1                         -- Contains pattern in ID
        GROUP BY scheme_id, scheme_name, region
        ORDER BY priority_order, scheme_name
        LIMIT 10
      `;
      
      const queryStr = query as string;
      const searchPattern = `%${queryStr.trim()}%`;      // For partial matches
      const startPattern = `${queryStr.trim()}%`;        // For starts-with matches
      const exactPattern = queryStr.trim();              // For exact matches
      
      const result = await client.query(searchQuery, [
        searchPattern,    // $1: %query%
        startPattern,     // $2: query%  
        exactPattern      // $3: query (exact)
        // Note: Removed duplicate parameter
      ]);
      
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error searching schemes:', error);
    res.status(500).json({ error: 'Failed to search schemes' });
  }
});

// Get comprehensive scheme analysis by scheme ID or name
router.get('/comprehensive/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // First, find the scheme and get comprehensive basic info with multi-block aggregation
      const schemeQuery = `
        SELECT 
          MIN(ss.scheme_id) as scheme_id,
          ss.scheme_name,
          MIN(ss.region) as region,
          MIN(ss.circle) as circle,
          MIN(ss.division) as division,
          MIN(ss.sub_division) as sub_division,
          string_agg(DISTINCT ss.block, ', ') as block,
          MIN(ss.agency) as agency,
          SUM(CAST(COALESCE(ss.number_of_village, '0') AS INTEGER)) as number_of_village,
          SUM(CAST(COALESCE(ss.total_villages_integrated, '0') AS INTEGER)) as total_villages_integrated,
          SUM(CAST(COALESCE(ss.number_of_village, '0') AS INTEGER)) as total_villages_in_scheme,
          SUM(CAST(COALESCE(ss.no_of_functional_village, '0') AS INTEGER)) as no_of_functional_village,
          SUM(CAST(COALESCE(ss.fully_completed_villages, '0') AS INTEGER)) as fully_completed_villages,
          SUM(CAST(COALESCE(ss.no_of_partial_village, '0') AS INTEGER)) as partial_villages,
          SUM(CAST(COALESCE(ss.no_of_non_functional_village, '0') AS INTEGER)) as no_of_non_functional_village,
          SUM(CAST(COALESCE(ss.total_number_of_esr, '0') AS INTEGER)) as total_number_of_esr,
          SUM(CAST(COALESCE(ss.total_esr_integrated, '0') AS INTEGER)) as total_esr_integrated,
          SUM(CAST(COALESCE(ss.no_fully_completed_esr, '0') AS INTEGER)) as no_fully_completed_esr,
          SUM(CAST(COALESCE(ss.balance_to_complete_esr, '0') AS INTEGER)) as balance_to_complete_esr,
          SUM(CAST(COALESCE(ss.flow_meters_connected, '0') AS INTEGER)) as flow_meters_connected,
          SUM(CAST(COALESCE(ss.residual_chlorine_analyzer_connected, '0') AS INTEGER)) as residual_chlorine_analyzer_connected,
          SUM(CAST(COALESCE(ss.pressure_transmitter_connected, '0') AS INTEGER)) as pressure_transmitter_connected,
          MIN(ss.fully_completion_scheme_status) as fully_completion_scheme_status,
          MIN(ss.scheme_functional_status) as scheme_functional_status,
          MIN(ss.mjp_commissioned) as mjp_commissioned,
          MIN(ss.mjp_fully_completed) as mjp_fully_completed,
          MIN(ss.dashboard_url) as dashboard_url
        FROM scheme_status ss
        WHERE ss.scheme_name ILIKE $1 OR ss.scheme_id ILIKE $1
        GROUP BY ss.scheme_name
      `;

      const schemeResult = await client.query(schemeQuery, [`%${identifier}%`]);
      
      if (schemeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Scheme not found' });
      }

      const scheme = schemeResult.rows[0];

      // Get comprehensive water supply data from water_scheme_data
      const waterDataQuery = `
        SELECT 
          COUNT(*) as total_villages_with_data,
          COUNT(CASE WHEN water_value_day7 > 0 THEN 1 END) as villages_receiving_water,
          COUNT(CASE WHEN water_value_day7 = 0 OR water_value_day7 IS NULL THEN 1 END) as villages_with_no_water,
          COUNT(CASE WHEN 
            water_value_day1 > 0 AND water_value_day2 > 0 AND water_value_day3 > 0 AND 
            water_value_day4 > 0 AND water_value_day5 > 0 AND water_value_day6 > 0 AND water_value_day7 > 0 
            THEN 1 END) as villages_consistent_water,
          COUNT(CASE WHEN 
            (water_value_day1 = 0 OR water_value_day1 IS NULL) AND 
            (water_value_day2 = 0 OR water_value_day2 IS NULL) AND 
            (water_value_day3 = 0 OR water_value_day3 IS NULL) AND 
            (water_value_day4 = 0 OR water_value_day4 IS NULL) AND 
            (water_value_day5 = 0 OR water_value_day5 IS NULL) AND 
            (water_value_day6 = 0 OR water_value_day6 IS NULL) AND 
            (water_value_day7 = 0 OR water_value_day7 IS NULL)
            THEN 1 END) as villages_consistent_zero_water,
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_above_55_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 THEN 1 END) as villages_below_55_lpcd,
          COUNT(CASE WHEN 
            lpcd_value_day1 > 55 AND lpcd_value_day2 > 55 AND lpcd_value_day3 > 55 AND 
            lpcd_value_day4 > 55 AND lpcd_value_day5 > 55 AND lpcd_value_day6 > 55 AND lpcd_value_day7 > 55 
            THEN 1 END) as villages_consistently_above_55_lpcd,
          COUNT(CASE WHEN 
            lpcd_value_day1 <= 55 AND lpcd_value_day1 > 0 AND 
            lpcd_value_day2 <= 55 AND lpcd_value_day2 > 0 AND 
            lpcd_value_day3 <= 55 AND lpcd_value_day3 > 0 AND 
            lpcd_value_day4 <= 55 AND lpcd_value_day4 > 0 AND 
            lpcd_value_day5 <= 55 AND lpcd_value_day5 > 0 AND 
            lpcd_value_day6 <= 55 AND lpcd_value_day6 > 0 AND 
            lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0 
            THEN 1 END) as villages_consistently_below_55_lpcd,
          SUM(water_value_day7) as total_water_supply_day7,
          AVG(water_value_day7) as avg_water_supply_day7,
          AVG(lpcd_value_day7) as avg_lpcd_day7,
          SUM(population) as total_population_covered,
          COUNT(CASE WHEN 
            lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL
            THEN 1 END) as villages_zero_lpcd
        FROM water_scheme_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;

      const waterDataResult = await client.query(waterDataQuery, [`%${identifier}%`]);
      const waterData = waterDataResult.rows[0];

      // Get comprehensive chlorine sensor data
      const chlorineDataQuery = `
        SELECT 
          COUNT(*) as total_esr_with_chlorine_data,
          COUNT(CASE WHEN chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5 THEN 1 END) as esr_optimal_chlorine,
          COUNT(CASE WHEN chlorine_value_7 < 0.2 AND chlorine_value_7 IS NOT NULL THEN 1 END) as esr_below_chlorine,
          COUNT(CASE WHEN chlorine_value_7 > 0.5 THEN 1 END) as esr_above_chlorine,
          COUNT(CASE WHEN chlorine_value_7 = 0 OR chlorine_value_7 IS NULL THEN 1 END) as esr_zero_chlorine,
          COUNT(CASE WHEN 
            chlorine_value_1 >= 0.2 AND chlorine_value_1 <= 0.5 AND
            chlorine_value_2 >= 0.2 AND chlorine_value_2 <= 0.5 AND
            chlorine_value_3 >= 0.2 AND chlorine_value_3 <= 0.5 AND
            chlorine_value_4 >= 0.2 AND chlorine_value_4 <= 0.5 AND
            chlorine_value_5 >= 0.2 AND chlorine_value_5 <= 0.5 AND
            chlorine_value_6 >= 0.2 AND chlorine_value_6 <= 0.5 AND
            chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5
            THEN 1 END) as esr_consistent_optimal_chlorine,
          COUNT(CASE WHEN 
            (chlorine_value_1 < 0.2 OR chlorine_value_1 IS NULL) AND 
            (chlorine_value_2 < 0.2 OR chlorine_value_2 IS NULL) AND 
            (chlorine_value_3 < 0.2 OR chlorine_value_3 IS NULL) AND
            (chlorine_value_4 < 0.2 OR chlorine_value_4 IS NULL) AND 
            (chlorine_value_5 < 0.2 OR chlorine_value_5 IS NULL) AND 
            (chlorine_value_6 < 0.2 OR chlorine_value_6 IS NULL) AND 
            (chlorine_value_7 < 0.2 OR chlorine_value_7 IS NULL)
            THEN 1 END) as esr_consistent_below_chlorine,
          COUNT(CASE WHEN 
            chlorine_value_1 > 0.5 AND chlorine_value_2 > 0.5 AND chlorine_value_3 > 0.5 AND
            chlorine_value_4 > 0.5 AND chlorine_value_5 > 0.5 AND chlorine_value_6 > 0.5 AND chlorine_value_7 > 0.5
            THEN 1 END) as esr_consistent_above_chlorine,
          AVG(chlorine_value_7) as avg_chlorine_day7,
          COUNT(CASE WHEN 
            (chlorine_value_1 = 0 OR chlorine_value_1 IS NULL) AND 
            (chlorine_value_2 = 0 OR chlorine_value_2 IS NULL) AND 
            (chlorine_value_3 = 0 OR chlorine_value_3 IS NULL) AND
            (chlorine_value_4 = 0 OR chlorine_value_4 IS NULL) AND 
            (chlorine_value_5 = 0 OR chlorine_value_5 IS NULL) AND 
            (chlorine_value_6 = 0 OR chlorine_value_6 IS NULL) AND 
            (chlorine_value_7 = 0 OR chlorine_value_7 IS NULL)
            THEN 1 END) as esr_consistent_zero_chlorine
        FROM chlorine_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;

      const chlorineDataResult = await client.query(chlorineDataQuery, [`%${identifier}%`]);
      const chlorineData = chlorineDataResult.rows[0];

      // Get comprehensive pressure sensor data
      const pressureDataQuery = `
        SELECT 
          COUNT(*) as total_esr_with_pressure_data,
          COUNT(CASE WHEN pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7 THEN 1 END) as esr_optimal_pressure,
          COUNT(CASE WHEN pressure_value_7 < 0.2 AND pressure_value_7 IS NOT NULL THEN 1 END) as esr_below_pressure,
          COUNT(CASE WHEN pressure_value_7 > 0.7 THEN 1 END) as esr_above_pressure,
          COUNT(CASE WHEN pressure_value_7 = 0 OR pressure_value_7 IS NULL THEN 1 END) as esr_zero_pressure,
          COUNT(CASE WHEN 
            pressure_value_1 >= 0.2 AND pressure_value_1 <= 0.7 AND
            pressure_value_2 >= 0.2 AND pressure_value_2 <= 0.7 AND
            pressure_value_3 >= 0.2 AND pressure_value_3 <= 0.7 AND
            pressure_value_4 >= 0.2 AND pressure_value_4 <= 0.7 AND
            pressure_value_5 >= 0.2 AND pressure_value_5 <= 0.7 AND
            pressure_value_6 >= 0.2 AND pressure_value_6 <= 0.7 AND
            pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7
            THEN 1 END) as esr_consistent_optimal_pressure,
          COUNT(CASE WHEN 
            (pressure_value_1 < 0.2 OR pressure_value_1 IS NULL) AND 
            (pressure_value_2 < 0.2 OR pressure_value_2 IS NULL) AND 
            (pressure_value_3 < 0.2 OR pressure_value_3 IS NULL) AND
            (pressure_value_4 < 0.2 OR pressure_value_4 IS NULL) AND 
            (pressure_value_5 < 0.2 OR pressure_value_5 IS NULL) AND 
            (pressure_value_6 < 0.2 OR pressure_value_6 IS NULL) AND 
            (pressure_value_7 < 0.2 OR pressure_value_7 IS NULL)
            THEN 1 END) as esr_consistent_below_pressure,
          COUNT(CASE WHEN 
            pressure_value_1 > 0.7 AND pressure_value_2 > 0.7 AND pressure_value_3 > 0.7 AND
            pressure_value_4 > 0.7 AND pressure_value_5 > 0.7 AND pressure_value_6 > 0.7 AND pressure_value_7 > 0.7
            THEN 1 END) as esr_consistent_above_pressure,
          AVG(pressure_value_7) as avg_pressure_day7,
          COUNT(CASE WHEN 
            (pressure_value_1 = 0 OR pressure_value_1 IS NULL) AND 
            (pressure_value_2 = 0 OR pressure_value_2 IS NULL) AND 
            (pressure_value_3 = 0 OR pressure_value_3 IS NULL) AND
            (pressure_value_4 = 0 OR pressure_value_4 IS NULL) AND 
            (pressure_value_5 = 0 OR pressure_value_5 IS NULL) AND 
            (pressure_value_6 = 0 OR pressure_value_6 IS NULL) AND 
            (pressure_value_7 = 0 OR pressure_value_7 IS NULL)
            THEN 1 END) as esr_consistent_zero_pressure
        FROM pressure_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;

      const pressureDataResult = await client.query(pressureDataQuery, [`%${identifier}%`]);
      const pressureData = pressureDataResult.rows[0];

      // Get village completion data
      const villageDataQuery = `
        SELECT 
          COUNT(*) as total_villages_in_system,
          COUNT(CASE WHEN fully_completion_village_status = 'Completed' THEN 1 END) as fully_completed_villages_count,
          COUNT(CASE WHEN fully_completion_village_status = 'In Progress' THEN 1 END) as partial_villages_count
        FROM village 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;

      const villageDataResult = await client.query(villageDataQuery, [`%${identifier}%`]);
      const villageData = villageDataResult.rows[0];

      // Structure the comprehensive data according to user requirements
      const comprehensiveData = {
        scheme_information: {
          scheme_id: scheme.scheme_id,
          scheme_name: scheme.scheme_name,
          region: scheme.region,
          circle: scheme.circle,
          division: scheme.division,
          sub_division: scheme.sub_division,
          block: scheme.block,
          agency: scheme.agency,
          completion_status: scheme.fully_completion_scheme_status === 'Fully Completed' ? 'Fully Completed' : 'In Progress',
          functional_status: scheme.scheme_functional_status,
          mjp_commissioned: scheme.mjp_commissioned,
          mjp_fully_completed: scheme.mjp_fully_completed,
          dashboard_url: scheme.dashboard_url,
          
          // Village metrics
          number_of_villages: parseInt(scheme.number_of_village) || 0,
          villages_integrated: parseInt(scheme.total_villages_integrated) || 0,
          villages_in_scheme: parseInt(scheme.total_villages_in_scheme) || 0,
          functional_villages: parseInt(scheme.no_of_functional_village) || 0,
          fully_completed_villages: parseInt(scheme.fully_completed_villages) || 0,
          partial_villages: parseInt(scheme.partial_villages) || 0,
          non_functional_villages: parseInt(scheme.no_of_non_functional_village) || 0,
          
          // ESR metrics
          total_esr: parseInt(scheme.total_number_of_esr) || 0,
          esr_integrated: parseInt(scheme.total_esr_integrated) || 0,
          fully_completed_esr: parseInt(scheme.no_fully_completed_esr) || 0,
          balance_esr_to_complete: parseInt(scheme.balance_to_complete_esr) || 0,
          
          // Infrastructure metrics
          flow_meters_connected: parseInt(scheme.flow_meters_connected) || 0,
          chlorine_analyzers_connected: parseInt(scheme.residual_chlorine_analyzer_connected) || 0,
          pressure_transmitters_connected: parseInt(scheme.pressure_transmitter_connected) || 0
        },
        
        village_water_supply_data: {
          total_villages_with_data: parseInt(waterData.total_villages_with_data) || 0,
          villages_receiving_water: parseInt(waterData.villages_receiving_water) || 0,
          villages_with_no_water: parseInt(waterData.villages_with_no_water) || 0,
          villages_consistent_water_supply: parseInt(waterData.villages_consistent_water) || 0,
          villages_consistent_zero_water: parseInt(waterData.villages_consistent_zero_water) || 0,
          villages_above_55_lpcd: parseInt(waterData.villages_above_55_lpcd) || 0,
          villages_below_55_lpcd: parseInt(waterData.villages_below_55_lpcd) || 0,
          villages_consistently_above_55_lpcd: parseInt(waterData.villages_consistently_above_55_lpcd) || 0,
          villages_consistently_below_55_lpcd: parseInt(waterData.villages_consistently_below_55_lpcd) || 0,
          villages_zero_lpcd: parseInt(waterData.villages_zero_lpcd) || 0,
          total_water_supply_day7: parseFloat(waterData.total_water_supply_day7) || 0,
          avg_water_supply_day7: parseFloat(waterData.avg_water_supply_day7) || 0,
          avg_lpcd_day7: parseFloat(waterData.avg_lpcd_day7) || 0,
          total_population_covered: parseInt(waterData.total_population_covered) || 0
        },
        
        sensor_data: {
          chlorine_sensors: {
            total_esr_with_data: parseInt(chlorineData.total_esr_with_chlorine_data) || 0,
            optimal_range_0_2_to_0_5: parseInt(chlorineData.esr_optimal_chlorine) || 0,
            below_range_less_than_0_2: parseInt(chlorineData.esr_below_chlorine) || 0,
            above_range_greater_than_0_5: parseInt(chlorineData.esr_above_chlorine) || 0,
            zero_readings: parseInt(chlorineData.esr_zero_chlorine) || 0,
            consistent_optimal_range: parseInt(chlorineData.esr_consistent_optimal_chlorine) || 0,
            consistent_below_range: parseInt(chlorineData.esr_consistent_below_chlorine) || 0,
            consistent_above_range: parseInt(chlorineData.esr_consistent_above_chlorine) || 0,
            consistent_zero_readings: parseInt(chlorineData.esr_consistent_zero_chlorine) || 0,
            avg_chlorine_day7: parseFloat(chlorineData.avg_chlorine_day7) || 0
          },
          
          pressure_sensors: {
            total_esr_with_data: parseInt(pressureData.total_esr_with_pressure_data) || 0,
            optimal_range_0_2_to_0_7: parseInt(pressureData.esr_optimal_pressure) || 0,
            below_range_less_than_0_2: parseInt(pressureData.esr_below_pressure) || 0,
            above_range_greater_than_0_7: parseInt(pressureData.esr_above_pressure) || 0,
            zero_readings: parseInt(pressureData.esr_zero_pressure) || 0,
            consistent_optimal_range: parseInt(pressureData.esr_consistent_optimal_pressure) || 0,
            consistent_below_range: parseInt(pressureData.esr_consistent_below_pressure) || 0,
            consistent_above_range: parseInt(pressureData.esr_consistent_above_pressure) || 0,
            consistent_zero_readings: parseInt(pressureData.esr_consistent_zero_pressure) || 0,
            avg_pressure_day7: parseFloat(pressureData.avg_pressure_day7) || 0
          }
        },
        
        village_completion_data: {
          total_villages_in_system: parseInt(villageData.total_villages_in_system) || 0,
          fully_completed_villages_count: parseInt(villageData.fully_completed_villages_count) || 0,
          partial_villages_count: parseInt(villageData.partial_villages_count) || 0
        }
      };

      res.json(comprehensiveData);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching comprehensive scheme analysis:', error);
    res.status(500).json({ error: 'Failed to fetch comprehensive scheme analysis' });
  }
});

// Get detailed lists for interactive tabs
router.get('/details/:identifier/:category', async (req, res) => {
  try {
    const { identifier, category } = req.params;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = '';
      let queryParams: any[] = [`%${identifier}%`];

      switch (category) {
        case 'villages-with-water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND water_value_day7 > 0
            ORDER BY water_value_day7 DESC
          `;
          break;

        case 'villages-no-water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND (water_value_day7 = 0 OR water_value_day7 IS NULL)
            ORDER BY village_name
          `;
          break;

        case 'villages-consistent-water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND water_value_day1 > 0 AND water_value_day2 > 0 AND water_value_day3 > 0 
              AND water_value_day4 > 0 AND water_value_day5 > 0 AND water_value_day6 > 0 AND water_value_day7 > 0
            ORDER BY water_value_day7 DESC
          `;
          break;

        case 'villages-consistent-zero-water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND (water_value_day1 = 0 OR water_value_day1 IS NULL) 
              AND (water_value_day2 = 0 OR water_value_day2 IS NULL) 
              AND (water_value_day3 = 0 OR water_value_day3 IS NULL) 
              AND (water_value_day4 = 0 OR water_value_day4 IS NULL) 
              AND (water_value_day5 = 0 OR water_value_day5 IS NULL) 
              AND (water_value_day6 = 0 OR water_value_day6 IS NULL) 
              AND (water_value_day7 = 0 OR water_value_day7 IS NULL)
            ORDER BY village_name
          `;
          break;

        case 'villages-above-55-lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND lpcd_value_day7 > 55
            ORDER BY lpcd_value_day7 DESC
          `;
          break;

        case 'villages-below-55-lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0
            ORDER BY lpcd_value_day7 ASC
          `;
          break;

        case 'villages-consistently-above-55-lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND lpcd_value_day1 > 55 AND lpcd_value_day2 > 55 AND lpcd_value_day3 > 55 
              AND lpcd_value_day4 > 55 AND lpcd_value_day5 > 55 AND lpcd_value_day6 > 55 AND lpcd_value_day7 > 55
            ORDER BY lpcd_value_day7 DESC
          `;
          break;

        case 'villages-consistently-below-55-lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND lpcd_value_day1 <= 55 AND lpcd_value_day1 > 0 
              AND lpcd_value_day2 <= 55 AND lpcd_value_day2 > 0 
              AND lpcd_value_day3 <= 55 AND lpcd_value_day3 > 0 
              AND lpcd_value_day4 <= 55 AND lpcd_value_day4 > 0 
              AND lpcd_value_day5 <= 55 AND lpcd_value_day5 > 0 
              AND lpcd_value_day6 <= 55 AND lpcd_value_day6 > 0 
              AND lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0
            ORDER BY lpcd_value_day7 ASC
          `;
          break;

        case 'fully-completed-villages':
          query = `
            SELECT village_name, fully_completion_village_status, number_of_esr, connected_esr, region, block
            FROM village 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND fully_completion_village_status = 'Completed'
            ORDER BY village_name
          `;
          break;

        case 'partial-villages':
          query = `
            SELECT village_name, fully_completion_village_status, number_of_esr, connected_esr, region, block
            FROM village 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND fully_completion_village_status = 'In Progress'
            ORDER BY village_name
          `;
          break;

        case 'esr-optimal-chlorine':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5
            ORDER BY chlorine_value_7 DESC
          `;
          break;

        case 'esr-below-chlorine':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND chlorine_value_7 < 0.2
            ORDER BY chlorine_value_7 ASC
          `;
          break;

        case 'esr-above-chlorine':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND chlorine_value_7 > 0.5
            ORDER BY chlorine_value_7 DESC
          `;
          break;

        case 'esr-optimal-pressure':
          query = `
            SELECT village_name, esr_name, pressure_value_7, region, block
            FROM pressure_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7
            ORDER BY pressure_value_7 DESC
          `;
          break;

        case 'esr-below-pressure':
          query = `
            SELECT village_name, esr_name, pressure_value_7, region, block
            FROM pressure_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND pressure_value_7 < 0.2
            ORDER BY pressure_value_7 ASC
          `;
          break;

        case 'esr-above-pressure':
          query = `
            SELECT village_name, esr_name, pressure_value_7, region, block
            FROM pressure_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND pressure_value_7 > 0.7
            ORDER BY pressure_value_7 DESC
          `;
          break;

        default:
          return res.status(400).json({ error: 'Invalid category' });
      }

      const result = await client.query(query, queryParams);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching scheme details:', error);
    res.status(500).json({ error: 'Failed to fetch scheme details' });
  }
});

// Generate Excel export for comprehensive scheme report
router.get('/export/excel/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // First, get statistics for summary sheet matching dashboard calculations
      const lpcdStatsQuery = `
        SELECT 
          COUNT(*) as total_villages,
          COUNT(CASE WHEN lpcd_value_day7 > 55 THEN 1 END) as villages_above_55_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 > 0 AND lpcd_value_day7 < 55 THEN 1 END) as villages_below_55_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 = 0 OR lpcd_value_day7 IS NULL THEN 1 END) as villages_zero_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 >= 55 AND lpcd_value_day7 < 60 THEN 1 END) as villages_55_to_60_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 >= 60 AND lpcd_value_day7 < 65 THEN 1 END) as villages_60_to_65_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 >= 65 AND lpcd_value_day7 < 70 THEN 1 END) as villages_65_to_70_lpcd,
          COUNT(CASE WHEN lpcd_value_day7 >= 70 THEN 1 END) as villages_above_70_lpcd,
          SUM(population) as total_population,
          SUM(CASE WHEN lpcd_value_day7 > 55 THEN population ELSE 0 END) as population_above_55_lpcd,
          SUM(CASE WHEN lpcd_value_day7 > 0 AND lpcd_value_day7 < 55 THEN population ELSE 0 END) as population_below_55_lpcd
        FROM water_scheme_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;
      
      const chlorineStatsQuery = `
        SELECT 
          COUNT(*) as total_esr_with_chlorine,
          COUNT(CASE WHEN chlorine_value_7 < 0.2 OR chlorine_value_7 IS NULL THEN 1 END) as esr_below_02_chlorine,
          COUNT(CASE WHEN chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5 THEN 1 END) as esr_optimal_chlorine,
          COUNT(CASE WHEN chlorine_value_7 > 0.5 THEN 1 END) as esr_above_05_chlorine
        FROM chlorine_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;
      
      const pressureStatsQuery = `
        SELECT 
          COUNT(*) as total_esr_with_pressure,
          COUNT(CASE WHEN pressure_value_7 < 0.2 OR pressure_value_7 IS NULL THEN 1 END) as esr_below_02_pressure,
          COUNT(CASE WHEN pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7 THEN 1 END) as esr_optimal_pressure,
          COUNT(CASE WHEN pressure_value_7 > 0.7 THEN 1 END) as esr_above_07_pressure
        FROM pressure_data 
        WHERE scheme_name ILIKE $1 OR scheme_id ILIKE $1
      `;
      
      const lpcdStatsResult = await client.query(lpcdStatsQuery, [`%${identifier}%`]);
      const chlorineStatsResult = await client.query(chlorineStatsQuery, [`%${identifier}%`]);
      const pressureStatsResult = await client.query(pressureStatsQuery, [`%${identifier}%`]);
      
      const lpcdStats = lpcdStatsResult.rows[0] || {};
      const chlorineStats = chlorineStatsResult.rows[0] || {};
      const pressureStats = pressureStatsResult.rows[0] || {};

      // Get all the comprehensive data for Excel export
      const queries = {
        scheme_summary: `
          SELECT 
            MIN(ss.scheme_id) as scheme_id,
            ss.scheme_name,
            MIN(ss.region) as region,
            MIN(ss.circle) as circle,
            MIN(ss.division) as division,
            MIN(ss.sub_division) as sub_division,
            string_agg(DISTINCT ss.block, ', ') as block,
            MIN(ss.agency) as agency,
            SUM(CAST(COALESCE(ss.number_of_village, '0') AS INTEGER)) as total_villages,
            SUM(CAST(COALESCE(ss.total_villages_integrated, '0') AS INTEGER)) as villages_integrated,
            SUM(CAST(COALESCE(ss.fully_completed_villages, '0') AS INTEGER)) as fully_completed_villages,
            SUM(CAST(COALESCE(ss.total_number_of_esr, '0') AS INTEGER)) as total_esr,
            SUM(CAST(COALESCE(ss.total_esr_integrated, '0') AS INTEGER)) as esr_integrated,
            SUM(CAST(COALESCE(ss.no_fully_completed_esr, '0') AS INTEGER)) as fully_completed_esr,
            SUM(CAST(COALESCE(ss.flow_meters_connected, '0') AS INTEGER)) as flow_meters_connected,
            SUM(CAST(COALESCE(ss.residual_chlorine_analyzer_connected, '0') AS INTEGER)) as chlorine_analyzers_connected,
            SUM(CAST(COALESCE(ss.pressure_transmitter_connected, '0') AS INTEGER)) as pressure_transmitters_connected,
            MIN(ss.fully_completion_scheme_status) as completion_status,
            MIN(ss.scheme_functional_status) as functional_status
          FROM scheme_status ss
          WHERE ss.scheme_name ILIKE $1 OR ss.scheme_id ILIKE $1
          GROUP BY ss.scheme_name
        `,
        village_water_consumption: `
          SELECT 
            wc.region,
            wc.circle,
            wc.division,
            wc.sub_division,
            wc.block,
            wc.scheme_id,
            wc.scheme_name,
            wc.village_name,
            wc.esr_name,
            wc.esr_capacity,
            wc.water_value_day7 as latest_water_consumption_ll,
            wc.water_value_day1,
            wc.water_value_day2,
            wc.water_value_day3,
            wc.water_value_day4,
            wc.water_value_day5,
            wc.water_value_day6,
            wc.flow_meter_connected as flow_meter_status,
            wc.flow_rate_m3,
            wc.online_status,
            CASE 
              WHEN wc.esr_capacity > 0 THEN ROUND((wc.water_value_day7 / wc.esr_capacity * 100), 2)
              ELSE 0
            END as consumption_percentage
          FROM water_consumption wc
          WHERE wc.scheme_name ILIKE $1 OR wc.scheme_id ILIKE $1
          ORDER BY wc.village_name, wc.esr_name
        `,
        communication_data: `
          SELECT 
            cs.region,
            cs.circle,
            cs.division,
            cs.sub_division,
            cs.block,
            cs.scheme_id,
            cs.scheme_name,
            cs.village_name,
            cs.esr_name,
            cs.chlorine_connected,
            cs.pressure_connected,
            cs.flow_meter_connected
          FROM communication_status cs
          WHERE cs.scheme_name ILIKE $1 OR cs.scheme_id ILIKE $1
          ORDER BY cs.village_name, cs.esr_name
        `,
        chlorine_data: `
          SELECT 
            cd.region,
            cd.circle,
            cd.division,
            cd.sub_division,
            cd.block,
            cd.scheme_id,
            cd.scheme_name,
            cd.village_name,
            cd.esr_name,
            cd.chlorine_value_7 as latest_chlorine_level,
            CASE 
              WHEN cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5 THEN 'Optimal'
              WHEN cd.chlorine_value_7 < 0.2 THEN 'Below Standard'
              WHEN cd.chlorine_value_7 > 0.5 THEN 'Above Standard'
              ELSE 'No Data'
            END as chlorine_status,
            cd.chlorine_value_1,
            cd.chlorine_value_2,
            cd.chlorine_value_3,
            cd.chlorine_value_4,
            cd.chlorine_value_5,
            cd.chlorine_value_6
          FROM chlorine_data cd
          WHERE cd.scheme_name ILIKE $1 OR cd.scheme_id ILIKE $1
          ORDER BY cd.village_name, cd.esr_name
        `,
        pressure_data: `
          SELECT 
            pd.region,
            pd.circle,
            pd.division,
            pd.sub_division,
            pd.block,
            pd.scheme_id,
            pd.scheme_name,
            pd.village_name,
            pd.esr_name,
            pd.pressure_value_7 as latest_pressure_bar,
            CASE 
              WHEN pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7 THEN 'Optimal'
              WHEN pd.pressure_value_7 < 0.2 THEN 'Below Standard'
              WHEN pd.pressure_value_7 > 0.7 THEN 'Above Standard'
              ELSE 'No Data'
            END as pressure_status,
            pd.pressure_value_1,
            pd.pressure_value_2,
            pd.pressure_value_3,
            pd.pressure_value_4,
            pd.pressure_value_5,
            pd.pressure_value_6
          FROM pressure_data pd
          WHERE pd.scheme_name ILIKE $1 OR pd.scheme_id ILIKE $1
          ORDER BY pd.village_name, pd.esr_name
        `,
      };

      const results: any = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await client.query(query, [`%${identifier}%`]);
        results[key] = result.rows;
      }

      // Create Excel workbook with ExcelJS and sky blue headers
      const workbook = new ExcelJS.Workbook();
      
      // Helper function to add sky blue headers and format data
      const addWorksheetWithHeaders = (data: any[], sheetName: string) => {
        if (!Array.isArray(data) || data.length === 0) return;
        
        // Format data to remove underscores from headers and replace date columns
        const formattedData = data.map(row => {
          const formattedRow: any = {};
          
          Object.keys(row).forEach(key => {
            let newKey = key;
            
            // Remove underscores and capitalize properly
            if (key.includes('_')) {
              newKey = key.split('_').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
            
            // For chlorine data, replace value columns with date columns
            if (sheetName === 'chlorine_data') {
              if (key === 'chlorine_value_1') {
                newKey = row['chlorine_date_day_1'] || 'Day 1';
              } else if (key === 'chlorine_value_2') {
                newKey = row['chlorine_date_day_2'] || 'Day 2';
              } else if (key === 'chlorine_value_3') {
                newKey = row['chlorine_date_day_3'] || 'Day 3';
              } else if (key === 'chlorine_value_4') {
                newKey = row['chlorine_date_day_4'] || 'Day 4';
              } else if (key === 'chlorine_value_5') {
                newKey = row['chlorine_date_day_5'] || 'Day 5';
              } else if (key === 'chlorine_value_6') {
                newKey = row['chlorine_date_day_6'] || 'Day 6';
              } else if (key === 'chlorine_value_7') {
                newKey = row['chlorine_date_day_7'] || 'Day 7';
              }
            }
            
            // For pressure data, replace value columns with date columns
            if (sheetName === 'pressure_data') {
              if (key === 'pressure_value_1') {
                newKey = row['pressure_date_day_1'] || 'Day 1';
              } else if (key === 'pressure_value_2') {
                newKey = row['pressure_date_day_2'] || 'Day 2';
              } else if (key === 'pressure_value_3') {
                newKey = row['pressure_date_day_3'] || 'Day 3';
              } else if (key === 'pressure_value_4') {
                newKey = row['pressure_date_day_4'] || 'Day 4';
              } else if (key === 'pressure_value_5') {
                newKey = row['pressure_date_day_5'] || 'Day 5';
              } else if (key === 'pressure_value_6') {
                newKey = row['pressure_date_day_6'] || 'Day 6';
              } else if (key === 'pressure_value_7') {
                newKey = row['pressure_date_day_7'] || 'Day 7';
              }
            }
            
            // For water consumption data, replace value columns with date columns
            if (sheetName === 'village_water_consumption') {
              if (key === 'water_value_day1') {
                newKey = row['water_date_day1'] || 'Day 1';
              } else if (key === 'water_value_day2') {
                newKey = row['water_date_day2'] || 'Day 2';
              } else if (key === 'water_value_day3') {
                newKey = row['water_date_day3'] || 'Day 3';
              } else if (key === 'water_value_day4') {
                newKey = row['water_date_day4'] || 'Day 4';
              } else if (key === 'water_value_day5') {
                newKey = row['water_date_day5'] || 'Day 5';
              } else if (key === 'water_value_day6') {
                newKey = row['water_date_day6'] || 'Day 6';
              } else if (key === 'water_value_day7') {
                newKey = row['water_date_day7'] || 'Day 7';
              }
            }
            
            // Skip date columns as they're now used as headers
            if (!key.includes('_date_day') && !key.includes('date_day')) {
              formattedRow[newKey] = row[key];
            }
          });
          
          return formattedRow;
        });
        
        // Create worksheet
        const worksheet = workbook.addWorksheet(sheetName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
        
        // Add header row
        const headerKeys = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
        worksheet.addRow(headerKeys);
        
        // Add data rows
        formattedData.forEach((row) => {
          worksheet.addRow(headerKeys.map((key) => row[key]));
        });
        
        // Style header row with sky blue background
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '87CEEB' } // Sky blue color
          };
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White bold text
          cell.alignment = { horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      };
      
      // Add Summary Statistics worksheet first (matching dashboard calculations)
      const summarySheet = workbook.addWorksheet('Dashboard Statistics');
      
      // Style helper for summary sheet
      const addSummarySection = (startRow: number, title: string, data: {label: string, value: any}[]) => {
        // Add section title
        summarySheet.getRow(startRow).getCell(1).value = title;
        summarySheet.getRow(startRow).getCell(1).font = { bold: true, size: 14 };
        summarySheet.getRow(startRow).getCell(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4472C4' }
        };
        summarySheet.getRow(startRow).getCell(1).font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
        summarySheet.mergeCells(startRow, 1, startRow, 2);
        
        // Add data rows
        data.forEach((item, index) => {
          const row = startRow + index + 1;
          summarySheet.getRow(row).getCell(1).value = item.label;
          summarySheet.getRow(row).getCell(2).value = item.value;
          summarySheet.getRow(row).getCell(1).font = { bold: true };
        });
        
        return startRow + data.length + 2;
      };
      
      // Set column widths
      summarySheet.getColumn(1).width = 40;
      summarySheet.getColumn(2).width = 20;
      
      let currentRow = 1;
      
      // 55 LPCD Village Achievement Section (matching EnhancedLpcdDashboard)
      currentRow = addSummarySection(currentRow, '55 LPCD Village Achievement', [
        { label: 'Total Villages', value: parseInt(lpcdStats.total_villages) || 0 },
        { label: 'Villages Above 55 LPCD (> 55)', value: parseInt(lpcdStats.villages_above_55_lpcd) || 0 },
        { label: 'Villages Below 55 LPCD (> 0 and < 55)', value: parseInt(lpcdStats.villages_below_55_lpcd) || 0 },
        { label: 'Villages with Zero/No Data', value: parseInt(lpcdStats.villages_zero_lpcd) || 0 },
        { label: 'Villages 55-60 LPCD', value: parseInt(lpcdStats.villages_55_to_60_lpcd) || 0 },
        { label: 'Villages 60-65 LPCD', value: parseInt(lpcdStats.villages_60_to_65_lpcd) || 0 },
        { label: 'Villages 65-70 LPCD', value: parseInt(lpcdStats.villages_65_to_70_lpcd) || 0 },
        { label: 'Villages Above 70 LPCD', value: parseInt(lpcdStats.villages_above_70_lpcd) || 0 },
        { label: 'Total Population Covered', value: parseInt(lpcdStats.total_population) || 0 },
        { label: 'Population Above 55 LPCD', value: parseInt(lpcdStats.population_above_55_lpcd) || 0 },
        { label: 'Population Below 55 LPCD', value: parseInt(lpcdStats.population_below_55_lpcd) || 0 },
      ]);
      
      // Chlorine Range Section (matching ChlorineDashboard - zero/null included in below range)
      currentRow = addSummarySection(currentRow, 'Chlorine Sensor Range (mg/L)', [
        { label: 'Total ESRs with Chlorine Data', value: parseInt(chlorineStats.total_esr_with_chlorine) || 0 },
        { label: 'Below Range (< 0.2 mg/L)', value: parseInt(chlorineStats.esr_below_02_chlorine) || 0 },
        { label: 'Optimal Range (0.2 - 0.5 mg/L)', value: parseInt(chlorineStats.esr_optimal_chlorine) || 0 },
        { label: 'Above Range (> 0.5 mg/L)', value: parseInt(chlorineStats.esr_above_05_chlorine) || 0 },
      ]);
      
      // Pressure Range Section (matching PressureDashboard - zero/null included in below range)
      currentRow = addSummarySection(currentRow, 'Pressure Sensor Range (bar)', [
        { label: 'Total ESRs with Pressure Data', value: parseInt(pressureStats.total_esr_with_pressure) || 0 },
        { label: 'Below Range (< 0.2 bar)', value: parseInt(pressureStats.esr_below_02_pressure) || 0 },
        { label: 'Optimal Range (0.2 - 0.7 bar)', value: parseInt(pressureStats.esr_optimal_pressure) || 0 },
        { label: 'Above Range (> 0.7 bar)', value: parseInt(pressureStats.esr_above_07_pressure) || 0 },
      ]);
      
      // Add worksheets for each data type with sky blue headers
      Object.entries(results).forEach(([sheetName, data]) => {
        addWorksheetWithHeaders(data as any[], sheetName);
      });

      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      const schemeName = results.scheme_summary[0]?.scheme_name || identifier;
      const region = results.scheme_summary[0]?.region || 'Unknown_Region';
      const fileName = `${schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${region.replace(/[^a-zA-Z0-9]/g, '_')}_Basic_Report.xlsx`;
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(excelBuffer as unknown as Buffer)
      });

      res.send(excelBuffer);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating Excel export:', error);
    res.status(500).json({ error: 'Failed to generate Excel export' });
  }
});

// Generate Comprehensive Village Excel export (water_scheme_data format)
router.get('/export/villages/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Get village water scheme data in same format as village LPCD page
      const villageQuery = `
        SELECT 
          wsd.region,
          wsd.circle,
          wsd.division,
          wsd.sub_division,
          wsd.block,
          wsd.scheme_id,
          wsd.scheme_name,
          wsd.village_name,
          wsd.population,
          wsd.water_value_day7 as latest_water_supply_ll,
          wsd.lpcd_value_day7 as latest_lpcd,
          CASE 
            WHEN wsd.lpcd_value_day7 > 55 THEN 'Above 55 LPCD'
            WHEN wsd.lpcd_value_day7 <= 55 AND wsd.lpcd_value_day7 > 0 THEN 'Below 55 LPCD'
            ELSE 'No Data'
          END as lpcd_status,
          wsd.lpcd_value_day1,
          wsd.lpcd_value_day2,
          wsd.lpcd_value_day3,
          wsd.lpcd_value_day4,
          wsd.lpcd_value_day5,
          wsd.lpcd_value_day6,
          wsd.lpcd_value_day7,
          wsd.water_value_day1,
          wsd.water_value_day2,
          wsd.water_value_day3,
          wsd.water_value_day4,
          wsd.water_value_day5,
          wsd.water_value_day6,
          wsd.water_value_day7,
          wsd.water_date_day_1,
          wsd.water_date_day_2,
          wsd.water_date_day_3,
          wsd.water_date_day_4,
          wsd.water_date_day_5,
          wsd.water_date_day_6,
          wsd.water_date_day_7,
          wsd.consistent_zero_water_supply,
          wsd.consistent_water_supply,
          wsd.dashboard_url
        FROM water_scheme_data wsd
        WHERE wsd.scheme_name ILIKE $1 OR wsd.scheme_id ILIKE $1
        ORDER BY wsd.village_name
      `;

      const result = await client.query(villageQuery, [`%${identifier}%`]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No village data found for this scheme' });
      }

      // Create Excel workbook with ExcelJS and sky blue headers
      const workbook = new ExcelJS.Workbook();
      
      // Format data to remove underscores from headers and replace date columns
      const formattedData = result.rows.map(row => {
        const formattedRow: any = {};
        Object.keys(row).forEach(key => {
          let newKey = key;
          
          // Remove underscores and capitalize properly
          if (key.includes('_')) {
            newKey = key.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          }
          
          // For water consumption data in villages export, replace value columns with date columns
          if (key === 'water_value_day1') {
            newKey = row['water_date_day_1'] || 'Day 1';
          } else if (key === 'water_value_day2') {
            newKey = row['water_date_day_2'] || 'Day 2';
          } else if (key === 'water_value_day3') {
            newKey = row['water_date_day_3'] || 'Day 3';
          } else if (key === 'water_value_day4') {
            newKey = row['water_date_day_4'] || 'Day 4';
          } else if (key === 'water_value_day5') {
            newKey = row['water_date_day_5'] || 'Day 5';
          } else if (key === 'water_value_day6') {
            newKey = row['water_date_day_6'] || 'Day 6';
          } else if (key === 'water_value_day7') {
            newKey = row['water_date_day_7'] || 'Day 7';
          } else if (key === 'lpcd_value_day1') {
            newKey = 'LPCD ' + (row['water_date_day_1'] || 'Day 1');
          } else if (key === 'lpcd_value_day2') {
            newKey = 'LPCD ' + (row['water_date_day_2'] || 'Day 2');
          } else if (key === 'lpcd_value_day3') {
            newKey = 'LPCD ' + (row['water_date_day_3'] || 'Day 3');
          } else if (key === 'lpcd_value_day4') {
            newKey = 'LPCD ' + (row['water_date_day_4'] || 'Day 4');
          } else if (key === 'lpcd_value_day5') {
            newKey = 'LPCD ' + (row['water_date_day_5'] || 'Day 5');
          } else if (key === 'lpcd_value_day6') {
            newKey = 'LPCD ' + (row['water_date_day_6'] || 'Day 6');
          } else if (key === 'lpcd_value_day7') {
            newKey = 'LPCD ' + (row['water_date_day_7'] || 'Day 7');
          }
          
          // Skip date columns as they're now used as headers
          if (!key.includes('_date_day')) {
            formattedRow[newKey] = row[key];
          }
        });
        return formattedRow;
      });
      
      const worksheet = workbook.addWorksheet('Village Data');
      
      // Add header row
      const headerKeys = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      worksheet.addRow(headerKeys);
      
      // Add data rows
      formattedData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key]));
      });
      
      // Style header row with sky blue background
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '87CEEB' } // Sky blue color
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White bold text
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      const schemeName = result.rows[0]?.scheme_name || identifier;
      const region = result.rows[0]?.region || 'Unknown_Region';
      const fileName = `${schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${region.replace(/[^a-zA-Z0-9]/g, '_')}_Village_Report.xlsx`;
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(excelBuffer as unknown as Buffer)
      });

      res.send(excelBuffer);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating Village Excel export:', error);
    res.status(500).json({ error: 'Failed to generate Village Excel export' });
  }
});

// Generate Comprehensive ESR Excel export (water_consumption + chlorine + pressure data)
router.get('/export/esr/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      // Get comprehensive ESR data with water consumption, chlorine, and pressure data
      const esrQuery = `
        SELECT 
          wc.region,
          wc.circle,
          wc.division,
          wc.sub_division,
          wc.block,
          wc.scheme_id,
          wc.scheme_name,
          wc.village_name,
          wc.esr_name,
          wc.esr_capacity,
          wc.flow_rate_m3,
          wc.flow_meter_connected,
          wc.online_status,
          -- Water consumption for 7 days
          wc.water_value_day1,
          wc.water_value_day2,
          wc.water_value_day3,
          wc.water_value_day4,
          wc.water_value_day5,
          wc.water_value_day6,
          wc.water_value_day7,
          -- Water dates for 7 days
          wc.water_date_day1,
          wc.water_date_day2,
          wc.water_date_day3,
          wc.water_date_day4,
          wc.water_date_day5,
          wc.water_date_day6,
          wc.water_date_day7,
          -- Chlorine values for 7 days
          cd.chlorine_value_1,
          cd.chlorine_value_2,
          cd.chlorine_value_3,
          cd.chlorine_value_4,
          cd.chlorine_value_5,
          cd.chlorine_value_6,
          cd.chlorine_value_7,
          -- Pressure values for 7 days
          pd.pressure_value_1,
          pd.pressure_value_2,
          pd.pressure_value_3,
          pd.pressure_value_4,
          pd.pressure_value_5,
          pd.pressure_value_6,
          pd.pressure_value_7,
          -- Consumption percentage
          CASE 
            WHEN wc.esr_capacity > 0 THEN ROUND((wc.water_value_day7 / wc.esr_capacity * 100), 2)
            ELSE 0
          END as consumption_percentage,
          -- Status indicators
          CASE 
            WHEN cd.chlorine_value_7 >= 0.2 AND cd.chlorine_value_7 <= 0.5 THEN 'Optimal'
            WHEN cd.chlorine_value_7 < 0.2 THEN 'Below Standard'
            WHEN cd.chlorine_value_7 > 0.5 THEN 'Above Standard'
            ELSE 'No Data'
          END as chlorine_status,
          CASE 
            WHEN pd.pressure_value_7 >= 0.2 AND pd.pressure_value_7 <= 0.7 THEN 'Optimal'
            WHEN pd.pressure_value_7 < 0.2 THEN 'Below Standard'
            WHEN pd.pressure_value_7 > 0.7 THEN 'Above Standard'
            ELSE 'No Data'
          END as pressure_status
        FROM water_consumption wc
        LEFT JOIN chlorine_data cd ON (
          cd.scheme_id = wc.scheme_id 
          AND cd.village_name = wc.village_name 
          AND cd.esr_name = wc.esr_name
        )
        LEFT JOIN pressure_data pd ON (
          pd.scheme_id = wc.scheme_id 
          AND pd.village_name = wc.village_name 
          AND pd.esr_name = wc.esr_name
        )
        WHERE wc.scheme_name ILIKE $1 OR wc.scheme_id ILIKE $1
        ORDER BY wc.village_name, wc.esr_name
      `;

      const result = await client.query(esrQuery, [`%${identifier}%`]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No ESR data found for this scheme' });
      }

      // Create Excel workbook with ExcelJS and sky blue headers
      const workbook = new ExcelJS.Workbook();
      
      // Format data to remove underscores from headers and add date columns
      const formattedData = result.rows.map(row => {
        const formattedRow: any = {};
        Object.keys(row).forEach(key => {
          let newKey = key;
          
          // Remove underscores and capitalize properly
          if (key.includes('_')) {
            newKey = key.split('_').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          }
          
          // Replace water value columns with date columns as headers
          if (key === 'water_value_day1') {
            newKey = row['water_date_day1'] || 'Day 1';
          } else if (key === 'water_value_day2') {
            newKey = row['water_date_day2'] || 'Day 2';
          } else if (key === 'water_value_day3') {
            newKey = row['water_date_day3'] || 'Day 3';
          } else if (key === 'water_value_day4') {
            newKey = row['water_date_day4'] || 'Day 4';
          } else if (key === 'water_value_day5') {
            newKey = row['water_date_day5'] || 'Day 5';
          } else if (key === 'water_value_day6') {
            newKey = row['water_date_day6'] || 'Day 6';
          } else if (key === 'water_value_day7') {
            newKey = row['water_date_day7'] || 'Day 7';
          } else if (key === 'chlorine_value_1') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_1'] || 'Day 1');
          } else if (key === 'chlorine_value_2') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_2'] || 'Day 2');
          } else if (key === 'chlorine_value_3') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_3'] || 'Day 3');
          } else if (key === 'chlorine_value_4') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_4'] || 'Day 4');
          } else if (key === 'chlorine_value_5') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_5'] || 'Day 5');
          } else if (key === 'chlorine_value_6') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_6'] || 'Day 6');
          } else if (key === 'chlorine_value_7') {
            newKey = 'Chlorine ' + (row['chlorine_date_day_7'] || 'Day 7');
          } else if (key === 'pressure_value_1') {
            newKey = 'Pressure ' + (row['pressure_date_day_1'] || 'Day 1');
          } else if (key === 'pressure_value_2') {
            newKey = 'Pressure ' + (row['pressure_date_day_2'] || 'Day 2');
          } else if (key === 'pressure_value_3') {
            newKey = 'Pressure ' + (row['pressure_date_day_3'] || 'Day 3');
          } else if (key === 'pressure_value_4') {
            newKey = 'Pressure ' + (row['pressure_date_day_4'] || 'Day 4');
          } else if (key === 'pressure_value_5') {
            newKey = 'Pressure ' + (row['pressure_date_day_5'] || 'Day 5');
          } else if (key === 'pressure_value_6') {
            newKey = 'Pressure ' + (row['pressure_date_day_6'] || 'Day 6');
          } else if (key === 'pressure_value_7') {
            newKey = 'Pressure ' + (row['pressure_date_day_7'] || 'Day 7');
          }
          
          // Skip date columns as they're now used as headers
          if (!key.includes('date_day')) {
            formattedRow[newKey] = row[key];
          }
        });
        return formattedRow;
      });
      
      const worksheet = workbook.addWorksheet('ESR Data');
      
      // Add header row
      const headerKeys = formattedData.length > 0 ? Object.keys(formattedData[0]) : [];
      worksheet.addRow(headerKeys);
      
      // Add data rows
      formattedData.forEach((row) => {
        worksheet.addRow(headerKeys.map((key) => row[key]));
      });
      
      // Style header row with sky blue background
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '87CEEB' } // Sky blue color
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }; // White bold text
        cell.alignment = { horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Set response headers
      const schemeName = result.rows[0]?.scheme_name || identifier;
      const region = result.rows[0]?.region || 'Unknown_Region';
      const fileName = `${schemeName.replace(/[^a-zA-Z0-9]/g, '_')}_${region.replace(/[^a-zA-Z0-9]/g, '_')}_ESR_Report.xlsx`;
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(excelBuffer as unknown as Buffer)
      });

      res.send(excelBuffer);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error generating ESR Excel export:', error);
    res.status(500).json({ error: 'Failed to generate ESR Excel export' });
  }
});

// Get filtered data for specific categories (keyword detection support)
router.get('/filter/:identifier/:category', async (req, res) => {
  try {
    const { identifier, category } = req.params;
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      let query = '';
      let queryParams: any[] = [`%${identifier}%`];

      // Map keyword categories to specific queries
      switch (category.toLowerCase()) {
        case 'villages-with-water':
        case 'water':
        case 'villages_receiving_water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block, scheme_name
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND water_value_day7 > 0
            ORDER BY water_value_day7 DESC
          `;
          break;

        case 'villages-above-55-lpcd':
        case 'above-lpcd':
        case 'above_55_lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block, scheme_name
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND lpcd_value_day7 > 55
            ORDER BY lpcd_value_day7 DESC
          `;
          break;

        case 'villages-below-55-lpcd':
        case 'below-lpcd':
        case 'below_55_lpcd':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block, scheme_name
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND lpcd_value_day7 <= 55 AND lpcd_value_day7 > 0
            ORDER BY lpcd_value_day7 ASC
          `;
          break;

        case 'optimal-chlorine':
        case 'optimal_chlorine':
        case 'chlorine-optimal':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block, scheme_name
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5
            ORDER BY chlorine_value_7 DESC
          `;
          break;

        case 'above-chlorine':
        case 'above_chlorine':
        case 'high-chlorine':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block, scheme_name
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND chlorine_value_7 > 0.5
            ORDER BY chlorine_value_7 DESC
          `;
          break;

        case 'below-chlorine':
        case 'below_chlorine':
        case 'low-chlorine':
          query = `
            SELECT village_name, esr_name, chlorine_value_7, region, block, scheme_name
            FROM chlorine_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) AND chlorine_value_7 < 0.2
            ORDER BY chlorine_value_7 ASC
          `;
          break;

        case 'optimal-pressure':
        case 'optimal_pressure':
        case 'pressure-optimal':
          query = `
            SELECT village_name, esr_name, pressure_value_7, region, block, scheme_name
            FROM pressure_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND pressure_value_7 >= 0.2 AND pressure_value_7 <= 0.7
            ORDER BY pressure_value_7 DESC
          `;
          break;

        case 'flow-meters':
        case 'flowmeters':
        case 'fm':
        case 'flow_meters':
          query = `
            SELECT village_name, esr_name, flow_meter_connected, flow_rate_m3, region, block, scheme_name
            FROM water_consumption 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND flow_meter_connected IS NOT NULL
            ORDER BY village_name, esr_name
          `;
          break;

        case 'villages-no-water':
        case 'no-water':
        case 'zero-water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block, scheme_name
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND (water_value_day7 = 0 OR water_value_day7 IS NULL)
            ORDER BY village_name
          `;
          break;

        case 'consistent-water':
        case 'consistent_water':
          query = `
            SELECT village_name, water_value_day7, lpcd_value_day7, region, block, scheme_name
            FROM water_scheme_data 
            WHERE (scheme_name ILIKE $1 OR scheme_id ILIKE $1) 
              AND water_value_day1 > 0 AND water_value_day2 > 0 AND water_value_day3 > 0 
              AND water_value_day4 > 0 AND water_value_day5 > 0 AND water_value_day6 > 0 AND water_value_day7 > 0
            ORDER BY water_value_day7 DESC
          `;
          break;

        default:
          return res.status(400).json({ error: 'Invalid category. Please specify a valid filter category.' });
      }

      const result = await client.query(query, queryParams);
      
      res.json({
        category: category,
        scheme_identifier: identifier,
        count: result.rows.length,
        data: result.rows
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching filtered data:', error);
    res.status(500).json({ error: 'Failed to fetch filtered data' });
  }
});

// Get all schemes for fuzzy matching
router.get('/all-schemes', async (req, res) => {
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    try {
      const query = `
        SELECT DISTINCT 
          MIN(scheme_id) as scheme_id,
          scheme_name,
          MIN(region) as region
        FROM scheme_status 
        GROUP BY scheme_name
        ORDER BY scheme_name
      `;

      const result = await client.query(query);
      res.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching all schemes:', error);
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
});

export default router;