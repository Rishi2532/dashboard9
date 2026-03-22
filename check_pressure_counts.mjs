import http from 'http';

const regions = ['Amravati', 'Chhatrapati Sambhajinagar', 'Konkan', 'Nagpur', 'Nashik', 'Pune'];

async function fetchStats() {
  return new Promise((resolve) => {
    http.get('http://localhost:5000/api/pressure/overall-region-comparison?filterType=commissioned', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
}

async function fetchDetails(region, category) {
  return new Promise((resolve) => {
    const url = region ? 
      `http://localhost:5000/api/pressure/overall-region-comparison/details/${category}?region=${encodeURIComponent(region)}&filterType=commissioned` : 
      `http://localhost:5000/api/pressure/overall-region-comparison/details/${category}?filterType=commissioned`;
      
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
}

async function run() {
  console.log("Fetching summary stats...");
  const statsResponse = await fetchStats();
  const summary = statsResponse.data || [];
  
  const categories = [
    { key: 'below_0_2', label: 'below_0_2' },
    { key: 'optimal_0_2_0_7', label: 'between_0_2_0_7' },
    { key: 'above_0_7', label: 'above_0_7' },
    { key: 'offline', label: 'offline' },
    { key: 'all_sensors', label: 'total' },
    { key: 'consistent_below_0_2', label: 'consistent_below_0_2' },
    { key: 'consistent_optimal', label: 'consistent_optimal' },
    { key: 'consistent_above_0_7', label: 'consistent_above_0_7' },
    { key: 'consistent_all', label: 'consistent_7_day_total' }
  ];
  
  // Just test Amravati and TOTAL to save time.
  for (const region of ['Amravati', null]) {
    const regionName = region || 'TOTAL';
    const regionSummary = region ? summary.find(r => r.region === region) : summary.find(r => r.region === 'TOTAL');
    
    if (!regionSummary) {
      console.log(`\n--- No summary found for ${regionName} ---`);
      continue;
    }
    
    console.log(`\n=== Checking Region: ${regionName} ===`);
    
    for (const cat of categories) {
      try {
        const details = await fetchDetails(region, cat.key);
        const detailCount = details.data ? details.data.length : 0;
        
        // Summing logic for 'total' (since the summary api returns breakdown)
        let summaryCount = parseInt(regionSummary[cat.label] || 0);
        if (cat.key === 'all_sensors') {
             summaryCount = parseInt(regionSummary.offline) + parseInt(regionSummary.below_0_2) + parseInt(regionSummary.optimal_0_2_0_7) + parseInt(regionSummary.above_0_7);
        } else if (cat.key === 'consistent_all') {
             summaryCount = parseInt(regionSummary.consistent_below_0_2) + parseInt(regionSummary.consistent_optimal) + parseInt(regionSummary.consistent_above_0_7);
        }
        
        if (detailCount !== summaryCount) {
           console.log(`❌ MISMATCH in ${cat.key}: Summary=${summaryCount}, Details=${detailCount}`);
        } else {
           console.log(`✅ MATCH in ${cat.key}: ${summaryCount}`);
        }
      } catch (e) {
         console.log(`Error checking ${cat.key} for ${regionName}: ${e.message}`);
      }
    }
  }
}

run();
