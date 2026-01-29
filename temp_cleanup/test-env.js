// Simple script to check environment variables
console.log('Checking environment variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');
console.log('PGHOST:', process.env.PGHOST ? process.env.PGHOST : 'Not found');
console.log('PGUSER:', process.env.PGUSER ? process.env.PGUSER : 'Not found');
console.log('PGDATABASE:', process.env.PGDATABASE ? process.env.PGDATABASE : 'Not found');