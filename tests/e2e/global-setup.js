const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pinEnv, ensureEnvFile, assertE2eDb } = require('./e2e-env');
module.exports = async () => {
  pinEnv();
  const root = path.resolve(__dirname, '../..');
  const db = path.join(root, 'database', 'e2e.sqlite');
  fs.writeFileSync(db, '');
  ensureEnvFile(); // .env.e2e (own SQLite DB) - normally already created by pinEnv() when the config loaded
  assertE2eDb(); // never wipe anything but database/e2e.sqlite
  execSync('php artisan migrate:fresh --seed --force --env=e2e', { cwd: root, stdio: 'inherit' });
  execSync('php artisan optimize:clear --env=e2e', { cwd: root, stdio: 'ignore' });
  fs.mkdirSync(path.join(__dirname, 'screenshots'), { recursive: true });
};
