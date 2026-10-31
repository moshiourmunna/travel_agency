import '../../css/admin.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import Layout from './components/Layout';

const pages = import.meta.glob('./pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} · Musafir Admin` : 'Musafir Admin'),
    resolve: async (name) => {
        const load = pages[`./pages/${name}.tsx`];
        if (!load) throw new Error(`Admin page not found: ${name}`);
        const mod = (await load()) as { default: any };
        const page = mod.default;
        if (page.layout === undefined && !name.startsWith('Auth/') && name !== 'Health') {
            page.layout = (p: ReactNode) => <Layout>{p}</Layout>;
        }
        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#14A497', showSpinner: false },
});
