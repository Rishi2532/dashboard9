import { Router } from "express";
import { db } from "../db-local";
import {
  waterSchemeData,
  chlorineData,
  pressureData,
  schemeStatuses,
  waterConsumption,
  communicationStatus,
} from "../../shared/schema";
import { eq, sql, and, or, ilike } from "drizzle-orm";

const router = Router();

// Search schemes by name or ID
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search in scheme_status table for matching schemes
    const schemes = await db
      .select({
        scheme_id: schemeStatuses.scheme_id,
        scheme_name: schemeStatuses.scheme_name,
        region: schemeStatuses.region,
        division: schemeStatuses.division,
        block: schemeStatuses.block,
      })
      .from(schemeStatuses)
      .where(
        or(
          ilike(schemeStatuses.scheme_name, `%${query}%`),
          ilike(schemeStatuses.scheme_id, `%${query}%`),
        ),
      )
      .limit(10);

    // Remove duplicates based on scheme_id
    const uniqueSchemes = schemes.reduce((acc: any[], current) => {
      const exists = acc.find((item) => item.scheme_id === current.scheme_id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    res.json(uniqueSchemes);
  } catch (error) {
    console.error("Error searching schemes:", error);
    res.status(500).json({ error: "Failed to search schemes" });
  }
});

// Get comprehensive scheme data for report generation
router.get("/scheme/:schemeId", async (req, res) => {
  try {
    const { schemeId } = req.params;

    if (!schemeId) {
      return res.status(400).json({ error: "Scheme ID is required" });
    }

    // Get scheme details - accept both scheme ID and scheme name
    const [schemeInfo] = await db
      .select()
      .from(schemeStatuses)
      .where(
        or(
          eq(schemeStatuses.scheme_id, schemeId),
          ilike(schemeStatuses.scheme_name, `%${schemeId}%`)
        )
      )
      .limit(1);

    if (!schemeInfo) {
      return res.status(404).json({ error: "Scheme not found" });
    }

    // Get village-level water consumption and LPCD data using the found scheme_id
    const villages = await db
      .select()
      .from(waterSchemeData)
      .where(eq(waterSchemeData.scheme_id, schemeInfo.scheme_id));

    // Calculate scheme-level aggregated data
    const totalPopulation = villages.reduce(
      (sum, v) => sum + (v.population || 0),
      0,
    );

    // Aggregate water consumption for all 7 days
    const totalWater = {
      day1: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day1?.toString() || "0") || 0),
        0,
      ),
      day2: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day2?.toString() || "0") || 0),
        0,
      ),
      day3: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day3?.toString() || "0") || 0),
        0,
      ),
      day4: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day4?.toString() || "0") || 0),
        0,
      ),
      day5: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day5?.toString() || "0") || 0),
        0,
      ),
      day6: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day6?.toString() || "0") || 0),
        0,
      ),
      day7: villages.reduce(
        (sum, v) =>
          sum + (parseFloat(v.water_value_day7?.toString() || "0") || 0),
        0,
      ),
    };

    // Calculate scheme-level LPCD for all 7 days
    // Formula: ROUND((Water in Lakh Liters * 100,000) / Population, 2) - matches scheme-lpcd-routes.ts
    const schemeLpcd = {
      day1:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day1 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day2:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day2 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day3:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day3 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day4:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day4 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day5:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day5 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day6:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day6 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
      day7:
        totalPopulation > 0
          ? parseFloat(
              ((totalWater.day7 * 100000) / totalPopulation).toFixed(2),
            )
          : 0,
    };

    // Count villages above 55 LPCD based on lpcd_value_day7
    const villagesAbove55 = villages.filter(
      (v) => parseFloat(v.lpcd_value_day7?.toString() || "0") >= 55,
    ).length;

    // Count ESRs with water supply based on water_value_day7 > 0
    const esrsWithWater = villages.filter(
      (v) => parseFloat(v.water_value_day7?.toString() || "0") > 0,
    ).length;

    // Get ESR-level chlorine data using the found scheme_id
    const chlorineDataList = await db
      .select()
      .from(chlorineData)
      .where(eq(chlorineData.scheme_id, schemeInfo.scheme_id));

    // Get ESR-level pressure data using the found scheme_id
    const pressureDataList = await db
      .select()
      .from(pressureData)
      .where(eq(pressureData.scheme_id, schemeInfo.scheme_id));

    // Get ESR-level water consumption data using the found scheme_id
    const waterConsumptionList = await db
      .select()
      .from(waterConsumption)
      .where(eq(waterConsumption.scheme_id, schemeInfo.scheme_id));

    // Get communication status for ESRs using the found scheme_id
    const commStatusList = await db
      .select()
      .from(communicationStatus)
      .where(eq(communicationStatus.scheme_id, schemeInfo.scheme_id));

    // Combine data by village and ESR
    const reportData = {
      schemeInfo: {
        scheme_id: schemeInfo.scheme_id,
        scheme_name: schemeInfo.scheme_name,
        region: schemeInfo.region,
        circle: schemeInfo.circle,
        division: schemeInfo.division,
        sub_division: schemeInfo.sub_division,
        block: schemeInfo.block,
        agency: schemeInfo.agency,
        total_villages: schemeInfo.number_of_village || villages.length,
        total_villages_integrated: schemeInfo.total_villages_integrated,
        fully_completed_villages: schemeInfo.fully_completed_villages,
        no_of_functional_village: schemeInfo.no_of_functional_village,
        no_of_partial_village: schemeInfo.no_of_partial_village,
        no_of_non_functional_village: schemeInfo.no_of_non_functional_village,
        total_esr: schemeInfo.total_number_of_esr || chlorineDataList.length,
        total_esr_integrated: schemeInfo.total_esr_integrated,
        no_fully_completed_esr: schemeInfo.no_fully_completed_esr,
        balance_to_complete_esr: schemeInfo.balance_to_complete_esr,
        flow_meters_connected: schemeInfo.flow_meters_connected,
        pressure_transmitter_connected:
          schemeInfo.pressure_transmitter_connected,
        residual_chlorine_analyzer_connected:
          schemeInfo.residual_chlorine_analyzer_connected,
        scheme_functional_status: schemeInfo.scheme_functional_status,
        fully_completion_scheme_status:
          schemeInfo.fully_completion_scheme_status,
        mjp_commissioned: schemeInfo.mjp_commissioned,
        mjp_fully_completed: schemeInfo.mjp_fully_completed,
        dashboard_url: schemeInfo.dashboard_url,
        // Scheme-level aggregated data
        total_population: totalPopulation,
        scheme_lpcd: schemeLpcd,
        scheme_water: totalWater,
        villages_above_55: villagesAbove55,
        esrs_with_water: esrsWithWater,
        // Dates from first village
        water_dates: {
          date1: villages[0]?.water_date_day1,
          date2: villages[0]?.water_date_day2,
          date3: villages[0]?.water_date_day3,
          date4: villages[0]?.water_date_day4,
          date5: villages[0]?.water_date_day5,
          date6: villages[0]?.water_date_day6,
          date7: villages[0]?.water_date_day7,
        },
        lpcd_dates: {
          date1: villages[0]?.lpcd_date_day1,
          date2: villages[0]?.lpcd_date_day2,
          date3: villages[0]?.lpcd_date_day3,
          date4: villages[0]?.lpcd_date_day4,
          date5: villages[0]?.lpcd_date_day5,
          date6: villages[0]?.lpcd_date_day6,
          date7: villages[0]?.lpcd_date_day7,
        },
      },
      villagesData: villages.map((village) => {
        // Find ESRs for this village
        const esrs = chlorineDataList
          .filter((esr) => esr.village_name === village.village_name)
          .map((esr) => {
            // Find corresponding pressure data
            const pressure = pressureDataList.find(
              (p) =>
                p.village_name === esr.village_name &&
                p.esr_name === esr.esr_name,
            );

            // Find water consumption data for this ESR
            const waterConsumptionData = waterConsumptionList.find(
              (wc) =>
                wc.village_name === esr.village_name &&
                wc.esr_name === esr.esr_name,
            );

            // Find communication status for this ESR
            const commStatus = commStatusList.find(
              (cs) =>
                cs.village_name === esr.village_name &&
                cs.esr_name === esr.esr_name,
            );

            return {
              esr_name: esr.esr_name,
              time_duration: waterConsumptionData?.time_duration,
              esr_capacity: waterConsumptionData?.esr_capacity,
              chlorine: {
                value_1: esr.chlorine_value_1,
                value_2: esr.chlorine_value_2,
                value_3: esr.chlorine_value_3,
                value_4: esr.chlorine_value_4,
                value_5: esr.chlorine_value_5,
                value_6: esr.chlorine_value_6,
                value_7: esr.chlorine_value_7,
                date_1: esr.chlorine_date_day_1,
                date_2: esr.chlorine_date_day_2,
                date_3: esr.chlorine_date_day_3,
                date_4: esr.chlorine_date_day_4,
                date_5: esr.chlorine_date_day_5,
                date_6: esr.chlorine_date_day_6,
                date_7: esr.chlorine_date_day_7,
              },
              pressure: {
                value_1: pressure?.pressure_value_1,
                value_2: pressure?.pressure_value_2,
                value_3: pressure?.pressure_value_3,
                value_4: pressure?.pressure_value_4,
                value_5: pressure?.pressure_value_5,
                value_6: pressure?.pressure_value_6,
                value_7: pressure?.pressure_value_7,
                date_1: pressure?.pressure_date_day_1,
                date_2: pressure?.pressure_date_day_2,
                date_3: pressure?.pressure_date_day_3,
                date_4: pressure?.pressure_date_day_4,
                date_5: pressure?.pressure_date_day_5,
                date_6: pressure?.pressure_date_day_6,
                date_7: pressure?.pressure_date_day_7,
              },
              water_consumption: {
                day1: waterConsumptionData?.water_value_day1,
                day2: waterConsumptionData?.water_value_day2,
                day3: waterConsumptionData?.water_value_day3,
                day4: waterConsumptionData?.water_value_day4,
                day5: waterConsumptionData?.water_value_day5,
                day6: waterConsumptionData?.water_value_day6,
                day7: waterConsumptionData?.water_value_day7,
                date1: waterConsumptionData?.water_date_day1,
                date2: waterConsumptionData?.water_date_day2,
                date3: waterConsumptionData?.water_date_day3,
                date4: waterConsumptionData?.water_date_day4,
                date5: waterConsumptionData?.water_date_day5,
                date6: waterConsumptionData?.water_date_day6,
                date7: waterConsumptionData?.water_date_day7,
              },
              flow_rate_m3: waterConsumptionData?.flow_rate_m3,
              flow_meter_connected: commStatus?.flow_meter_connected,
              chlorine_connected: commStatus?.chlorine_connected,
              pressure_connected: commStatus?.pressure_connected,
            };
          });

        return {
          village_name: village.village_name,
          population: village.population,
          water_consumption: {
            day1: village.water_value_day1,
            day2: village.water_value_day2,
            day3: village.water_value_day3,
            day4: village.water_value_day4,
            day5: village.water_value_day5,
            day6: village.water_value_day6,
            day7: village.water_value_day7,
            date1: village.water_date_day1,
            date2: village.water_date_day2,
            date3: village.water_date_day3,
            date4: village.water_date_day4,
            date5: village.water_date_day5,
            date6: village.water_date_day6,
            date7: village.water_date_day7,
          },
          lpcd: {
            day1: village.lpcd_value_day1,
            day2: village.lpcd_value_day2,
            day3: village.lpcd_value_day3,
            day4: village.lpcd_value_day4,
            day5: village.lpcd_value_day5,
            day6: village.lpcd_value_day6,
            day7: village.lpcd_value_day7,
            date1: village.lpcd_date_day1,
            date2: village.lpcd_date_day2,
            date3: village.lpcd_date_day3,
            date4: village.lpcd_date_day4,
            date5: village.lpcd_date_day5,
            date6: village.lpcd_date_day6,
            date7: village.lpcd_date_day7,
          },
          esrs: esrs,
        };
      }),
    };

    res.json(reportData);
  } catch (error) {
    console.error("Error fetching scheme data:", error);
    res.status(500).json({ error: "Failed to fetch scheme data" });
  }
});

export default router;
