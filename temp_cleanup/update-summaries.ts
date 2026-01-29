import { updateRegionSummaries } from './server/db';

async function runUpdate() {
  try {
    console.log('Updating region summaries...');
    await updateRegionSummaries();
    console.log('Update completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

runUpdate();