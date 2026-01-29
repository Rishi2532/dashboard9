import { getDB } from './db/index';
import { schemeStatuses } from './db/schema';
import { sql } from 'drizzle-orm';

async function testFilterLogic() {
  const db = await getDB();
  
  console.log('=== Testing Scheme Filter Logic ===\n');
  
  // Check what statuses exist in the database
  console.log('1. Checking unique scheme statuses in database:');
  const uniqueStatuses = await db
    .select({ status: schemeStatuses.fully_completion_scheme_status })
    .from(schemeStatuses)
    .groupBy(schemeStatuses.fully_completion_scheme_status);
  
  console.log('Unique statuses found:');
  uniqueStatuses.forEach((row: any) => {
    console.log(`  - "${row.status}"`);
  });
  
  // Test each filter type
  const filterTypes = ['commissioned', 'fully_completed', 'in_progress', 'partially_commissioned'];
  
  for (const filterType of filterTypes) {
    console.log(`\n2. Testing filterType="${filterType}":`);
    
    let statusConditions: string[] = [];
    
    switch (filterType) {
      case 'fully_completed':
        statusConditions = ['Completed', 'Fully-Completed', 'Fully Completed', 'fully completed'];
        break;
      case 'commissioned':
        statusConditions = ['Commissioned'];
        break;
      case 'partially_commissioned':
        statusConditions = ['Partially Commissioned', 'Partial Commissioned'];
        break;
      case 'in_progress':
        statusConditions = ['In Progress', 'Work in Progress'];
        break;
    }
    
    console.log(`  Looking for statuses: ${statusConditions.join(', ')}`);
    
    const results = await db
      .select({ scheme_id: schemeStatuses.scheme_id, status: schemeStatuses.fully_completion_scheme_status })
      .from(schemeStatuses)
      .where(
        sql`LOWER(${schemeStatuses.fully_completion_scheme_status}) IN (${sql.join(statusConditions.map(s => sql`${s.toLowerCase()}`), sql`, `)})`
      );
    
    console.log(`  Found ${results.length} matching schemes`);
    if (results.length > 0 && results.length <= 5) {
      console.log('  Sample matches:');
      results.forEach((r: any) => console.log(`    - ${r.scheme_id}: "${r.status}"`));
    } else if (results.length > 5) {
      console.log('  Sample matches (first 5):');
      results.slice(0, 5).forEach((r: any) => console.log(`    - ${r.scheme_id}: "${r.status}"`));
    }
  }
  
  process.exit(0);
}

testFilterLogic().catch(console.error);
