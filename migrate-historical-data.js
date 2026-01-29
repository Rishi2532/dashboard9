// Script to migrate existing chlorine data to historical storage
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const { chlorineData, chlorineHistory } = require('./shared/schema.ts');

async function migrateHistoricalData() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL not found');
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log('Starting migration of chlorine data to historical storage...');

  try {
    // Get all chlorine data
    const allData = await db.select().from(chlorineData);
    console.log(`Found ${allData.length} chlorine records to migrate`);

    const uploadBatchId = `migration_${Date.now()}`;
    const historicalRecords = [];

    // Process each record
    for (const record of allData) {
      // Unpack 7-day data into individual historical entries
      for (let day = 1; day <= 7; day++) {
        const dateField = `chlorine_date_day_${day}`;
        const valueField = `chlorine_value_${day}`;
        
        const chlorineDate = record[dateField];
        const chlorineValue = record[valueField];
        
        // Only store if both date and value exist
        if (chlorineDate && chlorineValue !== null && chlorineValue !== undefined) {
          historicalRecords.push({
            region: record.region,
            circle: record.circle,
            division: record.division,
            sub_division: record.sub_division,
            block: record.block,
            scheme_id: record.scheme_id,
            scheme_name: record.scheme_name,
            village_name: record.village_name,
            esr_name: record.esr_name,
            chlorine_date: chlorineDate,
            chlorine_value: chlorineValue,
            upload_batch_id: uploadBatchId,
            dashboard_url: record.dashboard_url
          });
        }
      }
    }

    console.log(`Generated ${historicalRecords.length} historical records`);

    // Insert in batches
    const batchSize = 500;
    let inserted = 0;
    
    for (let i = 0; i < historicalRecords.length; i += batchSize) {
      const batch = historicalRecords.slice(i, i + batchSize);
      
      try {
        await db.insert(chlorineHistory).values(batch);
        inserted += batch.length;
        console.log(`Inserted batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(historicalRecords.length/batchSize)}, total: ${inserted}`);
      } catch (error) {
        console.error(`Error inserting batch ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }

    console.log(`✅ Migration completed! Inserted ${inserted} historical records`);
    
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  migrateHistoricalData();
}

module.exports = { migrateHistoricalData };