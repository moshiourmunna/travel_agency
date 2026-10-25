import Link from 'next/link';
import { Icon } from '@/components/icons/Icon';
import { AppBadges } from '@/components/ui/AppBadges';
import { CountUp, Countdown, QuickFilter, ScrollButtons } from '@/components/client/HomeBits';
import { Price } from '@/components/client/Price';
import { SearchWidget } from '@/components/layout/SearchWidget';
import { FaqList, SecHead, Stars } from '@/components/ui/basics';
import { ActivityCard, DestCard, ReviewCard, TourCard } from '@/components/ui/cards';
import { Picture } from '@/components/ui/Picture';
import type { I18n } from '@/lib/i18n';
import type { Section } from '@/lib/types';

type P = { i: I18n; s: Section; site: any };
const link = (i: I18n, l?: { url: string; label: string }) => (l ? { link: i.u(l.url), linkLabel: l.label } : {});
const COLORS: Record<string, string> = {
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rose: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300', brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
};

function Hero({ i, s }: P) {
  const d = s.data;
  return (
    <section className="relative isolate overflow-hidden bg-ink-950">
      <Picture img={d.bg_image} alt={d.image_alt} className="img-cover absolute inset-0 -z-20" priority sizes="100vw" width={1600} height={1000} />
      <div className="hero-shade absolute inset-0 -z-10" />
      <div className="wrap flex min-h-[640px] flex-col justify-end pb-10 pt-16 sm:pt-24 lg:min-h-[760px] lg:pb-16">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur sm:text-sm"><Stars i={i} rating={d.rating ?? 5} className="h-3.5 w-3.5" /> {d.rating_text}</p>
          <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.08] text-white text-shadow text-balance sm:text-6xl lg:text-7xl">
            {d.title} <span className={i.lang === 'bn' ? 'text-accent-300' : 'font-display font-medium italic text-accent-300'}>{d.title_accent}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-xl">{d.subtitle}</p>
        </div>
        {d.show_search !== false ? <div className="mt-8 lg:mt-10"><SearchWidget i={i} /></div> : null}
      </div>
    </section>
  );
}

function TrustStrip({ s }: P) {
  return (
    <section className="border-b border-ink-100 bg-white dark:border-ink-800 dark:bg-ink-900" aria-label={s.data.label}>
      <div className="wrap no-scrollbar flex gap-8 overflow-x-auto py-5 lg:justify-between">
        {s.data.items.map((x: any, k: number) => (
          <div key={k} className="flex shrink-0 items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={x.icon} /></span><div><p className="text-sm font-bold text-ink-900 dark:text-white">{x.title}</p><p className="text-xs muted">{x.text}</p></div></div>
        ))}
      </div>
    </section>
  );
}

function Categories({ i, s }: P) {
  return (
    <section className="section pb-0">
      <div className="wrap">
        <SecHead eyebrow={s.data.eyebrow} title={s.data.title} center />
        <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-9 md:px-0">
          {(s.items ?? []).map((c: any) => (
            <Link key={c.slug} href={c.slug === 'cruise' ? i.u('/cruises') : i.u(`/tours?type=${c.slug}`)} className="group flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl border border-ink-100 bg-white p-4 text-center transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-soft dark:border-ink-800 dark:bg-ink-900 md:w-auto">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:scale-110 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={c.icon} className="h-6 w-6" /></span>
              <span className="text-sm font-semibold text-ink-700 dark:text-ink-200">{c.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function DestinationsBento({ i, s }: P) {
  const ds = s.items ?? [];
  return (
    <section className="section">
      <div className="wrap">
        <SecHead eyebrow={s.data.eyebrow} title={s.data.title} sub={s.data.subtitle} {...link(i, s.data.link)} />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 md:mx-0 md:grid md:scroll-px-0 md:grid-cols-4 md:grid-rows-2 md:px-0 lg:h-[560px]">
          {ds[0] ? <div className="w-[78%] shrink-0 snap-start md:col-span-2 md:row-span-2 md:w-auto [&>a]:h-full [&>a]:aspect-auto md:[&>a]:min-h-[420px]"><DestCard i={i} d={ds[0]} tall /></div> : null}
          {ds.slice(1, 5).map((d: any) => <div key={d.slug} className="w-[66%] shrink-0 snap-start md:w-auto [&>a]:h-full md:[&>a]:aspect-auto"><DestCard i={i} d={d} /></div>)}
        </div>
      </div>
    </section>
  );
}

function Deals({ i, s }: P) {
  const { t } = i;
  return (
    <section className="section bg-gradient-to-b from-accent-50 to-white dark:from-ink-900 dark:to-ink-950">
      <div className="wrap">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div><p className="eyebrow text-accent-700 dark:text-accent-300"><Icon name="zap" className="h-4 w-4" /> {s.data.eyebrow}</p><h2 className="h-section">{s.data.title}</h2></div>
          <div className="flex items-center gap-3">
            {s.data.countdown_to ? <Countdown to={s.data.countdown_to} className="flex items-center gap-2 rounded-2xl bg-ink-900 px-4 py-2 text-white dark:bg-white/10" label={t('Offer ends in', 'অফার শেষ হবে')} endsLabel={t('Ends in', 'শেষ হবে')} /> : null}
            <ScrollButtons target="#deals" prev={t('Previous', 'আগের')} next={t('Next', 'পরের')}>{[<Icon key="l" name="chevron-left" />, <Icon key="r" name="chevron-right" />]}</ScrollButtons>
          </div>
        </div>
        <div id="deals" className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-px-4 px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
          {(s.items ?? []).map((o: any) => (
            <Link key={o.code} href={i.u(o.link || '/offers')} className="group relative flex w-[82%] shrink-0 snap-start overflow-hidden rounded-3xl bg-ink-900 text-white sm:w-[420px]">
              <Picture img={o.image} className="img-cover absolute inset-0 opacity-70 transition duration-700 group-hover:scale-105" sizes="420px" />
              <span className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/60 to-transparent" />
              <span className="relative flex min-h-[220px] flex-col p-6">
                <span className="badge w-fit bg-white/15 text-white backdrop-blur">{o.tag}</span>
                <span className="mt-3 max-w-[16rem] text-xl font-bold leading-snug">{o.title}</span>
                <span className="mt-1 text-2xl font-extrabold text-accent-300">{o.discount}</span>
                <span className="mt-auto flex items-center gap-3 pt-4 text-xs"><span className="rounded-lg border border-dashed border-white/40 px-2 py-1 font-mono font-bold tracking-wider">{o.code}</span>{o.ends_at ? <span className="text-white/70">{t('Valid till', 'মেয়াদ')} {i.date(o.ends_at)}</span> : null}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Tours({ i, s }: P) {
  const total = s.data.total ?? null;
  return (
    <section className="section">
      <div className="wrap">
        <QuickFilter label={i.t('Filter packages', 'প্যাকেজ ফিল্টার')} options={s.data.filters ?? []} header={<div><p className="eyebrow">{s.data.eyebrow}</p><h2 className="h-section">{s.data.title}</h2></div>}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{(s.items ?? []).map((x: any) => <TourCard key={x.slug} i={i} x={x} />)}</div>
        </QuickFilter>
        <div className="mt-10 text-center"><Link href={i.u(s.data.link?.url ?? '/tours')} className="btn btn-outline btn-lg">{(s.data.link?.label ?? '').replace(':count', i.d(total ?? ''))} <Icon name="arrow-right" className="h-4 w-4" /></Link></div>
      </div>
    </section>
  );
}

function Themes({ i, s }: P) {
  return (
    <section className="section bg-ink-50 dark:bg-ink-900/40" aria-labelledby="themes-h">
      <div className="wrap">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">{s.data.eyebrow}</p><h2 id="themes-h" className="h-section">{s.data.title}</h2></div>{s.data.link ? <Link href={i.u(s.data.link.url)} className="link inline-flex items-center gap-1">{s.data.link.label} <Icon name="arrow-right" className="h-4 w-4" /></Link> : null}</div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {(s.items ?? []).map((th: any) => (
            <Link key={th.slug} href={i.u(`/holidays/${th.slug}`)} className="group relative aspect-[3/4] overflow-hidden rounded-3xl">
              <Picture img={th.image} className="img-cover transition duration-700 group-hover:scale-110" sizes="(min-width: 1024px) 16vw, 50vw" />
              <span className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/20 to-transparent" />
              <span className="absolute inset-x-0 bottom-0 p-4 text-white"><span className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur"><Icon name={th.icon} className="h-5 w-5" /></span><span className="block font-bold leading-tight">{th.name}</span><span className="text-xs text-white/75">{i.d(th.tours_count)} {i.t('trips', 'টি ট্রিপ')}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cruises({ i, s }: P) {
  const d = s.data;
  return (
    <section className="relative overflow-hidden bg-ink-950 py-16 text-white md:py-24" aria-labelledby="cruise-h">
      <Picture img={d.bg_image} className="absolute inset-0 h-full w-full object-cover opacity-25" sizes="100vw" width={1600} height={1000} />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/80 to-ink-950/40" />
      <div className="wrap relative grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
        <div>
          <p className="eyebrow text-accent-300"><Icon name="ship" className="h-4 w-4" /> {d.eyebrow}</p>
          <h2 id="cruise-h" className="h-section text-white">{d.title}</h2>
          <p className="mt-4 text-ink-300">{d.subtitle}</p>
          <ul className="mt-6 grid grid-cols-2 gap-3 text-sm">{(d.features ?? []).map((f: any, k: number) => <li key={k} className="flex items-center gap-2"><Icon name={f.icon} className="h-4 w-4 text-accent-300" /> {f.title}</li>)}</ul>
          <div className="mt-7 flex flex-wrap gap-3">
            {d.primary ? <Link href={i.u(d.primary.url)} className="btn btn-accent btn-lg">{d.primary.label}</Link> : null}
            {d.secondary ? <Link href={i.u(d.secondary.url)} className="btn btn-lg bg-white/10 text-white ring-1 ring-white/25 hover:bg-white/20">{d.secondary.label}</Link> : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(s.items ?? []).map((c: any) => (
            <Link key={c.slug} href={i.u(`/cruises/${c.slug}`)} className="group overflow-hidden rounded-3xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10">
              <div className="relative aspect-[16/9] overflow-hidden"><Picture img={c.image} className="img-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 640px) 30vw, 100vw" /><span className="badge absolute left-3 top-3 bg-white text-ink-800">{i.d(c.nights)} {i.t('nights', 'রাত')}</span></div>
              <div className="p-4"><p className="font-bold leading-snug">{c.title}</p><p className="mt-1 text-xs text-ink-400">{c.ship} · {c.depart_port}</p><p className="mt-2 text-sm text-ink-300">{i.t('from', 'শুরু')} <b className="text-lg text-white"><Price value={c.price} /></b></p></div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Activities({ i, s }: P) {
  return (
    <section className="section" aria-labelledby="act-h">
      <div className="wrap">
        <SecHead id="act-h" eyebrow={s.data.eyebrow} title={s.data.title} sub={s.data.subtitle} {...link(i, s.data.link)} />
        <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:scroll-px-0 md:grid-cols-2 md:px-0 lg:grid-cols-4">
          {(s.items ?? []).map((a: any) => <div key={a.slug} className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto"><ActivityCard i={i} a={a} /></div>)}
        </div>
      </div>
    </section>
  );
}

function TrustSafety({ s }: P) {
  const d = s.data;
  return (
    <section className="section bg-brand-50/60 dark:bg-brand-950/40" aria-labelledby="trust-h">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <p className="eyebrow">{d.eyebrow}</p><h2 id="trust-h" className="h-section">{d.title}</h2><p className="mt-4 muted">{d.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-2">{(d.badges ?? []).map((b: string) => <span key={b} className="chip bg-white font-bold dark:bg-ink-900">{b}</span>)}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {d.items.map((x: any, k: number) => <div key={k} className="card p-5"><span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-700 text-white"><Icon name={x.icon} className="h-5 w-5" /></span><h3 className="mt-3 font-bold">{x.title}</h3><p className="mt-1 text-sm muted">{x.text}</p></div>)}
        </div>
      </div>
    </section>
  );
}

function Services({ i, s }: P) {
  return (
    <section className="section">
      <div className="wrap">
        <SecHead eyebrow={s.data.eyebrow} title={s.data.title} center />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {s.data.items.map((x: any, k: number) => (
            <Link key={k} href={i.u(x.url)} className="card card-hover group flex gap-4 p-6">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${COLORS[x.color] ?? COLORS.brand}`}><Icon name={x.icon} className="h-6 w-6" /></span>
              <span><span className="flex items-center gap-1 font-bold text-ink-900 dark:text-white">{x.title} <Icon name="arrow-right" className="h-4 w-4 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" /></span><span className="mt-1 block text-sm muted">{x.text}</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs({ i, s }: P) {
  const d = s.data;
  const g = d.gallery_images ?? [];
  const alts = d.gallery_alts ?? [];
  return (
    <section className="section bg-ink-50 dark:bg-ink-900/40">
      <div className="wrap grid items-center gap-12 lg:grid-cols-2">
        <div className="relative grid grid-cols-2 gap-4">
          <Picture img={g[0]} alt={alts[0]} className="aspect-[3/4] w-full rounded-3xl object-cover" sizes="(min-width: 1024px) 25vw, 50vw" />
          <div className="grid gap-4"><Picture img={g[1]} alt={alts[1]} className="aspect-square w-full rounded-3xl object-cover" sizes="(min-width: 1024px) 25vw, 50vw" /><Picture img={g[2]} alt={alts[2]} className="aspect-[4/3] w-full rounded-3xl object-cover" sizes="(min-width: 1024px) 25vw, 50vw" /></div>
          {d.award ? (
            <div className="absolute -bottom-6 left-1/2 w-[85%] -translate-x-1/2 rounded-2xl bg-white p-4 shadow-lift dark:bg-ink-800 sm:w-auto">
              <div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-100 text-accent-700"><Icon name="award" className="h-6 w-6" /></span><div><p className="font-bold text-ink-900 dark:text-white">{d.award.title}</p><p className="text-xs muted">{d.award.text}</p></div></div>
            </div>
          ) : null}
        </div>
        <div>
          <p className="eyebrow">{d.eyebrow}</p><h2 className="h-section">{d.title}</h2><p className="mt-4 lead">{d.subtitle}</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {d.items.map((x: any, k: number) => <li key={k} className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-soft dark:bg-ink-800 dark:text-brand-300"><Icon name={x.icon} className="h-5 w-5" /></span><span><b className="block text-ink-900 dark:text-white">{x.title}</b><span className="text-sm muted">{x.text}</span></span></li>)}
          </ul>
          <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(s.items ?? []).map((st: any, k: number) => <div key={k} className="rounded-2xl bg-white p-4 text-center shadow-soft dark:bg-ink-800"><dt className="sr-only">{st.label}</dt><dd><CountUp value={st.value} suffix={st.suffix} format="lakh" /><span className="text-xs muted">{st.label}</span></dd></div>)}
          </dl>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ i, s }: P) {
  return (
    <section className="section">
      <div className="wrap">
        <SecHead eyebrow={s.data.eyebrow} title={s.data.title} center />
        <ol className="grid gap-6 md:grid-cols-4">
          {s.data.items.map((x: any, k: number) => (
            <li key={k} className="relative text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-lift"><Icon name={x.icon} className="h-7 w-7" /></span><span className="absolute left-1/2 top-0 ml-6 grid h-7 w-7 place-items-center rounded-full bg-accent-400 text-xs font-bold text-ink-900">{i.d(k + 1)}</span><h3 className="mt-4 text-lg font-bold">{x.title}</h3><p className="mt-1 text-sm muted">{x.text}</p></li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Testimonials({ i, s }: P) {
  const d = s.data;
  return (
    <section className="section bg-brand-950 text-white">
      <div className="wrap">
        <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="eyebrow text-brand-300">{d.eyebrow}</p><h2 className="h-section text-white">{d.title}</h2></div>
          <div className="flex flex-wrap gap-3">{(d.platforms ?? []).map((p: any) => <div key={p.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5"><p className="text-xs text-brand-200">{p.name}</p><p className="flex items-center gap-1.5"><b className="text-lg">{i.d(p.rating)}</b><Stars i={i} rating={p.rating} className="h-3.5 w-3.5" /><span className="text-xs text-brand-200">({i.num(p.count)})</span></p></div>)}</div>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:grid md:scroll-px-0 md:grid-cols-3 md:px-0 [&_.card]:border-white/10 [&_.card]:bg-white/5 [&_blockquote]:text-ink-100 [&_figcaption]:border-white/10 [&_p.font-bold]:text-white [&_.muted]:text-brand-200">
          {(s.items ?? []).map((r: any) => <div key={r.id} className="w-[85%] shrink-0 snap-start md:w-auto"><ReviewCard i={i} r={r} /></div>)}
        </div>
        {d.link ? <div className="mt-8 text-center"><Link className="btn btn-white" href={i.u(d.link.url)}>{d.link.label}</Link></div> : null}
      </div>
    </section>
  );
}

function Partners({ s }: P) {
  const items = s.items ?? [];
  return (
    <section className="border-b border-ink-100 py-10 dark:border-ink-800" aria-label={s.data.label}>
      <p className="mb-6 text-center text-sm font-semibold text-ink-500 dark:text-ink-300">{s.data.title}</p>
      <div className="relative overflow-hidden mask-fade-r"><div className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
        {[0, 1].map((rep) => items.map((a: any) => (
          <span key={`${rep}-${a.code}`} className="flex shrink-0 items-center gap-2 rounded-2xl border border-ink-100 bg-white px-5 py-3 dark:border-ink-800 dark:bg-ink-900" aria-hidden={rep ? true : undefined}><span className="grid h-8 w-8 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ background: a.color }}>{a.code}</span><span className="text-sm font-bold text-ink-700 dark:text-ink-200">{a.name}</span></span>
        )))}
      </div></div>
    </section>
  );
}

function Blog({ i, s }: P) {
  return (
    <section className="section">
      <div className="wrap">
        <SecHead eyebrow={s.data.eyebrow} title={s.data.title} {...link(i, s.data.link)} />
        <div className="grid gap-6 md:grid-cols-3">
          {(s.items ?? []).map((p: any) => (
            <article key={p.slug} className="group relative">
              <div className="aspect-[16/10] overflow-hidden rounded-3xl"><Picture img={p.image} className="img-cover transition duration-700 group-hover:scale-105" sizes="(min-width: 768px) 33vw, 100vw" /></div>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold"><span className="badge badge-brand">{p.category}</span><span className="muted">{i.date(p.published_at)} · {i.d(p.reading_mins)} {i.t('min read', 'মিনিট পড়া')}</span></div>
              <h3 className="mt-2 text-lg font-bold leading-snug"><Link href={i.u(`/blog/${p.slug}`)} className="after:absolute after:inset-0 group-hover:text-brand-700 dark:group-hover:text-brand-300">{p.title}</Link></h3>
              <p className="mt-2 line-clamp-2 text-sm muted">{p.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function AppPromo({ i, s, site }: P) {
  const d = s.data;
  return (
    <section className="pb-16 md:pb-20">
      <div className="wrap">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 px-6 py-12 text-white sm:px-12 lg:py-0">
          <div className="pattern-dots absolute inset-0 opacity-50" />
          <div className="relative grid items-center gap-10 lg:grid-cols-2">
            <div className="lg:py-16">
              <p className="eyebrow text-accent-300">{d.eyebrow}</p><h2 className="h-section text-white">{d.title}</h2><p className="mt-4 max-w-lg text-brand-100">{d.subtitle}</p>
              <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">{(d.features ?? []).map((f: string, k: number) => <li key={k} className="flex items-center gap-2"><Icon name="circle-check" className="h-4 w-4 text-accent-300" /> {f}</li>)}</ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <AppBadges i={i} links={site.settings.app?.links ?? {}} variant="promo" />
              </div>
            </div>
            <div className="relative mx-auto w-60 lg:mt-12 lg:self-end" aria-hidden="true">
              <div className="rounded-t-[2.5rem] border-[10px] border-b-0 border-ink-900 bg-white pb-6 shadow-2xl dark:bg-ink-900">
                <div className="mx-auto mt-2 h-5 w-24 rounded-full bg-ink-900" />
                <div className="p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <div className="flex items-center justify-between"><img src="/brand/icon.svg" className="h-7 w-7 rounded-lg" alt="" width={28} height={28} /><span className="text-[10px] font-semibold text-ink-500">{d.phone?.greeting}</span></div>
                  <div className="mt-3 overflow-hidden rounded-2xl"><Picture img={d.phone_image} className="h-28 w-full object-cover" sizes="220px" /></div>
                  <p className="mt-2 text-xs font-bold text-ink-900 dark:text-white">{d.phone?.trip}</p>
                  <div className="mt-2 rounded-xl bg-brand-50 p-2 text-[10px] text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">{d.phone?.flight}</div>
                  <div className="mt-2 grid grid-cols-3 gap-1.5">{['ticket', 'hotel', 'shield-check'].map((x) => <div key={x} className="grid h-12 place-items-center rounded-xl bg-ink-50 text-brand-700 dark:bg-ink-800"><Icon name={x} className="h-4 w-4" /></div>)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq({ i, s, site }: P) {
  const c = site.settings.company ?? {};
  return (
    <section className="section bg-ink-50 pt-16 dark:bg-ink-900/40">
      <div className="wrap grid gap-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">{s.data.eyebrow}</p><h2 className="h-section">{s.data.title}</h2><p className="mt-4 lead">{s.data.subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3"><a href={`tel:${c.hotline_tel}`} className="btn btn-primary"><Icon name="phone" className="h-4 w-4" /> {i.d(c.hotline)}</a>{s.data.link ? <Link href={i.u(s.data.link.url)} className="btn btn-outline">{s.data.link.label}</Link> : null}</div>
        </div>
        <FaqList items={s.items ?? []} />
      </div>
    </section>
  );
}

const MAP: Record<string, (p: P) => React.ReactNode> = {
  hero: Hero, trust_strip: TrustStrip, categories: Categories, destinations_bento: DestinationsBento, deals: Deals, tours: Tours, themes: Themes, cruises: Cruises,
  activities: Activities, trust_safety: TrustSafety, services: Services, why_us: WhyUs, how_it_works: HowItWorks, testimonials: Testimonials, partners: Partners,
  blog: Blog, app_promo: AppPromo, faq: Faq,
};

/** Renders CMS sections in admin-defined order; unknown types are skipped (forward compatible). */
export function Sections({ i, sections, site }: { i: I18n; sections: Section[]; site: any }) {
  return <>{sections.map((s) => { const C = MAP[s.type]; return C ? <C key={s.id} i={i} s={s} site={site} /> : null; })}</>;
}
