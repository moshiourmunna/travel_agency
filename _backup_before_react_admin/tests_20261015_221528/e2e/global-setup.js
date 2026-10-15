const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
module.exports = async () => {
  const root = path.resolve(__dirname, '../..');
  const db = path.join(root, 'database', 'e2e.sqlite');
  fs.writeFileSync(db, '');
  // Build .env.e2e from .env (separate SQLite DB, file sessions, no rate limits) so the real DB is never touched.
  const envFile = path.join(root, '.env.e2e');
  if (!fs.existsSync(envFile)) {
    const keep = fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter((l) => !/^(APP_ENV|APP_URL|APP_DEBUG|DB_CONNECTION|DB_DATABASE|SESSION_DRIVER|CACHE_STORE)=/.test(l));
    keep.push('APP_ENV=e2e', 'APP_DEBUG=true', 'APP_URL=http://127.0.0.1:8091', 'DB_CONNECTION=sqlite', `DB_DATABASE=${db.replace(/\\/g, '/')}`, 'SESSION_DRIVER=file', 'CACHE_STORE=file');
    fs.writeFileSync(envFile, keep.join('\n') + '\n');
  }
  execSync('php artisan migrate:fresh --seed --force --env=e2e', { cwd: root, stdio: 'inherit' });
  execSync('php artisan optimize:clear --env=e2e', { cwd: root, stdio: 'ignore' });
  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
};
