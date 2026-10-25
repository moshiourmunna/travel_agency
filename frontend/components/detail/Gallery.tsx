import { Icon } from '@/components/icons/Icon';
import { Picture } from '@/components/ui/Picture';
import type { I18n } from '@/lib/i18n';
import type { Image } from '@/lib/types';
import { LightboxScope } from './Lightbox';

/** 5-up bento gallery (swipe row on mobile) with lightbox — mockup tour/cruise/hotel header. */
export function Gallery({ i, images, title }: { i: I18n; images: Image[]; title: string }) {
  const g = images.filter(Boolean).slice(0, 5);
  return (
    <section className="wrap mt-4" aria-label={i.t('Photo gallery', 'ছবির গ্যালারি')}>
      <LightboxScope className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 md:mx-0 md:grid md:h-[460px] md:grid-cols-4 md:grid-rows-2 md:scroll-px-0 md:px-0"
        labels={{ viewer: i.t('Photo viewer', 'ছবি দর্শক'), close: i.t('Close', 'বন্ধ'), prev: i.t('Previous photo', 'আগের ছবি'), next: i.t('Next photo', 'পরের ছবি') }}
        closeIcon={<Icon name="x" />} prevIcon={<Icon name="chevron-left" />} nextIcon={<Icon name="chevron-right" />}>
        {g.map((im, k) => (
          <a key={k} href={im!.srcset?.[2]?.url ?? im!.src} data-lightbox data-caption={title}
            className={`relative w-[85%] shrink-0 snap-start overflow-hidden rounded-2xl md:w-auto md:rounded-none ${k === 0 ? 'md:col-span-2 md:row-span-2 md:rounded-l-3xl' : ''} ${k === 2 ? 'md:rounded-tr-3xl' : ''} ${k === 4 ? 'md:rounded-br-3xl' : ''}`}>
            <Picture img={im} alt={`${title} — ${i.t('photo', 'ছবি')} ${i.d(k + 1)}`} className="img-cover aspect-[16/10] md:aspect-auto" priority={k === 0} sizes={k === 0 ? '(min-width: 768px) 50vw, 85vw' : '(min-width: 768px) 25vw, 85vw'} width={k === 0 ? 1600 : 640} height={k === 0 ? 1000 : 400} />
            {k === 4 ? <span className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-900 shadow md:inline-flex"><Icon name="images" className="h-4 w-4" /> {i.t('View all photos', 'সব ছবি দেখুন')}</span> : null}
          </a>
        ))}
      </LightboxScope>
    </section>
  );
}

export function QuickFacts({ items }: { items: [icon: string, label: string, value: string][] }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([ic, k, v]) => (
        <li key={k} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 dark:border-ink-800"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"><Icon name={ic} className="h-5 w-5" /></span><div><p className="text-xs muted">{k}</p><p className="text-sm font-bold text-ink-900 dark:text-white">{v}</p></div></li>
      ))}
    </ul>
  );
}

export function SubNav({ i, items }: { i: I18n; items: [id: string, label: string][] }) {
  return (
    <nav className="no-scrollbar sticky top-16 z-20 -mx-4 mt-8 flex gap-6 overflow-x-auto border-b border-ink-100 bg-white/95 px-4 pt-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/95 lg:top-[72px] lg:mx-0 lg:px-0" aria-label={i.t('On this page', 'এই পাতায়')}>
      {items.map(([id, l]) => <a key={id} href={`#${id}`} className="tab-line">{l}</a>)}
    </nav>
  );
}
