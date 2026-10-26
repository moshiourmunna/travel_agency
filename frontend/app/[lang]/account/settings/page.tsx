import { AccountCurrency, ApiButton, ApiForm, LanguageSelect, Modal, SaveSwitch } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead, ago } from '@/components/account/page';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('settings');

function Row({ id, label, sub, children }: { id: string; label: string; sub?: string | null; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div><p id={`${id}-l`} className="text-sm font-semibold">{label}</p>{sub ? <p className="text-xs muted">{sub}</p> : null}</div>
      {children}
    </div>
  );
}

function Pw({ id, name, label, auto, hint }: { id: string; name: string; label: string; auto: string; hint?: string }) {
  return (
    <div className="field mt-3"><label className="label" htmlFor={id}>{label}</label>
      <input id={id} name={name} type="password" className="input" required minLength={auto === 'new-password' ? 8 : 1} autoComplete={auto} aria-describedby={hint ? `${id}-h` : undefined} />
      {hint ? <p id={`${id}-h`} className="mt-1 text-xs muted">{hint}</p> : null}</div>
  );
}

export default async function Settings({ params }: PageProps<'/[lang]/account/settings'>) {
  const { lang, i } = await accountCtx(params);
  const { t, date } = i;
  const x = await me<any>('settings', lang, `/${lang}/account/settings`);
  const saved = t('Saved', 'সংরক্ষিত');
  const close = t('Close', 'বন্ধ করুন');
  return (
    <>
      <AccountHead i={i} k="settings" sub={null} />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-6" aria-labelledby="sec-h">
          <h2 id="sec-h" className="text-lg font-bold">{t('Sign-in & security', 'সাইন-ইন ও নিরাপত্তা')}</h2>
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            <Row id="spw" label={t('Password', 'পাসওয়ার্ড')} sub={x.password_changed ? `${t('Last changed', 'শেষ পরিবর্তন')} ${ago(i, x.password_changed)}` : null}>
              <Modal id="pw-dlg" triggerClass="btn btn-outline btn-sm" trigger={t('Change', 'পরিবর্তন')} title={t('Change password', 'পাসওয়ার্ড পরিবর্তন')} closeLabel={close}>
                <ApiForm path="password" method="PUT" reset success={t('Password changed. Other devices were signed out.', 'পাসওয়ার্ড পরিবর্তন হয়েছে। অন্য ডিভাইস থেকে সাইন আউট করা হয়েছে।')}>
                  <Pw id="pw-c" name="current" label={t('Current password', 'বর্তমান পাসওয়ার্ড')} auto="current-password" />
                  <Pw id="pw-n" name="password" label={t('New password', 'নতুন পাসওয়ার্ড')} auto="new-password" hint={t('At least 8 characters, with letters and numbers.', 'কমপক্ষে ৮ অক্ষর, অক্ষর ও সংখ্যাসহ।')} />
                  <Pw id="pw-r" name="password_confirmation" label={t('Repeat new password', 'নতুন পাসওয়ার্ড আবার')} auto="new-password" />
                  <div className="mt-6 flex justify-end"><button className="btn btn-primary">{t('Change password', 'পাসওয়ার্ড পরিবর্তন')}</button></div>
                </ApiForm>
              </Modal>
            </Row>
            <Row id="s2fa" label={t('Two-step sign-in (OTP)', 'টু-স্টেপ সাইন-ইন (ওটিপি)')} sub={t('After your password, a code by SMS each time you sign in', 'পাসওয়ার্ডের পরে প্রতিবার সাইন-ইনে এসএমএসে কোড')}>
              <SaveSwitch path="settings" name="two_factor" on={!!x.two_factor} labelId="s2fa-l" saved={saved} />
            </Row>
            <div className="py-3">
              <p className="text-sm font-semibold">{t('Active sessions', 'সক্রিয় সেশন')}</p>
              <ul className="mt-2 space-y-2 text-sm">
                {x.sessions.map((s: any) => (
                  <li key={s.id} className="flex items-center gap-3 rounded-xl bg-ink-50 p-3 dark:bg-ink-850" data-session={s.id}>
                    <Icon name="monitor-smartphone" className="h-5 w-5 text-ink-500 dark:text-ink-300" />
                    <div className="flex-1"><p className="font-medium">{s.name}</p><p className="text-xs muted">{s.current ? t('Active now', 'এখন সক্রিয়') : `${t('Last active', 'শেষ সক্রিয়')} ${ago(i, s.last_used)}`}</p></div>
                    {s.current ? <span className="badge badge-brand">{t('This device', 'এই ডিভাইস')}</span> : (
                      <ApiButton method="DELETE" path={`sessions/${s.id}`} className="btn btn-outline btn-sm" success={t('Signed out', 'সাইন আউট হয়েছে')} confirm={t('Sign this device out?', 'এই ডিভাইস সাইন আউট করবেন?')}>
                        {t('Sign out', 'সাইন আউট')}<span className="sr-only"> {s.name}</span>
                      </ApiButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            {x.logins?.length ? (
              <div className="py-3">
                <p className="text-sm font-semibold">{t('Recent sign-ins', 'সাম্প্রতিক সাইন-ইন')}</p>
                <ul className="mt-2 space-y-1 text-xs muted">
                  {x.logins.map((l: any, k: number) => (
                    <li key={k} className="flex items-center gap-2"><Icon name={l.success ? 'check' : 'x'} className={`h-3.5 w-3.5 ${l.success ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <span>{l.agent} · {l.ip} · <time dateTime={l.at}>{date(l.at.slice(0, 10))}</time>{l.success ? '' : ` · ${t('failed', 'ব্যর্থ')}`}</span></li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
        <section className="card p-4 sm:p-6" aria-labelledby="pref-h">
          <h2 id="pref-h" className="text-lg font-bold">{t('Preferences', 'পছন্দ')}</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="st-l">{t('Language', 'ভাষা')}</label><LanguageSelect id="st-l" current={lang} /></div>
            <div><label className="label" htmlFor="st-c">{t('Display currency', 'প্রদর্শিত মুদ্রা')}</label><AccountCurrency id="st-c" saved={t('Prices shown approximately; you always pay in BDT.', 'মূল্য আনুমানিক দেখানো হবে; পরিশোধ সবসময় টাকায়।')} /></div>
          </div>
          <div id="notif" className="mt-4 scroll-mt-24 divide-y divide-ink-100 dark:divide-ink-800">
            <p className="pb-1 text-sm font-bold">{t('Notifications', 'নোটিফিকেশন')}</p>
            <Row id="n1" label={t('Trip & payment alerts (SMS + WhatsApp)', 'ট্রিপ ও পেমেন্ট অ্যালার্ট (এসএমএস + হোয়াটসঅ্যাপ)')} sub={t('Required for active bookings', 'সক্রিয় বুকিংয়ের জন্য প্রয়োজনীয়')}>
              <SaveSwitch path="settings" group="notify" name="alerts" on disabled labelId="n1-l" saved={saved} />
            </Row>
            <Row id="n2" label={t('Email receipts & itineraries', 'ইমেইলে রসিদ ও ভ্রমণসূচি')}><SaveSwitch path="settings" group="notify" name="email" on={!!x.notify.email} labelId="n2-l" saved={saved} /></Row>
            <Row id="n3" label={t('Deals and price-drop alerts', 'অফার ও দাম কমার অ্যালার্ট')} sub={t('Max 2 per week', 'সপ্তাহে সর্বোচ্চ ২টি')}><SaveSwitch path="settings" group="notify" name="deals" on={!!x.notify.deals} labelId="n3-l" saved={saved} /></Row>
            <Row id="n4" label={t('Newsletter', 'নিউজলেটার')}><SaveSwitch path="settings" group="notify" name="newsletter" on={!!x.notify.newsletter} labelId="n4-l" saved={saved} /></Row>
          </div>
        </section>
        <section className="card p-4 sm:p-6 lg:col-span-2" aria-labelledby="priv-h">
          <h2 id="priv-h" className="text-lg font-bold">{t('Privacy & data', 'গোপনীয়তা ও তথ্য')}</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm muted">{t('Download a copy of your profile, travellers, bookings, reviews, wallet and Miles (JSON).', 'আপনার প্রোফাইল, ভ্রমণকারী, বুকিং, রিভিউ, ওয়ালেট ও মাইলসের একটি কপি ডাউনলোড করুন (JSON)।')}</p>
            <a href="/api/me/export" download className="btn btn-outline btn-sm" data-export><Icon name="download" className="h-4 w-4" /> {t('Download my data', 'আমার তথ্য ডাউনলোড')}</a>
          </div>
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900 dark:bg-rose-900/20 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{t('Delete account', 'অ্যাকাউন্ট মুছুন')}</p>
              <p className="text-xs text-rose-800/80 dark:text-rose-200/80">{t('Only possible when you have no active bookings. Wallet balance is refunded first.', 'কোনো সক্রিয় বুকিং না থাকলেই সম্ভব। আগে ওয়ালেট ব্যালান্স ফেরত দেওয়া হবে।')}</p></div>
            <Modal id="del-dlg" triggerClass="btn btn-sm bg-rose-700 text-white hover:bg-rose-800" trigger={t('Delete account', 'অ্যাকাউন্ট মুছুন')} title={t('Delete your account?', 'অ্যাকাউন্ট মুছবেন?')} closeLabel={close}>
              <ApiForm path="account" method="DELETE" go={`/api/auth/logout?next=/${lang}`} success={t('Your account was deleted.', 'আপনার অ্যাকাউন্ট মুছে ফেলা হয়েছে।')}>
                <p className="mt-2 text-sm muted">{t('Your profile, saved travellers and preferences are erased and you are signed out everywhere. Invoices we must keep by law stay, without your contact details.', 'আপনার প্রোফাইল, সংরক্ষিত ভ্রমণকারী ও পছন্দ মুছে যাবে এবং সব ডিভাইস থেকে সাইন আউট হবে। আইন অনুযায়ী রাখতে হয় এমন ইনভয়েস থাকবে, আপনার যোগাযোগের তথ্য ছাড়া।')}</p>
                <Pw id="del-pw" name="password" label={t('Enter your password to confirm', 'নিশ্চিত করতে পাসওয়ার্ড দিন')} auto="current-password" />
                <div className="mt-6 flex justify-end"><button className="btn bg-rose-700 text-white hover:bg-rose-800">{t('Delete permanently', 'স্থায়ীভাবে মুছুন')}</button></div>
              </ApiForm>
            </Modal>
          </div>
        </section>
      </div>
    </>
  );
}
