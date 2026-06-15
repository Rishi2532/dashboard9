import { runPiChlorineIngestion } from '../server/cron/pi-chlorine-ingestion';

async function run() {
  console.log("Starting script manually...");
  const result = await runPiChlorineIngestion();
  console.log("Result:", result);
  process.exit(0);
}
run();
