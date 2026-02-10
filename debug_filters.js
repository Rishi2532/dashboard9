const http = require('http');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.error(`Error parsing JSON from ${url}:`, data.substring(0, 100));
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log('Fetching /api/chlorine/filters...');
        const chlorineFilters = await fetchUrl('http://localhost:5000/api/chlorine/filters');
        console.log('Chlorine Filters keys:', chlorineFilters ? Object.keys(chlorineFilters) : 'null');
        console.log('Chlorine Regions:', chlorineFilters?.regions?.length);
        console.log('Chlorine Circles:', chlorineFilters?.circles?.length);

        console.log('\nFetching /api/schemes/filters...');
        const schemeFilters = await fetchUrl('http://localhost:5000/api/schemes/filters');
        console.log('Scheme Filters keys:', schemeFilters ? Object.keys(schemeFilters) : 'null');
        console.log('Scheme Regions:', schemeFilters?.regions?.length);
        console.log('Scheme Circles:', schemeFilters?.circles?.length);

    } catch (err) {
        console.error('Error:', err);
    }
}

run();
