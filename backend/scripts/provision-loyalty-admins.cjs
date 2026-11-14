// Explicit local demo provisioning; credentials are random, local-only and never printed.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { connect } = require('./sqlserver-connection.cjs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ quiet: true });
(async () => {
  if (process.argv[2] !== '--demo') throw new Error('Usage: npm run loyalty:admins -- --demo (local demo accounts only)');
  const destination = path.resolve(__dirname, '../.local/loyalty-admins.json');
  const pool = await connect(); let tx, written = false;
  try {
    if (fs.existsSync(destination)) {
      const saved = JSON.parse(fs.readFileSync(destination, 'utf8'));
      if (!Array.isArray(saved.accounts) || saved.accounts.length !== 2 || saved.accounts[0].email === saved.accounts[1].email) throw new Error('Invalid local credential file');
      for (const account of saved.accounts) {
        const found = await pool.request().input('email', account.email).query("SELECT u.password_hash FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.email=@email AND u.status='ACTIVE' AND r.name='ADMIN'");
        if (found.recordset.length !== 1 || !(await bcrypt.compare(account.password, found.recordset[0].password_hash))) throw new Error('Saved demo account no longer matches. No account was changed.');
      }
      console.log('Both demo admins already exist. Credentials preserved in backend/.local/loyalty-admins.json.'); return;
    }
    const accounts = [1, 2].map(n => ({ id: randomUUID(), email: `loyalty-admin${n}@riskmind.local`, name: `Loyalty Admin ${n}`, password: randomBytes(24).toString('base64url') }));
    tx = pool.transaction(); await tx.begin();
    let role = await tx.request().query("SELECT id FROM roles WHERE name='ADMIN'");
    if (!role.recordset.length) role = await tx.request().query("INSERT roles(name) OUTPUT inserted.id VALUES('ADMIN')");
    for (const account of accounts) {
      // Plain INSERT intentionally refuses to overwrite or elevate an existing account.
      await tx.request().input('id', account.id).input('email', account.email).input('name', account.name).input('password', await bcrypt.hash(account.password, 12)).query('INSERT users(id,email,full_name,password_hash) VALUES(@id,@email,@name,@password)');
      await tx.request().input('id', account.id).input('role', role.recordset[0].id).query('INSERT user_roles(user_id,role_id) VALUES(@id,@role)');
      await tx.request().input('id', account.id).input('data', JSON.stringify({ email: account.email, purpose: 'local demo' })).query("INSERT audit_logs(user_id,action,entity_type,new_data) VALUES(@id,'DEMO_ADMIN_PROVISIONED','LOYALTY_ADMIN',@data)");
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify({ purpose: 'Local demo only; never commit or upload', accounts }, null, 2), { flag: 'wx', mode: 0o600 }); written = true;
    await tx.commit(); written = false;
    console.log('Created two distinct local demo admins. Credentials: backend/.local/loyalty-admins.json (gitignored). No existing accounts were changed.');
  } catch (error) {
    if (tx) await tx.rollback().catch(() => {});
    if (written) fs.unlinkSync(destination);
    throw error;
  } finally { await pool.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
