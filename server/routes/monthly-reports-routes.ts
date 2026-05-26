import { Router } from "express";
import { pool } from "../db-local";

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

export default router;
