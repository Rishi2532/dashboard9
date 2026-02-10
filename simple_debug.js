async function run() {
    try {
        const res = await fetch('http://localhost:5000/api/chlorine/filters');
        console.log('Status:', res.status);
        console.log('Headers:', JSON.stringify([...res.headers]));
        const text = await res.text();
        console.log('Body start:', text.substring(0, 200));
    } catch (e) {
        console.error(e);
    }
}
run();
