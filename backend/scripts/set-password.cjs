// Explicit operator command; bootstrap never creates or changes credentials.
const { connect } = require('./sqlserver-connection.cjs');
const bcrypt = require('bcryptjs');
const readline = require('node:readline');
require('dotenv').config({ quiet: true });

function hiddenPassword() {
  if (!process.stdin.isTTY) throw new Error('Use an interactive terminal or provide NEW_PASSWORD');
  process.stdout.write('New password (hidden): ');
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let password = '';
    const finish = () => { process.stdin.removeListener('keypress', onKey); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write('\n'); };
    const onKey = (text, key) => {
      if (key?.ctrl && key.name === 'c') { finish(); reject(new Error('Cancelled')); }
      else if (key?.name === 'return') { finish(); resolve(password); }
      else if (key?.name === 'backspace') password = password.slice(0, -1);
      else if (text && !/[\x00-\x1f\x7f]/.test(text)) password += text;
    };
    process.stdin.on('keypress', onKey);
  });
}

(async () => {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('Usage: npm run user:password -- user@example.com');
  const password = process.env.NEW_PASSWORD || await hiddenPassword();
  if (password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Use at least 12 characters and at most 72 UTF-8 bytes');
  const pool = await connect();
  try {
    const result = await pool.request().input('password', await bcrypt.hash(password, 12)).input('email', email).query(`
      SET NOCOUNT ON; SET XACT_ABORT ON; BEGIN TRANSACTION;
      DECLARE @changed TABLE(id uniqueidentifier);
      UPDATE dbo.users SET password_hash=@password,auth_version=auth_version+1,updated_at=SYSUTCDATETIME()
      OUTPUT inserted.id INTO @changed WHERE lower(email)=@email;
      UPDATE t SET used_at=SYSUTCDATETIME(),mail_payload=NULL,mail_state='CANCELLED'
      FROM dbo.password_reset_tokens t JOIN @changed c ON c.id=t.user_id WHERE t.used_at IS NULL;
      INSERT dbo.audit_logs(user_id,action,entity_type,new_data)
      SELECT id,'OPERATOR_PASSWORD_RESET','USER','{"sessionsRevoked":true,"source":"local_cli"}' FROM @changed;
      COMMIT; SELECT id FROM @changed;
    `);
    if (result.recordset.length !== 1) throw new Error('Account not found');
    console.log('Password updated. Existing sessions and recovery links were revoked; roles/status preserved.');
  } finally { await pool.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
