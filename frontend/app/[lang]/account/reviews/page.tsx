import { ApiForm } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, Status, Thumb } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { Stars } from '@/components/ui/basics';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('reviews');

export default async function Reviews({ params }: PageProps<'/[lang]/account/reviews'>) {
  const { lang, i } = await accountCtx(params);
  const { t, d, date } = i;
  const x = await me<any>('reviews', lang, `/${lang}/account/reviews`);
  const miles = d(x.miles);
  return (
    <>
      <AccountHead i={i} k="reviews" sub={x.miles ? t(`Each published review earns ${miles} Miles.`, `প্রতিটি প্রকাশিত রিভিউতে ${miles} মাইলস।`) : null} />
      <section className="card p-4 sm:p-6" aria-labelledby="wr-h">
        <h2 id="wr-h" className="text-lg font-bold">{t('Waiting for your review', 'আপনার রিভিউয়ের অপেক্ষায়')}</h2>
        {x.pending.length ? x.pending.map((p: any, n: number) => {
          const id = `rv${n}`;
          return (
            <ApiForm key={p.ref} path="reviews" extra={{ ref: p.ref }} className={`mt-4 grid gap-4 lg:grid-cols-[16rem_1fr] ${n ? 'border-t border-ink-100 pt-6 dark:border-ink-800' : ''}`}
              success={x.miles ? t(`Thanks! Your review is in moderation; ${miles} Miles will be added once it is published.`, `ধন্যবাদ! রিভিউটি মডারেশনে আছে; প্রকাশ হলে ${miles} মাইলস যোগ হবে।`) : t('Thanks! Your review is in moderation.', 'ধন্যবাদ! রিভিউটি মডারেশনে আছে।')}>
              <div className="flex gap-3 lg:block">
                <Thumb img={p.image} className="h-20 w-28 shrink-0 rounded-xl object-cover lg:h-36 lg:w-full" />
                <div className="lg:mt-2"><p className="font-semibold">{p.title}</p><p className="text-xs muted">{p.ref}{p.date ? ` · ${date(p.date)}` : ''}</p></div>
              </div>
              <div>
                <fieldset><legend className="label">{t('Overall rating', 'সার্বিক রেটিং')}</legend>
                  <div className="flex flex-row-reverse justify-end gap-1">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <span key={s} className="contents">
                        <input type="radio" name="rating" id={`${id}-r${s}`} value={s} className="peer sr-only" defaultChecked={s === 5} required />
                        <label htmlFor={`${id}-r${s}`} className="cursor-pointer text-ink-300 hover:text-accent-400 peer-checked:text-accent-400 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 rounded dark:text-ink-600" title={d(s)}>
                          <Icon name="star" className="h-8 w-8 fill-current" /><span className="sr-only">{d(s)} {t('stars', 'তারকা')}</span>
                        </label>
                      </span>
                    ))}
                  </div>
                </fieldset>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {([['guide', 'Guide', 'গাইড'], ['hotels', 'Hotels', 'হোটেল'], ['value', 'Value', 'মূল্যমান']] as [string, string, string][]).map(([k, en, bn]) => (
                    <div key={k}><label className="label" htmlFor={`${id}-${k}`}>{t(en, bn)}</label>
                      <select id={`${id}-${k}`} name={`scores[${k}]`} className="input" data-int>{[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{d(s)} ★</option>)}</select></div>
                  ))}
                </div>
                <div className="field mt-3"><label className="label" htmlFor={`${id}-title`}>{t('Headline (optional)', 'শিরোনাম (ঐচ্ছিক)')}</label><input id={`${id}-title`} name="title" className="input" maxLength={120} /></div>
                <div className="field mt-3"><label className="label" htmlFor={`${id}-body`}>{t('Your review', 'আপনার রিভিউ')}</label>
                  <textarea id={`${id}-body`} name="body" rows={4} className="input" required minLength={20} maxLength={3000} placeholder={t('What did you love? Anything we could do better?', 'কী ভালো লেগেছে? কী আরও ভালো করা যেত?')} /></div>
                <button className="btn btn-primary mt-4">{t('Publish review', 'রিভিউ প্রকাশ')}</button>
              </div>
            </ApiForm>
          );
        }) : <p className="mt-3 text-sm muted">{t('No trips waiting for a review. After you travel with us, you can review the trip here.', 'রিভিউয়ের অপেক্ষায় কোনো ট্রিপ নেই। আমাদের সাথে ভ্রমণের পর এখানে রিভিউ দিতে পারবেন।')}</p>}
      </section>
      <section className="mt-6" aria-labelledby="pr-h">
        <h2 id="pr-h" className="text-lg font-bold">{t('Your reviews', 'আপনার রিভিউ')}</h2>
        {x.published.length ? (
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {x.published.map((r: any) => (
              <li key={r.id} className="card p-4 sm:p-5" data-review={r.status}>
                <div className="flex items-center justify-between gap-2"><Stars i={i} rating={r.rating} /><Status t={t} s={({ review: 'pending_review', hidden: 'rejected' } as Record<string, string>)[r.status] ?? r.status} /></div>
                <p className="mt-2 font-semibold">{r.title}</p>
                <p className="mt-1 text-sm muted">“{r.body}”</p>
                {r.reply ? <p className="mt-3 rounded-xl bg-ink-50 p-3 text-sm dark:bg-ink-850"><span className="font-semibold">{t('Reply from the team', 'টিমের উত্তর')}:</span> {r.reply}</p> : null}
                <p className="mt-3 text-xs muted">{[r.ref, r.date ? date(r.date) : null, r.status === 'published' && x.miles ? `+${miles} ${t('Miles', 'মাইলস')}` : null].filter(Boolean).join(' · ')}</p>
              </li>
            ))}
          </ul>
        ) : <div className="mt-3"><Empty icon="star" title={t('No reviews yet', 'এখনও কোনো রিভিউ নেই')} /></div>}
      </section>
    </>
  );
}
