import http from 'http';
import ExcelJS from 'exceljs';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/chlorine/overall-region-comparison/export/all_sensors?region=Nagpur&filterType=commissioned',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let chunks = [];
  res.on('data', (chunk) => {
    chunks.push(chunk);
  });
  
  res.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1); // Usually worksheet 1
      // The first row is the header, so the data rows = count - 1
      const rowCount = worksheet.rowCount;
      console.log(`Excel Export for Nagpur all_sensors has ${rowCount - 1} data rows.`);
      
      // Let's also check the API response for details to compare
      http.get('http://localhost:5000/api/chlorine/overall-region-comparison/details/all_sensors?region=Nagpur&filterType=commissioned', (res2) => {
        let rawData = '';
        res2.on('data', (chunk) => { rawData += chunk; });
        res2.on('end', () => {
          const parsedData = JSON.parse(rawData);
          console.log(`JSON Details API for Nagpur all_sensors returned ${parsedData.data.length} items.`);
          if ((rowCount - 1) === parsedData.data.length) {
              console.log("SUCCESS: Export row count exactly matches JSON detail list count.");
          } else {
              console.log("ERROR: Discrepancy between Export row count and JSON Detail list count!");
          }
        });
      });
      
    } catch(err) {
      console.error('Error parsing excel:', err);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.end();
