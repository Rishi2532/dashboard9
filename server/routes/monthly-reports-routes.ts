import { Router } from "express";
import { pool } from "../db-local";
import { storage } from "../storage";

const router = Router();

router.get("/progress", async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      region,
      circle,
      division,
      sub_division,
      block,
      scheme_id,
    } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ error: "startDate and endDate are required" });
    }

    // Determine the level of granularity
    const isRegionMode =
      !scheme_id && !block && !sub_division && !division && !circle;
    const isSingleSchemeMode = !!scheme_id;

    if (isRegionMode) {
      let regionFilter = "";
      const queryParams: any[] = [startDate, endDate];
      if (region && region !== "All Regions") {
        regionFilter = "AND region_name = $3";
        queryParams.push(region);
      }

      const query = `
        WITH RankedData AS (
          SELECT
            region_name,
            total_esr_integrated,
            total_villages_integrated,
            total_schemes_integrated,
            flow_meter_integrated,
            rca_integrated,
            pressure_transmitter_integrated,
            uploaded_at,
            ROW_NUMBER() OVER(PARTITION BY region_name ORDER BY uploaded_at ASC) as asc_rank,
            ROW_NUMBER() OVER(PARTITION BY region_name ORDER BY uploaded_at DESC) as desc_rank
          FROM region_history
          WHERE uploaded_at >= $1::timestamp AND uploaded_at <= $2::timestamp
          ${regionFilter}
        ),
        StartData AS (
          SELECT * FROM RankedData WHERE asc_rank = 1
        ),
        EndData AS (
          SELECT * FROM RankedData WHERE desc_rank = 1
        )
        SELECT
          COALESCE(s.region_name, e.region_name) as region_name,
          s.total_esr_integrated as start_esr,
          e.total_esr_integrated as end_esr,
          s.total_villages_integrated as start_villages,
          e.total_villages_integrated as end_villages,
          s.total_schemes_integrated as start_schemes,
          e.total_schemes_integrated as end_schemes,
          s.flow_meter_integrated as start_flow_meters,
          e.flow_meter_integrated as end_flow_meters,
          s.rca_integrated as start_rca,
          e.rca_integrated as end_rca,
          s.pressure_transmitter_integrated as start_pressure,
          e.pressure_transmitter_integrated as end_pressure,
          s.uploaded_at as start_date,
          e.uploaded_at as end_date
        FROM StartData s
        FULL OUTER JOIN EndData e ON s.region_name = e.region_name
        ORDER BY region_name
      `;

      const result = await pool.query(query, queryParams);
      return res.json({ type: "region", data: result.rows });
    } else {
      const conditions = [
        "uploaded_at >= $1::timestamp",
        "uploaded_at <= $2::timestamp",
      ];
      const queryParams: any[] = [startDate, endDate];
      let paramCount = 2;

      if (region && region !== "All Regions") {
        paramCount++;
        conditions.push(`region = $${paramCount}`);
        queryParams.push(region);
      }
      if (circle) {
        paramCount++;
        conditions.push(`circle = $${paramCount}`);
        queryParams.push(circle);
      }
      if (division) {
        paramCount++;
        conditions.push(`division = $${paramCount}`);
        queryParams.push(division);
      }
      if (sub_division) {
        paramCount++;
        conditions.push(`sub_division = $${paramCount}`);
        queryParams.push(sub_division);
      }
      if (block) {
        paramCount++;
        conditions.push(`block = $${paramCount}`);
        queryParams.push(block);
      }
      if (scheme_id) {
        paramCount++;
        conditions.push(`scheme_id = $${paramCount}`);
        queryParams.push(scheme_id);
      }

      const whereClause = conditions.join(" AND ");

      const query = `
        WITH RankedData AS (
          SELECT
            scheme_id,
            scheme_name,
            region,
            circle,
            division,
            sub_division,
            block,
            total_villages_integrated,
            total_esr_integrated,
            flow_meters_connected,
            residual_chlorine_analyzer_connected,
            pressure_transmitter_connected,
            uploaded_at,
            ROW_NUMBER() OVER(PARTITION BY scheme_id, block ORDER BY uploaded_at ASC) as asc_rank,
            ROW_NUMBER() OVER(PARTITION BY scheme_id, block ORDER BY uploaded_at DESC) as desc_rank
          FROM scheme_status_history
          WHERE ${whereClause}
        ),
        StartData AS (
          SELECT * FROM RankedData WHERE asc_rank = 1
        ),
        EndData AS (
          SELECT * FROM RankedData WHERE desc_rank = 1
        )
        SELECT
          COALESCE(s.scheme_id, e.scheme_id) as scheme_id,
          COALESCE(s.scheme_name, e.scheme_name) as scheme_name,
          COALESCE(s.region, e.region) as region,
          COALESCE(s.circle, e.circle) as circle,
          COALESCE(s.division, e.division) as division,
          COALESCE(s.sub_division, e.sub_division) as sub_division,
          COALESCE(s.block, e.block) as block,
          
          s.total_villages_integrated as start_villages,
          e.total_villages_integrated as end_villages,
          
          s.total_esr_integrated as start_esr,
          e.total_esr_integrated as end_esr,
          
          s.flow_meters_connected as start_flow_meters,
          e.flow_meters_connected as end_flow_meters,
          
          s.residual_chlorine_analyzer_connected as start_rca,
          e.residual_chlorine_analyzer_connected as end_rca,
          
          s.pressure_transmitter_connected as start_pressure,
          e.pressure_transmitter_connected as end_pressure,
          
          s.uploaded_at as start_date,
          e.uploaded_at as end_date
        FROM StartData s
        FULL OUTER JOIN EndData e ON s.scheme_id = e.scheme_id AND s.block = e.block
        ORDER BY region, circle, division, sub_division, block, scheme_name
      `;

      const result = await pool.query(query, queryParams);
      return res.json({ type: isSingleSchemeMode ? "scheme" : "aggregate", data: result.rows });
    }
  } catch (error) {
    console.error("Error generating monthly report data:", error);
    res.status(500).json({ error: "Failed to fetch progress data" });
  }
});

// GET /api/monthly-reports/data?region=...&report_month=YYYY-MM
router.get("/data", async (req, res) => {
  try {
    const region = (req.query.region as string) || "all";
    const circle = (req.query.circle as string) || "all";
    const division = (req.query.division as string) || "all";
    const subdivision = (req.query.subdivision as string) || "all";
    const block = (req.query.block as string) || "all";
    const scheme_id = (req.query.scheme_id as string) || "all";
    const report_month = (req.query.report_month as string) || null;

    if (!report_month) {
      return res.status(400).json({ error: "report_month query parameter required (YYYY-MM)" });
    }

    const start = new Date(`${report_month}-01T00:00:00Z`);
    const next = new Date(start);
    next.setMonth(start.getMonth() + 1);

    const startIso = start.toISOString();
    const nextIso = next.toISOString();
    const startStr = startIso.substring(0, 10);
    const nextStr = nextIso.substring(0, 10);

    let caseType: "A" | "B" | "C" = "A";
    if (scheme_id !== "all") {
      caseType = "C";
    } else if (circle !== "all" || division !== "all" || subdivision !== "all" || block !== "all") {
      caseType = "B";
    }

    // Find timestamps in the month for comparison (applicable to newly added schemes/villages calculation)
    const timeConditions: string[] = [];
    const timeQueryParams: any[] = [];
    let timeParamIdx = 1;
    if (region !== "all") {
      timeConditions.push(`region = $${timeParamIdx++}`);
      timeQueryParams.push(region);
    }
    if (circle !== "all") {
      timeConditions.push(`circle = $${timeParamIdx++}`);
      timeQueryParams.push(circle);
    }
    if (division !== "all") {
      timeConditions.push(`division = $${timeParamIdx++}`);
      timeQueryParams.push(division);
    }
    if (subdivision !== "all") {
      timeConditions.push(`sub_division = $${timeParamIdx++}`);
      timeQueryParams.push(subdivision);
    }
    if (block !== "all") {
      timeConditions.push(`block = $${timeParamIdx++}`);
      timeQueryParams.push(block);
    }
    if (scheme_id !== "all") {
      timeConditions.push(`scheme_id = $${timeParamIdx++}`);
      timeQueryParams.push(scheme_id);
    }

    const timeParams = [...timeQueryParams, startIso, nextIso];
    const timeQuery = `
      SELECT DISTINCT uploaded_at 
      FROM scheme_status_history 
      WHERE ${timeConditions.length > 0 ? timeConditions.join(" AND ") + " AND " : ""} uploaded_at >= $${timeParamIdx} AND uploaded_at < $${timeParamIdx + 1}
      ORDER BY uploaded_at ASC
    `;
    const timesRes = await pool.query(timeQuery, timeParams);

    let start_time: any = null;
    let end_time: any = null;

    if (timesRes.rows.length > 0) {
      start_time = timesRes.rows[0].uploaded_at;
      end_time = timesRes.rows[timesRes.rows.length - 1].uploaded_at;
    } else {
      // Fallback
      const fallbackQuery = `
        SELECT DISTINCT uploaded_at 
        FROM scheme_status_history 
        WHERE ${timeConditions.length > 0 ? timeConditions.join(" AND ") + " AND " : ""} uploaded_at < $${timeParamIdx}
        ORDER BY uploaded_at DESC LIMIT 2
      `;
      const fallbackRes = await pool.query(fallbackQuery, [...timeQueryParams, nextIso]);
      if (fallbackRes.rows.length > 0) {
        end_time = fallbackRes.rows[0].uploaded_at;
        start_time = fallbackRes.rows[fallbackRes.rows.length - 1]?.uploaded_at || end_time;
      }
    }

    if (!start_time || !end_time) {
      const overallTimes = await pool.query(
        `SELECT DISTINCT uploaded_at FROM scheme_status_history ORDER BY uploaded_at DESC LIMIT 2`
      );
      if (overallTimes.rows.length > 0) {
        end_time = overallTimes.rows[0].uploaded_at;
        start_time = overallTimes.rows[overallTimes.rows.length - 1]?.uploaded_at || end_time;
      }
    }

    let newlyAddedSchemes: string[] = [];
    let newlyAddedVillages: string[] = [];

    if (start_time && end_time && start_time !== end_time) {
      // Query newly added scheme names: present in end_time but not start_time
      const schemeCompareQuery = `
        SELECT DISTINCT scheme_name 
        FROM scheme_status_history 
        WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
          ${region !== "all" ? "AND region = $3" : ""}
          ${circle !== "all" ? "AND circle = $4" : ""}
          ${division !== "all" ? "AND division = $5" : ""}
          ${subdivision !== "all" ? "AND sub_division = $6" : ""}
          ${block !== "all" ? "AND block = $7" : ""}
          ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
          AND scheme_id NOT IN (
            SELECT DISTINCT scheme_id 
            FROM scheme_status_history 
            WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
              ${region !== "all" ? "AND region = $3" : ""}
              ${circle !== "all" ? "AND circle = $4" : ""}
              ${division !== "all" ? "AND division = $5" : ""}
              ${subdivision !== "all" ? "AND sub_division = $6" : ""}
              ${block !== "all" ? "AND block = $7" : ""}
              ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
          )
        ORDER BY scheme_name ASC
      `;
      const compareParams = [end_time, start_time];
      if (region !== "all") compareParams.push(region);
      if (circle !== "all") compareParams.push(circle);
      if (division !== "all") compareParams.push(division);
      if (subdivision !== "all") compareParams.push(subdivision);
      if (block !== "all") compareParams.push(block);
      if (scheme_id !== "all") compareParams.push(scheme_id);

      const schemesRes = await pool.query(schemeCompareQuery, compareParams);
      newlyAddedSchemes = schemesRes.rows.map(r => r.scheme_name);

      let wsStartRes = await pool.query(
        `SELECT DISTINCT uploaded_at FROM water_scheme_data_history WHERE uploaded_at < $1 ${region !== "all" ? "AND region = $2" : ""} ORDER BY uploaded_at DESC LIMIT 1`,
        region !== "all" ? [startStr, region] : [startStr]
      );
      let wsEndRes = await pool.query(
        `SELECT DISTINCT uploaded_at FROM water_scheme_data_history WHERE uploaded_at < $1 ${region !== "all" ? "AND region = $2" : ""} ORDER BY uploaded_at DESC LIMIT 1`,
        region !== "all" ? [nextStr, region] : [nextStr]
      );
      let wsStartTime = wsStartRes.rows[0]?.uploaded_at || null;
      let wsEndTime = wsEndRes.rows[0]?.uploaded_at || null;

      if (!wsEndTime) {
        const wsMaxRes = await pool.query(
          `SELECT DISTINCT uploaded_at FROM water_scheme_data_history ${region !== "all" ? "WHERE region = $1" : ""} ORDER BY uploaded_at DESC LIMIT 1`,
          region !== "all" ? [region] : []
        );
        wsEndTime = wsMaxRes.rows[0]?.uploaded_at || null;
      }
      if (!wsStartTime && wsEndTime) {
        const wsMinRes = await pool.query(
          `SELECT DISTINCT uploaded_at FROM water_scheme_data_history ${region !== "all" ? "WHERE region = $1" : ""} ORDER BY uploaded_at ASC LIMIT 1`,
          region !== "all" ? [region] : []
        );
        const earliestTime = wsMinRes.rows[0]?.uploaded_at || null;
        if (earliestTime && earliestTime !== wsEndTime) {
          wsStartTime = earliestTime;
        }
      }

      if (wsEndTime) {
        let villagesQuery = "";
        let villagesParams = [];
        if (wsStartTime) {
          villagesQuery = `
            SELECT DISTINCT village_name 
            FROM water_scheme_data_history 
            WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
              ${region !== "all" ? "AND region = $3" : ""}
              ${circle !== "all" ? "AND circle = $4" : ""}
              ${division !== "all" ? "AND division = $5" : ""}
              ${subdivision !== "all" ? "AND sub_division = $6" : ""}
              ${block !== "all" ? "AND block = $7" : ""}
              ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
              AND village_name NOT IN (
                SELECT DISTINCT village_name 
                FROM water_scheme_data_history 
                WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
                  ${region !== "all" ? "AND region = $3" : ""}
                  ${circle !== "all" ? "AND circle = $4" : ""}
                  ${division !== "all" ? "AND division = $5" : ""}
                  ${subdivision !== "all" ? "AND sub_division = $6" : ""}
                  ${block !== "all" ? "AND block = $7" : ""}
                  ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
              )
            ORDER BY village_name ASC
          `;
          villagesParams = [wsEndTime, wsStartTime];
          if (region !== "all") villagesParams.push(region);
          if (circle !== "all") villagesParams.push(circle);
          if (division !== "all") villagesParams.push(division);
          if (subdivision !== "all") villagesParams.push(subdivision);
          if (block !== "all") villagesParams.push(block);
          if (scheme_id !== "all") villagesParams.push(scheme_id);
        } else {
          const wsEarliestRes = await pool.query(
            `SELECT DISTINCT uploaded_at FROM water_scheme_data_history WHERE uploaded_at >= $1 AND uploaded_at < $2 ${region !== "all" ? "AND region = $3" : ""} ORDER BY uploaded_at ASC LIMIT 1`,
            region !== "all" ? [startStr, nextStr, region] : [startStr, nextStr]
          );
          const wsEarliestTime = wsEarliestRes.rows[0]?.uploaded_at || null;
          if (wsEarliestTime && wsEarliestTime !== wsEndTime) {
            villagesQuery = `
              SELECT DISTINCT village_name 
              FROM water_scheme_data_history 
              WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $1::timestamptz))) < 60
                ${region !== "all" ? "AND region = $3" : ""}
                ${circle !== "all" ? "AND circle = $4" : ""}
                ${division !== "all" ? "AND division = $5" : ""}
                ${subdivision !== "all" ? "AND sub_division = $6" : ""}
                ${block !== "all" ? "AND block = $7" : ""}
                ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
                AND village_name NOT IN (
                  SELECT DISTINCT village_name 
                  FROM water_scheme_data_history 
                  WHERE ABS(EXTRACT(EPOCH FROM (uploaded_at - $2::timestamptz))) < 60
                    ${region !== "all" ? "AND region = $3" : ""}
                    ${circle !== "all" ? "AND circle = $4" : ""}
                    ${division !== "all" ? "AND division = $5" : ""}
                    ${subdivision !== "all" ? "AND sub_division = $6" : ""}
                    ${block !== "all" ? "AND block = $7" : ""}
                    ${scheme_id !== "all" ? "AND scheme_id = $8" : ""}
                )
              ORDER BY village_name ASC
            `;
            villagesParams = [wsEndTime, wsEarliestTime];
            if (region !== "all") villagesParams.push(region);
            if (circle !== "all") villagesParams.push(circle);
            if (division !== "all") villagesParams.push(division);
            if (subdivision !== "all") villagesParams.push(subdivision);
            if (block !== "all") villagesParams.push(block);
            if (scheme_id !== "all") villagesParams.push(scheme_id);
          }
        }

        if (villagesQuery) {
          const villagesRes = await pool.query(villagesQuery, villagesParams);
          newlyAddedVillages = villagesRes.rows.map(r => r.village_name);
        }
      }
    }

    let responseData: any = {
      caseType,
      report_month,
      filters: { region, circle, division, subdivision, block, scheme_id },
      summary: {},
      lpcdCommissionedSchemes: [],
      lpcdHighlights: [],
      newlyAddedSchemes,
      newlyAddedVillages
    };

    if (caseType === "A") {
      // Case A: region_history table.
      const regionsToCheck = region !== "all" ? [region] : (await storage.getAllRegions()).map(r => r.region_name);
      const monthlySummaryByRegion: any[] = [];

      for (const rn of regionsToCheck) {
        // End row: latest snapshot up to the end of the report month (i.e. < nextIso)
        let endRowRes = await pool.query(
          `SELECT * FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
          [rn, nextIso]
        );
        let endRow = endRowRes.rows[0] || null;

        // Start row: latest snapshot before the start of the report month (i.e. < startIso)
        let startRowRes = await pool.query(
          `SELECT * FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) < $2::timestamptz ORDER BY COALESCE(data_month, uploaded_at) DESC, uploaded_at DESC LIMIT 1`,
          [rn, startIso]
        );
        let startRow = startRowRes.rows[0] || null;

        // Fallbacks
        if (!startRow && endRow) {
          // If there is no previous month snapshot, fall back to the earliest snapshot in the current month as the baseline
          const startFallback = await pool.query(
            `SELECT * FROM region_history WHERE region_name = $1 AND COALESCE(data_month, uploaded_at) >= $2::timestamptz AND COALESCE(data_month, uploaded_at) < $3::timestamptz ORDER BY COALESCE(data_month, uploaded_at) ASC, uploaded_at ASC LIMIT 1`,
            [rn, startIso, nextIso]
          );
          startRow = startFallback.rows[0] || null;
        }

        const delta = (field: string) => {
          const endVal = endRow && endRow[field] != null ? Number(endRow[field]) : 0;
          const startVal = startRow && startRow[field] != null ? Number(startRow[field]) : 0;
          return endVal - startVal;
        };

        monthlySummaryByRegion.push({
          region_name: rn,
          start_schemes: startRow ? Number(startRow.total_schemes_integrated || 0) : 0,
          start_villages: startRow ? Number(startRow.total_villages_integrated || 0) : 0,
          start_esrs: startRow ? Number(startRow.total_esr_integrated || 0) : 0,
          start_flow_meters: startRow ? Number(startRow.flow_meter_integrated || 0) : 0,
          start_rca: startRow ? Number(startRow.rca_integrated || 0) : 0,
          start_pt: startRow ? Number(startRow.pressure_transmitter_integrated || 0) : 0,

          end_schemes: endRow ? Number(endRow.total_schemes_integrated || 0) : 0,
          end_villages: endRow ? Number(endRow.total_villages_integrated || 0) : 0,
          end_esrs: endRow ? Number(endRow.total_esr_integrated || 0) : 0,
          end_flow_meters: endRow ? Number(endRow.flow_meter_integrated || 0) : 0,
          end_rca: endRow ? Number(endRow.rca_integrated || 0) : 0,
          end_pt: endRow ? Number(endRow.pressure_transmitter_integrated || 0) : 0,

          newly_added_esr: delta("total_esr_integrated"),
          newly_added_fully_completed_esr: delta("fully_completed_esr"),
          newly_added_villages: delta("total_villages_integrated"),
          newly_added_fully_completed_villages: delta("fully_completed_villages"),
          newly_added_schemes: delta("total_schemes_integrated"),
          newly_added_flow_meters: delta("flow_meter_integrated"),
          newly_added_rca: delta("rca_integrated"),
          newly_added_pt: delta("pressure_transmitter_integrated"),

          // Cumulative fields for PDF compatibility
          total_esr_integrated: endRow ? Number(endRow.total_esr_integrated || 0) : 0,
          fully_completed_esr: endRow ? Number(endRow.fully_completed_esr || 0) : 0,
          partial_esr: endRow ? Number(endRow.partial_esr || 0) : 0,
          total_villages_integrated: endRow ? Number(endRow.total_villages_integrated || 0) : 0,
          fully_completed_villages: endRow ? Number(endRow.fully_completed_villages || 0) : 0,
          total_schemes_integrated: endRow ? Number(endRow.total_schemes_integrated || 0) : 0,
          fully_completed_schemes: endRow ? Number(endRow.fully_completed_schemes || 0) : 0,
          flow_meter_integrated: endRow ? Number(endRow.flow_meter_integrated || 0) : 0,
          rca_integrated: endRow ? Number(endRow.rca_integrated || 0) : 0,
          pressure_transmitter_integrated: endRow ? Number(endRow.pressure_transmitter_integrated || 0) : 0,
        });
      }

      const summaryTotals = monthlySummaryByRegion.reduce(
        (acc, item) => {
          acc.totalSchemesInRegion += item.total_schemes_integrated || 0;
          acc.totalEsrIntegrated += item.total_esr_integrated || 0;
          acc.fullyCompletedEsr += item.fully_completed_esr || 0;
          acc.totalVillagesIntegrated += item.total_villages_integrated || 0;
          acc.fullyCompletedVillages += item.fully_completed_villages || 0;
          acc.rcaConnected += item.rca_integrated || 0;
          acc.pressureConnected += item.pressure_transmitter_integrated || 0;
          acc.flowMetersConnected += item.flow_meter_integrated || 0;
          return acc;
        },
        {
          totalSchemesInRegion: 0,
          totalEsrIntegrated: 0,
          fullyCompletedEsr: 0,
          totalVillagesIntegrated: 0,
          fullyCompletedVillages: 0,
          rcaConnected: 0,
          pressureConnected: 0,
          flowMetersConnected: 0,
        }
      );

      responseData.summary = {
        ...summaryTotals,
        region,
        report_month
      };
      responseData.monthlySummaryByRegion = monthlySummaryByRegion;

    } else {
      // Case B or C: scheme_status_history table.
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIdx = 1;

      if (caseType === "C") {
        conditions.push(`scheme_id = $${paramIdx++}`);
        queryParams.push(scheme_id);
        if (block !== "all") {
          conditions.push(`block = $${paramIdx++}`);
          queryParams.push(block);
        }
      } else {
        if (region !== "all") {
          conditions.push(`region = $${paramIdx++}`);
          queryParams.push(region);
        }
        if (circle !== "all") {
          conditions.push(`circle = $${paramIdx++}`);
          queryParams.push(circle);
        }
        if (division !== "all") {
          conditions.push(`division = $${paramIdx++}`);
          queryParams.push(division);
        }
        if (subdivision !== "all") {
          conditions.push(`sub_division = $${paramIdx++}`);
          queryParams.push(subdivision);
        }
        if (block !== "all") {
          conditions.push(`block = $${paramIdx++}`);
          queryParams.push(block);
        }
      }

      const getAggregatedData = async (timestamp: any) => {
        if (!timestamp) return null;
        const aggQuery = `
          SELECT 
            COUNT(DISTINCT scheme_id) FILTER (WHERE UPPER(fully_completion_scheme_status) IN ('COMPLETED', 'FULLY COMPLETED', 'IN PROGRESS')) as schemes_count,
            SUM(COALESCE(total_villages_integrated, 0)) as villages_sum,
            SUM(COALESCE(total_esr_integrated, 0)) as esrs_sum,
            SUM(COALESCE(flow_meters_connected, 0)) as flow_meters_sum,
            SUM(COALESCE(residual_chlorine_analyzer_connected, 0)) as rca_sum,
            SUM(COALESCE(pressure_transmitter_connected, 0)) as pt_sum
          FROM scheme_status_history
          WHERE uploaded_at = $1 ${conditions.length > 0 ? " AND " + conditions.map((c, i) => c.replace(/\$\d+/, `$${i + 2}`)).join(" AND ") : ""}
        `;
        const res = await pool.query(aggQuery, [timestamp, ...queryParams]);
        return res.rows[0] || null;
      };

      const startData = await getAggregatedData(start_time);
      const endData = await getAggregatedData(end_time);

      const getVal = (data: any, field: string) => data && data[field] != null ? Number(data[field]) : 0;

      const caseData = {
        start: {
          schemes: getVal(startData, "schemes_count"),
          villages: getVal(startData, "villages_sum"),
          esrs: getVal(startData, "esrs_sum"),
          flow_meters: getVal(startData, "flow_meters_sum"),
          rca: getVal(startData, "rca_sum"),
          pt: getVal(startData, "pt_sum")
        },
        end: {
          schemes: getVal(endData, "schemes_count"),
          villages: getVal(endData, "villages_sum"),
          esrs: getVal(endData, "esrs_sum"),
          flow_meters: getVal(endData, "flow_meters_sum"),
          rca: getVal(endData, "rca_sum"),
          pt: getVal(endData, "pt_sum")
        },
        progress: {
          schemes: getVal(endData, "schemes_count") - getVal(startData, "schemes_count"),
          villages: getVal(endData, "villages_sum") - getVal(startData, "villages_sum"),
          esrs: getVal(endData, "esrs_sum") - getVal(startData, "esrs_sum"),
          flow_meters: getVal(endData, "flow_meters_sum") - getVal(startData, "flow_meters_sum"),
          rca: getVal(endData, "rca_sum") - getVal(startData, "rca_sum"),
          pt: getVal(endData, "pt_sum") - getVal(startData, "pt_sum")
        }
      };

      responseData.caseData = caseData;
      responseData.summary = {
        totalSchemesInRegion: caseData.end.schemes,
        totalEsrIntegrated: caseData.end.esrs,
        totalVillagesIntegrated: caseData.end.villages,
        rcaConnected: caseData.end.rca,
        pressureConnected: caseData.end.pt,
        flowMetersConnected: caseData.end.flow_meters,
        region,
        report_month
      };
    }

    // Try to include day-wise monthly LPCD data pivoted from water_scheme_data_history
    try {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const parts = report_month.split("-");
      const monthNum = parseInt(parts[1], 10);
      const monthName = months[monthNum - 1] || "";
      const yearNum = parseInt(parts[0], 10);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

      const joinConditions: string[] = [];
      const lpcdParams: any[] = [];
      let lpcdParamIdx = 1;

      joinConditions.push(`(h.data_date LIKE $${lpcdParamIdx++} OR h.data_date LIKE $${lpcdParamIdx++})`);
      lpcdParams.push(`%-${monthName}%`, `${report_month}-%`);

      const filterConditions: string[] = [];
      if (region !== "all") {
        filterConditions.push(`s.region = $${lpcdParamIdx++}`);
        lpcdParams.push(region);
      }
      if (circle !== "all") {
        filterConditions.push(`s.circle = $${lpcdParamIdx++}`);
        lpcdParams.push(circle);
      }
      if (division !== "all") {
        filterConditions.push(`s.division = $${lpcdParamIdx++}`);
        lpcdParams.push(division);
      }
      if (subdivision !== "all") {
        filterConditions.push(`s.sub_division = $${lpcdParamIdx++}`);
        lpcdParams.push(subdivision);
      }
      if (block !== "all") {
        filterConditions.push(`s.block = $${lpcdParamIdx++}`);
        lpcdParams.push(block);
      }
      if (scheme_id !== "all") {
        filterConditions.push(`s.scheme_id = $${lpcdParamIdx++}`);
        lpcdParams.push(scheme_id);
      }

      const lpcdQuery = `
        SELECT 
          s.region, s.circle, s.division, s.sub_division, s.block, s.scheme_id, s.scheme_name, s.water_supply,
          h.data_date,
          h.lpcd_value as lpcd_avg
        FROM (
          SELECT DISTINCT ON (scheme_id) scheme_id, region, circle, division, sub_division, block, scheme_name, water_supply 
          FROM scheme_status
        ) s
        INNER JOIN (
          SELECT DISTINCT scheme_id FROM scheme_lpcd_data_history
        ) integrated ON s.scheme_id = integrated.scheme_id
        LEFT JOIN scheme_lpcd_data_history h ON s.scheme_id = h.scheme_id AND ${joinConditions.join(" AND ")}
        ${filterConditions.length > 0 ? "WHERE " + filterConditions.join(" AND ") : ""}
        ORDER BY s.region, s.circle, s.division, s.sub_division, s.block, s.scheme_name, s.scheme_id
      `;

      const lpcdRes = await pool.query(lpcdQuery, lpcdParams);

      const schemeMap = new Map<string, {
        region: string;
        circle: string;
        division: string;
        sub_division: string;
        block: string;
        scheme_id: string;
        scheme_name: string;
        water_supply: string;
        days: Record<number, number | null>;
      }>();

      for (const r of lpcdRes.rows) {
        const key = r.scheme_id;
        if (!schemeMap.has(key)) {
          schemeMap.set(key, {
            region: r.region || "-",
            circle: r.circle || "-",
            division: r.division || "-",
            sub_division: r.sub_division || "-",
            block: r.block || "-",
            scheme_id: r.scheme_id,
            scheme_name: r.scheme_name,
            water_supply: r.water_supply || "",
            days: {}
          });
        }

        if (r.data_date) {
          let dayNum = 0;
          const dateMatch = r.data_date.match(/^(\d{1,2})-[a-zA-Z]{3}-(\d{2,4})$/);
          const shortDateMatch = r.data_date.match(/^(\d{1,2})-[a-zA-Z]{3}$/);
          const isoMatch = r.data_date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          const slashMatch = r.data_date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

          if (dateMatch) dayNum = parseInt(dateMatch[1], 10);
          else if (shortDateMatch) dayNum = parseInt(shortDateMatch[1], 10);
          else if (isoMatch) dayNum = parseInt(isoMatch[3], 10);
          else if (slashMatch) dayNum = parseInt(slashMatch[1], 10);

          if (dayNum >= 1 && dayNum <= 31) {
            schemeMap.get(key)!.days[dayNum] = r.lpcd_avg != null ? Number(r.lpcd_avg) : null;
          }
        }
      }

      const table1Rows: any[][] = [];
      const table2Rows: any[][] = [];
      const table3Rows: any[][] = [];
      const highlightsTable1Rows: any[][] = [];
      const highlightsTable2Rows: any[][] = [];
      const highlightsTable3Rows: any[][] = [];

      let srNo = 1;
      let highlightSrNo = 1;

      for (const [_, s] of schemeMap.entries()) {
        const metadata = [
          srNo,
          s.region,
          s.circle,
          s.division,
          s.sub_division,
          s.block,
          s.scheme_id,
          s.scheme_name,
          s.water_supply
        ];

        const row1 = [...metadata];
        for (let d = 1; d <= 14; d++) {
          row1.push(s.days[d] !== undefined ? s.days[d] : null);
        }
        table1Rows.push(row1);

        const row2 = [...metadata];
        for (let d = 15; d <= 28; d++) {
          row2.push(s.days[d] !== undefined ? s.days[d] : null);
        }
        table2Rows.push(row2);

        const row3 = [...metadata];
        for (let d = 29; d <= daysInMonth; d++) {
          row3.push(s.days[d] !== undefined ? s.days[d] : null);
        }
        table3Rows.push(row3);

        // Check if consistent highlights (all recorded days have LPCD >= 55)
        const dayValues = Object.values(s.days);
        const hasData = dayValues.length > 0;
        const isConsistent = hasData && dayValues.every(val => val !== null && val >= 55);

        if (isConsistent) {
          const hMetadata = [
            highlightSrNo,
            s.region,
            s.circle,
            s.division,
            s.sub_division,
            s.block,
            s.scheme_id,
            s.scheme_name,
            s.water_supply
          ];

          const hRow1 = [...hMetadata];
          for (let d = 1; d <= 14; d++) {
            hRow1.push(s.days[d] !== undefined ? s.days[d] : null);
          }
          highlightsTable1Rows.push(hRow1);

          const hRow2 = [...hMetadata];
          for (let d = 15; d <= 28; d++) {
            hRow2.push(s.days[d] !== undefined ? s.days[d] : null);
          }
          highlightsTable2Rows.push(hRow2);

          const hRow3 = [...hMetadata];
          for (let d = 29; d <= daysInMonth; d++) {
            hRow3.push(s.days[d] !== undefined ? s.days[d] : null);
          }
          highlightsTable3Rows.push(hRow3);

          highlightSrNo++;
        }

        srNo++;
      }

      const table1Headers = ["Sr No", "Region", "Circle", "Division", "Sub Division", "Block", "Scheme ID", "Scheme Name", "Water Supply"];
      for (let d = 1; d <= 14; d++) table1Headers.push(String(d));

      const table2Headers = ["Sr No", "Region", "Circle", "Division", "Sub Division", "Block", "Scheme ID", "Scheme Name", "Water Supply"];
      for (let d = 15; d <= 28; d++) table2Headers.push(String(d));

      const table3Headers = ["Sr No", "Region", "Circle", "Division", "Sub Division", "Block", "Scheme ID", "Scheme Name", "Water Supply"];
      for (let d = 29; d <= daysInMonth; d++) table3Headers.push(String(d));

      responseData.lpcdCommissionedSchemes = [
        { headers: table1Headers, rows: table1Rows },
        { headers: table2Headers, rows: table2Rows }
      ];
      if (daysInMonth >= 29) {
        responseData.lpcdCommissionedSchemes.push({ headers: table3Headers, rows: table3Rows });
      }

      responseData.lpcdHighlights = [
        { headers: table1Headers, rows: highlightsTable1Rows },
        { headers: table2Headers, rows: highlightsTable2Rows }
      ];
      if (daysInMonth >= 29) {
        responseData.lpcdHighlights.push({ headers: table3Headers, rows: highlightsTable3Rows });
      }
    } catch (e) {
      console.warn("Could not load LPCD snapshots:", e);
    }

    // Fetch chlorine comparison statistics for the end of the month from chlorine_history
    try {
      const chlorineQuery = `
        WITH parsed_dates AS (
          SELECT 
            *,
            (
              CASE 
                WHEN chlorine_date ~ '^[0-9]{1,2}-[A-Za-z]{3}$' THEN 
                  CASE 
                    WHEN EXTRACT(MONTH FROM TO_DATE(chlorine_date, 'DD-Mon')) >= 11 AND EXTRACT(MONTH FROM uploaded_at) <= 2 THEN
                      TO_DATE(chlorine_date || '-' || (EXTRACT(YEAR FROM uploaded_at) - 1)::text, 'DD-Mon-YYYY')
                    ELSE 
                      TO_DATE(chlorine_date || '-' || EXTRACT(YEAR FROM uploaded_at)::text, 'DD-Mon-YYYY')
                  END
                WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YYYY')
                WHEN chlorine_date ~ '^[0-9]{2}-[A-Za-z]{3}-[0-9]{2}$' THEN TO_DATE(chlorine_date, 'DD-Mon-YY')
                WHEN chlorine_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN TO_DATE(chlorine_date, 'YYYY-MM-DD')
                WHEN chlorine_date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN TO_DATE(chlorine_date, 'DD/MM/YYYY')
                WHEN chlorine_date ~ '^[0-9]+\\.?[0-9]*$' AND CAST(chlorine_date AS NUMERIC) < 1000000 THEN (TO_DATE('1899-12-30', 'YYYY-MM-DD') + (INTERVAL '1 day' * CAST(chlorine_date AS NUMERIC)))::date 
                ELSE NULL
              END
            ) as actual_date
          FROM chlorine_history
          WHERE uploaded_at >= $1 AND uploaded_at < $2
        ),
        last_7_dates AS (
          SELECT DISTINCT actual_date
          FROM parsed_dates
          WHERE actual_date IS NOT NULL
          ORDER BY actual_date DESC
          LIMIT 7
        ),
        esr_daily_values AS (
          SELECT 
            scheme_id, village_name, esr_name, region,
            actual_date,
            chlorine_value,
            ROW_NUMBER() OVER (PARTITION BY scheme_id, village_name, esr_name ORDER BY actual_date DESC) as date_rank
          FROM parsed_dates
          WHERE actual_date IN (SELECT actual_date FROM last_7_dates)
        ),
        esr_aggregates AS (
          SELECT 
            scheme_id, village_name, esr_name, region,
            MAX(CASE WHEN date_rank = 1 THEN chlorine_value END) as latest_value,
            COUNT(chlorine_value) as days_with_data,
            SUM(CASE WHEN chlorine_value < 0.2 THEN 1 ELSE 0 END) as below_count,
            SUM(CASE WHEN chlorine_value >= 0.2 AND chlorine_value <= 0.5 THEN 1 ELSE 0 END) as optimal_count,
            SUM(CASE WHEN chlorine_value > 0.5 THEN 1 ELSE 0 END) as above_count
          FROM esr_daily_values
          GROUP BY scheme_id, village_name, esr_name, region
        )
        SELECT 
          region,
          COUNT(*) as total_connected,
          SUM(CASE WHEN latest_value IS NOT NULL AND latest_value < 0.2 THEN 1 ELSE 0 END) as below_0_2,
          SUM(CASE WHEN latest_value IS NOT NULL AND latest_value >= 0.2 AND latest_value <= 0.5 THEN 1 ELSE 0 END) as optimal_0_2_0_5,
          SUM(CASE WHEN latest_value IS NOT NULL AND latest_value > 0.5 THEN 1 ELSE 0 END) as above_0_5,
          SUM(CASE WHEN days_with_data = 7 AND below_count = 7 THEN 1 ELSE 0 END) as consistent_below_0_2,
          SUM(CASE WHEN days_with_data = 7 AND optimal_count = 7 THEN 1 ELSE 0 END) as consistent_optimal,
          SUM(CASE WHEN days_with_data = 7 AND above_count = 7 THEN 1 ELSE 0 END) as consistent_above_0_5
        FROM esr_aggregates
        GROUP BY region
        ORDER BY region
      `;
      const chlorineRes = await pool.query(chlorineQuery, [startIso, nextIso]);
      responseData.chlorineComparison = chlorineRes.rows;
      console.log(`Fetched chlorine comparison for month ${report_month}:`, responseData.chlorineComparison ? responseData.chlorineComparison.length : 0, "regions");
    } catch (e) {
      console.warn("Could not load chlorine history comparison counts:", e);
    }

    if (!responseData.chlorineComparison || responseData.chlorineComparison.length === 0) {
      // Fallback to active chlorine_data table
      try {
        const activeRegionsRes = await pool.query(`SELECT DISTINCT region FROM chlorine_data WHERE region IS NOT NULL ORDER BY region`);
        const regions = activeRegionsRes.rows.map(r => r.region);
        const activeComparison = [];
        for (const r of regions) {
          const statsRes = await pool.query(`
            SELECT 
              COUNT(*) as total_connected,
              SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 < 0.2 THEN 1 ELSE 0 END) as below_0_2,
              SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5 THEN 1 ELSE 0 END) as optimal_0_2_0_5,
              SUM(CASE WHEN chlorine_value_7 IS NOT NULL AND chlorine_value_7 > 0.5 THEN 1 ELSE 0 END) as above_0_5,
              SUM(CASE WHEN 
                chlorine_value_1 IS NOT NULL AND chlorine_value_1 < 0.2 AND
                chlorine_value_2 IS NOT NULL AND chlorine_value_2 < 0.2 AND
                chlorine_value_3 IS NOT NULL AND chlorine_value_3 < 0.2 AND
                chlorine_value_4 IS NOT NULL AND chlorine_value_4 < 0.2 AND
                chlorine_value_5 IS NOT NULL AND chlorine_value_5 < 0.2 AND
                chlorine_value_6 IS NOT NULL AND chlorine_value_6 < 0.2 AND
                chlorine_value_7 IS NOT NULL AND chlorine_value_7 < 0.2
              THEN 1 ELSE 0 END) as consistent_below_0_2,
              SUM(CASE WHEN 
                chlorine_value_1 IS NOT NULL AND chlorine_value_1 >= 0.2 AND chlorine_value_1 <= 0.5 AND
                chlorine_value_2 IS NOT NULL AND chlorine_value_2 >= 0.2 AND chlorine_value_2 <= 0.5 AND
                chlorine_value_3 IS NOT NULL AND chlorine_value_3 >= 0.2 AND chlorine_value_3 <= 0.5 AND
                chlorine_value_4 IS NOT NULL AND chlorine_value_4 >= 0.2 AND chlorine_value_4 <= 0.5 AND
                chlorine_value_5 IS NOT NULL AND chlorine_value_5 >= 0.2 AND chlorine_value_5 <= 0.5 AND
                chlorine_value_6 IS NOT NULL AND chlorine_value_6 >= 0.2 AND chlorine_value_6 <= 0.5 AND
                chlorine_value_7 IS NOT NULL AND chlorine_value_7 >= 0.2 AND chlorine_value_7 <= 0.5
              THEN 1 ELSE 0 END) as consistent_optimal,
              SUM(CASE WHEN 
                chlorine_value_1 IS NOT NULL AND chlorine_value_1 > 0.5 AND
                chlorine_value_2 IS NOT NULL AND chlorine_value_2 > 0.5 AND
                chlorine_value_3 IS NOT NULL AND chlorine_value_3 > 0.5 AND
                chlorine_value_4 IS NOT NULL AND chlorine_value_4 > 0.5 AND
                chlorine_value_5 IS NOT NULL AND chlorine_value_5 > 0.5 AND
                chlorine_value_6 IS NOT NULL AND chlorine_value_6 > 0.5 AND
                chlorine_value_7 IS NOT NULL AND chlorine_value_7 > 0.5
              THEN 1 ELSE 0 END) as consistent_above_0_5
            FROM chlorine_data
            WHERE region = $1
          `, [r]);
          if (statsRes.rows.length > 0) {
            activeComparison.push({
              region: r,
              total_connected: Number(statsRes.rows[0].total_connected) || 0,
              below_0_2: Number(statsRes.rows[0].below_0_2) || 0,
              optimal_0_2_0_5: Number(statsRes.rows[0].optimal_0_2_0_5) || 0,
              above_0_5: Number(statsRes.rows[0].above_0_5) || 0,
              consistent_below_0_2: Number(statsRes.rows[0].consistent_below_0_2) || 0,
              consistent_optimal: Number(statsRes.rows[0].consistent_optimal) || 0,
              consistent_above_0_5: Number(statsRes.rows[0].consistent_above_0_5) || 0
            });
          }
        }
        responseData.chlorineComparison = activeComparison;
        console.log(`Fetched fallback chlorine comparison:`, responseData.chlorineComparison.length, "regions");
      } catch (err) {
        console.warn("Could not load fallback chlorine active comparison counts:", err);
      }
    }

    res.json(responseData);
  } catch (err) {
    console.error("Error in monthly-reports route:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
