/** Musafir frontend: Tailwind 3.4 using the shared mockup preset (pixel parity with the approved design). */
module.exports = {
  presets: [require('../packages/ui-tokens/tailwind.preset.cjs')],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './public/js/*.js'],
  // Gradient classes stored in the DB (gift-card designs, admin colour presets) are not in source files.
  safelist: [{ pattern: /^(from|via|to)-(brand|accent|ink|rose|emerald|sky|amber|violet)-(300|400|500|600|700|800|900)$/ }],
};
