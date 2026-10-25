import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { Price } from '@/components/client/Price';
import { CompareCheck, WishButton } from '@/components/client/Wish';
import type { I18n } from '@/lib/i18n';
import type { ActivityCard as A, CruiseCard as C, DestinationCard as D, HotelCard as H, Review, TourCard as Tr } from '@/lib/types';
import { pctOff } from '@/lib/format';
import { Avatar, CancelBadge, Stars } from './basics';
import { Picture } from './Picture';

const Heart = () => <Icon name="heart" className="h-[18px] w-[18px] [[aria-pressed=true]_&]:fill-current" />;

export function Wish({ i, id, kind = 'tour' }: { i: I18n; id: string; kind?: string }) {
  return <WishButton id={id} kind={kind} label={i.t('Save to wishlist', 'উইশলিস্টে রাখুন')}><Heart /></WishButton>;
}

export function TourCard({ i, x, list = false }: { i: I18n; x: Tr; list?: boolean }) {
  const off = pctOff(x.price, x.price_was);
  return (
    <article className={`card card-hover group relative flex overflow-hidden ${list ? 'flex-col sm:flex-row' : 'flex-col'}`} data-item data-price={x.price} data-rating={x.rating} data-days={x.days} data-region={x.region} data-cats={x.categories.join(' ')}>
      <div className={`relative shrink-0 overflow-hidden ${list ? 'aspect-[16/10] sm:aspect-auto sm:w-72' : 'aspect-[16/11]'}`}>
        <Picture img={x.image} alt={x.title} className="img-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {x.badge ? <span className="badge bg-accent-400 text-ink-900">{x.badge}</span> : null}
          {off ? <span className="badge bg-rose-600 text-white">-{i.d(off)}%</span> : null}
        </div>
        <div className="absolute right-3 top-3 z-10"><Wish i={i} id={x.slug} /></div>
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-ink-950/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
          <Icon name="map-pin" className="h-3.5 w-3.5" /> {x.location}{x.location !== x.country ? `, ${x.country}` : ''}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-500 dark:text-ink-300">
          <span className="inline-flex items-center gap-1"><Icon name="calendar-days" className="h-3.5 w-3.5" /> {i.d(x.days)}{i.t('D', 'দিন')} / {i.d(x.nights)}{i.t('N', 'রাত')}</span><span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1"><Icon name="users" className="h-3.5 w-3.5" /> {i.d(x.group_size)}</span>
          {x.includes_flight ? (<><span aria-hidden="true">·</span><span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300"><Icon name="plane" className="h-3.5 w-3.5" /> {i.t('Flight', 'ফ্লাইট')}</span></>) : null}
        </div>
        <h3 className="mt-2 text-[17px] font-bold leading-snug"><Link href={i.u(`/tours/${x.slug}`)} className="after:absolute after:inset-0 hover:text-brand-700 dark:hover:text-brand-300">{x.title}</Link></h3>
        {list ? <ul className="mt-3 hidden space-y-1 text-sm text-ink-600 dark:text-ink-300 sm:block">{x.highlights.map((h, k) => <li key={k} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />{h}</li>)}</ul> : null}
        <div className="mt-2 flex items-center gap-2 text-sm"><Stars i={i} rating={x.rating} className="h-3.5 w-3.5" /><b className="text-ink-800 dark:text-white">{i.d(x.rating)}</b><span className="muted">({i.num(x.reviews_count)})</span></div>
        <div className="mt-1.5"><CancelBadge policy={x.cancellation} /></div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div><p className="text-xs muted">{i.t('From, per person', 'শুরু, জনপ্রতি')}</p>
            <p className="flex items-baseline gap-2"><span className="text-xl font-extrabold text-ink-900 dark:text-white"><Price value={x.price} /></span>{x.price_was ? <s className="text-sm text-ink-400"><Price value={x.price_was} /></s> : null}</p></div>
          <CompareCheck id={x.slug} label={i.t('Compare', 'তুলনা')} />
        </div>
      </div>
    </article>
  );
}

export function CruiseCard({ i, c }: { i: I18n; c: C & { route?: string[] } }) {
  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden" data-item data-price={c.price} data-rating={c.rating} data-days={c.nights} data-region={c.region} data-dep={c.next_departure}>
      <div className="relative aspect-[16/10] overflow-hidden">
        <Picture img={c.image} alt={c.title} className="img-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5"><span className="badge bg-white text-ink-800">{c.region_label}</span>{c.badge ? <span className="badge bg-accent-400 text-ink-900">{c.badge}</span> : null}</div>
        <div className="absolute right-3 top-3 z-10"><Wish i={i} id={c.slug} kind="cruise" /></div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold text-white"><span className="inline-flex items-center gap-1"><Icon name="moon" className="h-3.5 w-3.5" /> {i.d(c.nights)} {i.t('nights', 'রাত')}</span><span className="inline-flex items-center gap-1"><Icon name="calendar-days" className="h-3.5 w-3.5" /> {i.date(c.next_departure)}</span></div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{c.ship} · {c.line}</p>
        <h3 className="mt-1 text-[17px] font-bold leading-snug"><Link className="after:absolute after:inset-0 hover:text-brand-700 dark:hover:text-brand-300" href={i.u(`/cruises/${c.slug}`)}>{c.title}</Link></h3>
        <p className="mt-2 line-clamp-1 text-sm muted"><Icon name="anchor" className="inline h-3.5 w-3.5" /> {(c.route ?? []).join(' → ')}</p>
        <div className="mt-2 flex items-center gap-2 text-sm"><Stars i={i} rating={c.rating} className="h-3.5 w-3.5" /><b>{i.d(c.rating)}</b><span className="muted">({i.num(c.reviews_count)})</span></div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-ink-100 pt-4 dark:border-ink-800">
          <div><p className="text-xs muted">{c.cabin_from}, {i.t('per person', 'জনপ্রতি')}</p><p className="flex items-baseline gap-2"><span className="text-xl font-extrabold text-ink-900 dark:text-white"><Price value={c.price} /></span>{c.price_was ? <s className="text-sm text-ink-400"><Price value={c.price_was} /></s> : null}</p></div>
          <CancelBadge policy={c.cancellation} />
        </div>
      </div>
    </article>
  );
}

export function ActivityCard({ i, a }: { i: I18n; a: A }) {
  return (
    <article className="card card-hover group relative flex h-full flex-col overflow-hidden" data-item data-price={a.price} data-rating={a.rating} data-cats={a.category} data-tier={a.cancellation?.kind} data-region={a.region}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Picture img={a.image} alt={a.title} className="img-cover transition duration-700 group-hover:scale-105" />
        {a.badge ? <span className="badge absolute left-3 top-3 bg-accent-400 text-ink-900">{a.badge}</span> : null}
        <div className="absolute right-3 top-3 z-10"><Wish i={i} id={a.slug} kind="activity" /></div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-ink-500 dark:text-ink-300">{a.category_label} · {a.city}</p>
        <h3 className="mt-1 line-clamp-2 font-bold leading-snug"><Link className="after:absolute after:inset-0 hover:text-brand-700 dark:hover:text-brand-300" href={i.u(`/activities/${a.slug}`)}>{a.title}</Link></h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs muted"><span className="inline-flex items-center gap-1"><Icon name="clock" className="h-3.5 w-3.5" /> {a.duration}</span>{a.pickup ? <span className="inline-flex items-center gap-1"><Icon name="car" className="h-3.5 w-3.5" /> {i.t('Pickup', 'পিকআপ')}</span> : null}</p>
        <div className="mt-2"><CancelBadge policy={a.cancellation} /></div>
        <div className="mt-auto flex items-end justify-between pt-3"><span className="inline-flex items-center gap-1 text-sm"><Icon name="star" className="h-3.5 w-3.5 fill-current text-accent-400" /><b>{i.d(a.rating)}</b><span className="muted">({i.num(a.reviews_count)})</span></span><span className="text-right"><span className="block text-[11px] muted">{i.t('from', 'শুরু')}</span><b className="text-lg"><Price value={a.price} /></b></span></div>
      </div>
    </article>
  );
}

export function DestCard({ i, d, tall = false, priority = false }: { i: I18n; d: D; tall?: boolean; priority?: boolean }) {
  return (
    <Link href={i.u(`/destinations/${d.slug}`)} className={`group relative block overflow-hidden rounded-3xl ${tall ? 'aspect-[4/5]' : 'aspect-[4/3]'}`}>
      <Picture img={d.image} alt={d.name} className="img-cover transition duration-700 group-hover:scale-110" priority={priority} sizes={tall ? '(min-width: 768px) 50vw, 80vw' : '(min-width: 768px) 25vw, 66vw'} />
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/10 to-transparent" />
      <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 text-white">
        <span><span className="block text-xl font-bold">{d.name}</span><span className="text-sm text-white/80">{d.country} · {i.d(d.tours_count)} {i.t('tours', 'ট্যুর')}</span></span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-accent-400 group-hover:text-ink-900"><Icon name="arrow-up-right" className="h-5 w-5" /></span>
      </span>
    </Link>
  );
}

export function HotelCard({ i, h }: { i: I18n; h: H & { rating?: number } }) {
  const score = h.rating ?? h.guest_score;
  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden sm:flex-row" data-item data-price={h.price} data-rating={score} data-stars={h.stars}>
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:aspect-auto sm:w-64 lg:w-72">
        <Picture img={h.image} alt={h.name} className="img-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute right-3 top-3 z-10"><Wish i={i} id={h.slug} kind="hotel" /></div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5 md:flex-row">
        <div className="flex-1">
          <div className="flex items-center gap-1 text-accent-400" role="img" aria-label={`${i.d(h.stars)} ${i.t('star hotel', 'তারকা হোটেল')}`}>{Array.from({ length: h.stars }).map((_, k) => <Icon key={k} name="star" className="h-3.5 w-3.5 fill-current" />)}</div>
          <h3 className="mt-1 text-lg font-bold"><Link className="after:absolute after:inset-0 hover:text-brand-700 dark:hover:text-brand-300" href={i.u(`/hotels/${h.slug}`)}>{h.name}</Link></h3>
          <p className="mt-1 flex items-center gap-1 text-sm muted"><Icon name="map-pin" className="h-4 w-4" /> {h.city} · {h.distance}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">{h.amenities.slice(0, 4).map((a) => <span key={a.code} className="badge badge-gray"><Icon name={a.icon} className="h-3.5 w-3.5" /> {a.label}</span>)}</div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold">{h.refundable ? <span className="text-emerald-700 dark:text-emerald-400">✓ {i.t('Free cancellation', 'ফ্রি বাতিল')}</span> : null}{h.breakfast ? <span className="text-emerald-700 dark:text-emerald-400">✓ {i.t('Breakfast included', 'নাশতা অন্তর্ভুক্ত')}</span> : null}</div>
        </div>
        <div className="flex shrink-0 flex-row items-end justify-between gap-2 border-t border-ink-100 pt-3 dark:border-ink-800 md:w-44 md:flex-col md:border-l md:border-t-0 md:pl-5 md:pt-0">
          <div className="flex items-center gap-2 md:flex-row-reverse"><span className="rounded-lg bg-brand-700 px-2 py-1 text-sm font-bold text-white">{i.d(score)}</span><span className="text-xs leading-tight muted">{score >= 9 ? i.t('Excellent', 'চমৎকার') : i.t('Very good', 'খুব ভালো')}<br />{i.num(h.reviews_count)} {i.t('reviews', 'রিভিউ')}</span></div>
          <div className="text-right">{h.price_was ? <s className="text-sm text-ink-400"><Price value={h.price_was} /></s> : null}<p className="text-xl font-extrabold text-ink-900 dark:text-white"><Price value={h.price} /></p><p className="text-xs muted">{i.t('per night, incl. VAT', 'প্রতি রাত, ভ্যাটসহ')}</p></div>
        </div>
      </div>
    </article>
  );
}

export function ReviewCard({ i, r }: { i: I18n; r: Review & { body?: string } }) {
  return (
    <figure className="card flex h-full flex-col p-6">
      <div className="flex items-center justify-between"><Stars i={i} rating={r.rating} /><Icon name="quote" className="h-8 w-8 text-brand-100 dark:text-brand-900" /></div>
      <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-ink-700 dark:text-ink-200">“{r.body ?? r.text}”</blockquote>
      <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4 dark:border-ink-800"><Avatar initials={r.initials} /><div><p className="font-bold text-ink-900 dark:text-white">{r.name}</p><p className="text-xs muted">{r.trip} · {r.city}</p></div></figcaption>
    </figure>
  );
}
