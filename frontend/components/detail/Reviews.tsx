import { Icon } from '@/components/icons/Icon';
import { Stars } from '@/components/ui/basics';
import { ReviewCard } from '@/components/ui/cards';
import type { I18n } from '@/lib/i18n';
import { ReviewDialog } from './ReviewDialog';

export type ReviewSummary = { rating: number; count: number; histogram: Record<string, number>; scores?: Record<string, number> | null; items: any[] };

export function ReviewsBlock({ i, r, subject }: { i: I18n; r: ReviewSummary; subject: { type: string; slug: string } }) {
  const t = i.t;
  const scoreLabels: Record<string, string> = { guide: t('Guide', 'গাইড'), hotels: t('Hotels', 'হোটেল'), value: t('Value', 'মূল্যমান'), transport: t('Transport', 'পরিবহন'), cabins: t('Cabins', 'কেবিন'), food: t('Food', 'খাবার'), staff: t('Staff', 'স্টাফ'), location: t('Location', 'অবস্থান'), cleanliness: t('Cleanliness', 'পরিচ্ছন্নতা') };
  const scores = r.scores ?? { guide: 4.9, hotels: 4.7, value: 4.8, transport: 4.6 };
  return (
    <section id="reviews" className="scroll-mt-32 pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{t('Traveller reviews', 'ভ্রমণকারীদের রিভিউ')}</h2>
        <ReviewDialog subject={subject} loginHref={i.u('/login')} openIcon={<Icon name="pen-line" className="h-4 w-4" />} closeIcon={<Icon name="x" />} starIcon={<Icon name="star" className="h-7 w-7 fill-current" />}
          l={{ open: t('Write a review', 'রিভিউ লিখুন'), title: t('Write a review', 'রিভিউ লিখুন'), rating: t('Your rating', 'আপনার রেটিং'), ratingErr: t('Please choose a rating.', 'রেটিং দিন।'), titleLabel: t('Title', 'শিরোনাম'), titleErr: t('Add a short title.', 'ছোট একটি শিরোনাম দিন।'), body: t('Your experience', 'আপনার অভিজ্ঞতা'), bodyErr: t('Please write at least 20 characters.', 'কমপক্ষে ২০ অক্ষর লিখুন।'), cancel: t('Cancel', 'বাতিল'), submit: t('Submit review', 'রিভিউ জমা দিন'), close: t('Close', 'বন্ধ'), stars: t('stars', 'তারকা'), success: t('Thank you! Your review will appear after moderation.', 'ধন্যবাদ! যাচাইয়ের পর আপনার রিভিউ প্রকাশিত হবে।'), signin: t('Only travellers who completed this trip can review.', 'শুধু এই ট্রিপ সম্পন্ন করা ভ্রমণকারীরা রিভিউ দিতে পারেন।'), signinCta: t('Sign in to continue', 'চালিয়ে যেতে সাইন ইন করুন'), failed: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।') }} />
      </div>
      <div className="mt-5 grid gap-6 rounded-3xl bg-ink-50 p-6 dark:bg-ink-900 md:grid-cols-[200px_1fr]">
        <div className="text-center md:border-r md:border-ink-200 md:pr-6 dark:md:border-ink-800"><p className="text-5xl font-extrabold text-ink-900 dark:text-white">{i.d(r.rating)}</p><div className="flex justify-center"><Stars i={i} rating={r.rating} /></div><p className="mt-1 text-sm muted">{i.num(r.count)} {t('verified reviews', 'যাচাইকৃত রিভিউ')}</p></div>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((s) => { const pc = r.histogram?.[s] ?? 0; return (
            <div key={s} className="flex items-center gap-3 text-sm"><span className="w-10 shrink-0">{i.d(s)} ★</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800" role="img" aria-label={`${i.d(s)} ★ ${i.d(pc)}%`}><span className="block h-full rounded-full bg-accent-400" style={{ width: `${pc}%` }} /></span><span className="w-10 shrink-0 text-right muted">{i.d(pc)}%</span></div>
          ); })}
          <div className="flex flex-wrap gap-2 pt-2">{Object.entries(scores).map(([k, v]) => <span key={k} className="badge badge-brand">{scoreLabels[k] ?? k} {i.d(v)}</span>)}</div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{r.items.map((x) => <ReviewCard key={x.id} i={i} r={x} />)}</div>
    </section>
  );
}
