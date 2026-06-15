import { findElementsByTemplate, getAttributeSummaryData } from '../server/services/pi-web-api-service';

async function test() {
  try {
    const defaultPath = "\\\\DemoAF\\JJM\\JJM\\Maharashtra";
    console.log("Finding villages...");
    // Let's just find 1 to test
    const villages = await findElementsByTemplate(defaultPath, "MJP Village Level - Active");
    const village = villages[0];
    console.log("Village Path:", village.Path);

    console.log("Fetching summary...");
    const waterPoints = await getAttributeSummaryData(village.WebId, 'Calc - Water Consumption per day', 7, 'Maximum');
    console.log("Summary success:", waterPoints.length);
    console.log(JSON.stringify(waterPoints, null, 2));

  } catch(e) {
    console.error(e.message);
  }
}

test();
