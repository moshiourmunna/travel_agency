/** Musafir admin: Tailwind 3.4 + the shared mockup preset (same tokens as the public site). */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

export default {
    presets: [require('../packages/ui-tokens/tailwind.preset.cjs')],
    content: ['./resources/js/**/*.{ts,tsx}', './resources/views/admin/**/*.blade.php', './app/Admin/**/*.php'],
};
