import { Head, useForm } from '@inertiajs/react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import { Input } from '@/fields/basic';

type Props = { profile: { name: string; email: string; phone: string | null; title: string | null; branch: string | null; role: string | null; last_login_at: string | null }; logins: { at: string; ip: string; agent: string; success: boolean; guard: string }[] };

export default function Profile({ profile, logins }: Props) {
  const { t } = useT();
  const url = useAdminUrl();
  const info = useForm({ name: profile.name, phone: profile.phone ?? '' });
  const pw = useForm({ current_password: '', password: '', password_confirmation: '' });
  return (
    <>
      <Head title={t('My profile', 'আমার প্রোফাইল')} />
      <PageHeader title={t('My profile', 'আমার প্রোফাইল')} subtitle={`${profile.email} · ${profile.role ?? ''}`} crumbs={[[t('My profile', 'আমার প্রোফাইল')]]} icon="user" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title={t('Details', 'তথ্য')}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); info.put(url('/profile'), { preserveScroll: true }); }}>
            <Input label={t('Full name', 'পূর্ণ নাম')} value={info.data.name} onChange={(v) => info.setData('name', v)} error={info.errors.name} required />
            <Input label={t('Mobile', 'মোবাইল')} value={info.data.phone} onChange={(v) => info.setData('phone', v)} error={info.errors.phone} />
            <p className="text-sm muted">{profile.title} · {profile.branch}</p>
            <button className="btn btn-primary btn-sm" disabled={info.processing}>{info.processing ? <Spinner /> : null}{t('Save', 'সংরক্ষণ')}</button>
          </form>
        </Card>
        <Card title={t('Change password', 'পাসওয়ার্ড পরিবর্তন')}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); pw.put(url('/profile/password'), { preserveScroll: true, onSuccess: () => pw.reset() }); }}>
            <Input type="password" label={t('Current password', 'বর্তমান পাসওয়ার্ড')} value={pw.data.current_password} onChange={(v) => pw.setData('current_password', v)} error={pw.errors.current_password} autoComplete="current-password" required />
            <Input type="password" label={t('New password', 'নতুন পাসওয়ার্ড')} value={pw.data.password} onChange={(v) => pw.setData('password', v)} error={pw.errors.password} autoComplete="new-password" required help={t('At least 8 characters with letters and numbers.', 'কমপক্ষে ৮ অক্ষর, অক্ষর ও সংখ্যা সহ।')} />
            <Input type="password" label={t('Repeat new password', 'নতুন পাসওয়ার্ড আবার')} value={pw.data.password_confirmation} onChange={(v) => pw.setData('password_confirmation', v)} autoComplete="new-password" required />
            <button className="btn btn-primary btn-sm" disabled={pw.processing}>{pw.processing ? <Spinner /> : null}{t('Update password', 'পাসওয়ার্ড হালনাগাদ')}</button>
          </form>
        </Card>
        <Card title={t('Recent sign-ins', 'সাম্প্রতিক সাইন-ইন')} className="lg:col-span-2" pad={false}>
          <div className="overflow-x-auto"><table className="table">
            <thead><tr><th>{t('When', 'কখন')}</th><th>IP</th><th>{t('Device', 'ডিভাইস')}</th><th>{t('Result', 'ফলাফল')}</th></tr></thead>
            <tbody>{logins.map((l, i) => <tr key={i}><td className="whitespace-nowrap">{l.at}</td><td>{l.ip}</td><td className="max-w-md truncate text-xs muted">{l.agent}</td><td>{l.success ? <span className="badge badge-green">OK</span> : <span className="badge badge-red">{t('Failed', 'ব্যর্থ')}</span>}</td></tr>)}</tbody>
          </table></div>
        </Card>
      </div>
    </>
  );
}
