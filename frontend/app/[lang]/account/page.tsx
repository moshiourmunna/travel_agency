import { DepartCountdown } from '@/components/account/client';
import { accountCtx, accountMetadata, ago, manageHref } from '@/components/account/page';
import { KindChip, Kpi, Progress, Status, Thumb } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { Picture } from '@/components/ui/Picture';
import { me } from '@/lib/account';
import type { I18n } from '@/lib/i18n';

export const generateMetadata = accountMetadata('index');

/** To-do lines are data from the API ({type, n, amount, name}); worded here in the visitor's language. */
function todoText(i: I18n, x: any): [string, string] {
  const { t, d, bdt } = i;
  switch (x.type) {
    case 'pay': return ['wallet', i.lang === 'bn' ? `কিস্তি ${d(x.n)} পরিশোধ — ${bdt(x.amount)}` : `Pay instalment ${x.n} — ${bdt(x.amount)}`];
    case 'visa': return ['file-up', i.lang === 'bn' ? `${x.name}-এর ভিসার কাগজ আপলোড` : `Upload ${x.name}’s visa documents`];
    case 'passport': return ['passport', i.lang === 'bn' ? `${x.name}-এর পাসপোর্ট নবায়ন` : `Renew ${x.name}’s passport`];
    case 'profile': return ['user-round', t('Complete your profile', 'প্রোফাইল সম্পূর্ণ করুন')];
    case 'travellers': return ['users', t('Save your co-travellers', 'সহযাত্রীদের তথ্য সংরক্ষণ')];
    case 'insurance': return ['shield-check', t('Add travel insurance', 'ভ্রমণ বিমা যোগ')];
    default: return ['circle', x.type];
  }
}

export default async function Dashboard({ params }: PageProps<'/[lang]/account'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u, d, num, bdt, date } = i;
  const x = await me<any>('dashboard', lang, `/${lang}/account`);
  const nt = x.next_trip;
  const st = x.stats;
  const done = x.todo.filter((z: any) => z.done).length;
  return (
    <>
      <h1 className="sr-only">{t('My account', 'মাই অ্যাকাউন্ট')}</h1>
      {nt ? (
        <section className="relative overflow-hidden rounded-3xl bg-ink-900 text-white" aria-labelledby="next-h" data-next-trip={nt.ref}>
          <Picture img={nt.image} className="absolute inset-0 h-full w-full object-cover opacity-50" sizes="(min-width: 1024px) 70vw, 100vw" priority width={1600} height={1000} />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-transparent" />
          <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold text-accent-300">{t('Your next trip', 'আপনার পরবর্তী ট্রিপ')}</p>
              <h2 id="next-h" className="mt-1 text-2xl font-extrabold leading-tight sm:text-4xl">{nt.title}</h2>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-100">
                <span><Icon name="calendar" className="inline h-4 w-4" /> {date(nt.travel_start)}{nt.travel_end && nt.travel_end !== nt.travel_start ? ` – ${date(nt.travel_end)}` : ''}</span>
                {nt.subtitle ? <span><Icon name="users" className="inline h-4 w-4" /> {nt.subtitle}</span> : null}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={u(manageHref(nt))} className="btn btn-accent">{t('View booking', 'বুকিং দেখুন')}</a>
                {nt.balance > 0 ? <a href={u('/account/payments')} className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">{t('Pay instalment', 'কিস্তি পরিশোধ')}</a> : null}
              </div>
            </div>
            {nt.starts_at ? (
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-100">{t('Departs in', 'যাত্রা শুরু')}</p>
                <DepartCountdown to={nt.starts_at} label={t('Time until departure', 'যাত্রা পর্যন্ত বাকি সময়')} units={[t('Days', 'দিন'), t('Hours', 'ঘণ্টা'), t('Mins', 'মিনিট'), t('Secs', 'সেকেন্ড')]} />
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-600 p-6 text-white sm:p-8">
          <p className="text-sm font-semibold text-accent-300">{t('Welcome back,', 'আবার স্বাগতম,')} {x.user.first_name}</p>
          <h2 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t('Where to next?', 'এবার কোথায় যাবেন?')}</h2>
          <p className="mt-2 text-sm text-brand-100">{t('No upcoming trips yet — explore holidays, cruises and flights.', 'এখনও কোনো আসন্ন ট্রিপ নেই — হলিডে, ক্রুজ ও ফ্লাইট ঘুরে দেখুন।')}</p>
          <a href={u('/tours')} className="btn btn-accent mt-5">{t('Explore holidays', 'হলিডে দেখুন')}</a>
        </section>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label={t('Upcoming trips', 'আসন্ন ট্রিপ')} value={d(st.upcoming)} icon="plane" note={st.needs_action ? `${d(st.needs_action)} ${t('need action', 'টিতে পদক্ষেপ দরকার')}` : t('All set', 'সব ঠিক আছে')} />
        <Kpi label={t('Wallet balance', 'ওয়ালেট ব্যালান্স')} value={bdt(st.wallet)} icon="wallet" note={t('Usable on any booking', 'যেকোনো বুকিংয়ে ব্যবহারযোগ্য')} tone="accent" />
        <Kpi label={t('Musafir Miles', 'মুসাফির মাইলস')} value={num(st.miles)} icon="award" delta={st.miles_month ? `+${num(st.miles_month)}` : undefined} note={t('this month', 'এই মাসে')} tone="sky" />
        <Kpi label={t('Next payment', 'পরবর্তী পেমেন্ট')} value={st.next_payment ? bdt(st.next_payment.amount) : '—'} icon="calendar-clock" tone="rose"
          note={st.next_payment ? `${t('Due', 'পরিশোধের শেষ দিন')} ${date(st.next_payment.due_date, 'short')}` : t('Nothing due', 'কিছু বাকি নেই')} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="card p-4 sm:p-6 xl:col-span-2" aria-labelledby="up-h">
          <div className="flex items-center justify-between gap-3"><h2 id="up-h" className="text-lg font-bold">{t('Upcoming bookings', 'আসন্ন বুকিং')}</h2><a href={u('/account/bookings')} className="link-muted text-sm font-semibold">{t('See all', 'সব দেখুন')}</a></div>
          {x.upcoming.length ? (
            <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
              {x.upcoming.map((b: any) => (
                <li key={b.ref} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center" data-booking={b.ref}>
                  <Thumb img={b.image} className="h-16 w-full rounded-xl object-cover sm:w-24" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><KindChip t={t} k={b.kind} /> <Status t={t} s={b.status} /></div>
                    <p className="mt-1 truncate font-semibold text-ink-900 dark:text-white">{b.title}</p>
                    <p className="text-xs muted">{b.ref} · {date(b.travel_start)}</p>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:block sm:text-right">
                    <p className="font-bold">{bdt(b.total)}</p>
                    {b.balance > 0 ? <p className="text-xs text-rose-700 dark:text-rose-300">{t('Due', 'বাকি')} {bdt(b.balance)}</p> : <p className="text-xs text-emerald-700 dark:text-emerald-400">{t('Fully paid', 'সম্পূর্ণ পরিশোধিত')}</p>}
                  </div>
                  <a href={u(manageHref(b))} className="btn btn-outline btn-sm">{t('Manage', 'ম্যানেজ')}<span className="sr-only"> {b.ref}</span></a>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm muted">{t('No upcoming bookings.', 'কোনো আসন্ন বুকিং নেই।')} <a href={u('/tours')} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">{t('Find your next trip', 'পরবর্তী ট্রিপ খুঁজুন')}</a></p>}
        </section>
        <div className="space-y-6">
          <section className="card p-4 sm:p-6" aria-labelledby="todo-h">
            <h2 id="todo-h" className="text-lg font-bold">{t('To-do before you fly', 'যাত্রার আগে করণীয়')}</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {x.todo.map((z: any) => {
                const [ic, txt] = todoText(i, z);
                return (
                  <li key={z.key} data-todo={z.type} data-done={z.done ? '1' : '0'}>
                    <a href={u(z.href)} className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink-50 dark:hover:bg-ink-850">
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${z.done ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200'}`}><Icon name={z.done ? 'check' : ic} className="h-4 w-4" /></span>
                      <span className={`flex-1 ${z.done ? 'text-ink-500 line-through dark:text-ink-300' : 'font-medium'}`}>{txt}{z.done ? <span className="sr-only"> ({t('done', 'সম্পন্ন')})</span> : null}</span>
                      <Icon name="chevron-right" className="h-4 w-4 text-ink-400" />
                    </a>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4">
              <Progress pct={x.todo.length ? (done / x.todo.length) * 100 : 100} label={t('To-do progress', 'করণীয়ের অগ্রগতি')} />
              <p className="mt-1.5 text-xs muted">{i.lang === 'bn' ? `${d(x.todo.length)}টির মধ্যে ${d(done)}টি সম্পন্ন` : `${done} of ${x.todo.length} done`}</p>
            </div>
          </section>
          <section className="card p-4 sm:p-6" aria-labelledby="visa-h">
            <div className="flex items-center justify-between"><h2 id="visa-h" className="text-lg font-bold">{t('Visa tracker', 'ভিসা ট্র্যাকার')}</h2><a href={u('/account/visa')} className="link-muted text-sm font-semibold">{t('Details', 'বিস্তারিত')}</a></div>
            {x.visas.length ? x.visas.slice(0, 2).map((v: any) => (
              <div key={v.ref} className="mt-4" data-visa={v.ref}>
                <div className="flex items-center justify-between gap-2 text-sm"><p className="font-semibold"><span aria-hidden="true">{v.flag}</span> {v.name}</p><Status t={t} s={v.stage} /></div>
                <Progress pct={v.stage_no * 20} label={`${v.name} — ${t('visa progress', 'ভিসার অগ্রগতি')}`} className="mt-2" />
                <p className="mt-1 text-xs muted">{t('Stage', 'ধাপ')} {d(v.stage_no)}/{d(5)}{v.eta ? ` · ${t('Expected', 'সম্ভাব্য')} ${date(v.eta)}` : ''}</p>
              </div>
            )) : <p className="mt-4 text-sm muted">{t('No visa applications in progress.', 'কোনো ভিসা আবেদন চলমান নেই।')} <a href={u('/visa')} className="font-semibold text-brand-700 hover:underline dark:text-brand-300">{t('Apply for a visa', 'ভিসার আবেদন করুন')}</a></p>}
          </section>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-6" aria-labelledby="act-h">
          <div className="flex items-center justify-between"><h2 id="act-h" className="text-lg font-bold">{t('Recent activity', 'সাম্প্রতিক কার্যক্রম')}</h2><a href={u('/account/notifications')} className="link-muted text-sm font-semibold">{t('See all', 'সব দেখুন')}</a></div>
          {x.notifications.length ? (
            <ol className="relative mt-4 space-y-4 border-l border-ink-100 pl-5 dark:border-ink-800">
              {x.notifications.map((n: any) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[29px] grid h-6 w-6 place-items-center rounded-full bg-white ring-1 ring-ink-200 dark:bg-ink-900 dark:ring-ink-700"><Icon name={n.icon || 'bell'} className="h-3.5 w-3.5 text-brand-700 dark:text-brand-300" /></span>
                  <p className="text-sm font-semibold">{n.title}</p><p className="text-xs muted">{n.body} · <time dateTime={n.at}>{ago(i, n.at)}</time></p>
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm muted">{t('Nothing new yet.', 'এখনও নতুন কিছু নেই।')}</p>}
        </section>
        {x.picks?.items?.length ? (
          <section className="card overflow-hidden" aria-labelledby="rec-h">
            <div className="p-4 sm:p-6">
              <h2 id="rec-h" className="text-lg font-bold">{t('Picked for you', 'আপনার জন্য বাছাই')}</h2>
              <p className="text-sm muted">{x.picks.based_on.length
                ? (i.lang === 'bn' ? `আপনার ${x.picks.based_on.join(' ও ')} ট্রিপের ভিত্তিতে` : `Based on your ${x.picks.based_on.join(' and ')} trips`)
                : t('Popular with travellers like you', 'আপনার মতো ভ্রমণকারীদের পছন্দ')}</p>
            </div>
            <ul className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-6 sm:pb-6">
              {x.picks.items.map((p: any) => (
                <li key={p.slug}>
                  <a href={u(`/tours/${p.slug}`)} className="group flex gap-3 rounded-2xl border border-ink-100 p-2 hover:border-brand-400 dark:border-ink-800">
                    <Thumb img={p.image} className="h-16 w-20 shrink-0 rounded-xl object-cover" />
                    <span className="min-w-0"><span className="line-clamp-2 text-sm font-semibold group-hover:text-brand-700 dark:group-hover:text-brand-300">{p.title}</span><span className="text-xs muted">{t('from', 'শুরু')} {bdt(p.price)}</span></span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
