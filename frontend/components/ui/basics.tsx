import Link from 'next/link';
import { Fragment } from 'react';
import { Icon } from '@/components/icons/Icon';
import type { I18n } from '@/lib/i18n';
import type { Image, Policy } from '@/lib/types';
import { Picture } from './Picture';

export function Stars({ i, rating, className = 'h-4 w-4' }: { i: I18n; rating: number; className?: string }) {
  return (
    <span className="stars" role="img" aria-label={`${i.t('Rated', 'রেটিং')} ${i.d(rating)}/${i.d(5)}`}>
      {[0, 1, 2, 3, 4].map((k) =>
        rating >= k + 0.75 ? <Icon key={k} name="star" className={`${className} fill-current`} /> : rating >= k + 0.25 ? <Icon key={k} name="star-half" className={`${className} fill-current`} /> : <Icon key={k} name="star" className={`${className} text-ink-200 dark:text-ink-700`} />,
      )}
    </span>
  );
}

export function SecHead({ eyebrow, title, sub, link, linkLabel, center = false, light = false, id }: {
  eyebrow?: string | null; title: string; sub?: string | null; link?: string | null; linkLabel?: string | null; center?: boolean; light?: boolean; id?: string;
}) {
  return (
    <div className={`mb-8 flex flex-col gap-4 md:mb-10 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className="max-w-2xl">
        {eyebrow ? <p className={`eyebrow ${light ? 'text-brand-300' : ''}`}>{eyebrow}</p> : null}
        <h2 id={id} className={`h-section text-balance ${light ? 'text-white' : ''}`}>{title}</h2>
        {sub ? <p className={`mt-3 ${light ? 'text-ink-300' : 'lead'}`}>{sub}</p> : null}
      </div>
      {link ? (
        <Link href={link} className={`group inline-flex shrink-0 items-center gap-1.5 text-sm font-bold ${light ? 'text-white' : 'text-brand-700 dark:text-brand-300'}`}>
          {linkLabel} <Icon name="arrow-right" className="h-4 w-4 transition group-hover:translate-x-1" />
        </Link>
      ) : null}
    </div>
  );
}

export type Crumb = [label: string, href: string];
export function Crumbs({ i, items, light = false }: { i: I18n; items: Crumb[]; light?: boolean }) {
  return (
    <nav aria-label={i.t('Breadcrumb', 'ব্রেডক্রাম্ব')} className="text-sm">
      <ol className={`flex flex-wrap items-center gap-1.5 ${light ? 'text-white/80' : 'text-ink-500 dark:text-ink-300'}`}>
        {items.map(([label, h], k) =>
          k < items.length - 1 ? (
            <Fragment key={k}>
              <li><Link href={h} className="hover:underline">{label}</Link></li>
              <li aria-hidden="true"><Icon name="chevron-right" className="h-3.5 w-3.5 opacity-60" /></li>
            </Fragment>
          ) : (
            <li key={k} aria-current="page" className={`font-semibold ${light ? 'text-white' : 'text-ink-800 dark:text-ink-100'}`}>{label}</li>
          ),
        )}
      </ol>
    </nav>
  );
}

export function PageHero({ i, title, sub, crumbs, image, children }: { i: I18n; title: string; sub?: string | null; crumbs: Crumb[]; image: Image | undefined; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      <Picture img={image} className="img-cover absolute inset-0 -z-10 opacity-60" priority sizes="100vw" width={1600} height={1000} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-950/90 via-ink-950/60 to-ink-950/20" />
      <div className="wrap py-12 md:py-20">
        <Crumbs i={i} items={crumbs} light />
        <h1 className="mt-4 max-w-3xl text-3xl font-extrabold text-white text-balance sm:text-5xl">{title}</h1>
        {sub ? <p className="mt-4 max-w-2xl text-base text-ink-200 sm:text-lg">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}

export function CancelBadge({ policy, className = '' }: { policy: Policy; className?: string }) {
  if (!policy) return null;
  const k = policy.kind;
  const tone = k === 'free' ? 'text-emerald-700 dark:text-emerald-400' : k === 'partial' ? 'text-amber-700 dark:text-amber-300' : 'text-ink-500 dark:text-ink-300';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tone} ${className}`}>
      <Icon name={k === 'free' ? 'circle-check' : k === 'partial' ? 'circle-alert' : 'circle-x'} className="h-3.5 w-3.5" /> {policy.label}
    </span>
  );
}

export function Avatar({ initials, className = 'h-11 w-11 text-sm', gradient = 'from-brand-500 to-brand-800' }: { initials?: string | null; className?: string; gradient?: string }) {
  return <span className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${gradient} font-bold text-white ${className}`} aria-hidden="true">{initials}</span>;
}

export function FaqList({ items, openFirst = true }: { items: { q: string; a: string }[]; openFirst?: boolean }) {
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-100 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
      {items.map((f, k) => (
        <details key={k} className="group" open={openFirst && k === 0} data-item>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-semibold text-ink-800 hover:bg-ink-50 dark:text-white dark:hover:bg-ink-850">
            <span>{f.q}</span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink-100 transition group-open:rotate-45 group-open:bg-brand-700 group-open:text-white dark:bg-ink-800"><Icon name="plus" className="h-4 w-4" /></span>
          </summary>
          <p className="px-5 pb-5 text-[15px] leading-7 text-ink-600 dark:text-ink-300">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Compact dark hero with a search form (hotels, flights). */
export function SearchHero({ i, title, sub, crumbs, image, opacity = 'opacity-45', children }: { i: I18n; title: string; sub?: string | null; crumbs: Crumb[]; image: Image | undefined; opacity?: string; children?: React.ReactNode }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      <Picture img={image} className={`img-cover absolute inset-0 -z-10 ${opacity}`} priority sizes="100vw" width={1600} height={1000} />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-950/30 to-ink-950" />
      <div className="wrap py-10 md:py-14">
        <Crumbs i={i} items={crumbs} light />
        <h1 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">{title}</h1>
        {sub ? <p className="mt-2 text-ink-200">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}

/** Light page header without image (compare, wishlist, sitemap, legal). */
export function PlainHero({ i, title, sub, crumbs, children }: { i: I18n; title: string; sub?: string | null; crumbs: Crumb[]; children?: React.ReactNode }) {
  return (
    <section className="border-b border-ink-100 bg-ink-50 py-10 dark:border-ink-800 dark:bg-ink-900">
      <div className="wrap">
        <Crumbs i={i} items={crumbs} />
        <h1 className="mt-3 text-3xl font-extrabold">{title}</h1>
        {sub ? <p className="mt-1 muted">{sub}</p> : null}
        {children}
      </div>
    </section>
  );
}
