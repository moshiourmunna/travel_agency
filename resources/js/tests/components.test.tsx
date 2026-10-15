import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ConfirmDelete } from '@/components/admin/confirm-dialog';
import { DataTable, type Column } from '@/components/admin/data-table';
import { Field } from '@/components/admin/field';
import { Chips, FilterBar, FilterSelect, SearchInput, useFilters } from '@/components/admin/filters';
import { Pagination } from '@/components/admin/pagination';
import { PayStatus, StatusBadge } from '@/components/admin/status-badge';
import { Input } from '@/components/ui/input';
import { calls, page } from './inertia-mock';

type Row = { id: number; name: string; total: number };
const cols: Column<Row>[] = [
  { key: 'name', label: 'Name', sort: 'name', main: true, render: (r) => r.name },
  { key: 'total', label: 'Total', sort: 'total', align: 'end', render: (r) => r.total },
  { key: 'actions', label: 'Actions', actions: true, render: () => <button>Edit</button> },
];

describe('DataTable', () => {
  it('renders rows with data-label for mobile cards', () => {
    render(<DataTable columns={cols} rows={[{ id: 1, name: 'Rahim', total: 5 }]} rowKey={(r) => r.id} caption="People" />);
    const cell = screen.getByText('Rahim').closest('td')!;
    expect(cell).toHaveAttribute('data-label', 'Name');
    expect(cell).toHaveClass('cell-main');
    expect(screen.getByRole('button', { name: 'Edit' }).closest('td')).toHaveAttribute('data-label', '');
    expect(screen.getByRole('table', { name: 'People' })).toBeInTheDocument();
  });
  it('shows the empty state', () => {
    render(<DataTable columns={cols} rows={[]} rowKey={(r) => r.id} empty="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
  it('marks the sorted column and toggles the server sort', async () => {
    render(<DataTable columns={cols} rows={[]} rowKey={(r) => r.id} sort="total" dir="desc" />);
    expect(screen.getByRole('columnheader', { name: /Total/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.getByRole('columnheader', { name: /Name/ })).not.toHaveAttribute('aria-sort');
    await userEvent.click(screen.getByRole('button', { name: /Total/ }));
    expect(calls.at(-1)!.url).toBe('/admin?sort=total&dir=asc');
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(calls.at(-1)!.url).toBe('/admin?sort=name&dir=desc');
  });
});

describe('Pagination', () => {
  const meta = { current_page: 2, last_page: 5, per_page: 20, total: 90, from: 21, to: 40 };
  it('renders summary, current page and prev/next', () => {
    render(<Pagination meta={meta} />);
    expect(screen.getByText('Showing 21–40 of 90')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/admin?page=1');
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/admin?page=3');
  });
  it('uses a custom page param', () => {
    render(<Pagination meta={meta} param="ip" />);
    expect(screen.getByRole('link', { name: '5' })).toHaveAttribute('href', '/admin?ip=5');
  });
  it('renders nothing for empty results', () => {
    const { container } = render(<Pagination meta={{ ...meta, total: 0 }} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('StatusBadge / PayStatus', () => {
  it('maps tones and translates', () => {
    page.props = { ...page.props, t: { Confirmed: 'নিশ্চিত' } };
    render(<><StatusBadge status="confirmed" /><StatusBadge status="cancelled" label="Cancelled" /><PayStatus status="overdue" label="Overdue" /></>);
    expect(screen.getByText('নিশ্চিত').className).toMatch(/emerald|ok/);
    expect(screen.getByText('Cancelled').className).toMatch(/red|no/);
    expect(screen.getByText('Overdue').className).toMatch(/red|no/);
  });
  it('humanises unknown statuses', () => {
    render(<StatusBadge status="docs_pending" />);
    expect(screen.getByText('Docs pending')).toBeInTheDocument();
  });
});

describe('Field', () => {
  it('links label, control and error accessibly', () => {
    render(<Field label="Phone" error="Invalid phone" required><Input name="phone" /></Field>);
    const input = screen.getByLabelText(/Phone/);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAccessibleDescription('Invalid phone');
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid phone');
  });
  it('shows hint when no error', () => {
    render(<Field label="Name" hint="As in passport"><Input /></Field>);
    expect(screen.getByText('As in passport')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid');
  });
});

function FilterHarness() {
  const f = useFilters({ q: '', status: '' });
  return (
    <FilterBar onSubmit={() => f.apply()} onReset={f.reset} dirty>
      <SearchInput value={f.values.q} onChange={(x) => f.set('q', x)} placeholder="Search bookings" />
      <FilterSelect value={f.values.status} onChange={(x) => f.apply({ status: x })} options={[{ value: 'paid', label: 'Paid' }]} placeholder="All statuses" />
    </FilterBar>
  );
}

describe('Filters', () => {
  it('submits search to the server and applies selects immediately', async () => {
    render(<FilterHarness />);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search bookings' }), 'Rahim');
    await userEvent.click(screen.getByRole('button', { name: 'Filter' }));
    expect(calls.at(-1)).toMatchObject({ method: 'get', url: '/admin', data: { q: 'Rahim' } });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'All statuses' }), 'paid');
    expect(calls.at(-1)!.data).toEqual({ q: 'Rahim', status: 'paid' });
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(calls.at(-1)).toMatchObject({ url: '/admin', data: {} });
  });
  it('chips mark the active filter', () => {
    render(<Chips items={[{ label: 'All', params: {}, active: false }, { label: 'Paid', params: { status: 'paid' }, active: true }]} />);
    expect(screen.getByRole('link', { name: 'Paid', current: true })).toBeInTheDocument();
    expect(screen.getByText('Paid').closest('a')).toHaveAttribute('href', '/admin?status=paid');
  });
});

describe('ConfirmDelete', () => {
  it('requires the checkbox and sends confirm=1 with reason via DELETE', async () => {
    render(<ConfirmDelete action="/admin/bookings/BHA-1" reason />);
    await userEvent.click(screen.getByTestId('delete-trigger'));
    const dlg = await screen.findByRole('dialog');
    const submit = within(dlg).getByRole('button', { name: 'Confirm delete' });
    expect(submit).toBeDisabled();
    await userEvent.type(within(dlg).getByRole('textbox', { name: 'Reason (optional)' }), 'Duplicate');
    await userEvent.click(within(dlg).getByRole('checkbox'));
    expect(submit).toBeEnabled();
    fireEvent.submit(submit.closest('form')!);
    expect(calls.at(-1)).toMatchObject({ method: 'delete', url: '/admin/bookings/BHA-1', data: { confirm: '1', reason: 'Duplicate' } });
  });
  it('can be cancelled with Escape without sending', async () => {
    render(<ConfirmDelete action="/x" />);
    await userEvent.click(screen.getByTestId('delete-trigger'));
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });
});
