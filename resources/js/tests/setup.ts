import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import { calls, page, baseProps } from './inertia-mock';
vi.mock('@inertiajs/react', async () => (await import('./inertia-mock')).inertiaMock());
afterEach(() => cleanup());
beforeEach(() => { calls.length = 0; page.props = baseProps(); window.history.replaceState({}, '', '/admin'); });
