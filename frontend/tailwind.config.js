/** Musafir frontend: Tailwind 3.4 using the shared mockup preset (pixel parity with the approved design). */
module.exports = {
  presets: [require('../packages/ui-tokens/tailwind.preset.cjs')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './public/js/*.js'],
};
