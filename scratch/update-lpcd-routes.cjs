const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../server/routes/scheme-lpcd-routes.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Inside scheme_aggregation, add MAX(ss.agency_type)
content = content.replace(/MAX\(ss\.mjp_commissioned\) as mjp_commissioned/g, 'MAX(ss.mjp_commissioned) as mjp_commissioned,\n            MAX(ss.agency_type) as agency_type');

// In the final SELECTs, they look like this:
//          dashboard_url,
//          mjp_commissioned
//        FROM scheme_aggregation
content = content.replace(/mjp_commissioned\s*\n\s*FROM/g, 'mjp_commissioned,\n          agency_type\n        FROM');

// Also update `dataHistory` route if it does not have agency_type
// It already selects ss.agency_type in `scheme_lpcd_data_history h LEFT JOIN scheme_status ss`
// But we should be careful not to double add if it already has it. The regex above won't hit it because it doesn't match `MAX(ss.mjp_commissioned)`.

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected agency_type to lpcd queries.');
