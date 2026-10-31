import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Card, PageHeader, Spinner } from '@/components/ui';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import { Input } from '@/fields/basic';

type TwoFactor = { enabled: boolean; required: boolean; recovery_left: number };
type Props = { two_factor: TwoFactor; profile: { name: string; email: string; phone: string | null; title: string | null; branch: string | null; role: string | null; last_login_at: string | null }; logins: { at: string; ip: string; agent: string; success: boolean; guard: string }[] };

export default function Profile({ profile, logins, two_factor }: Props) {
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
        <TwoFactorCard tf={two_factor} />
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

/** Authenticator-app (TOTP) set-up: password → QR + secret → confirm with a code → recovery codes shown once. */
function TwoFactorCard({ tf }: { tf: TwoFactor }) {
  const { t } = useT();
  const url = useAdminUrl();
  const flash = (usePage().props as any).flash ?? {};
  const setup = flash.two_factor_setup as { secret: string; qr: string } | undefined;
  const codes = flash.recovery_codes as string[] | undefined;
  const [mode, setMode] = useState<'' | 'enable' | 'disable' | 'recovery'>('');
  const pw = useForm({ password: '' });
  const conf = useForm({ code: '' });
  const ask = (m: typeof mode) => { pw.reset(); pw.clearErrors(); setMode(m); };
  const submitPw = (e: React.FormEvent) => {
    e.preventDefault();
    const o = { preserveScroll: true, onSuccess: () => { pw.reset(); setMode(''); } };
    if (mode === 'enable') pw.post(url('/profile/two-factor'), o);
    else if (mode === 'recovery') pw.post(url('/profile/two-factor/recovery'), o);
    else if (mode === 'disable') pw.delete(url('/profile/two-factor'), o);
  };
  return (
    <Card title={t('Two-step sign-in', 'দুই-ধাপ সাইন-ইন')} className="lg:col-span-2">
      <div className="space-y-4" data-2fa-card={tf.enabled ? 'on' : 'off'}>
        <p className="text-sm">
          {tf.enabled
            ? <><span className="badge badge-green mr-2">{t('On', 'চালু')}</span>{t('An authenticator app code is asked for after your password.', 'পাসওয়ার্ডের পর অথেনটিকেটর অ্যাপের কোড চাওয়া হয়।')} {t('Recovery codes left:', 'বাকি রিকভারি কোড:')} {tf.recovery_left}</>
            : <><span className="badge badge-gray mr-2">{t('Off', 'বন্ধ')}</span>{t('Protect your account with Google Authenticator, Microsoft Authenticator, 1Password or any TOTP app.', 'Google Authenticator, Microsoft Authenticator, 1Password বা যেকোনো TOTP অ্যাপ দিয়ে অ্যাকাউন্ট সুরক্ষিত করুন।')}</>}
          {tf.required ? <span className="ml-2 badge badge-gold">{t('Required for your role', 'আপনার রোলে বাধ্যতামূলক')}</span> : null}
        </p>
        {codes?.length ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20" data-recovery-codes>
            <p className="text-sm font-semibold">{t('Save these recovery codes now — each works once if you lose your phone. They will not be shown again.', 'এই রিকভারি কোডগুলো এখনই সংরক্ষণ করুন — ফোন হারালে প্রতিটি একবার কাজ করবে। আর দেখানো হবে না।')}</p>
            <ul className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-4">{codes.map((c) => <li key={c} className="rounded-lg bg-white px-2 py-1 text-center dark:bg-ink-900">{c}</li>)}</ul>
          </div>
        ) : null}
        {setup && !tf.enabled ? (
          <form className="grid gap-4 sm:grid-cols-[200px_1fr]" onSubmit={(e) => { e.preventDefault(); conf.post(url('/profile/two-factor/confirm'), { preserveScroll: true }); }}>
            <img src={setup.qr} alt={t('QR code for your authenticator app', 'অথেনটিকেটর অ্যাপের কিউআর কোড')} width={200} height={200} className="rounded-xl bg-white p-2" />
            <div className="space-y-3">
              <p className="text-sm">{t('1. Scan the QR code in your app (or type the key below).', '১. অ্যাপে কিউআর কোড স্ক্যান করুন (বা নিচের কী লিখুন)।')}</p>
              <p className="font-mono text-sm tracking-wider" data-2fa-secret>{setup.secret}</p>
              <p className="text-sm">{t('2. Enter the 6-digit code it shows.', '২. অ্যাপে দেখানো ৬ অঙ্কের কোড দিন।')}</p>
              <Input label={t('Code', 'কোড')} value={conf.data.code} onChange={(v) => conf.setData('code', v.replace(/[^0-9]/g, ''))} error={conf.errors.code} autoComplete="one-time-code" />
              <button className="btn btn-primary btn-sm" disabled={conf.processing || conf.data.code.length < 6} data-2fa-confirm>{conf.processing ? <Spinner /> : null}{t('Turn on', 'চালু করুন')}</button>
            </div>
          </form>
        ) : null}
        {mode ? (
          <form className="flex flex-wrap items-end gap-3" onSubmit={submitPw}>
            <div className="w-64"><Input type="password" label={t('Confirm with your password', 'পাসওয়ার্ড দিয়ে নিশ্চিত করুন')} value={pw.data.password} onChange={(v) => pw.setData('password', v)} error={pw.errors.password} autoComplete="current-password" required /></div>
            <button className={mode === 'disable' ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm'} disabled={pw.processing} data-2fa-password-submit>{pw.processing ? <Spinner /> : null}{t('Continue', 'চালিয়ে যান')}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMode('')}>{t('Cancel', 'বাতিল')}</button>
          </form>
        ) : (
          <div className="flex flex-wrap gap-2">
            {!tf.enabled ? <button type="button" className="btn btn-primary btn-sm" onClick={() => ask('enable')} data-2fa-enable>{t('Set up authenticator app', 'অথেনটিকেটর অ্যাপ সেট করুন')}</button> : <>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => ask('recovery')}>{t('New recovery codes', 'নতুন রিকভারি কোড')}</button>
              {!tf.required ? <button type="button" className="btn btn-ghost btn-sm text-rose-700" onClick={() => ask('disable')}>{t('Turn off', 'বন্ধ করুন')}</button> : null}
            </>}
          </div>
        )}
      </div>
    </Card>
  );
}
