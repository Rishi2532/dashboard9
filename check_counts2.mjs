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

// Show distribution of lpcd_value_day7
const day7Values = data.map(s => Number(s.lpcd_value_day7));
const above55 = day7Values.filter(v => v >= 55).length;
const below55 = day7Values.filter(v => v < 55).length;
const zero = day7Values.filter(v => v === 0).length;

console.log('Using lpcd_value_day7 directly:');
console.log('  Above 55 (>= 55):', above55);
console.log('  Below 55 (< 55):', below55);
console.log('  Zero:', zero);

// Show some sample values
console.log('\nSample lpcd_value_day7 values (first 10):');
data.slice(0, 10).forEach(s => {
    console.log(`  ${s.scheme_name} (${s.region}): day7=${s.lpcd_value_day7}, total_water_day7=${s.total_water_day7}, population=${s.total_population}`);
});

// Compare with regional-stats API
const regional = await fetchJson('http://localhost:5000/api/chlorine/scheme-lpcd/regional-stats');
console.log('\nRegional Stats API response:');
regional.data.forEach(r => {
    console.log(`  ${r.region}: total=${r.totalSchemes}, above55=${r.schemesAbove55}, below55=${r.schemesBelow55}, noSupply=${r.schemesNoSupply}`);
});
