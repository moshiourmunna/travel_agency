import { ApiButton, ApiForm, Modal } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Empty } from '@/components/account/ui';
import { Icon } from '@/components/icons/Icon';
import { Avatar } from '@/components/ui/basics';
import { me } from '@/lib/account';
import type { I18n } from '@/lib/i18n';

export const generateMetadata = accountMetadata('travellers');

const NATIONS = ['BD', 'IN', 'NP', 'LK', 'PK', 'BT', 'MY', 'SG', 'TH', 'AE', 'SA', 'QA', 'GB', 'US', 'CA', 'AU'];
const RELS: [string, string, string][] = [['Self', 'Myself', 'নিজে'], ['Spouse', 'Spouse', 'স্বামী/স্ত্রী'], ['Child', 'Child', 'সন্তান'], ['Parent', 'Parent', 'মা/বাবা'], ['Sibling', 'Sibling', 'ভাই/বোন'], ['Friend', 'Friend', 'বন্ধু'], ['Colleague', 'Colleague', 'সহকর্মী'], ['Other', 'Other', 'অন্যান্য']];

function TravellerFields({ i, p, id, hasSelf }: { i: I18n; p?: any; id: string; hasSelf: boolean }) {
  const { t, lang } = i;
  const region = new Intl.DisplayNames([lang === 'bn' ? 'bn' : 'en'], { type: 'region' });
  const parts = (p?.name ?? '').trim().split(/\s+/);
  const surname = parts.length > 1 ? parts.pop() : '';
  const given = parts.join(' ');
  const f = (k: string) => `${id}-${k}`;
  return (
    <>
      <p className="mt-1 text-xs muted">{t('Enter names exactly as on the passport.', 'পাসপোর্টে যেভাবে আছে ঠিক সেভাবে নাম লিখুন।')}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="field"><label className="label" htmlFor={f('g')}>{t('Given name', 'নামের প্রথম অংশ')}</label><input id={f('g')} name="given_name" className="input" required maxLength={80} autoComplete="off" defaultValue={given} /></div>
        <div className="field"><label className="label" htmlFor={f('s')}>{t('Surname', 'পদবি')}</label><input id={f('s')} name="surname" className="input" required maxLength={60} autoComplete="off" defaultValue={surname} /></div>
        <div className="field"><label className="label" htmlFor={f('d')}>{t('Date of birth', 'জন্ম তারিখ')}</label><input id={f('d')} name="dob" type="date" className="input" required defaultValue={p?.dob ?? ''} max={new Date().toISOString().slice(0, 10)} /></div>
        <div className="field"><label className="label" htmlFor={f('r')}>{t('Relationship', 'সম্পর্ক')}</label>
          <select id={f('r')} name="relation" className="input" defaultValue={p?.relation_code ?? 'Spouse'}>
            {RELS.filter(([c]) => c !== 'Self' || !hasSelf || p?.is_self).map(([c, en, bn]) => <option key={c} value={c}>{t(en, bn)}</option>)}
          </select></div>
        <div className="field"><label className="label" htmlFor={f('x')}>{t('Gender', 'লিঙ্গ')}</label>
          <select id={f('x')} name="gender" className="input" defaultValue={p?.gender ?? ''}><option value="">—</option><option value="female">{t('Female', 'নারী')}</option><option value="male">{t('Male', 'পুরুষ')}</option><option value="other">{t('Other', 'অন্যান্য')}</option></select></div>
        <div className="field"><label className="label" htmlFor={f('n')}>{t('Nationality', 'জাতীয়তা')}</label>
          <select id={f('n')} name="nationality" className="input" defaultValue={p?.nationality ?? 'BD'}>{Array.from(new Set([...(p?.nationality ? [p.nationality] : []), ...NATIONS])).map((c) => <option key={c} value={c}>{region.of(c) ?? c}</option>)}</select></div>
        <div className="field"><label className="label" htmlFor={f('p')}>{t('Passport number', 'পাসপোর্ট নম্বর')}</label>
          <input id={f('p')} name="passport_no" className="input uppercase" required={!p} pattern="[A-Za-z0-9]{6,12}" maxLength={12} autoComplete="off" spellCheck={false} placeholder={p?.passport_masked ?? 'EH0123456'} />
          {p ? <p className="mt-1 text-xs muted">{t('Leave blank to keep the saved number.', 'সংরক্ষিত নম্বর রাখতে খালি রাখুন।')}</p> : null}</div>
        <div className="field"><label className="label" htmlFor={f('e')}>{t('Passport expiry', 'পাসপোর্টের মেয়াদ')}</label><input id={f('e')} name="passport_expiry" type="date" className="input" required defaultValue={p?.passport_expiry ?? ''} /></div>
        <div className="field sm:col-span-2"><label className="label" htmlFor={f('ff')}>{t('Frequent flyer number (optional)', 'ফ্রিকোয়েন্ট ফ্লায়ার নম্বর (ঐচ্ছিক)')}</label>
          <input id={f('ff')} name="frequent_flyer" className="input" maxLength={32} pattern="[A-Za-z0-9 \-]+" autoComplete="off" placeholder={p?.frequent_flyer ?? 'BS 1234 5678'} />
          {p?.frequent_flyer ? <p className="mt-1 text-xs muted">{t('Leave blank to keep the saved number.', 'সংরক্ষিত নম্বর রাখতে খালি রাখুন।')}</p> : null}</div>
      </div>
    </>
  );
}

export default async function Travellers({ params }: PageProps<'/[lang]/account/travellers'>) {
  const { lang, i } = await accountCtx(params);
  const { t, date } = i;
  const x = await me<any>('travellers', lang, `/${lang}/account/travellers`);
  const region = new Intl.DisplayNames([lang === 'bn' ? 'bn' : 'en'], { type: 'region' });
  const hasSelf = x.items.some((p: any) => p.is_self);
  const close = t('Close', 'বন্ধ করুন');
  const saveBtn = <div className="mt-6 flex justify-end gap-2"><button className="btn btn-primary">{t('Save traveller', 'ভ্রমণকারী সংরক্ষণ')}</button></div>;
  return (
    <>
      <AccountHead i={i} k="travellers" sub={t('Save co-travellers once and check out faster. Passport data is encrypted.', 'সহযাত্রীদের একবার সংরক্ষণ করুন, দ্রুত চেকআউট করুন। পাসপোর্টের তথ্য এনক্রিপ্টেড।')}>
        <Modal id="add-trav" wide triggerClass="btn btn-primary btn-sm" trigger={<><Icon name="user-plus" className="h-4 w-4" /> {t('Add traveller', 'ভ্রমণকারী যোগ')}</>} title={t('Add a traveller', 'ভ্রমণকারী যোগ করুন')} closeLabel={close}>
          <ApiForm path="travellers" reset success={t('Traveller saved', 'ভ্রমণকারী সংরক্ষিত')}><TravellerFields i={i} id="new" hasSelf={hasSelf} />{saveBtn}</ApiForm>
        </Modal>
      </AccountHead>
      {x.items.length ? (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {x.items.map((p: any) => (
            <li key={p.id} className="card p-4 sm:p-5" data-traveller={p.id}>
              <div className="flex items-start gap-3">
                <Avatar initials={p.name.split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()} className="h-12 w-12 text-sm" />
                <div className="min-w-0 flex-1"><p className="font-bold">{p.name}</p><p className="text-xs muted">{p.relation}{p.dob ? ` · ${t('born', 'জন্ম')} ${date(p.dob)}` : ''}</p></div>
                <Modal id={`edit-${p.id}`} wide triggerClass="icon-btn h-8 w-8" trigger={<><Icon name="pencil" className="h-4 w-4" /><span className="sr-only">{t('Edit', 'এডিট')} {p.name}</span></>} title={`${t('Edit', 'এডিট')} — ${p.name}`} closeLabel={close}>
                  <ApiForm path={`travellers/${p.id}`} method="PUT" success={t('Traveller updated', 'ভ্রমণকারী হালনাগাদ হয়েছে')}><TravellerFields i={i} id={`t${p.id}`} p={p} hasSelf={hasSelf} />{saveBtn}</ApiForm>
                </Modal>
                {!p.is_self ? (
                  <ApiButton method="DELETE" path={`travellers/${p.id}`} className="icon-btn h-8 w-8 text-rose-700 dark:text-rose-300" label={`${t('Remove', 'সরান')} ${p.name}`}
                    confirm={t('Remove this traveller?', 'এই ভ্রমণকারী সরাবেন?')} success={t('Traveller removed', 'ভ্রমণকারী সরানো হয়েছে')}><Icon name="trash-2" className="h-4 w-4" /></ApiButton>
                ) : null}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-ink-50 p-3 text-sm dark:bg-ink-850">
                <div><dt className="text-xs muted">{t('Passport', 'পাসপোর্ট')}</dt><dd className="font-semibold">{p.passport_masked ?? '—'}</dd></div>
                <div><dt className="text-xs muted">{t('Expires', 'মেয়াদ শেষ')}</dt><dd className={`font-semibold ${p.expires_soon ? 'text-rose-700 dark:text-rose-300' : ''}`}>{p.passport_expiry ? date(p.passport_expiry) : '—'}</dd></div>
                <div><dt className="text-xs muted">{t('Nationality', 'জাতীয়তা')}</dt><dd className="font-semibold">{p.nationality ? region.of(p.nationality) : '—'}</dd></div>
                <div><dt className="text-xs muted">{t('Frequent flyer', 'ফ্রিকোয়েন্ট ফ্লায়ার')}</dt><dd className="font-semibold">{p.frequent_flyer ?? '—'}</dd></div>
              </dl>
              {p.expires_soon ? (
                <p className="mt-3 flex gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" data-expires-soon>
                  <Icon name="triangle-alert" className="h-4 w-4 shrink-0" /> {t('Expires within 6 months — most countries need 6 months’ validity. Renew via the DIP e-passport portal.', '৬ মাসের মধ্যে মেয়াদ শেষ — বেশিরভাগ দেশে ৬ মাসের মেয়াদ লাগে। ডিআইপি ই-পাসপোর্ট পোর্টালে নবায়ন করুন।')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : <Empty icon="users" title={t('No travellers saved yet', 'এখনও কোনো ভ্রমণকারী সংরক্ষিত নেই')} sub={t('Add yourself and your family once to check out faster.', 'দ্রুত চেকআউটের জন্য নিজেকে ও পরিবারকে একবার যোগ করুন।')} />}
    </>
  );
}
