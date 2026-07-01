import { storage } from '../server/storage.js';

async function main() {
  console.time('query');
  try {
    const res = await storage.getChlorineSensorsByDayWiseCriteria('optimal_0_2_0_5', 5);
    console.log('Rows:', res.length);
  } catch(e) {
    console.error(e);
  }
  console.timeEnd('query');
  process.exit(0);
}

main();
