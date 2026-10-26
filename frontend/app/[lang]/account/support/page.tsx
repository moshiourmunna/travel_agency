import { ApiForm, ChatComposer, Modal } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, Status } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/basics';
import { me } from '@/lib/account';
import { getSite } from '@/lib/site';

export const generateMetadata = accountMetadata('support');

const initials = (n?: string | null) => (n ?? '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
const kb = (n?: number | null) => (n ? (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`) : '');

export default async function Support({ params, searchParams }: PageProps<'/[lang]/account/support'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u, d, date } = i;
  const sp = await searchParams;
  const ticket = typeof sp.t === 'string' && /^TKT-\d{3,8}$/.test(sp.t) ? sp.t : '';
  const [x, site] = await Promise.all([me<any>('tickets', lang, `/${lang}/account/support${ticket ? `?t=${ticket}` : ''}`, ticket ? { ticket } : {}), getSite(lang)]);
  const c = site.settings.company ?? {};
  const o = x.open;
  const time = (iso: string) => new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' }).format(new Date(iso));
  const close = t('Close', 'বন্ধ করুন');
  return (
    <>
      <AccountHead i={i} k="support" sub={t('Average first reply: 4 minutes (9 AM – 10 PM). Emergency hotline 24/7.', 'গড় প্রথম উত্তর: ৪ মিনিট (সকাল ৯টা – রাত ১০টা)। জরুরি হটলাইন ২৪/৭।')}>
        {c.hotline ? <a href={`tel:${c.hotline_tel}`} className="btn btn-outline btn-sm"><Icon name="phone" className="h-4 w-4" /> {d(c.hotline)}</a> : null}
        <Modal id="new-tkt" triggerClass="btn btn-primary btn-sm" trigger={<><Icon name="plus" className="h-4 w-4" /> {t('New request', 'নতুন অনুরোধ')}</>} title={t('How can we help?', 'কীভাবে সাহায্য করতে পারি?')} closeLabel={close}>
          <ApiForm path="tickets" reset success={t('Request created — we will reply shortly.', 'অনুরোধ তৈরি হয়েছে — শিগগিরই উত্তর দেব।')}>
            <div className="field mt-4"><label className="label" htmlFor="nt-b">{t('Booking', 'বুকিং')}</label>
              <select id="nt-b" name="booking" className="input">
                {x.bookings.map((b: any) => <option key={b.ref} value={b.ref}>{b.ref} — {b.title}</option>)}
                <option value="">{t('Not about a booking', 'বুকিং সম্পর্কিত নয়')}</option>
              </select></div>
            <div className="field mt-3"><label className="label" htmlFor="nt-t">{t('Topic', 'বিষয়')}</label>
              <select id="nt-t" name="topic" className="input">
                {([['change', 'Change dates or names', 'তারিখ বা নাম পরিবর্তন'], ['payment', 'Payment or refund', 'পেমেন্ট বা রিফান্ড'], ['visa', 'Visa documents', 'ভিসার কাগজপত্র'], ['special', 'Special request', 'বিশেষ অনুরোধ'], ['complaint', 'Complaint', 'অভিযোগ'], ['other', 'Something else', 'অন্য কিছু']] as [string, string, string][]).map(([v, en, bn]) => <option key={v} value={v}>{t(en, bn)}</option>)}
              </select></div>
            <div className="field mt-3"><label className="label" htmlFor="nt-m">{t('Details', 'বিস্তারিত')}</label><textarea id="nt-m" name="message" rows={4} className="input" required minLength={10} maxLength={3000} /></div>
            <div className="mt-6 flex justify-end gap-2"><button className="btn btn-primary">{t('Submit', 'জমা দিন')}</button></div>
          </ApiForm>
        </Modal>
      </AccountHead>
      {x.items.length ? (
        <div className="grid gap-6 xl:grid-cols-[22rem_1fr]">
          <section className="card p-3" aria-labelledby="tk-h">
            <h2 id="tk-h" className="px-2 py-2 text-sm font-bold uppercase tracking-wide muted">{t('Your requests', 'আপনার অনুরোধ')}</h2>
            <ul className="space-y-1">
              {x.items.map((k: any) => {
                const cur = o?.ref === k.ref;
                return (
                  <li key={k.ref}>
                    <a href={`${u('/account/support')}?t=${k.ref}#chat`} className={`block rounded-2xl p-3 ${cur ? 'bg-brand-50 dark:bg-brand-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-850'}`} aria-current={cur ? 'true' : undefined} data-ticket={k.ref}>
                      <div className="flex items-center justify-between gap-2"><span className="text-xs muted">{k.ref}</span><Status t={t} s={k.status} /></div>
                      <p className="mt-1 text-sm font-semibold">{k.subject}</p>
                      <p className="text-xs muted">{k.agent ? `${k.agent} · ` : ''}{date(k.date)}</p>
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
          {o ? (
            <section id="chat" className="card flex min-h-[28rem] flex-col overflow-hidden" aria-labelledby="ch-h" data-open-ticket={o.ref}>
              <div className="flex items-center gap-3 border-b border-ink-100 p-4 dark:border-ink-800">
                <Avatar initials={initials(o.agent)} className="h-10 w-10 text-xs" gradient="from-accent-400 to-accent-700" />
                <div className="min-w-0 flex-1"><h2 id="ch-h" className="truncate font-bold">{o.subject}</h2>
                  <p className="text-xs muted">{o.agent ? `${o.agent} · ${t('Travel expert', 'ট্রাভেল এক্সপার্ট')}` : t('A travel expert will pick this up shortly', 'শিগগিরই একজন ট্রাভেল এক্সপার্ট দেখবেন')} · {o.ref}</p></div>
                <Status t={t} s={o.status} />
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50 p-4 dark:bg-ink-950" aria-live="polite">
                {o.messages.map((m: any) => (
                  <div key={m.id} className={`${m.mine ? 'ml-auto rounded-br-md bg-brand-700 text-white' : 'rounded-bl-md bg-white text-ink-800 ring-1 ring-ink-100 dark:bg-ink-900 dark:text-ink-100 dark:ring-ink-800'} max-w-[85%] rounded-2xl px-4 py-2.5 text-sm`} data-msg={m.mine ? 'me' : 'agent'}>
                    {!m.mine && m.author ? <p className="mb-0.5 text-[11px] font-semibold text-brand-700 dark:text-brand-300">{m.author}</p> : null}
                    {m.body ? <p className="whitespace-pre-line [overflow-wrap:anywhere]">{m.body}</p> : null}
                    {m.attachments.map((a: any, k: number) => (
                      <a key={k} href={a.url ? `/api/me/${a.url}` : undefined} target="_blank" rel="noopener" className={`mt-2 flex items-center gap-2 rounded-xl p-2 ${m.mine ? 'bg-white/15 hover:bg-white/25' : 'bg-ink-50 hover:bg-ink-100 dark:bg-ink-850'}`} data-attachment>
                        <Icon name="file-text" className="h-6 w-6 shrink-0" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.name}</span>{a.size ? <span className="text-xs opacity-80">{kb(a.size)}</span> : null}</span><Icon name="download" className="h-4 w-4" />
                      </a>
                    ))}
                    <p className={`mt-1 text-[11px] ${m.mine ? 'text-brand-100' : 'text-ink-500 dark:text-ink-300'}`}><time dateTime={m.at}>{time(m.at)}</time></p>
                  </div>
                ))}
              </div>
              {['resolved', 'closed'].includes(o.status) ? (
                <p className="border-t border-ink-100 p-4 text-sm muted dark:border-ink-800">{t('This request is closed. Reply below to reopen it, or start a new request.', 'এই অনুরোধ বন্ধ। আবার খুলতে নিচে উত্তর দিন, অথবা নতুন অনুরোধ করুন।')}</p>
              ) : null}
              <ChatComposer ticket={o.ref} labels={{ message: t('Message', 'বার্তা'), placeholder: t('Write a message…', 'বার্তা লিখুন…'), attach: t('Attach file (PDF, JPG, PNG · max 5 MB)', 'ফাইল সংযুক্ত (PDF, JPG, PNG · সর্বোচ্চ ৫ এমবি)'), send: t('Send', 'পাঠান'), sent: t('Message sent', 'বার্তা পাঠানো হয়েছে'), tooBig: t('Files must be 5 MB or smaller.', 'ফাইল ৫ এমবি বা তার কম হতে হবে।'), remove: t('Remove', 'সরান') }} />
            </section>
          ) : null}
        </div>
      ) : <Empty icon="life-buoy" title={t('No support requests yet', 'এখনও কোনো সাপোর্ট অনুরোধ নেই')} sub={t('Ask us anything about a booking, payment or visa — we reply within minutes.', 'বুকিং, পেমেন্ট বা ভিসা নিয়ে যেকোনো প্রশ্ন করুন — কয়েক মিনিটে উত্তর দিই।')} />}
    </>
  );
}
