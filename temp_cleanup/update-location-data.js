import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();
const { Pool } = pg;

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Parse the SQL file to extract location data for each scheme
const locationData = [
  { scheme_id: '7945938', circle: 'Amravati', division: 'Amravati', sub_division: 'Achalpur', block: 'Chandur Bazar' },
  { scheme_id: '20028563', circle: 'Amravati', division: 'Yavatmal', sub_division: 'Pusad', block: 'Pusad' },
  { scheme_id: '20003791', circle: 'Amravati', division: 'Amravati W.M', sub_division: 'W.M.Amravati - 2', block: 'Achalpur' },
  { scheme_id: '20028565', circle: 'Akola', division: 'Akola', sub_division: 'Akola', block: 'Akola' },
  { scheme_id: '20028330', circle: 'Akola', division: 'Akola', sub_division: 'Murtizapur', block: 'Murtizapur' },
  { scheme_id: '20030287', circle: 'Amravati', division: 'Amravati', sub_division: 'Amravati - 2', block: 'Nandgaon Khandeshwar' },
  { scheme_id: '20028065', circle: 'Akola', division: 'Buldhana', sub_division: 'Buldhana', block: 'Motala' },
  { scheme_id: '20021409', circle: 'Akola', division: 'Buldhana', sub_division: 'Buldhana', block: 'Motala' },
  { scheme_id: '20027978', circle: 'Akola', division: 'Buldhana', sub_division: 'Buldhana', block: 'Motala' },
  { scheme_id: '20021406', circle: 'Akola', division: 'Buldhana', sub_division: 'Buldhana', block: 'Buldhana' },
  { scheme_id: '20029998', circle: 'Amravati', division: 'Amravati', sub_division: 'Achalpur', block: 'Achalpur' },
  { scheme_id: '20039258', circle: 'Nashik', division: 'W M Nashik', sub_division: 'W.M.Nashik', block: 'Nifad' },
  { scheme_id: '20028193', circle: 'Nashik', division: 'W M Nashik', sub_division: 'Sinnar', block: 'Naigaon' },
  { scheme_id: '7937337', circle: 'Ahmednagar', division: 'Sangamner', sub_division: 'Sangamner', block: 'Sangamner' },
  { scheme_id: '20033242', circle: 'Ahmednagar', division: 'Sangamner', sub_division: 'Sangamner', block: 'Sangamner' },
  { scheme_id: '20086730', circle: 'Nashik', division: 'W M Nashik', sub_division: 'Malegaon', block: 'Chandwad' },
  { scheme_id: '20054877', circle: 'Ahmednagar', division: 'Sangamner', sub_division: 'Kopargaon', block: 'Rahata' },
  { scheme_id: '417239', circle: 'Ahmednagar', division: 'Sangamner', sub_division: 'Kopargaon', block: 'Rahata' },
  { scheme_id: '20061165', circle: 'Jalgaon', division: 'Jalgaon', sub_division: 'Erandol', block: 'Dharangaon' },
  { scheme_id: '20019176', circle: 'Nashik', division: 'Nashik', sub_division: 'Sinnar', block: 'Sinnar' },
  { scheme_id: '20019286', circle: 'Nashik', division: 'Nashik', sub_division: 'Sinnar', block: 'Sinnar' },
  { scheme_id: '20030798', circle: 'Nashik', division: 'Nashik', sub_division: 'Manmad', block: 'Yeola' },
  { scheme_id: '20053796', circle: 'Jalgaon', division: 'Jalgaon', sub_division: 'Erandol', block: 'Chalisgaon' },
  { scheme_id: '5348540', circle: 'Ahmednagar', division: 'Ahmednagar', sub_division: 'Newasa', block: 'Nevasa' },
  { scheme_id: '20036536', circle: 'Nagpur', division: 'Chandrapur', sub_division: 'Chandrapur', block: 'Chimur' },
  { scheme_id: '2009882', circle: 'Nagpur', division: 'Chandrapur', sub_division: 'Gadchiroli', block: 'Chamorshi' },
  { scheme_id: '20050368', circle: 'Chandrapur', division: 'Chandrapur', sub_division: 'Chandrapur', block: 'Chandrapur' },
  { scheme_id: '20036500', circle: 'Nagpur', division: 'Nagpur', sub_division: 'Chandrapur', block: 'Saoali' },
  { scheme_id: '7891298', circle: 'Nagpur', division: 'Chandrapur', sub_division: 'Wardha', block: 'Wardha' },
  { scheme_id: '7928270', circle: 'Chandrapur', division: 'Chandrapur', sub_division: 'Pombhurna', block: 'Pombhurna' },
  { scheme_id: '7890975', circle: 'Chandrapur', division: 'Chandrapur', sub_division: 'Gadchiroli', block: 'Aheri' },
  { scheme_id: '20019216', circle: 'Nagpur', division: 'Gondia', sub_division: 'Gondia', block: 'Goregaon' },
  { scheme_id: '7890965', circle: 'Nagpur', division: 'Chandrapur', sub_division: 'Mul', block: 'Mul' },
  { scheme_id: '20009650', circle: 'Nagpur', division: 'Nagpur', sub_division: 'Nagpur', block: 'Hingna' },
  { scheme_id: '2003645', circle: 'Nagpur', division: 'Gondia', sub_division: 'Gondia', block: 'Gondia' },
  { scheme_id: '631010', circle: 'Nagpur', division: 'Gondia', sub_division: 'Bhandara', block: 'Tumsar' },
  { scheme_id: '20017217', circle: 'Nagpur', division: 'Gondia', sub_division: 'Bhandara', block: 'Tumsar' },
  { scheme_id: '7940695', circle: 'Nagpur', division: 'Nagpur', sub_division: 'Nagpur', block: 'Kamptee' },
  { scheme_id: '20036862', circle: 'Nagpur', division: 'Chandrapur', sub_division: 'Chandrapur', block: 'Mul' },
  { scheme_id: '20030459', circle: 'Latur', division: 'Latur', sub_division: 'Chakur', block: 'Chakur' },
  { scheme_id: '20018162', circle: 'Chhatrapati Sambhajinagar', division: 'Chhatrapati Sambhajinagar', sub_division: 'Paithan', block: 'Paithan' },
  { scheme_id: '20051233', circle: 'Chhatrapati Sambhajinagar', division: 'Chhatrapati Sambhajinagar', sub_division: 'Gangapur', block: 'Gangapur' },
  { scheme_id: '20017395', circle: 'Chhatrapati Sambhajinagar', division: 'Chhatrapati Sambhajinagar', sub_division: 'Sillod', block: 'Sillod' },
  { scheme_id: '20013969', circle: 'Nanded', division: 'Nanded', sub_division: 'Himayatnagar', block: 'Himayatnagar' },
  { scheme_id: '7942142', circle: 'Nanded', division: 'Nanded', sub_division: 'Naigaon', block: 'Naigaon' },
  { scheme_id: '20023330', circle: 'Nanded', division: 'Parbhani', sub_division: 'Senaon', block: 'Senaon' },
  { scheme_id: '20030820', circle: 'Latur', division: 'Latur', sub_division: 'Renapur', block: 'Renapur' },
  { scheme_id: '20030815', circle: 'Latur', division: 'Latur', sub_division: 'Shirur Anantpal', block: 'Shirur Anantpal' },
  { scheme_id: '7338000', circle: 'Nanded', division: 'Nanded', sub_division: 'Kandhar', block: 'Kandhar' },
  { scheme_id: '20027541', circle: 'Pune', division: 'Pune 2', sub_division: 'Pune 2', block: 'Velhe' },
  { scheme_id: '20027892', circle: 'Pune', division: 'Satara', sub_division: 'Phaltan', block: 'Phaltan' },
  { scheme_id: '20017250', circle: 'Pune', division: 'Pune 1', sub_division: 'Baramati', block: 'Ambegaon' },
  { scheme_id: '20022133', circle: 'Pune', division: 'MJP Works Division No. 2 , Pune', sub_division: 'Pune', block: 'Mulshi' },
  { scheme_id: '20013367', circle: 'Pune', division: 'Pune 2', sub_division: 'Maval', block: 'Daund' },
  { scheme_id: '20027396', circle: 'Sangli', division: 'Solapur', sub_division: 'Solapur', block: 'Sangola' },
  { scheme_id: '7940233', circle: 'Sangli', division: 'Sangli', sub_division: 'Islampur', block: 'Valva' },
  { scheme_id: '7942125', circle: 'Pune', division: 'Pune 1', sub_division: 'Baramati', block: 'Ambegaon' },
  { scheme_id: '20018548', circle: 'Pune', division: 'Pune 2', sub_division: 'Baramati', block: 'Ambegaon' },
  { scheme_id: '20028168', circle: 'Panvel', division: 'Raigadh', sub_division: 'Mangaon', block: 'Khalapur' },
  { scheme_id: '20020563', circle: 'Panvel', division: 'Raigadh', sub_division: 'Mangaon', block: 'Pen' },
  { scheme_id: '20047871', circle: 'Thane', division: 'Thane', sub_division: 'Palghar', block: 'Dahanu' },
  { scheme_id: '20092478', circle: 'Thane', division: 'Thane', sub_division: 'Thane', block: 'Kalyan' }
];

async function updateSchemeLocationData() {
  console.log(`Starting location data update for ${locationData.length} schemes...`);
  let updatedCount = 0;
  let errorCount = 0;

  try {
    // Loop through each scheme and update its location data
    for (const data of locationData) {
      try {
        // Update the location fields for this scheme
        const query = `
          UPDATE scheme_status
          SET 
            circle = $1,
            division = $2,
            sub_division = $3,
            block = $4
          WHERE scheme_id = $5
        `;
        
        const result = await pool.query(query, [
          data.circle,
          data.division,
          data.sub_division,
          data.block,
          data.scheme_id
        ]);
        
        if (result.rowCount > 0) {
          console.log(`Updated location data for scheme_id: ${data.scheme_id}`);
          updatedCount++;
        } else {
          console.log(`Scheme not found: ${data.scheme_id}`);
        }
      } catch (schemeError) {
        console.error(`Error updating scheme ${data.scheme_id}:`, schemeError);
        errorCount++;
      }
    }
    
    console.log(`Location data update completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error in location data update process:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the update function
updateSchemeLocationData();