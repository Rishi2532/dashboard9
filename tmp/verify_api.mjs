import fetch from 'node-fetch';

async function test() {
  try {
    const response = await fetch('http://localhost:5000/api/regions/summary?view=INSTRUMENTED');
    const data = await response.json();
    console.log('Region Summary (INSTRUMENTED):', JSON.stringify(data, null, 2));
    
    if (data.fully_completed_villages !== undefined && data.total_villages_integrated !== undefined) {
      console.log('✅ Success: API returns both fully_completed_villages and total_villages_integrated');
    } else {
      console.log('❌ Error: Missing expected fields in API response');
    }
  } catch (error) {
    console.error('Error fetching API:', error.message);
  }
}

test();
