import '../css/admin.css';
import { createInertiaApp } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import AdminLayout from '@/layouts/admin-layout';

const pages = import.meta.glob('./pages/**/*.tsx');

createInertiaApp({
  title: (title) => (title ? `${title} | Admin` : 'Admin'),
  resolve: async (name) => {
    const load = pages[`./pages/${name}.tsx`];
    if (!load) throw new Error(`Page not found: ${name}`);
    const mod = (await load()) as { default: { layout?: unknown } };
    mod.default.layout ??= [AdminLayout];
    return mod.default as never;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: { color: '#c9962e', showSpinner: false },
});
