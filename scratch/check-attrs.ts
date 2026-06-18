import { getAllESRs, fetchWithRetry } from "./server/services/pi-web-api-service.ts";

async function checkAttrs() {
  const esrs = await getAllESRs("\\\\DemoAF\\JJM\\JJM\\Maharashtra");
  if (esrs.length > 0) {
    const webId = esrs[0].WebId;
    console.log(`Checking attributes for ${esrs[0].Path}...`);
    const attrsRes = await fetchWithRetry(`/elements/${webId}/attributes`);
    const items = attrsRes.data.Items;
    items.forEach((item: any) => {
      console.log(item.Name);
    });
  } else {
    console.log("No ESRs found.");
  }
  process.exit(0);
}

checkAttrs();
