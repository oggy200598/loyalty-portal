require('dotenv').config({ quiet: true });
(async () => {
  if (process.env.DB_MIGRATE_ON_START === 'true') {
    await require('./deploy-sqlserver.cjs').deploy();
  }
  require('../dist/src/main.js');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
