import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function testRegionalStatsFiltering() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== Testing /api/pressure/regional-stats Filtering ===\n');
    
    // First, get scheme IDs for "in_progress" filter
    console.log('1. Getting scheme IDs with fully_completion_scheme_status = "In Progress"...');
    const schemeQuery = `
      SELECT scheme_id 
      FROM scheme_status 
      WHERE LOWER(fully_completion_scheme_status) IN ('in progress', 'work in progress')
      LIMIT 10
    `;
    const schemeResult = await pool.query(schemeQuery);
    const schemeIds = schemeResult.rows.map(r => r.scheme_id);
    console.log(`   Found ${schemeResult.rows.length} schemes (showing first 10)`);
    console.log(`   Sample IDs: ${schemeIds.slice(0, 5).join(', ')}\n`);
    
    // Now test the actual query used by /api/pressure/regional-stats
    console.log('2. Testing regional stats query WITHOUT filter...');
    const allRegionsQuery = `
      SELECT DISTINCT region FROM communication_status cs WHERE region IS NOT NULL ORDER BY region
    `;
    const allRegions = await pool.query(allRegionsQuery);
    console.log(`   Found ${allRegions.rows.length} regions total\n`);
    
    // Test WITH filter
    console.log('3. Testing regional stats query WITH in_progress filter...');
    const ids = schemeIds.map(id => `'${id}'`).join(',');
    const filteredRegionsQuery = `
      SELECT DISTINCT region FROM communication_status cs 
      WHERE region IS NOT NULL 
      AND cs.scheme_id IN (${ids})
      ORDER BY region
    `;
    const filteredRegions = await pool.query(filteredRegionsQuery);
    console.log(`   Found ${filteredRegions.rows.length} regions with filter\n`);
    
    // Test actual stats for one region
    console.log('4. Testing stats calculation for Amravati region...');
    
    // Without filter
    const statsNoFilterQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' THEN cs.id END) as total_connected
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (cs.scheme_id = wc.scheme_id AND cs.village_name = wc.village_name)
      LEFT JOIN pressure_data pd ON (cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name)
      WHERE cs.region = 'Amravati'
    `;
    const statsNoFilter = await pool.query(statsNoFilterQuery);
    console.log(`   WITHOUT filter: ${statsNoFilter.rows[0].total_connected} connected sensors`);
    
    // With filter
    const statsWithFilterQuery = `
      SELECT 
        COUNT(DISTINCT CASE WHEN cs.pressure_connected = 'Connected' THEN cs.id END) as total_connected
      FROM communication_status cs
      LEFT JOIN water_consumption wc ON (cs.scheme_id = wc.scheme_id AND cs.village_name = wc.village_name)
      LEFT JOIN pressure_data pd ON (cs.scheme_id = pd.scheme_id AND cs.village_name = pd.village_name)
      WHERE cs.region = 'Amravati'
      AND cs.scheme_id IN (${ids})
    `;
    const statsWithFilter = await pool.query(statsWithFilterQuery);
    console.log(`   WITH filter: ${statsWithFilter.rows[0].total_connected} connected sensors`);
    
    console.log('\n=== CONCLUSION ===');
    if (statsNoFilter.rows[0].total_connected === statsWithFilter.rows[0].total_connected) {
      console.log('⚠️  PROBLEM: Filter is NOT reducing the data!');
      console.log('   The numbers are the same with and without filter.');
      console.log('   This means the backend is returning unfiltered data.');
    } else {
      console.log('✅ Filter is working correctly!');
      console.log(`   Reduced from ${statsNoFilter.rows[0].total_connected} to ${statsWithFilter.rows[0].total_connected} sensors`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testRegionalStatsFiltering();
