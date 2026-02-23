import http from 'http';

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
    });
}

function getLatestLpcdValue(scheme) {
    for (const day of [7, 6, 5, 4, 3, 2, 1]) {
        const value = scheme[`lpcd_value_day${day}`];
        if (value !== undefined && value !== null && value !== '' && !isNaN(Number(value))) {
            return Number(value);
        }
    }
    return null;
}

const data = await fetchJson('http://localhost:5000/api/scheme-lpcd-data');
console.log('Total records from API:', data.length);

// Deduplicate by scheme_name (as the dashboard does)
const seenNames = new Set();
const uniqueSchemes = [];
data.forEach(scheme => {
    if (!seenNames.has(scheme.scheme_name)) {
        seenNames.add(scheme.scheme_name);
        uniqueSchemes.push(scheme);
    }
});
console.log('Unique schemes (by scheme_name):', uniqueSchemes.length);

let above55 = 0, below55 = 0, nullCount = 0;
const byRegion = {};

uniqueSchemes.forEach(scheme => {
    const lpcd = getLatestLpcdValue(scheme);
    const region = scheme.region || 'Unknown';
    if (!byRegion[region]) byRegion[region] = { total: 0, above55: 0, below55: 0, nullCount: 0 };
    byRegion[region].total++;

    if (lpcd !== null && lpcd >= 55) {
        above55++;
        byRegion[region].above55++;
    } else if (lpcd !== null) {
        below55++;
        byRegion[region].below55++;
    } else {
        nullCount++;
        byRegion[region].nullCount++;
    }
});

console.log('\n=== TOTALS (matching SchemeLpcdDashboard logic) ===');
console.log('Above 55 (>= 55):', above55);
console.log('Below 55 (< 55, not null):', below55);
console.log('Null LPCD (no data):', nullCount);

console.log('\n=== BY REGION ===');
Object.keys(byRegion).sort().forEach(region => {
    const r = byRegion[region];
    console.log(`${region}: total=${r.total}, above55=${r.above55}, below55=${r.below55}, null=${r.nullCount}`);
});
