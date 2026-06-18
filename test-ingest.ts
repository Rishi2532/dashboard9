import { runPiRealtimeValuesIngestion } from './server/cron/pi-realtime-values.ts';

async function run() {
  console.log("Starting realtime values ingestion test...");
  await runPiRealtimeValuesIngestion();
  console.log("Finished!");
}

run();
