// Public / user-facing REGRESSION suite (separate from the admin suite).
// Baseline screenshots + behaviour snapshots were recorded on the pre-React code (commit "admin v2 (blade)")
// and are compared on every run:  npx playwright test -c playwright.regression.config.js
// Re-record only intentionally:   npx playwright test -c playwright.regression.config.js --update-snapshots
const base = require('./playwright.config.js');
const path = require('path');
const baseline = process.env.REGRESSION_BASELINE || path.join(__dirname, 'regression', 'baseline');

module.exports = {
  ...base,
  testDir: './regression',
  reporter: [['list'], ['json', { outputFile: 'results/regression.json' }]],
  outputDir: 'results/regression-artifacts',
  snapshotPathTemplate: `${baseline}/{projectName}/{arg}{ext}`,
  expect: { ...base.expect, toHaveScreenshot: { maxDiffPixelRatio: 0.02, threshold: 0.25, animations: 'disabled', caret: 'hide', scale: 'css' } },
  updateSnapshots: process.env.UPDATE_BASELINE ? 'all' : 'none',
};
