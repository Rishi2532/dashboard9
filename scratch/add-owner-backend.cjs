const fs = require('fs');
const path = require('path');

const storagePath = path.join(__dirname, '../server/storage.ts');
let storage = fs.readFileSync(storagePath, 'utf8');

storage = storage.replace(/cd\.dashboard_url\n\s*FROM communication_status cs\n\s*LEFT JOIN chlorine_data cd ON \(/g, 
`cd.dashboard_url,\n            ss.agency_type as owner\n          FROM communication_status cs\n          LEFT JOIN chlorine_data cd ON (`);
storage = storage.replace(/AND EXTRACT\(DAY FROM \(CURRENT_TIMESTAMP - cs\.last_seen\)\)::integer >= \$\{days\}\n\s*\$\{regionFilter\}\n\s*\$\{schemeFilter\}\n\s*ORDER BY cs\.region/g, 
`AND EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.last_seen))::integer >= \${days}\n            \${regionFilter}\n            \${schemeFilter}\n          LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id\n          ORDER BY cs.region`);

storage = storage.replace(/cd\.dashboard_url\n\s*FROM sensor_streaks ss\n\s*JOIN communication_status cs ON \(/g, 
`cd.dashboard_url,\n            sch_stat.agency_type as owner\n          FROM sensor_streaks ss\n          JOIN communication_status cs ON (`);
storage = storage.replace(/AND ss\.esr_name = cd\.esr_name\n\s*\)\n\s*WHERE ss\.consecutive_days >= \$\{days\}\n\s*\$\{regionFilter\}\n\s*ORDER BY cs\.region/g, 
`AND ss.esr_name = cd.esr_name\n          )\n          LEFT JOIN scheme_status sch_stat ON ss.scheme_id = sch_stat.scheme_id\n          WHERE ss.consecutive_days >= \${days}\n            \${regionFilter}\n          ORDER BY cs.region`);

storage = storage.replace(/pd\.dashboard_url\n\s*FROM communication_status cs\n\s*LEFT JOIN pressure_data pd ON \(/g, 
`pd.dashboard_url,\n            ss.agency_type as owner\n          FROM communication_status cs\n          LEFT JOIN pressure_data pd ON (`);
storage = storage.replace(/AND EXTRACT\(DAY FROM \(CURRENT_TIMESTAMP - cs\.pressure_last_seen\)\)::integer >= \$\{days\}\n\s*\$\{regionFilter\}\n\s*\$\{schemeFilter\}\n\s*ORDER BY cs\.region/g, 
`AND EXTRACT(DAY FROM (CURRENT_TIMESTAMP - cs.pressure_last_seen))::integer >= \${days}\n            \${regionFilter}\n            \${schemeFilter}\n          LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id\n          ORDER BY cs.region`);

storage = storage.replace(/pd\.dashboard_url\n\s*FROM sensor_streaks ss\n\s*JOIN communication_status cs ON \(/g, 
`pd.dashboard_url,\n            sch_stat.agency_type as owner\n          FROM sensor_streaks ss\n          JOIN communication_status cs ON (`);
storage = storage.replace(/AND ss\.esr_name = pd\.esr_name\n\s*\)\n\s*WHERE ss\.consecutive_days >= \$\{days\}\n\s*\$\{regionFilter\}\n\s*ORDER BY cs\.region/g, 
`AND ss.esr_name = pd.esr_name\n          )\n          LEFT JOIN scheme_status sch_stat ON ss.scheme_id = sch_stat.scheme_id\n          WHERE ss.consecutive_days >= \${days}\n            \${regionFilter}\n          ORDER BY cs.region`);

fs.writeFileSync(storagePath, storage);

const chlorineRoutesPath = path.join(__dirname, '../server/routes/chlorine-routes.ts');
let chlorineRoutes = fs.readFileSync(chlorineRoutesPath, 'utf8');

chlorineRoutes = chlorineRoutes.replace(/cd\.dashboard_url\n\s*FROM communication_status cs\n\s*LEFT JOIN water_consumption wc ON \(/g, 
`cd.dashboard_url,\n        ss.agency_type as owner\n      FROM communication_status cs\n      LEFT JOIN water_consumption wc ON (`);
chlorineRoutes = chlorineRoutes.replace(/cs\.scheme_name = cd\.scheme_name AND\n\s*cs\.village_name = cd\.village_name AND\n\s*cs\.esr_name = cd\.esr_name\n\s*\)\n\s*WHERE/g, 
`cs.scheme_name = cd.scheme_name AND\n        cs.village_name = cd.village_name AND\n        cs.esr_name = cd.esr_name\n      )\n      LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id AND cs.scheme_name = ss.scheme_name\n      WHERE`);

// Update export query for division sensors
chlorineRoutes = chlorineRoutes.replace(/cd\.dashboard_url\n\s*FROM chlorine_data cd\n\s*WHERE LOWER\(cd\.division\) = LOWER\(\$\{division\}\)/g, `cd.dashboard_url,\n        ss.agency_type as owner\n      FROM chlorine_data cd\n      LEFT JOIN scheme_status ss ON cd.scheme_id = ss.scheme_id AND cd.scheme_name = ss.scheme_name\n      WHERE LOWER(cd.division) = LOWER(\${division})`);

fs.writeFileSync(chlorineRoutesPath, chlorineRoutes);

const pressureRoutesPath = path.join(__dirname, '../server/routes/pressure-routes.ts');
let pressureRoutes = fs.readFileSync(pressureRoutesPath, 'utf8');

pressureRoutes = pressureRoutes.replace(/pd\.dashboard_url\n\s*FROM pressure_data pd\n\s*WHERE LOWER\(pd\.division\) = LOWER\(\$\{division\}\)/g, 
`pd.dashboard_url,\n        ss.agency_type as owner\n      FROM pressure_data pd\n      LEFT JOIN scheme_status ss ON pd.scheme_id = ss.scheme_id AND pd.scheme_name = ss.scheme_name\n      WHERE LOWER(pd.division) = LOWER(\${division})`);

pressureRoutes = pressureRoutes.replace(/pd\.dashboard_url\n\s*FROM communication_status cs\n\s*LEFT JOIN pressure_data pd ON \(/g, 
`pd.dashboard_url,\n        ss.agency_type as owner\n      FROM communication_status cs\n      LEFT JOIN pressure_data pd ON (`);
pressureRoutes = pressureRoutes.replace(/cs\.scheme_name = pd\.scheme_name AND\n\s*cs\.village_name = pd\.village_name AND\n\s*cs\.esr_name = pd\.esr_name\n\s*\)\n\s*WHERE/g, 
`cs.scheme_name = pd.scheme_name AND\n        cs.village_name = pd.village_name AND\n        cs.esr_name = pd.esr_name\n      )\n      LEFT JOIN scheme_status ss ON cs.scheme_id = ss.scheme_id AND cs.scheme_name = ss.scheme_name\n      WHERE`);

// In division-sensors-export
pressureRoutes = pressureRoutes.replace(/({ header: 'Scheme Name', key: 'scheme_name', width: 30 },)/g, `$1\n      { header: 'Owner', key: 'owner', width: 15 },`);
pressureRoutes = pressureRoutes.replace(/scheme_name: row\.scheme_name,/g, `scheme_name: row.scheme_name,\n        owner: row.owner || 'N/A',`);

// In day-wise-sensors-export
pressureRoutes = pressureRoutes.replace(/({ header: 'Scheme Name', key: 'scheme_name', width: 30 },)/g, `$1\n      { header: 'Owner', key: 'owner', width: 15 },`);
pressureRoutes = pressureRoutes.replace(/scheme_name: sensor\.scheme_name,/g, `scheme_name: sensor.scheme_name,\n        owner: sensor.owner || 'N/A',`);


fs.writeFileSync(pressureRoutesPath, pressureRoutes);

console.log('Backend changes completed');
