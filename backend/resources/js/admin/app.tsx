import '../../css/admin.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';

const pages = import.meta.glob('./pages/**/*.tsx');

createInertiaApp({
    title: (title) => (title ? `${title} | Musafir Admin` : 'Musafir Admin'),
    resolve: async (name) => {
        const load = pages[`./pages/${name}.tsx`];
        if (!load) throw new Error(`Admin page not found: ${name}`);
        return ((await load()) as { default: never }).default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: '#14A497', showSpinner: false },
});
