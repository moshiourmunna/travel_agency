import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ResourceForm from '@/pages/admin/resource/form';
import Settings from '@/pages/admin/settings';
import PilgrimForm from '@/pages/admin/pilgrims/form';
import BookingShow from '@/pages/admin/bookings/show';
import { calls, page } from './inertia-mock';

describe('Settings page', () => {
  const props = {
    languages: [{ code: 'en', native: 'English', dir: 'ltr', enabled: true, is_default: true }, { code: 'ar', native: 'العربية', dir: 'rtl', enabled: true, is_default: false }],
    modules: [{ key: 'blog', label: 'Blog', enabled: true }, { key: 'visa', label: 'Visa', enabled: false }],
    licences: [{ type: 'mora', label: 'MoRA', number: '1', valid_until: '', show: true }],
    settings: { phone: '1', email: 'a@b.c', address_en: 'x', hajj_date: '2027-05-15', qurbani_price: '1', insurance_price: '1', early_bird_discount: '0', hold_hours: '48', bank_details: '' },
  };
  it('sends module and language toggles as 1/0 strings via PUT', async () => {
    render(<Settings {...props} />);
    expect(screen.getByTestId('lang-en')).toBeDisabled();
    await userEvent.click(screen.getByTestId('module-blog'));
    await userEvent.click(screen.getByTestId('module-visa'));
    await userEvent.click(screen.getByTestId('lang-ar'));
    fireEvent.submit(screen.getByRole('button', { name: 'Save settings' }).closest('form')!);
    const c = calls.at(-1)!;
    expect(c).toMatchObject({ method: 'put', url: '/admin/settings' });
    expect(c.data).toMatchObject({ modules: { blog: '0', visa: '1' }, languages: { en: '1', ar: '0' }, default_language: 'en', licences: { mora: { show: '1' } } });
  });
});

describe('Resource form', () => {
  const fields = [
    { name: 'question', key: 'question', type: 'tr', label: 'Question', required: true, options: null, preview: null },
    { name: 'category', key: 'category', type: 'select', label: 'Category', required: true, options: [{ value: 'hajj', label: 'Hajj' }, { value: 'visa', label: 'Visa' }], preview: null },
    { name: 'image', key: 'image', type: 'image', label: 'Image', required: false, options: null, preview: '/img.jpg' },
    { name: 'is_active', key: 'is_active', type: 'checkbox', label: 'Active', required: false, options: null, preview: null },
  ];
  const languages = [{ code: 'en', native: 'English', dir: 'ltr' }, { code: 'ar', native: 'العربية', dir: 'rtl' }];
  it('edits translations per language and spoofs PUT with multipart', async () => {
    render(<ResourceForm resource="faqs" label="FAQ" id={7} fields={fields} values={{ question: { en: 'Q' }, category: 'hajj', image: null, is_active: true }} languages={languages} />);
    const ar = screen.getByRole('textbox', { name: 'Question (العربية)' });
    expect(ar).toHaveAttribute('dir', 'rtl');
    await userEvent.type(ar, 'سؤال');
    await userEvent.selectOptions(screen.getByLabelText(/Category/), 'visa');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Active' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!);
    const c = calls.at(-1)!;
    expect(c).toMatchObject({ method: 'post', url: '/admin/manage/faqs/7', options: { forceFormData: true } });
    expect(c.data).toMatchObject({ _method: 'put', question: { en: 'Q', ar: 'سؤال' }, category: 'visa', is_active: false });
  });
  it('shows server validation errors next to the field', () => {
    page.props = { ...page.props, errors: { 'question.en': 'The question field is required.' } };
    render(<ResourceForm resource="faqs" label="FAQ" id={null} fields={fields} values={{}} languages={languages} />);
    expect(screen.getByRole('alert')).toHaveTextContent('The question field is required.');
  });
});

describe('Pilgrim form', () => {
  it('keeps the pilgrim id and sends booleans as 1/0', async () => {
    const pilgrim = { id: 42, full_name: 'AYESHA', gender: 'female', dob: '', relation: '', phone: '', passport_no: '', passport_issue: '', passport_expiry: '', passport_place: '', nid: '', blood_group: '', medical_notes: '', needs_wheelchair: false, mahram_traveller_id: '', passport_verified: false };
    render(<PilgrimForm pilgrim={pilgrim} mahrams={[{ value: '5', label: 'HUSBAND (Husband)' }]} options={{ relations: [], blood: ['O+'] }} />);
    await userEvent.selectOptions(screen.getByLabelText('Mahram'), '5');
    await userEvent.click(screen.getByRole('checkbox', { name: /Wheelchair/ }));
    fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form')!);
    expect(calls.at(-1)).toMatchObject({ method: 'put', url: '/admin/pilgrims/42', data: { id: 42, mahram_traveller_id: '5', needs_wheelchair: 1, passport_verified: 0 } });
  });
});

describe('Booking show page', () => {
  const booking = {
    id: 1, ref: 'BHA-27-00342', type: 'hajj', customer: { id: 3, name: 'Md. Rahim', phone: '017', email: 'r@x' }, package: 'Standard Hajj 2027', room_type: 'quad', pax: 2,
    total: 1670000, paid: 492000, due: 1178000, progress: 29, status: 'docs_pending', status_label: 'Docs pending', status_tone: 'pen' as const, payment_status: 'partial', payment_status_label: 'Partially paid',
    payment_mode: 'installment', payment_mode_label: 'Installments', agent: null, created: '01 Sep 2026', trashed: false, subtotal: 1690000, discount: 20000, adults: 2, children: 0, payment_method: 'bkash',
    payment_method_label: 'bKash', package_departure: '01 May 2027', agent_info: null, agent_id: null, source: 'web', created_at: '01 Sep 2026', deleted_at: null, hold_expires_at: null, items: [], wheelchair: false,
    notes: null, admin_note: null, prereg: null, docs_total: 2, docs_ok: 1,
  };
  const props = {
    booking, pilgrims: [{ id: 9, traveller_id: 4, name: 'AYESHA', lead: false, gender: 'female', age: 40, passport: 'EB1', passport_expiry: '01 Jan 2027', passport_verified: false, passport_warn: true, needs_mahram: true, mahram: null,
      room_type: 'quad', price: 835000, ticket_no: null, govt_tracking_no: null, blood_group: null, wheelchair: false, medical_notes: null, documents: [{ id: 77, type: 'passport', status: 'pending', has_file: true, note: null }], visa: null }],
    payments: [{ id: 5, method: 'bkash', method_label: 'bKash', txn: 'TX1', amount: 392000, refunded: 0, status: 'paid', status_label: 'Paid', status_tone: 'ok' as const, date: '05 Oct 2026', note: null, has_slip: false, booking: null, recorder: null, refundable: 392000, refunds: [] }],
    installments: [{ id: 1, label: 'Installment 2', due: '01 Oct 2026', amount: 500000, status: 'pending', late: true }],
    open_installments: [{ id: 1, label: 'Installment 2', amount: 500000, due: '01 Oct' }], ledger: [], commissions: [], timeline: [{ id: 1, type: 'note', icon: '📝', from: null, to: null, message: 'Called', at: '01 Oct 2026 10:00', user: 'Admin' }],
    agents: [{ id: 1, code: 'AG-1', company: 'Al Noor' }],
    options: { statuses: [{ value: 'confirmed', label: 'Confirmed' }, { value: 'docs_pending', label: 'Docs pending' }], methods: [{ value: 'cash', label: 'Cash' }], visa_statuses: [{ value: 'approved', label: 'Approved' }] },
    defaults: { first_due: '2026-11-15', last_due: '2027-03-15', now: '2026-10-15T21:00' },
  };
  it('renders key facts and warnings', () => {
    render(<BookingShow {...props} />);
    expect(screen.getByRole('heading', { name: /BHA-27-00342/ })).toBeInTheDocument();
    expect(screen.getAllByText('৳ 16,70,000').length).toBeGreaterThan(0);
    expect(screen.getByText(/< 6 months validity/)).toBeInTheDocument();
    expect(screen.getByText(/Not linked/)).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Invoice/ })).toHaveAttribute('target', '_blank');
  });
  it('changes status, verifies a document and refunds (owner)', async () => {
    render(<BookingShow {...props} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'confirmed');
    await userEvent.click(screen.getByRole('button', { name: 'Update status' }));
    expect(calls.at(-1)).toMatchObject({ method: 'post', url: '/admin/bookings/BHA-27-00342/status', data: { status: 'confirmed' } });
    await userEvent.click(screen.getByRole('button', { name: 'Verify Passport' }));
    expect(calls.at(-1)).toMatchObject({ url: '/admin/documents/77/review', data: { status: 'verified' } });
    await userEvent.click(screen.getByRole('button', { name: /Refund/ }));
    const dlg = await screen.findByRole('dialog');
    await userEvent.type(within(dlg).getByLabelText(/Reason/), 'Medical');
    window.confirm = () => true;
    fireEvent.submit(within(dlg).getByRole('button', { name: 'Record refund' }).closest('form')!);
    expect(calls.at(-1)).toMatchObject({ method: 'post', url: '/admin/payments/5/refund', data: { amount: '392000', reason: 'Medical' } });
  });
  it('hides owner-only actions for staff and visa when module is off', () => {
    page.props = { ...page.props, auth: { user: { id: 2, name: 'S', email: null, initials: 'S', role: 'staff', isOwner: false } }, modules: { agents: false, visa: false, installments: true } };
    render(<BookingShow {...props} />);
    expect(screen.queryByRole('button', { name: /Refund/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('delete-trigger')).not.toBeInTheDocument();
    expect(screen.queryByText('Update visa')).not.toBeInTheDocument();
    expect(screen.queryByText(/Assign agent/)).not.toBeInTheDocument();
  });
});
