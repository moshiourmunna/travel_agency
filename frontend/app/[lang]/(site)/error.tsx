'use client';

import { useEffect } from 'react';

const COPY = {
  en: { k: 'Something went wrong', h: 'We hit a bump in the road', p: 'This page could not load. Please try again — if it keeps happening, call or WhatsApp us and we will help right away.', retry: 'Try again', home: 'Home' },
  bn: { k: 'কিছু একটা সমস্যা হয়েছে', h: 'পথে একটু ঝাঁকুনি লেগেছে', p: 'পাতাটি লোড হয়নি। আবার চেষ্টা করুন — বারবার হলে কল বা হোয়াটসঅ্যাপ করুন, আমরা সঙ্গে সঙ্গে সাহায্য করব।', retry: 'আবার চেষ্টা করুন', home: 'হোম' },
};

/** Route-level error boundary (keeps header/footer). Copy is inline because the dictionary fetch may be what failed. */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.warn('[musafir] route error', error.digest ?? error.message); }, [error]);
  const lang = typeof document !== 'undefined' && document.documentElement.lang === 'bn' ? 'bn' : 'en';
  const c = COPY[lang];
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 py-16 text-center"><div className="max-w-lg">
      <p className="text-sm font-bold uppercase tracking-widest text-rose-600">{c.k}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{c.h}</h1>
      <p className="mt-3 muted">{c.p}</p>
      {error.digest ? <p className="mt-2 font-mono text-xs muted">ref: {error.digest}</p> : null}
      <div className="mt-6 flex justify-center gap-2"><button type="button" className="btn btn-primary" onClick={reset}>{c.retry}</button><a href={`/${lang}`} className="btn btn-outline">{c.home}</a></div>
    </div></section>
  );
}
