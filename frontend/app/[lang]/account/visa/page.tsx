import { ApiForm } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty, Progress, Status } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';
import type { I18n } from '@/lib/i18n';

export const generateMetadata = accountMetadata('visa');

const DONE = ['approved', 'rejected', 'delivered'];

function Stages({ i, v }: { i: I18n; v: any }) {
  const { t, d, date } = i;
  return (
    <ol className="mt-6 grid gap-4 md:grid-cols-5">
      {v.events.map((e: any, k: number) => (
        <li key={k} className="relative flex gap-3 md:flex-col md:items-center md:text-center" data-stage-state={e.state}>
          {k < v.events.length - 1 ? <span className={`absolute left-4 top-9 h-[calc(100%-1rem)] w-0.5 md:left-1/2 md:top-4 md:h-0.5 md:w-full ${e.state === 'done' ? 'bg-brand-600' : 'bg-ink-200 dark:bg-ink-700'}`} aria-hidden="true" /> : null}
          <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${e.state === 'done' ? 'bg-brand-700 text-white' : e.state === 'current' ? 'bg-accent-400 text-ink-900 ring-4 ring-accent-100 dark:ring-accent-400/20' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}>
            {e.state === 'done' ? <Icon name="check" className="h-4 w-4" /> : d(k + 1)}
          </span>
          <div>
            <p className="text-sm font-semibold">{e.label}</p>
            <p className="text-xs muted">{e.date ? date(e.date) : k === 3 && v.eta ? `${t('Expected', 'সম্ভাব্য')} ${date(v.eta, 'short')}` : t('Pending', 'অপেক্ষমাণ')}</p>
            {e.state === 'current' ? <span className="sr-only">({t('current step', 'বর্তমান ধাপ')})</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Upload({ i, v }: { i: I18n; v: any }) {
  const { t } = i;
  const open = v.checklist.filter((c: any) => !c.done);
  return (
    <>
      <p className="mt-4 text-sm font-semibold">{t('We still need:', 'আমাদের এখনও প্রয়োজন:')}</p>
      <ul className="mt-2 space-y-2 text-sm">
        {v.checklist.map((c: any) => (
          <li key={c.key} className="flex items-center gap-2" data-doc-done={c.done ? '1' : '0'}>
            <Icon name={c.done ? 'circle-check' : 'circle-alert'} className={`h-4 w-4 shrink-0 ${c.done ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}`} />
            <span>{c.label}{c.done && c.status === 'pending' ? <span className="muted"> · {t('checking', 'যাচাই চলছে')}</span> : null}</span>
            <span className="sr-only">{c.done ? t('received', 'পাওয়া গেছে') : t('missing', 'বাকি')}</span>
          </li>
        ))}
      </ul>
      {v.documents.filter((x: any) => x.status === 'rejected').map((x: any, k: number) => (
        <p key={k} className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><Icon name="circle-x" className="mr-1 inline h-4 w-4" /> {x.label} — {x.reason || t('please upload again', 'আবার আপলোড করুন')}</p>
      ))}
      {open.length ? (
        <ApiForm path={`visa/${v.ref}/documents`} multipart reset className="mt-4" success={t('Uploaded — our visa officer will verify within 4 working hours.', 'আপলোড হয়েছে — ৪ কর্মঘণ্টার মধ্যে ভিসা অফিসার যাচাই করবেন।')}>
          {open.length > 1 ? (
            <div className="field mb-3"><label className="label" htmlFor={`dl-${v.ref}`}>{t('Document', 'ডকুমেন্ট')}</label>
              <select id={`dl-${v.ref}`} name="label" className="input">{open.map((c: any) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></div>
          ) : <input type="hidden" name="label" value={open[0].key} />}
          <div className="field">
            <label htmlFor={`up-${v.ref}`} className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 p-5 text-center text-sm hover:border-brand-500 has-[:focus-visible]:border-brand-500 dark:border-ink-700">
              <Icon name="upload" className="h-6 w-6 text-brand-700 dark:text-brand-300" />
              <span className="font-semibold">{open.length === 1 ? `${t('Upload', 'আপলোড')}: ${open[0].label}` : t('Choose a file', 'ফাইল বেছে নিন')}</span>
              <span className="text-xs muted">PDF, JPG, PNG · {t('max 10 MB', 'সর্বোচ্চ ১০ এমবি')}</span>
            </label>
            <input id={`up-${v.ref}`} name="file" type="file" required className="sr-only" accept=".pdf,.jpg,.jpeg,.png" />
          </div>
          <button className="btn btn-primary btn-sm mt-3 w-full">{t('Submit document', 'ডকুমেন্ট জমা দিন')}</button>
        </ApiForm>
      ) : <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{t('All documents received — our visa officer is checking them.', 'সব ডকুমেন্ট পাওয়া গেছে — ভিসা অফিসার যাচাই করছেন।')}</p>}
    </>
  );
}

export default async function Visa({ params }: PageProps<'/[lang]/account/visa'>) {
  const { lang, i } = await accountCtx(params);
  const { t, u } = i;
  const x = await me<any>('visa', lang, `/${lang}/account/visa`);
  const active = x.items.filter((v: any) => !DONE.includes(v.stage));
  const main = active.filter((v: any) => v.stage !== 'docs');
  const docs = active.filter((v: any) => v.stage === 'docs');
  const note = (v: any) => v.stage === 'embassy' ? t('Embassy processing usually takes 7–10 working days. No action needed from you right now.', 'দূতাবাসের প্রক্রিয়া সাধারণত ৭–১০ কর্মদিবস লাগে। এখন আপনার কিছু করতে হবে না।')
    : v.stage === 'decision' ? t('A decision is due soon — we will message you the moment it arrives.', 'শিগগিরই সিদ্ধান্ত আসবে — এলেই আমরা জানাব।')
    : t('Our visa officer is reviewing your application. We message you at every step.', 'আমাদের ভিসা অফিসার আপনার আবেদন দেখছেন। প্রতিটি ধাপে আমরা জানাই।');
  return (
    <>
      <AccountHead i={i} k="visa" sub={t('Live status for every application. We message you at each step.', 'প্রতিটি আবেদনের লাইভ স্ট্যাটাস। প্রতিটি ধাপে আমরা আপনাকে জানাই।')}>
        <a href={u('/visa')} className="btn btn-primary btn-sm"><Icon name="plus" className="h-4 w-4" /> {t('New application', 'নতুন আবেদন')}</a>
      </AccountHead>
      {!x.items.length ? (
        <Empty icon="stamp" title={t('No visa applications yet', 'এখনও কোনো ভিসা আবেদন নেই')} sub={t('We handle 40+ countries, with document checks and embassy appointments.', '৪০+ দেশের ভিসা — ডকুমেন্ট চেক ও দূতাবাস অ্যাপয়েন্টমেন্টসহ।')}>
          <a href={u('/visa')} className="btn btn-primary">{t('Browse visa services', 'ভিসা সেবা দেখুন')}</a>
        </Empty>
      ) : null}
      {main.map((v: any) => (
        <section key={v.ref} className="card mb-6 p-4 sm:p-6" aria-labelledby={`v-${v.ref}`} data-visa={v.ref}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs muted">{v.ref}{v.booking ? <> · {t('linked to', 'যুক্ত')} <a href={u(`/account/bookings/${v.booking}`)} className="hover:underline">{v.booking}</a></> : null}</p>
              <h2 id={`v-${v.ref}`} className="mt-1 text-xl font-bold"><span aria-hidden="true">{v.flag}</span> {v.country} {v.type} — {v.name}</h2></div>
            <Status t={t} s={v.stage} />
          </div>
          <Stages i={i} v={v} />
          <div className="mt-6 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900 dark:bg-sky-900/30 dark:text-sky-100"><Icon name="info" className="mr-1 inline h-4 w-4" /> {note(v)}</div>
        </section>
      ))}
      {x.items.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {docs.map((v: any) => (
            <section key={v.ref} className="card border-accent-300 p-4 ring-1 ring-accent-300 dark:ring-accent-400/40 sm:p-6" aria-labelledby={`v-${v.ref}`} data-visa={v.ref}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs muted">{v.ref}</p><h2 id={`v-${v.ref}`} className="mt-1 text-lg font-bold"><span aria-hidden="true">{v.flag}</span> {v.country} — {v.name}</h2></div>
                <Status t={t} s={v.stage} />
              </div>
              <Progress pct={v.stage_no * 20} label={`${v.name} — ${t('visa progress', 'ভিসার অগ্রগতি')}`} className="mt-4" />
              <Upload i={i} v={v} />
            </section>
          ))}
          <section className="card p-4 sm:p-6" aria-labelledby="vh-h">
            <h2 id="vh-h" className="text-lg font-bold">{t('All applications', 'সব আবেদন')}</h2>
            <ul className="mt-4 divide-y divide-ink-100 dark:divide-ink-800">
              {x.items.map((v: any) => (
                <li key={v.ref} className="flex items-center gap-3 py-3"><span className="text-2xl" aria-hidden="true">{v.flag}</span>
                  <div className="min-w-0 flex-1"><p className="truncate font-semibold">{v.country} · {v.type}</p><p className="text-xs muted">{v.ref} · {v.name}</p></div><Status t={t} s={v.stage} /></li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl bg-ink-50 p-4 text-sm dark:bg-ink-850">
              <p className="font-semibold">{t('Need another visa?', 'আরেকটি ভিসা দরকার?')}</p>
              <p className="mt-1 muted">{t('We handle 40+ countries, with document checks and embassy appointments.', '৪০+ দেশের ভিসা — ডকুমেন্ট চেক ও দূতাবাস অ্যাপয়েন্টমেন্টসহ।')}</p>
              <a href={u('/visa')} className="link-muted mt-2 inline-block font-semibold">{t('Browse visa services', 'ভিসা সেবা দেখুন')} →</a>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
