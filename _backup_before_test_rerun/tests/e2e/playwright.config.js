// Browser tests: headless Chrome against `php artisan serve --env=e2e` on a freshly seeded SQLite DB.
// Run from this folder:  npm install && npx playwright test   (needs Chrome; set CHROME_PATH or use `npx playwright install chromium`)
const { defineConfig } = require('@playwright/test');
const fs = require('fs');
require('./e2e-env').pinEnv(); // APP_ENV=e2e for the dev server + every artisan child process
const chrome = process.env.CHROME_PATH || ['/usr/bin/google-chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const vp = (w) => ({ width: w, height: w < 500 ? 780 : w < 1000 ? 1024 : w < 1500 ? 800 : 1080 });

module.exports = defineConfig({
  testDir: './specs',
  timeout: 300_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/results.json' }]],
  outputDir: 'results/artifacts',
  globalSetup: require.resolve('./global-setup.js'),
  use: { actionTimeout: 15_000, navigationTimeout: 30_000, baseURL: 'http://127.0.0.1:8091', headless: true, launchOptions: chrome ? { executablePath: chrome } : {}, trace: 'retain-on-failure', screenshot: 'only-on-failure', locale: 'en-US', timezoneId: 'Asia/Dhaka' },
  projects: [360, 768, 1280, 1920].map((w) => ({ name: `w${w}`, use: { viewport: vp(w), isMobile: w < 500, hasTouch: w < 500 } })),
  webServer: { command: 'php artisan serve --env=e2e --port=8091 --no-reload', cwd: '../..', url: 'http://127.0.0.1:8091/up', reuseExistingServer: false, timeout: 60_000, stdout: 'ignore', stderr: 'pipe', env: { APP_ENV: 'e2e' } },
});
