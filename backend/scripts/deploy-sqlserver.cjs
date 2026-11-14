const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { connect, settings } = require('./sqlserver-connection.cjs');
require('dotenv').config({ quiet: true });
async function ensureDatabase(database) {
  settings(database); // Validate identifier before interpolation.
  const master = await connect('master');
  try { await master.request().input('name', database).query(`IF DB_ID(@name) IS NULL CREATE DATABASE [${database}]`); }
  finally { await master.close(); }
}
async function deploy(database = settings().config.database, through, seed = true) {
  // Managed Azure SQL databases are provisioned in the portal; no master permissions needed.
  if (process.env.SQLSERVER_SKIP_DATABASE_CREATE !== 'true') await ensureDatabase(database);
  const pool = await connect(database);
  try {
    await pool.request().query("IF OBJECT_ID('dbo.app_schema_migrations','U') IS NULL CREATE TABLE dbo.app_schema_migrations (name nvarchar(200) PRIMARY KEY, checksum varchar(64) NOT NULL, applied_at datetime2 NOT NULL DEFAULT SYSUTCDATETIME())");
    const base = path.resolve(__dirname, '../prisma/migrations-sqlserver');
    const files = fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name).sort();
    for (const name of files) {
      if (through && name > through) continue;
      const source = fs.readFileSync(path.join(base, name, 'migration.sql'), 'utf8');
      const checksum = createHash('sha256').update(source).digest('hex');
      const tx = pool.transaction(); await tx.begin();
      try {
        await tx.request().query("DECLARE @result int; EXEC @result=sp_getapplock @Resource='riskmind_migrations', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=10000; IF @result<0 THROW 51010, 'Cannot acquire migration lock', 1;");
        const previous = await tx.request().input('name', name).query('SELECT checksum FROM dbo.app_schema_migrations WHERE name=@name');
        if (previous.recordset.length) {
          if (previous.recordset[0].checksum !== checksum) throw new Error(`Applied migration changed: ${name}`);
        } else {
          for (const batch of source.split(/^\s*GO\s*$/im).filter(s => s.trim())) await tx.request().batch(batch);
          await tx.request().input('name', name).input('checksum', checksum).query('INSERT dbo.app_schema_migrations(name,checksum) VALUES(@name,@checksum)');
          console.log(`Applied SQL Server migration: ${name}`);
        }
        await tx.commit();
      } catch (error) { await tx.rollback().catch(() => {}); throw error; }
    }
    if (seed && !through) await pool.request().batch(fs.readFileSync(path.resolve(__dirname, '../prisma/sqlserver-default-policy.sql'), 'utf8'));
  } finally { await pool.close(); }
}
module.exports = { deploy, ensureDatabase };
if (require.main === module) deploy().then(() => console.log('SQL Server schema is up to date.')).catch(error => { console.error(error.message); process.exitCode = 1; });
