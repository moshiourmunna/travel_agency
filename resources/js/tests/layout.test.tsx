import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AdminLayout, { LanguageSwitcher, ThemeToggle } from '@/layouts/admin-layout';
import { page } from './inertia-mock';

describe('LanguageSwitcher', () => {
  it('lists enabled languages as /lang links and marks the current one', () => {
    page.props = { ...page.props, locale: 'bn' };
    render(<LanguageSwitcher />);
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/lang/en', '/lang/bn', '/lang/ar']);
    expect(screen.getByRole('link', { current: true })).toHaveAttribute('href', '/lang/bn');
  });
});

describe('ThemeToggle', () => {
  it('toggles the dark class and persists it', async () => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement).toHaveClass('dark');
    expect(localStorage.getItem('adm-theme')).toBe('dark');
    await userEvent.click(screen.getByRole('button'));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});

describe('AdminLayout', () => {
  it('hides module and owner-only links', () => {
    page.props = { ...page.props, modules: { agents: false, preregistration: false, visa: true, installments: true, blog: true }, auth: { user: { id: 2, name: 'Staff', email: 's@x', initials: 'S', role: 'staff', isOwner: false } } };
    render(<AdminLayout><p>content</p></AdminLayout>);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/admin/bookings');
    expect(hrefs).not.toContain('/admin/commissions');
    expect(hrefs).not.toContain('/admin/pre-registrations');
    expect(hrefs).not.toContain('/admin/audit-log');
    expect(screen.getByText('content')).toBeInTheDocument();
  });
  it('shows owner links, a skip link and RTL direction', () => {
    page.props = { ...page.props, dir: 'rtl', locale: 'ar' };
    render(<AdminLayout><p>x</p></AdminLayout>);
    expect(screen.getAllByRole('link').map((a) => a.getAttribute('href'))).toContain('/admin/audit-log');
    expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', '#main');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
  });
  it('opens the mobile drawer', async () => {
    render(<AdminLayout><p>x</p></AdminLayout>);
    await userEvent.click(screen.getByTestId('menu-toggle'));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
