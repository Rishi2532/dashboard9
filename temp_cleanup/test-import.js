// Test CommonJS import of pg module
console.log('Testing pg module import in CommonJS');

try {
  // Try to import pg in CommonJS style
  const pg = require('pg');
  console.log('✅ Successfully imported pg module');
  
  // Check if Pool is available
  if (pg.Pool) {
    console.log('✅ Pool class is available');
  } else {
    console.error('❌ Pool class is NOT available in pg module!');
  }
  
  // Print version
  console.log('pg module version:', pg.version);
  console.log('pg module exports:', Object.keys(pg));
} catch (error) {
  console.error('❌ Error importing pg module:', error.message);
}