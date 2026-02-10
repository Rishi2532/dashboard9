async function run() {
    try {
        const res = await fetch('http://localhost:5000/api/chlorine/filters');
        console.log('Status:', res.status);
        const json = await res.json();
        console.log('Response JSON:', JSON.stringify(json, null, 2));
        console.log('\nRegions count:', json?.regions?.length || 0);
        console.log('Circles count:', json?.circles?.length || 0);
        console.log('Divisions count:', json?.divisions?.length || 0);
        console.log('Subdivisions count:', json?.subdivisions?.length || 0);
        console.log('Blocks count:', json?.blocks?.length || 0);
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
