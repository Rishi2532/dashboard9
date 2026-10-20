import { getDB } from './server/db';
import { sql } from 'drizzle-orm';
import { getEscalationStatus } from './server/services/escalation-service';

async function test() {
  const db = await getDB();
  const isAll = true;
  const selectedRegion = 'All';

  const t0 = Date.now();
  const [
    iotSchemesTotalRes,
    iotSchemesFullyRes,
    iotVillagesTotalRes,
    iotVillagesFullyRes,
    iotEsrTotalRes,
    iotEsrFullyRes,
    opSchemesRes,
    opVillagesRes,
    opEsrsRes,
    escalationRes
  ] = await Promise.all([
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        total_villages_integrated, total_esr_integrated,
        fully_completion_scheme_status as status,
        water_supply
      FROM scheme_status
      WHERE (total_villages_integrated > 0 OR total_esr_integrated > 0)
        ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        fully_completed_villages, no_fully_completed_esr,
        fully_completion_scheme_status as status,
        water_supply
      FROM scheme_status
      WHERE (TRIM(LOWER(fully_completion_scheme_status)) IN ('fully completed', 'completed', 'fully-completed', 'connected') OR TRIM(LOWER(mjp_fully_completed)) = 'yes')
        ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, ss.water_supply_status as status
      FROM water_scheme_data ws
      LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
      WHERE ws.village_name IS NOT NULL
        ${isAll ? sql`` : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, 'Completed' as status
      FROM water_scheme_data ws
      JOIN village v ON v.scheme_id = ws.scheme_id AND LOWER(TRIM(v.village_name)) = LOWER(TRIM(ws.village_name))
      LEFT JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id
      WHERE TRIM(LOWER(v.fully_completion_village_status)) IN ('completed', 'fully completed', 'fully_completed')
        ${isAll ? sql`` : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
        scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
        chlorine_connected, pressure_connected, flow_meter_connected,
        overall_status as status
      FROM communication_status
      WHERE esr_name IS NOT NULL AND esr_name != '-'
        ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name)))
        scheme_id, scheme_name, village_name, esr_name, region, circle, division, sub_division, block,
        chlorine_connected, pressure_connected, flow_meter_connected,
        overall_status as status
      FROM communication_status
      WHERE esr_name IS NOT NULL AND esr_name != '-'
        AND LOWER(TRIM(chlorine_connected)) = 'connected'
        AND LOWER(TRIM(pressure_connected)) = 'connected'
        AND LOWER(TRIM(flow_meter_connected)) = 'connected'
        ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY scheme_id, LOWER(TRIM(village_name)), LOWER(TRIM(esr_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (scheme_id)
        scheme_id, scheme_name, region, circle, division, sub_division, block,
        water_supply as status
      FROM scheme_status
      WHERE water_supply = 'Yes'
        ${isAll ? sql`` : sql`AND region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY scheme_id, region, scheme_name
    `),
    db.execute(sql`
      SELECT DISTINCT ON (ws.scheme_id, LOWER(TRIM(ws.village_name)))
        ws.scheme_id, ws.scheme_name, ws.village_name, ws.region, ws.circle, ws.division, ws.sub_division, ws.block,
        ws.population, ws.lpcd_value_day7 as lpcd_value, 'Yes' as status
      FROM water_scheme_data ws
      JOIN scheme_status ss ON ss.scheme_id = ws.scheme_id AND ss.water_supply = 'Yes'
      WHERE ws.village_name IS NOT NULL
        ${isAll ? sql`` : sql`AND ws.region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY ws.scheme_id, LOWER(TRIM(ws.village_name))
    `),
    db.execute(sql`
      SELECT DISTINCT ON (c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name)))
        c.scheme_id, c.scheme_name, c.village_name, c.esr_name, c.region, c.circle, c.division, c.sub_division, c.block,
        'Yes' as status
      FROM chlorine_data c
      JOIN scheme_status ss ON ss.scheme_id = c.scheme_id AND ss.water_supply = 'Yes'
      WHERE c.esr_name IS NOT NULL AND c.esr_name != '-'
        ${isAll ? sql`` : sql`AND c.region ILIKE ${`%${selectedRegion}%`}`}
      ORDER BY c.scheme_id, LOWER(TRIM(c.village_name)), LOWER(TRIM(c.esr_name))
    `),
    getEscalationStatus({ region: undefined })
  ]);

  console.log(`Parallel queries took ${Date.now() - t0}ms`);
  console.log({
    iotSchemesTotal: (iotSchemesTotalRes as any).rows?.length,
    iotSchemesFully: (iotSchemesFullyRes as any).rows?.length,
    iotVillagesTotal: (iotVillagesTotalRes as any).rows?.length,
    iotVillagesFully: (iotVillagesFullyRes as any).rows?.length,
    iotEsrTotal: (iotEsrTotalRes as any).rows?.length,
    iotEsrFully: (iotEsrFullyRes as any).rows?.length,
    opSchemes: (opSchemesRes as any).rows?.length,
    opVillages: (opVillagesRes as any).rows?.length,
    opEsrs: (opEsrsRes as any).rows?.length,
  });

  process.exit(0);
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
