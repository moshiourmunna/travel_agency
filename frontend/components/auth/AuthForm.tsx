'use client';
import { useRef, useState } from 'react';
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

/**
 * Sign in (mobile OTP or email + password), register and password reset.
 * The traveller portal API is wired in M5; until then submitting explains that accounts open soon.
 */
export function AuthForm({ mode, L, links, eye }: { mode: AuthMode; L: L; links: { forgot: string; terms: string; privacy: string }; eye: React.ReactNode }) {
  const [tab, setTab] = useState<'otp' | 'pw'>('otp');
  const [step, setStep] = useState<1 | 2>(1);
  const pending = (e: React.FormEvent) => { e.preventDefault(); toast(L.soon); };
  const sendCode = (scope: HTMLElement | null) => {
    const inputs = [...(scope?.querySelectorAll('input') ?? [])] as HTMLInputElement[];
    const bad = inputs.find((x) => !x.checkValidity());
    if (bad) { bad.reportValidity(); return; }
    setStep(2);
  };
  if (mode === 'login') {
    return (
      <div className="mt-6">
        <div className="grid grid-cols-2 rounded-xl bg-ink-100 p-1 dark:bg-ink-800" role="tablist" aria-label={L.method}>
          {(['otp', 'pw'] as const).map((k) => (
            <button key={k} type="button" role="tab" className="tab-pill" id={`tb-${k}`} aria-controls={`lg-${k}`} aria-selected={tab === k} tabIndex={tab === k ? 0 : -1}
              onClick={() => setTab(k)} onKeyDown={(e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const n = k === 'otp' ? 'pw' : 'otp'; setTab(n); document.getElementById(`tb-${n}`)?.focus(); } }}>
              {k === 'otp' ? L.otpTab : L.pwTab}
            </button>
          ))}
        </div>
        <div id="lg-otp" role="tabpanel" aria-labelledby="tb-otp" className="mt-6" hidden={tab !== 'otp'}>
          {step === 1 ? (
            <div className="space-y-4" id="otp-1">
              <div className="field"><label className="label" htmlFor="lg-ph">{L.mobile}</label>
                <div className="flex"><span className="inline-flex items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 text-sm font-semibold dark:border-ink-700 dark:bg-ink-800">{L.cc}</span>
                  <input id="lg-ph" name="phone" type="tel" className="input rounded-l-none" required pattern="1[3-9][0-9]{8}" placeholder="1XXXXXXXXX" autoComplete="tel-national" /></div></div>
              <button type="button" className="btn btn-primary btn-lg w-full" onClick={(e) => sendCode(e.currentTarget.parentElement)}>{L.sendOtp}</button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={pending}>
              <p className="text-sm muted">{L.enterCode}</p>
              <OtpBoxes L={L} first />
              <button className="btn btn-primary btn-lg w-full">{L.verify}</button>
              <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => toast(L.resent)}>{L.resend}</button>
            </form>
          )}
        </div>
        <form id="lg-pw" role="tabpanel" aria-labelledby="tb-pw" hidden={tab !== 'pw'} className="mt-6 space-y-4" onSubmit={pending}>
          <div className="field"><label className="label" htmlFor="lg-em">{L.email}</label><input id="lg-em" name="email" type="email" className="input" required autoComplete="email" /></div>
          <Password id="lg-pass" label={L.password} L={L} eye={eye} autoComplete="current-password" extra={<a href={links.forgot} className="link text-sm">{L.forgotQ}</a>} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remember" className="check" defaultChecked /> {L.keep}</label>
          <button className="btn btn-primary btn-lg w-full">{L.signIn}</button>
        </form>
      </div>
    );
  }
  if (mode === 'register') {
    return (
      <form className="mt-6 space-y-4" onSubmit={pending}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="field"><label className="label" htmlFor="rg-fn">{L.first}</label><input id="rg-fn" name="first_name" className="input" required autoComplete="given-name" /></div>
          <div className="field"><label className="label" htmlFor="rg-ln">{L.last}</label><input id="rg-ln" name="last_name" className="input" required autoComplete="family-name" /></div>
        </div>
        <div className="field"><label className="label" htmlFor="rg-ph">{L.mobileShort}</label><input id="rg-ph" name="phone" type="tel" className="input" required pattern="01[3-9][0-9]{8}" placeholder="01XXXXXXXXX" autoComplete="tel" /></div>
        <div className="field"><label className="label" htmlFor="rg-em">{L.email}</label><input id="rg-em" name="email" type="email" className="input" required autoComplete="email" /></div>
        <Password id="rg-pw" label={L.newPw8} L={L} eye={eye} autoComplete="new-password" />
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="terms" className="check mt-0.5" required /> <span>{L.agree} <a className="link" href={links.terms}>{L.terms}</a> {L.and} <a className="link" href={links.privacy}>{L.privacy}</a></span></label>
        <button className="btn btn-primary btn-lg w-full">{L.create}</button>
      </form>
    );
  }
  return step === 1 ? (
    <div className="mt-6 space-y-4">
      <div className="field"><label className="label" htmlFor="fp-id">{L.mobileOrEmail}</label><input id="fp-id" name="identifier" className="input" required autoComplete="username" /></div>
      <button type="button" className="btn btn-primary btn-lg w-full" onClick={(e) => sendCode(e.currentTarget.parentElement)}>{L.sendCode}</button>
    </div>
  ) : (
    <form className="mt-6 space-y-4" onSubmit={pending}>
      <OtpBoxes L={L} />
      <div className="field"><label className="label" htmlFor="fp-new">{L.newPw}</label><input id="fp-new" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" /></div>
      <button className="btn btn-primary btn-lg w-full">{L.update}</button>
      <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => toast(L.resent)}>{L.resend}</button>
    </form>
  );
}
