const http = require('http');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const tab of ['lpcd', 'chlorine', 'pressure', 'offline']) {
    const data = await fetchJson(`/api/alerts-progress/${tab}`);
    console.log(`\n=== TAB: ${tab} (Rows: ${data.length}) ===`);
    if (data.length > 0) {
      const first = data[0];
      const sms = first.sms_dispatches || [];
      console.log(`Scheme: ${first.scheme_name} (#${first.scheme_id})`);
      console.log(`SMS Dispatches count: ${sms.length}`);
      if (sms.length > 0) {
        console.log(`Templates in SMS:`, [...new Set(sms.map(s => s.template_name))]);
        console.log(`Engineers:`, sms.map(s => `${s.engineer_name} (${s.is_success ? 'Success' : 'Fail'})`));
      }
    }
  }
}

main().catch(console.error);
