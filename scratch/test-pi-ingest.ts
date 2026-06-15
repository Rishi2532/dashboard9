import { runPiChlorineIngestion } from '../server/cron/pi-chlorine-ingestion';

async function run() {
  const pathsToTry = [
    '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Ahmednagar\\\\Division-Ahmednagar\\\\Sub Division-Newasa\\\\Block-Shevgaon\\\\Scheme-20029079 - Retro.Bodhegaon and 7 villages RRWSS. Ta. Shevgaon\\\\Chapadgaon',
    '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Ahmednagar\\\\Division-Ahmednagar ZP\\\\Sub Division-Newasa\\\\Block-Shevgaon\\\\Scheme-20029079 - Retro.Bodhegaon and 7 villages RRWSS. Ta. Shevgaon\\\\Chapadgaon',
    '\\\\DemoAF\\\\JJM\\\\JJM\\\\Maharashtra\\\\Region-Nashik\\\\Circle-Ahmednagar\\\\Division-Ahmednagar MJP\\\\Sub Division-Newasa\\\\Block-Shevgaon\\\\Scheme-20029079 - Retro.Bodhegaon and 7 villages RRWSS. Ta. Shevgaon\\\\Chapadgaon'
  ];

  for (const p of pathsToTry) {
     console.log("Trying:", p);
     const res = await runPiChlorineIngestion(p);
     if (res && res.processed > 0) {
        console.log("SUCCESS!");
        process.exit(0);
     }
  }
  console.log("None worked.");
  process.exit(1);
}

run();
