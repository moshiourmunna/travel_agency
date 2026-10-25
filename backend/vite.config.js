import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
    plugins: [
        laravel({ input: ['resources/js/admin/app.tsx'], refresh: true }),
        react(),
    ],
    resolve: { alias: { '@': fileURLToPath(new URL('./resources/js/admin', import.meta.url)) } },
    build: { chunkSizeWarningLimit: 900 },
    server: { watch: { ignored: ['**/storage/framework/views/**'] } },
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./resources/js/admin/tests/setup.ts'],
        include: ['resources/js/**/*.test.{ts,tsx}'],
        css: false,
    },
});
