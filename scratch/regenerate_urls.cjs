
const { regenerateAllDashboardUrls } = require('../server/auto-generate-dashboard-urls');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  try {
    console.log('🚀 Starting forced regeneration of all dashboard URLs...');
    const results = await regenerateAllDashboardUrls();
    console.log('✅ Regeneration completed!');
    console.log('Results:', results);
  } catch (error) {
    console.error('❌ Regeneration failed:', error);
  } finally {
    process.exit(0);
  }
}

run();
