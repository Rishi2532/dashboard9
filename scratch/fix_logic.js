import fs from 'fs';

const filePath = 'server/routes/filter-utils.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix for fully_completed_no
// We want to add: AND (s.water_supply_status IS NULL OR LOWER(s.water_supply_status) != 'full')
// after AND l.avg_lpcd = 0 in the second large block for fully_completed.

const lines = content.split('\n');
let foundIoT = false;
let updated = false;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('} else if (activeFilter === \'fully_completed\') {')) {
    foundIoT = true;
  }
  
  if (foundIoT && lines[i].includes('AND l.avg_lpcd = 0')) {
    // Check if this is the ONE we haven't updated yet.
    // The first and second one (commissioned) are already updated.
    // Wait, let's just search for the specific signature of the IoT No block.
    if (!lines[i+1].includes('water_supply_status')) {
      console.log(`Updating line ${i+1}`);
      lines[i] = lines[i] + "\n          AND (s.water_supply_status IS NULL OR LOWER(s.water_supply_status) != 'full')";
      updated = true;
      // Break after the first one we find that needs update
      // (The commissioned one is already updated so it won't match the condition line[i+1] doesn't include water_supply_status)
    }
  }
}

if (updated) {
  fs.writeFileSync(filePath, lines.join('\n'));
  console.log('Successfully updated filter-utils.ts');
} else {
  console.log('No updates needed or could not find targets.');
}
