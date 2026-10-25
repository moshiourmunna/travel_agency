import type { I18n } from '@/lib/i18n';

/** Offline stylised route map (mockup partials/route_map.html) — no third-party map scripts. */
export function RouteMap({ i, stops, query }: { i: I18n; stops: string[]; query: string }) {
  const n = stops.length;
  const pts = stops.map((_, k) => [Math.round((80 + (640 * k) / Math.max(n - 1, 1)) * 10) / 10, 190 + (k % 2 ? 60 : -45)] as const);
  const cut = (s: string) => (s.length > 22 ? s.slice(0, 21) + '…' : s);
  return (
    <figure className="overflow-hidden rounded-3xl border border-ink-100 dark:border-ink-800">
      <svg viewBox="0 0 800 380" className="h-auto w-full" role="img" aria-label={`${i.t('Route map', 'রুট ম্যাপ')}: ${stops.join(' → ')}`}>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D3F4EE" /><stop offset="1" stopColor="#A8E8DD" /></linearGradient>
          <pattern id="mgrid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#0D6B65" strokeOpacity=".08" /></pattern>
        </defs>
        <rect width="800" height="380" fill="url(#sea)" /><rect width="800" height="380" fill="url(#mgrid)" />
        <path d="M-20 300 C120 250 160 330 300 290 S520 210 600 250 S760 330 840 280 L840 400 L-20 400Z" fill="#F5ECCB" opacity=".9" />
        <path d="M-20 120 C80 60 200 140 320 90 S520 20 620 70 S780 40 840 60 L840 -20 L-20 -20Z" fill="#EEDCA0" opacity=".55" />
        <path d={'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L')} fill="none" stroke="#0D6B65" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        {pts.map(([x, y], k) => {
          const end = k === 0 || k === n - 1;
          return (
            <g key={k} transform={`translate(${x} ${y})`}>
              <circle r="17" fill={end ? '#F6A33B' : '#0D6B65'} stroke="#fff" strokeWidth="4" />
              <text y="5" textAnchor="middle" fontSize="13" fontWeight="800" fill={end ? '#0B1B2B' : '#fff'}>{i.d(k + 1)}</text>
              <text y={k % 2 === 0 ? 38 : -28} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0B1B2B">{cut(stops[k])}</text>
            </g>
          );
        })}
        <g transform="translate(740 330)"><circle r="22" fill="#fff" opacity=".85" /><path d="M0 -14 L5 0 L0 14 L-5 0Z" fill="#0D6B65" /><text y="-17" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0B1B2B">N</text></g>
      </svg>
      <figcaption className="flex items-center justify-between gap-3 bg-white px-4 py-3 text-xs muted dark:bg-ink-900"><span>{i.t('Indicative route — not to scale', 'নির্দেশক রুট — স্কেল অনুযায়ী নয়')}</span><a className="link" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`} target="_blank" rel="noopener">{i.t('Open in map', 'ম্যাপে খুলুন')} ↗</a></figcaption>
    </figure>
  );
}
