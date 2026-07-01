const http = require('http');

http.get('http://localhost:5000/api/chlorine/day-wise-breakdown', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log("Total items:", parsed.length);
      console.log("First 3 items:", JSON.stringify(parsed.slice(0, 3), null, 2));
    } catch (e) {
      console.log("Error parsing JSON. Raw data:", data.substring(0, 200));
    }
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
