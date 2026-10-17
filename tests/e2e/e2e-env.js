// Safety net for the browser suites: every artisan call and the dev server MUST hit the throw-away e2e SQLite DB,
// never the developer's real database. Laravel's .env loader never overrides variables that already exist in the
// OS environment, so a stray APP_ENV / DB_* (e.g. APP_ENV=local) would silently make `php artisan serve` load .env.
const { execFileSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const e2eDb = path.join(root, 'database', 'e2e.sqlite');
// Uploads, sessions, compiled views and logs of the e2e server go here instead of the real storage/ folder.
const e2eStorage = path.join(__dirname, '.storage');
const fs = require('fs');
const same = (a, b) => path.resolve(String(a)).replace(/\\/g, '/').toLowerCase() === path.resolve(String(b)).replace(/\\/g, '/').toLowerCase();

/**
 * Create .env.e2e (copy of .env with its own SQLite DB, file sessions/cache) if missing, and verify it points at e2eDb.
 * MUST run before Playwright starts the webServer (i.e. when the config is loaded): Playwright starts webServer BEFORE
 * globalSetup, and if .env.e2e is missing then `artisan serve --env=e2e` falls back to .env, putenv()s its DB_* values
 * and the `php -S` child inherits them as real OS variables (which no later .env.e2e can override) -> real database.
 */
function ensureEnvFile() {
  const envFile = path.join(root, '.env.e2e');
  if (!fs.existsSync(envFile)) {
    const keep = fs.readFileSync(path.join(root, '.env'), 'utf8').split(/\r?\n/).filter((l) => !/^\s*(APP_ENV|APP_URL|APP_DEBUG|DB_[A-Z_]+|SESSION_DRIVER|CACHE_STORE)\s*=/.test(l));
    keep.push('APP_ENV=e2e', 'APP_DEBUG=true', 'APP_URL=http://127.0.0.1:8091', 'DB_CONNECTION=sqlite', `DB_DATABASE=${e2eDb.replace(/\\/g, '/')}`, 'SESSION_DRIVER=file', 'CACHE_STORE=file');
    fs.writeFileSync(envFile, keep.join('\n') + '\n');
  }
  const vars = Object.fromEntries(fs.readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]));
  if (vars.DB_CONNECTION !== 'sqlite' || !vars.DB_DATABASE || !same(path.resolve(root, vars.DB_DATABASE), e2eDb) || vars.DB_URL) {
    throw new Error(`Refusing to run e2e tests: ${envFile} must set DB_CONNECTION=sqlite and DB_DATABASE=${e2eDb} (and no DB_URL).`);
  }
  if (!fs.existsSync(e2eDb)) fs.writeFileSync(e2eDb, '');
}

/** Pin APP_ENV=e2e for this process and its children; refuse to run with DB_* overrides in the OS environment. */
function pinEnv() {
  ensureEnvFile();
  process.env.APP_ENV = 'e2e';
  process.env.LARAVEL_STORAGE_PATH = e2eStorage;
  for (const d of ['app/private', 'app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'framework/testing', 'logs']) {
    fs.mkdirSync(path.join(e2eStorage, d), { recursive: true });
  }
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

module.exports = { root, e2eDb, e2eStorage, ensureEnvFile, pinEnv, assertE2eDb };
