// Safety net for the browser suites: every artisan call and the dev server MUST hit the throw-away e2e SQLite DB,
// never the developer's real database. Laravel's .env loader never overrides variables that already exist in the
// OS environment, so a stray APP_ENV / DB_* (e.g. APP_ENV=local) would silently make `php artisan serve` load .env.
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const e2eDb = path.join(root, 'database', 'e2e.sqlite');
const same = (a, b) => path.resolve(String(a)).replace(/\\/g, '/').toLowerCase() === path.resolve(String(b)).replace(/\\/g, '/').toLowerCase();

/** Pin APP_ENV=e2e for this process and its children; refuse to run with DB_* overrides in the OS environment. */
function pinEnv() {
  process.env.APP_ENV = 'e2e';
  const bad = Object.keys(process.env).filter((k) => /^DB_/i.test(k));
  if (bad.length) throw new Error(`Refusing to run e2e tests: ${bad.join(', ')} set in the environment would override .env.e2e. Unset them first.`);
}

/** Ask Laravel which database --env=e2e resolves to; abort unless it is the dedicated e2e SQLite file. */
function assertE2eDb() {
  pinEnv();
  const code = "echo json_encode([config('database.default'), config('database.connections.'.config('database.default').'.database')]);";
  const out = execFileSync('php', ['artisan', 'tinker', '--env=e2e', '--execute', code], { cwd: root, encoding: 'utf8' });
  let conn, db;
  try { [conn, db] = JSON.parse(out.trim().split(/\r?\n/).pop()); } catch { /* reported below */ }
  if (conn !== 'sqlite' || !db || !same(path.resolve(root, db), e2eDb)) {
    throw new Error(`Refusing to run e2e tests: --env=e2e resolves to ${out.trim()} instead of sqlite ${e2eDb}`);
  }
}

module.exports = { root, e2eDb, pinEnv, assertE2eDb };
