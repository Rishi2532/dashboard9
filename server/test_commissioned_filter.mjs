import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function testCommissionedFilter() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== Testing Commissioned Filter (water_supply = Yes) ===\n');
    
    const query = `
      SELECT COUNT(*) as count
      FROM scheme_status
      WHERE LOWER(water_supply) = 'yes'
    `;
    
    const result = await pool.query(query);
    const count = result.rows[0].count;
    
    console.log(`Schemes with water_supply = 'Yes': ${count}`);
    
    if (count > 0) {
      console.log('\n✅ Commissioned filter will work!');
      console.log(`   It will filter to ${count} schemes`);
    } else {
      console.log('\n⚠️  No schemes have water_supply = Yes');
      console.log('   Commissioned filter will return empty results');
    }
    
    // Also check the other filters
    console.log('\n=== Other Filter Counts ===\n');
    
    const filters = [
      { name: 'Fully Completed', statuses: ['Completed', 'Fully-Completed', 'Fully Completed', 'fully completed'] },
      { name: 'In Progress', statuses: ['In Progress', 'Work in Progress'] }
    ];
    
    for (const filter of filters) {
      const lowerStatuses = filter.statuses.map(s => s.toLowerCase());
      const placeholders = lowerStatuses.map((_, i) => `$${i + 1}`).join(', ');
      
      const filterQuery = `
        SELECT COUNT(*) as count
        FROM scheme_status
        WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
      `;
      
      const filterResult = await pool.query(filterQuery, lowerStatuses);
      console.log(`${filter.name}: ${filterResult.rows[0].count} schemes`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

testCommissionedFilter();
