'use client';
import { useRef, useState } from 'react';
import { useSite } from '@/components/client/SiteContext';
import { toast } from '@/components/client/store';

export type AuthMode = 'login' | 'register' | 'forgot';
type L = Record<string, string>;

/** Six single-digit boxes that behave as one code field (paste, backspace, arrows). */
function OtpBoxes({ L, first = false }: { L: L; first?: boolean }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const go = (k: number) => refs.current[Math.max(0, Math.min(5, k))]?.focus();
  return (
    <div className="flex justify-between gap-2" role="group" aria-label={L.code}>
      {Array.from({ length: 6 }, (_, k) => (
        <input key={k} ref={(el) => { refs.current[k] = el; }} name={`otp${k}`} className="input h-14 w-full p-0 text-center text-xl font-bold" inputMode="numeric" maxLength={1} required
          aria-label={`${L.digit} ${L.digits.split(',')[k]}`} autoComplete={first && k === 0 ? 'one-time-code' : 'off'}
          onInput={(e) => { const v = e.currentTarget.value.replace(/\D/g, ''); e.currentTarget.value = v.slice(-1); if (v) go(k + 1); }}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !e.currentTarget.value) go(k - 1); if (e.key === 'ArrowLeft') go(k - 1); if (e.key === 'ArrowRight') go(k + 1); }}
          onPaste={(e) => { const d = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6); if (!d) return; e.preventDefault(); d.split('').forEach((c, j) => { const el = refs.current[j]; if (el) el.value = c; }); go(d.length); }} />
      ))}
    </div>
  );
}

function Password({ id, label, L, eye, autoComplete, extra }: { id: string; label: string; L: L; eye: React.ReactNode; autoComplete: string; extra?: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <div className="flex justify-between"><label className="label" htmlFor={id}>{label}</label>{extra}</div>
      <div className="relative">
        <input id={id} name="password" type={show ? 'text' : 'password'} className="input pr-12" required minLength={8} autoComplete={autoComplete} />
        <button type="button" className="icon-btn absolute right-2 top-1/2 h-9 w-9 -translate-y-1/2" aria-pressed={show} aria-label={L.showPw} onClick={() => setShow(!show)}>{eye}</button>
      </div>
    </div>
  );
}

/** Read the 6 OTP boxes inside a form. */
const readOtp = (form: HTMLFormElement) => Array.from({ length: 6 }, (_, k) => (form.elements.namedItem(`otp${k}`) as HTMLInputElement | null)?.value ?? '').join('');

/** Where to go after signing in: ?next= (same-site paths only) or the account dashboard. */
function nextUrl(lang: string) {
  const n = new URLSearchParams(window.location.search).get('next');
  return n && n.startsWith(`/${lang}/`) && !n.startsWith('//') ? n : `/${lang}/account`;
}

type Res = { ok: boolean; status: number; data?: any; message?: string; errors?: Record<string, string[]> };
async function call(action: string, lang: string, body: unknown): Promise<Res> {
  try {
    const r = await fetch(`/api/auth/${action}?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: j.data, message: j.message, errors: j.errors };
  } catch { return { ok: false, status: 0 }; }
}

/**
 * Sign in (mobile OTP or email + password), register and password reset — all through the BFF (/api/auth/*),
 * which keeps the session token in an httpOnly cookie.
 */
export function AuthForm({ mode, L, links, eye }: { mode: AuthMode; L: L; links: { forgot: string; terms: string; privacy: string }; eye: React.ReactNode }) {
  const { lang } = useSite();
  const [tab, setTab] = useState<'otp' | 'pw'>('otp');
  const [step, setStep] = useState<1 | 2>(1);
  const [ident, setIdent] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [info, setInfo] = useState('');
  const [devCode, setDevCode] = useState('');
  const [challenge, setChallenge] = useState('');

  const fail = (r: Res) => {
    if (r.status === 429) { setErr({ form: L.tooMany }); return; }
    const e: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.errors ?? {})) e[k.split('.')[0]] = v[0];
    if (!Object.keys(e).length) e.form = r.message || L.error;
    setErr(e);
  };
  const done = () => { window.location.assign(nextUrl(lang)); };

  const sendCode = async (scope: HTMLElement | null, purpose: 'login' | 'reset') => {
    const input = scope?.querySelector('input') as HTMLInputElement | null;
    if (input && !input.checkValidity()) { input.reportValidity(); return; }
    const id = purpose === 'login' ? `0${(input?.value ?? '').replace(/^0+/, '')}` : (input?.value ?? '').trim();
    setBusy(true); setErr({});
    const r = await call('otp-send', lang, { identifier: id, purpose });
    setBusy(false);
    if (!r.ok) { fail(r); return; }
    setIdent(id); setInfo(`${L.sentTo} ${r.data?.to ?? ''}`); setDevCode(r.data?.dev_code ?? ''); setStep(2);
  };
  const resend = async (purpose: 'login' | 'reset') => {
    setBusy(true); const r = await call('otp-send', lang, { identifier: ident, purpose }); setBusy(false);
    if (!r.ok) { fail(r); return; }
    setDevCode(r.data?.dev_code ?? ''); toast(L.resent);
  };
  const submit = (fn: (f: HTMLFormElement) => Promise<Res>) => async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    setBusy(true); setErr({});
    const r = await fn(f);
    if (r.ok) { done(); return; }
    setBusy(false); fail(r);
  };
  const val = (f: HTMLFormElement, n: string) => ((f.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
  const fe = (k: string) => err[k] ? <p className="field-error" role="alert">{err[k]}</p> : null;
  const formErr = err.form || err.email || err.identifier || err.destination || err.code
    ? <div role="alert" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200" data-auth-error>{err.form || err.email || err.identifier || err.destination || err.code}</div> : null;
  const dev = devCode ? <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" data-dev-code={devCode}>{L.devCode}: <b className="font-mono tracking-widest">{devCode}</b></p> : null;
  const btn = (label: string, type: 'submit' | 'button' = 'submit', onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void) => (
    <button type={type} onClick={onClick} disabled={busy} aria-busy={busy} className="btn btn-primary btn-lg w-full">{busy ? L.wait : label}</button>
  );

  if (mode === 'login') {
    return (
      <div className="mt-6">
        <div className="grid grid-cols-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800" role="tablist" aria-label={L.method}>
          {(['otp', 'pw'] as const).map((k) => (
            <button key={k} type="button" role="tab" className="tab-pill" id={`tb-${k}`} aria-controls={`lg-${k}`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1}
              onClick={() => { setTab(k); setErr({}); }} onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = k === 'otp' ? 'pw' : 'otp'; setTab(n); document.getElementById(`tb-${n}`)?.focus(); } }}>
              {k === 'otp' ? L.otpTab : L.pwTab}
            </button>
          ))}
        </div>
        <div id="lg-otp" role="tabpanel" aria-labelledby="tb-otp" className="mt-6" hidden={tab !== 'otp'}>
          {step === 1 ? (
            <form className="space-y-4" id="otp-1" onSubmit={(e) => { e.preventDefault(); sendCode(e.currentTarget, 'login'); }} noValidate>
              <div className="field"><label className="label" htmlFor="lg-ph">{L.mobile}</label>
                <div className="flex"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 text-sm font-semibold dark:border-ink-700 dark:bg-ink-800">{L.cc}</span>
                  <input id="lg-ph" name="phone" type="tel" className="input rounded-l-none" required pattern="0?1[3-9][0-9]{8}" placeholder="1XXXXXXXXX" autoComplete="tel-national" inputMode="tel" /></div></div>
              {formErr}
              {btn(L.sendOtp)}
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submit((f) => call('otp-verify', lang, { identifier: ident, code: readOtp(f), remember: true }))}>
              <p className="text-sm muted" aria-live="polite">{info}. {L.enterCode}</p>
              {dev}
              <OtpBoxes L={L} first />
              {formErr}
              {btn(L.verify)}
              <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => { setStep(1); setErr({}); }}>{L.changeNo}</button>
                <button type="button" className="btn btn-ghost btn-sm flex-1" disabled={busy} onClick={() => resend('login')}>{L.resend}</button></div>
            </form>
          )}
        </div>
        {challenge ? (
          <form id="lg-2fa" role="tabpanel" aria-labelledby="tb-pw" hidden={tab !== 'pw'} className="mt-6 space-y-4" data-two-step noValidate
            onSubmit={submit((f) => call('login-verify', lang, { challenge, code: readOtp(f) }))}>
            <p className="text-sm muted" aria-live="polite">{info}</p>
            {dev}
            <OtpBoxes L={L} first />
            {formErr}
            {btn(L.verify)}
            <div className="flex gap-2"><button type="button" className="btn btn-ghost btn-sm flex-1" onClick={() => { setChallenge(''); setDevCode(''); setErr({}); }}>{L.back}</button>
              <button type="button" className="btn btn-ghost btn-sm flex-1" disabled={busy} onClick={async () => {
                setBusy(true); const r = await call('login-resend', lang, { challenge }); setBusy(false);
                if (!r.ok) { fail(r); return; }
                setDevCode(r.data?.dev_code ?? ''); toast(L.resent);
              }}>{L.resend}</button></div>
          </form>
        ) : null}
        <form id="lg-pw" role="tabpanel" aria-labelledby="tb-pw" hidden={tab !== 'pw' || !!challenge} className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            if (!f.checkValidity()) { f.reportValidity(); return; }
            setBusy(true); setErr({});
            const r = await call('login', lang, { email: val(f, 'email'), password: (f.elements.namedItem('password') as HTMLInputElement).value, remember: (f.elements.namedItem('remember') as HTMLInputElement).checked });
            if (r.ok && r.data?.two_factor) {
              setBusy(false); setChallenge(r.data.challenge); setDevCode(r.data.dev_code ?? ''); setInfo(`${L.twoStep} ${r.data.to ?? ''}.`);
              return;
            }
            if (r.ok) { done(); return; }
            setBusy(false); fail(r);
          }}>
          <div className="field"><label className="label" htmlFor="lg-em">{L.email}</label><input id="lg-em" name="email" type="email" className="input" required autoComplete="email" /></div>
          <Password id="lg-pass" label={L.password} L={L} eye={eye} autoComplete="current-password" extra={<a href={links.forgot} className="link text-sm">{L.forgotQ}</a>} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remember" className="check" defaultChecked /> {L.keep}</label>
          {formErr}
          {btn(L.signIn)}
        </form>
      </div>
    );
  }
  if (mode === 'register') {
    return (
      <form className="mt-6 space-y-4" noValidate onSubmit={submit((f) => call('register', lang, {
        first_name: val(f, 'first_name'), last_name: val(f, 'last_name'), phone: val(f, 'phone'), email: val(f, 'email'),
        password: (f.elements.namedItem('password') as HTMLInputElement).value, terms: (f.elements.namedItem('terms') as HTMLInputElement).checked, website: val(f, 'website'),
        referral: new URLSearchParams(window.location.search).get('ref') ?? undefined,
      }))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className={`field ${err.first_name ? 'is-invalid' : ''}`}><label className="label" htmlFor="rg-fn">{L.first}</label><input id="rg-fn" name="first_name" className="input" required autoComplete="given-name" />{fe('first_name')}</div>
          <div className={`field ${err.last_name ? 'is-invalid' : ''}`}><label className="label" htmlFor="rg-ln">{L.last}</label><input id="rg-ln" name="last_name" className="input" required autoComplete="family-name" />{fe('last_name')}</div>
        </div>
        <div className={`field ${err.phone ? 'is-invalid' : ''}`}><label className="label" htmlFor="rg-ph">{L.mobileShort}</label><input id="rg-ph" name="phone" type="tel" className="input" required pattern="01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" autoComplete="tel" />{fe('phone')}</div>
        <div className={`field ${err.email ? 'is-invalid' : ''}`}><label className="label" htmlFor="rg-em">{L.email}</label><input id="rg-em" name="email" type="email" className="input" required autoComplete="email" />{fe('email')}</div>
        <div className={err.password ? 'is-invalid' : ''}><Password id="rg-pw" label={L.newPw8} L={L} eye={eye} autoComplete="new-password" />{fe('password')}</div>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="check mt-0.5" required /> <span>{L.agree} <a className="link" href={links.terms}>{L.terms}</a> {L.and} <a className="link" href={links.privacy}>{L.privacy}</a></span></label>
        {fe('terms')}
        {err.form ? formErr : null}
        {btn(L.create)}
      </form>
    );
  }
  return step === 1 ? (
    <form className="mt-6 space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); sendCode(e.currentTarget, 'reset'); }}>
      <div className="field"><label className="label" htmlFor="fp-id">{L.mobileOrEmail}</label><input id="fp-id" name="identifier" className="input" required autoComplete="username" /></div>
      {formErr}
      {btn(L.sendCode)}
    </form>
  ) : (
    <form className="mt-6 space-y-4" onSubmit={submit((f) => call('reset', lang, { identifier: ident, code: readOtp(f), password: (f.elements.namedItem('password') as HTMLInputElement).value }))}>
      <p className="text-sm muted" aria-live="polite">{info}</p>
      {dev}
      <OtpBoxes L={L} />
      <div className={`field ${err.password ? 'is-invalid' : ''}`}><label className="label" htmlFor="fp-new">{L.newPw}</label><input id="fp-new" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" />{fe('password')}</div>
      {formErr}
      {btn(L.update)}
      <button type="button" className="btn btn-ghost btn-sm w-full" disabled={busy} onClick={() => resend('reset')}>{L.resend}</button>
    </form>
  );
}
