import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

const { Pool } = pg;

// Create a connection to the PostgreSQL database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to determine agency based on region
function getAgencyByRegion(regionName) {
  switch(regionName) {
    case 'Amravati':
      return 'M/S Ceinsys';
    case 'Nashik':
      return 'M/S Wipro';
    case 'Nagpur':
      return 'M/S Tata Consultancy Services';
    case 'Pune':
      return 'M/S Larsen & Toubro';
    case 'Konkan':
      return 'M/S Orange Business Services';
    case 'Chhatrapati Sambhajinagar':
    case 'CS':  // Handling both versions of the name
      return 'M/S Siemens';
    default:
      return 'Not Specified';
  }
}

// Main function to run a test import
async function main() {
  try {
    const client = await pool.connect();
    
    // Create a few test schemes with explicit scheme_id values
    const testSchemes = [
      {
        region_name: 'Amravati',
        scheme_id: 'AM-001',
        scheme_name: '83 Village RRWS Scheme MJP RR (C 39)',
        total_villages: 87,
        functional_villages: 75,
        partial_villages: 8,
        non_functional_villages: 4,
        fully_completed_villages: 72,
        total_esr: 124,
        scheme_functional_status: 'Functional',
        fully_completed_esr: 85,
        balance_esr: 39,
        flow_meters_connected: 90,
        pressure_transmitters_connected: 65,
        residual_chlorine_connected: 80,
        scheme_status: 'Partial',
        agency: getAgencyByRegion('Amravati')
      },
      {
        region_name: 'Nashik',
        scheme_id: 'NS-001',
        scheme_name: 'Ozar-Sakore & 2 Villages',
        total_villages: 3,
        functional_villages: 3,
        partial_villages: 0,
        non_functional_villages: 0,
        fully_completed_villages: 3,
        total_esr: 6,
        scheme_functional_status: 'Functional',
        fully_completed_esr: 6,
        balance_esr: 0,
        flow_meters_connected: 6,
        pressure_transmitters_connected: 6,
        residual_chlorine_connected: 6,
        scheme_status: 'Fully-Completed',
        agency: getAgencyByRegion('Nashik')
      },
      {
        region_name: 'Nagpur',
        scheme_id: 'NG-001',
        scheme_name: 'Bothali & 7 Village RR WSS',
        total_villages: 8,
        functional_villages: 8,
        partial_villages: 0,
        non_functional_villages: 0,
        fully_completed_villages: 8,
        total_esr: 8,
        scheme_functional_status: 'Functional',
        fully_completed_esr: 8,
        balance_esr: 0,
        flow_meters_connected: 8,
        pressure_transmitters_connected: 8,
        residual_chlorine_connected: 8,
        scheme_status: 'Fully-Completed',
        agency: getAgencyByRegion('Nagpur')
      },
      {
        region_name: 'Pune',
        scheme_id: 'PN-001',
        scheme_name: 'Pune Test Scheme',
        total_villages: 15,
        functional_villages: 10,
        partial_villages: 3,
        non_functional_villages: 2,
        fully_completed_villages: 8,
        total_esr: 20,
        scheme_functional_status: 'Partial',
        fully_completed_esr: 15,
        balance_esr: 5,
        flow_meters_connected: 18,
        pressure_transmitters_connected: 12,
        residual_chlorine_connected: 16,
        scheme_status: 'Partial',
        agency: getAgencyByRegion('Pune')
      },
      {
        region_name: 'Konkan',
        scheme_id: 'KK-001',
        scheme_name: 'Konkan Test Scheme',
        total_villages: 5,
        functional_villages: 3,
        partial_villages: 1,
        non_functional_villages: 1,
        fully_completed_villages: 2,
        total_esr: 7,
        scheme_functional_status: 'Partial',
        fully_completed_esr: 4,
        balance_esr: 3,
        flow_meters_connected: 5,
        pressure_transmitters_connected: 3,
        residual_chlorine_connected: 4,
        scheme_status: 'Partial',
        agency: getAgencyByRegion('Konkan')
      },
      {
        region_name: 'Chhatrapati Sambhajinagar',
        scheme_id: 'CS-001',
        scheme_name: 'CS Test Scheme',
        total_villages: 12,
        functional_villages: 9,
        partial_villages: 2,
        non_functional_villages: 1,
        fully_completed_villages: 8,
        total_esr: 15,
        scheme_functional_status: 'Functional',
        fully_completed_esr: 12,
        balance_esr: 3,
        flow_meters_connected: 13,
        pressure_transmitters_connected: 10,
        residual_chlorine_connected: 14,
        scheme_status: 'Partial',
        agency: getAgencyByRegion('Chhatrapati Sambhajinagar')
      }
    ];
    
    try {
      // First clear the table
      await client.query('TRUNCATE TABLE scheme_status RESTART IDENTITY');
      console.log('Existing scheme data cleared successfully');
      
      // Then insert test schemes
      for (const scheme of testSchemes) {
        const insertQuery = `
          INSERT INTO scheme_status (
            region_name, scheme_id, scheme_name, total_villages, functional_villages,
            partial_villages, non_functional_villages, fully_completed_villages,
            total_esr, scheme_functional_status, fully_completed_esr, balance_esr,
            flow_meters_connected, pressure_transmitters_connected, residual_chlorine_connected,
            scheme_status, agency
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
        `;
        
        const values = [
          scheme.region_name,
          scheme.scheme_id,
          scheme.scheme_name,
          scheme.total_villages,
          scheme.functional_villages,
          scheme.partial_villages,
          scheme.non_functional_villages,
          scheme.fully_completed_villages,
          scheme.total_esr,
          scheme.scheme_functional_status,
          scheme.fully_completed_esr,
          scheme.balance_esr,
          scheme.flow_meters_connected,
          scheme.pressure_transmitters_connected,
          scheme.residual_chlorine_connected,
          scheme.scheme_status,
          scheme.agency
        ];
        
        await client.query(insertQuery, values);
        console.log(`Inserted scheme: ${scheme.scheme_id} - ${scheme.scheme_name}`);
      }
      
      console.log('Test import completed successfully!');
      console.log(`Total inserted: ${testSchemes.length}`);
      
      // Update region summaries after import
      console.log('Updating region summaries...');
      await client.query('SELECT update_region_summaries()');
      
      console.log('Import process completed successfully!');
    } finally {
      client.release();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error in import process:', error);
    process.exit(1);
  }
}

// Run the import
main();