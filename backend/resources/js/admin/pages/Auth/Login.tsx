import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Spinner } from '@/components/ui';
import { useAdminUrl } from '@/lib/http';
import type { Shared } from '@/lib/types';

const DEMO = [['admin', 'Owner'], ['sales', 'Manager'], ['reservations', 'Reservations'], ['visa', 'Visa officer'], ['support', 'Support'], ['accounts', 'Finance'], ['content', 'Editor']];

export default function Login({ demo }: { demo: boolean }) {
  const props = usePage().props as unknown as Shared;
  const [bn, setBn] = useState(props.locale === 'bn');
  const t = (en: string, b: string) => (bn ? b : en);
  const url = useAdminUrl();
  const [show, setShow] = useState(false);
  const form = useForm({ email: '', password: '', remember: true });
  const submit = (e: React.FormEvent) => { e.preventDefault(); form.post(url('/login'), { onFinish: () => form.reset('password') }); };
  const err = form.errors.email || form.errors.password;
  return (
    <div className="grid min-h-screen bg-ink-50 dark:bg-ink-950 lg:grid-cols-2" lang={bn ? 'bn' : 'en'}>
      <Head title={t('Sign in', 'সাইন ইন')} />
      <div className="relative hidden overflow-hidden bg-brand-900 lg:block">
        <div className="absolute inset-0 pattern-dots opacity-60" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <img src="/brand/logo-dark.svg" alt="Musafir" className="h-11 w-auto self-start" width="180" height="44" />
          <div>
            <p className="font-display text-4xl italic leading-tight">{t('Every journey, with care.', 'প্রতিটি যাত্রায় আন্তরিক যত্ন।')}</p>
            <p className="mt-4 max-w-md text-brand-100">{t('Bookings, payments, visas, content and the whole website — managed in one place.', 'বুকিং, পেমেন্ট, ভিসা, কনটেন্ট ও পুরো ওয়েবসাইট — এক জায়গা থেকে।')}</p>
          </div>
          <p className="text-xs text-brand-200">© Musafir Tours &amp; Travels Ltd.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <img src="/brand/logo-compact.svg" alt="Musafir" className="h-9 w-auto dark:hidden lg:invisible" width="140" height="40" />
            <img src="/brand/logo-compact-dark.svg" alt="" className="hidden h-9 w-auto dark:block lg:invisible" width="140" height="40" />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBn(!bn)}>{bn ? 'English' : 'বাংলা'}</button>
          </div>
          <h1 className="text-3xl font-extrabold">{t('Staff sign in', 'স্টাফ সাইন ইন')}</h1>
          <p className="mt-2 text-sm muted">{t('Use your Musafir work email.', 'আপনার মুসাফির অফিস ইমেইল ব্যবহার করুন।')}</p>
          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            {err ? <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200"><Icon name="circle-alert" className="mt-0.5 shrink-0" />{err}</div> : null}
            <div>
              <label className="label" htmlFor="email">{t('Email', 'ইমেইল')}</label>
              <input id="email" type="email" autoComplete="username" required autoFocus className={'input' + (form.errors.email ? ' is-invalid' : '')} value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">{t('Password', 'পাসওয়ার্ড')}</label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" required className="input pr-11" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} />
                <button type="button" className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn h-9 w-9" onClick={() => setShow(!show)} aria-label={show ? t('Hide password', 'পাসওয়ার্ড লুকান') : t('Show password', 'পাসওয়ার্ড দেখুন')}><Icon name={show ? 'eye-off' : 'eye'} size={16} /></button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="check" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} />{t('Keep me signed in', 'সাইন ইন রাখুন')}</label>
            <button type="submit" className="btn btn-primary w-full" disabled={form.processing}>{form.processing ? <Spinner /> : <Icon name="log-in" />}{t('Sign in', 'সাইন ইন')}</button>
          </form>
          {demo ? (
            <div className="mt-8 rounded-2xl border border-dashed border-ink-200 p-4 text-xs dark:border-ink-700">
              <p className="font-semibold text-ink-700 dark:text-ink-200">{t('Local demo logins (password: password)', 'লোকাল ডেমো লগইন (পাসওয়ার্ড: password)')}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DEMO.map(([u, r]) => (
                  <button key={u} type="button" className="chip px-2.5 py-1 text-xs" onClick={() => form.setData({ ...form.data, email: `${u}@musafir.test`, password: 'password' })}>{r}</button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
