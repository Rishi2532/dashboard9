const http = require('http');

function fetchJson(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 400) {
                        reject(new Error(`Status ${res.statusCode}: ${data.substring(0, 200)}...`));
                    } else {
                        // Handle empty response
                        if (!data) return resolve({ headers: res.headers, data: null });
                        resolve({ headers: res.headers, data: JSON.parse(data) });
                    }
                } catch (e) {
                    reject(new Error(`Parse error: ${e.message}. Data: ${data.substring(0, 100)}...`));
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log('--- STARTING FILTER REPRODUCTION TEST ---');
        console.log('Step 1: Fetching sample data from /api/scheme-lpcd-data to identify valid Region/Circle...');

        // Note: The API might return a huge list, so we treat it carefully.
        // Ideally we'd use limit=1 but we don't know if limit is supported.
        // We'll just fetch and read first chunk? No, JSON parse will fail.
        // We'll fetch all... hopefully it's not > 100MB.

        const allDataRes = await fetchJson('/api/scheme-lpcd-data');
        const allData = allDataRes.data;

        if (!Array.isArray(allData)) {
            console.error('Response is not an array:', typeof allData);
            return;
        }

        console.log(`Fetched ${allData.length} total records.`);

        if (allData.length === 0) {
            console.log('No data found.');
            return;
        }

        // Find a region with multiple circles to be a good test candidate
        const regionMap = new Map(); // Region -> Set(Circles)

        for (const item of allData) {
            if (!item.region || !item.circle) continue;
            if (!regionMap.has(item.region)) {
                regionMap.set(item.region, new Set());
            }
            regionMap.get(item.region).add(item.circle);
        }

        // Find a region with > 1 circle
        let testRegion = null;
        let testCircle = null;

        for (const [region, circles] of regionMap.entries()) {
            if (circles.size > 1) {
                testRegion = region;
                testCircle = Array.from(circles)[0];
                break;
            }
        }

        if (!testRegion) {
            // Fallback to first available
            testRegion = allData[0].region;
            testCircle = allData[0].circle;
            console.log('WARNING: Could not find a region with multiple circles. Test might be inconclusive.');
        }

        console.log(`Step 2: Testing with Region: "${testRegion}" (Has ${regionMap.get(testRegion)?.size || 1} circles)`);
        console.log(`        Target Circle: "${testCircle}"`);

        // 1. Filter by Region
        const regionUrl = `/api/scheme-lpcd-data?region=${encodeURIComponent(testRegion)}`;
        console.log(`Fetching: ${regionUrl}`);
        const regionRes = await fetchJson(regionUrl);
        const regionData = regionRes.data;
        const regionCount = regionData.length;
        console.log(`Result: ${regionCount} records found for Region.`);

        // 2. Filter by Circle
        const circleUrl = `/api/scheme-lpcd-data?region=${encodeURIComponent(testRegion)}&circle=${encodeURIComponent(testCircle)}`;
        console.log(`Fetching: ${circleUrl}`);
        const circleRes = await fetchJson(circleUrl);
        const circleData = circleRes.data;

        // Print Debug Headers
        if (circleRes.headers['x-debug-query']) {
            console.log('--- DEBUG HEADERS ---');
            console.log('Query:', circleRes.headers['x-debug-query']);
        }
        const circleCount = circleData.length;
        console.log(`Result: ${circleCount} records found for Circle.`);

        // Print Debug Headers
        if (circleRes.headers['x-debug-query']) {
            console.log('--- DEBUG HEADERS ---');
            console.log('Query:', circleRes.headers['x-debug-query']);
        }


        console.log('--- ANALYSIS ---');
        if (circleCount < regionCount) {
            console.log('SUCCESS: Circle filter reduced the count (Correct behavior).');
            console.log(`Reduction: ${regionCount} -> ${circleCount}`);
        } else if (circleCount === regionCount) {
            const circlesInRegion = regionMap.get(testRegion)?.size || 0;
            if (circlesInRegion > 1) {
                console.log('FAILURE: Region has multiple circles but Circle filter returned same count as Region.');
                console.log('This indicates filtering is NOT working.');
            } else {
                console.log('INCONCLUSIVE: Region has only 1 circle, so counts match naturally.');
            }
        } else {
            console.log(`FAILURE: Circle count (${circleCount}) is greater than Region count (${regionCount})?? Impossible.`);
        }

        // Also test SimpleLpcdDashboard endpoint /api/water-scheme-data
        console.log('\n--- Testing /api/water-scheme-data (Simple Dashboard) ---');

        // 1. Filter by Region
        const wsRegionUrl = `/api/water-scheme-data?region=${encodeURIComponent(testRegion)}`;
        console.log(`Fetching: ${wsRegionUrl}`);
        const wsRegionRes = await fetchJson(wsRegionUrl);
        const wsRegionData = wsRegionRes.data;
        const wsRegionCount = wsRegionData?.length || 0;
        console.log(`Result: ${wsRegionCount} records.`);

        // 2. Filter by Circle
        const wsCircleUrl = `/api/water-scheme-data?region=${encodeURIComponent(testRegion)}&circle=${encodeURIComponent(testCircle)}`;
        console.log(`Fetching: ${wsCircleUrl}`);
        const wsCircleRes = await fetchJson(wsCircleUrl);
        const wsCircleData = wsCircleRes.data;
        const wsCircleCount = wsCircleData?.length || 0;
        console.log(`Result: ${wsCircleCount} records.`);

        if (wsCircleCount < wsRegionCount) {
            console.log('SUCCESS: /api/water-scheme-data filtering works.');
        } else {
            const circlesInRegion = regionMap.get(testRegion)?.size || 0;
            if (circlesInRegion > 1) {
                console.log('FAILURE: /api/water-scheme-data filtering failed (same count).');
            } else {
                console.log('INCONCLUSIVE: Single circle region.');
            }
        }

    } catch (error) {
        console.error('CRITICAL ERROR:', error.message);
    }
}

run();
