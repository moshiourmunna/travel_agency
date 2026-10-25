import type { Metadata } from 'next';
import { PlainHero, type Crumb } from '@/components/ui/basics';
import type { Lang } from '@/lib/format';
import { h2Sections } from '@/lib/html';
import { getI18n } from '@/lib/i18n';
import { getPage, pageMetadata } from '@/lib/page';
import { breadcrumbJsonLd, JsonLd } from '@/lib/seo';
import { getSite, siteUrl } from '@/lib/site';

export const legalMetadata = (lang: Lang, slug: string): Promise<Metadata> => pageMetadata(lang, slug, `/${slug}`);

/** Terms / privacy / refund policy: CMS page body (h2 + p) with numbered sections and a sticky contents list. */
export async function LegalPage({ lang, slug }: { lang: Lang; slug: string }) {
  const [i, page, site] = await Promise.all([getI18n(lang), getPage(slug, lang), getSite(lang)]);
  const t = i.t;
  const email = site.settings.company?.email as string | undefined;
  const crumbs: Crumb[] = [[t('Home', 'হোম'), i.u('/')], [page.title, i.u(`/${slug}`)]];
  const { toc, parts } = h2Sections(page.body ?? '', 'l', (text, n) => `${i.d(n)}. ${text}`);
  const updated = (page.data?.updated as string | undefined) ?? page.updated_at;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(siteUrl(site), crumbs)} />
      <PlainHero i={i} title={page.title} crumbs={crumbs} wrap="wrap max-w-5xl" big>
        {updated ? <p className="mt-2 muted">{t('Last updated', 'সর্বশেষ হালনাগাদ')}: {i.date(updated)}</p> : null}
      </PlainHero>
      <div className="wrap grid max-w-5xl gap-10 py-12 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block" aria-label={t('Contents', 'সূচিপত্র')}>
          <ol className="sticky top-24 space-y-2 text-sm">{toc.map((s) => <li key={s.id}><a className="link-muted" href={`#${s.id}`}>{s.text}</a></li>)}</ol>
        </nav>
        <div>
          <div className="prose-m" dangerouslySetInnerHTML={{ __html: parts.join('') }} />
          {email ? <div className="prose-m"><p>{t('Questions? Email', 'প্রশ্ন? ইমেইল করুন')} <a className="link" href={`mailto:${email}`}>{email}</a>.</p></div> : null}
        </div>
      </div>
    </>
  );
}
