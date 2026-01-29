import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function checkSchemeStatuses() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('=== Checking Scheme Statuses in Database ===\n');
    
    // Get unique statuses
    const statusQuery = `
      SELECT 
        fully_completion_scheme_status as status,
        COUNT(*) as count
      FROM scheme_status
      WHERE fully_completion_scheme_status IS NOT NULL
      GROUP BY fully_completion_scheme_status
      ORDER BY count DESC
    `;
    
    const result = await pool.query(statusQuery);
    
    console.log('Unique scheme statuses found:');
    console.log('─'.repeat(60));
    result.rows.forEach(row => {
      console.log(`  "${row.status}" → ${row.count} schemes`);
    });
    console.log('─'.repeat(60));
    
    // Test specific filters
    console.log('\n=== Testing Filter Matches ===\n');
    
    const filters = {
      'commissioned': ['Commissioned'],
      'fully_completed': ['Completed', 'Fully-Completed', 'Fully Completed', 'fully completed'],
      'in_progress': ['In Progress', 'Work in Progress'],
      'partially_commissioned': ['Partially Commissioned', 'Partial Commissioned']
    };
    
    for (const [filterType, conditions] of Object.entries(filters)) {
      const lowerConditions = conditions.map(c => c.toLowerCase());
      const placeholders = lowerConditions.map((_, i) => `$${i + 1}`).join(', ');
      
      const matchQuery = `
        SELECT COUNT(*) as count
        FROM scheme_status
        WHERE LOWER(fully_completion_scheme_status) IN (${placeholders})
      `;
      
      const matchResult = await pool.query(matchQuery, lowerConditions);
      const count = matchResult.rows[0].count;
      
      console.log(`Filter "${filterType}": ${count} matches`);
      console.log(`  Looking for: ${conditions.join(', ')}`);
      
      if (count === 0) {
        console.log(`  ⚠️  NO MATCHES - This filter will return empty results!`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSchemeStatuses();
