// Shared by runtime, migration and test harness. Never prints credentials.
function settings(database = process.env.SQLSERVER_DATABASE || 'ecommerce_risk_sqlserver') {
  if (!/^[a-zA-Z][a-zA-Z0-9_]{0,100}$/.test(database)) throw new Error('Invalid SQL Server database name');
  if (process.env.SQLSERVER_AUTH === 'windows') {
    const server = process.env.SQLSERVER_SERVER || '.\\SQLEXPRESS';
    if (/[;{}]/.test(server)) throw new Error('Invalid SQL Server instance');
    return { driver: 'windows', config: { server, database, connectionString: `Driver={ODBC Driver 18 for SQL Server};Server=${server};Database=${database};Trusted_Connection=Yes;Encrypt=Yes;TrustServerCertificate=Yes;`, connectionTimeout: 10000, requestTimeout: 30000, options: { useUTC: true } } };
  }
  if (!process.env.SQLSERVER_SERVER || !process.env.SQLSERVER_USER || !process.env.SQLSERVER_PASSWORD) throw new Error('Configure SQLSERVER_SERVER, SQLSERVER_USER and SQLSERVER_PASSWORD, or SQLSERVER_AUTH=windows');
  return { driver: 'sql', config: { server: process.env.SQLSERVER_SERVER, port: Number(process.env.SQLSERVER_PORT || 1433), database, user: process.env.SQLSERVER_USER, password: process.env.SQLSERVER_PASSWORD, connectionTimeout: 10000, requestTimeout: 30000, options: { encrypt: true, trustServerCertificate: process.env.SQLSERVER_TRUST_CERTIFICATE === 'true', useUTC: true } } };
}
async function connect(database) {
  const { driver, config } = settings(database);
  const sql = require(driver === 'windows' ? 'mssql/msnodesqlv8' : 'mssql');
  const pool = new sql.ConnectionPool(config); pool.on('error', () => {});
  return pool.connect();
}
module.exports = { settings, connect };
