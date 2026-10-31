import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/ui';
import { useAdminUrl } from '@/lib/http';
import type { Shared } from '@/lib/types';

/** Second sign-in step: 6-digit code from the authenticator app, or a one-time recovery code. */
export default function TwoFactor() {
  const props = usePage().props as unknown as Shared;
  const bn = props.locale === 'bn';
  const t = (en: string, b: string) => (bn ? b : en);
  const url = useAdminUrl();
  const [useRecovery, setUseRecovery] = useState(false);
  const form = useForm({ code: '', recovery: '' });
  const submit = (e: React.FormEvent) => { e.preventDefault(); form.post(url('/login/two-factor'), { onFinish: () => form.reset('code', 'recovery') }); };
  const err = form.errors.code || form.errors.recovery;
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 p-4 dark:bg-ink-950" lang={bn ? 'bn' : 'en'}>
      <Head title={t('Two-step sign-in', 'দুই-ধাপ সাইন-ইন')} />
      <form onSubmit={submit} className="card w-full max-w-sm space-y-5 p-6 sm:p-8" data-2fa-form>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name="shield-check" size={22} /></span>
          <div><h1 className="text-lg font-bold">{t('Two-step sign-in', 'দুই-ধাপ সাইন-ইন')}</h1>
            <p className="text-sm muted">{useRecovery ? t('Enter one of your recovery codes.', 'একটি রিকভারি কোড দিন।') : t('Enter the 6-digit code from your authenticator app.', 'অথেনটিকেটর অ্যাপের ৬ অঙ্কের কোড দিন।')}</p></div>
        </div>
        {err ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-900/30 dark:text-rose-200" role="alert">{err}</p> : null}
        {useRecovery ? (
          <div className="field"><label className="label" htmlFor="recovery">{t('Recovery code', 'রিকভারি কোড')}</label>
            <input id="recovery" className="input font-mono" value={form.data.recovery} onChange={(e) => form.setData('recovery', e.target.value)} autoComplete="one-time-code" autoFocus placeholder="xxxx-xxxx" /></div>
        ) : (
          <div className="field"><label className="label" htmlFor="code">{t('Authentication code', 'অথেনটিকেশন কোড')}</label>
            <input id="code" className="input text-center font-mono text-2xl tracking-[0.4em]" inputMode="numeric" pattern="[0-9 ]*" maxLength={7} value={form.data.code}
              onChange={(e) => form.setData('code', e.target.value.replace(/[^0-9]/g, ''))} autoComplete="one-time-code" autoFocus aria-invalid={!!err || undefined} /></div>
        )}
        <button className="btn btn-primary w-full" disabled={form.processing || (useRecovery ? !form.data.recovery : form.data.code.length < 6)} data-2fa-submit>{form.processing ? <Spinner /> : null}{t('Verify and sign in', 'যাচাই করে সাইন ইন')}</button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="link" onClick={() => setUseRecovery(!useRecovery)}>{useRecovery ? t('Use the app code', 'অ্যাপের কোড ব্যবহার') : t('Use a recovery code', 'রিকভারি কোড ব্যবহার')}</button>
          <Link href={url('/login')} className="link-muted">{t('Back', 'ফিরে যান')}</Link>
        </div>
      </form>
    </div>
  );
}
