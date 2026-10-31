import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Layout';
import { Badge, Card, PageHeader, Spinner, Switch, cx, useConfirm } from '@/components/ui';
import { FieldWrap, Input, Textarea } from '@/fields/basic';
import { TrPair } from '@/fields/bilingual';
import { JsonField } from '@/fields/json';
import { ImageField } from '@/fields/media';
import { useAdminUrl, useCan } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Shared } from '@/lib/types';

type Item = { key: string; type: 'tr' | 'text' | 'json' | 'number' | 'bool'; value: any; public: boolean; label: string; help: string | null; readonly: boolean };
type Group = { key: string; label: string; icon: string; items: Item[] };
type Props = { groups: Group[]; active: string; revalidate: { at: string; ok: boolean; tags: string[]; error?: string; skipped?: boolean } | null; env: { payment_mode: string; frontend: string } };

const GATEWAY_LABELS: Record<string, string> = { sslcommerz: 'SSLCommerz (cards, mobile banking)', bkash: 'bKash', nagad: 'Nagad', bank_transfer: 'Bank transfer (slip upload)', wallet: 'Musafir wallet', mock: 'Sandbox test gateway' };

export default function Settings({ groups, active, revalidate, env }: Props) {
  const { t, ago } = useT();
  const url = useAdminUrl();
  const can = useCan();
  const toast = useToast();
  const confirm = useConfirm();
  const errors = (usePage().props as unknown as Shared).errors;
  const [cur, setCur] = useState(groups.some((g) => g.key === active) ? active : groups[0]?.key);
  const group = groups.find((g) => g.key === cur) ?? groups[0];
  const initial = useMemo(() => Object.fromEntries((group?.items ?? []).map((i) => [i.key, i.value])), [group]);
  const [vals, setVals] = useState<Record<string, any>>(initial);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => { setVals(initial); }, [initial]);
  const dirty = JSON.stringify(vals) !== JSON.stringify(initial);

  const pick = async (k: string) => {
    if (k === cur) return;
    if (dirty && !(await confirm({ title: t('Discard unsaved changes?', 'সংরক্ষণ না করা পরিবর্তন বাদ দেবেন?'), confirm: t('Discard', 'বাদ দিন'), danger: true }))) return;
    setCur(k);
    window.history.replaceState(window.history.state, '', url('/settings') + '?group=' + k);
  };
  const save = () => {
    const changed = Object.fromEntries(Object.entries(vals).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(initial[k])));
    router.put(url('/settings/' + group.key), { values: changed }, {
      preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false),
      onError: () => toast('error', t('Some values need fixing.', 'কিছু মান ঠিক করতে হবে।')),
    });
  };
  const purge = async () => {
    if (!(await confirm({ title: t('Refresh the whole website cache?', 'পুরো ওয়েবসাইট ক্যাশ হালনাগাদ করবেন?'), body: t('Every page is rebuilt on its next visit. Use this after bulk changes.', 'পরের ভিজিটে প্রতিটি পেজ নতুন করে তৈরি হবে। বড় পরিবর্তনের পর ব্যবহার করুন।') }))) return;
    router.post(url('/revalidate'), {}, { preserveScroll: true });
  };

  const items = (group?.items ?? []).filter((i) => !q || (i.label + ' ' + i.key).toLowerCase().includes(q.toLowerCase()));
  const render = (i: Item) => {
    const v = vals[i.key];
    const set = (x: any) => setVals((s) => ({ ...s, [i.key]: x }));
    const err = errors['values.' + i.key];
    const label = <span className="flex items-center gap-2">{i.label}{i.public ? <Badge color="blue">{t('on website', 'ওয়েবসাইটে')}</Badge> : null}{i.readonly ? <Badge>{t('fixed', 'স্থির')}</Badge> : null}</span>;
    if (group.key === 'payments' && i.key === 'gateways' && v && typeof v === 'object') {
      return (
        <FieldWrap label={label} help={i.help ?? t('At least one must stay on. Turned-off methods disappear from checkout immediately.', 'অন্তত একটি চালু থাকতে হবে। বন্ধ করা মাধ্যম সঙ্গে সঙ্গে চেকআউট থেকে সরে যাবে।')} error={err}>
          <div className="divide-y divide-ink-100 rounded-xl border border-ink-100 dark:divide-ink-800 dark:border-ink-800" data-gateways>
            {Object.entries(v).map(([g, on]) => (
              <div key={g} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm font-medium">{GATEWAY_LABELS[g] ?? g}{g === 'mock' && env.payment_mode !== 'sandbox' ? <span className="ml-2 text-xs muted">{t('(only in sandbox mode)', '(শুধু স্যান্ডবক্সে)')}</span> : null}</span>
                <Switch checked={!!on} onChange={(x) => set({ ...v, [g]: x })} label={GATEWAY_LABELS[g] ?? g} />
              </div>
            ))}
          </div>
        </FieldWrap>
      );
    }
    if (i.type === 'bool') return <div><div className="flex items-center gap-3"><Switch checked={!!v} onChange={set} label={i.label} disabled={i.readonly} /><span className="text-sm font-medium">{label}</span></div>{i.help ? <p className="mt-1 pl-14 text-xs muted">{i.help}</p> : null}{err ? <p className="mt-1 text-xs text-rose-600">{err}</p> : null}</div>;
    if (i.type === 'number') {
      const unit = /_pct$/.test(i.key) ? '%' : /(fee|reward|discount|total|min|max)$/.test(i.key) && !/minutes|hours|days/.test(i.key) ? '৳' : undefined;
      return <Input label={label} type="number" step="any" min={0} max={unit === '%' ? 100 : undefined} value={v ?? ''} onChange={(x) => set(x === '' ? null : Number(x))} help={i.help} error={err} readOnly={i.readonly} prefix={unit === '৳' ? '৳' : undefined} />;
    }
    if (i.type === 'tr') return <FieldWrap label={label} help={i.help} error={err}><TrPair value={v} onChange={set} kind={(v?.en?.length ?? 0) > 80 ? 'text' : 'line'} errors={{ en: errors[`values.${i.key}.en`], bn: errors[`values.${i.key}.bn`] }} /></FieldWrap>;
    if (i.type === 'json') return <FieldWrap label={label} help={i.help} error={err}><JsonField value={v} onChange={set} ctx={{ errors, path: 'values.' + i.key }} /></FieldWrap>;
    // text
    const str = typeof v === 'string' ? v : v == null ? '' : String(v);
    if (/(^|_)og_image$|_image$/.test(i.key)) return <FieldWrap label={label} help={i.help} error={err}><ImageField byKey value={str || null} onChange={(x) => set(x ?? '')} /></FieldWrap>;
    if (str.length > 120) return <Textarea label={label} value={str} onChange={set} help={i.help} error={err} readOnly={i.readonly} rows={3} />;
    return <Input label={label} value={str} onChange={set} help={i.help} error={err} readOnly={i.readonly} type={/email$/.test(i.key) ? 'email' : 'text'} />;
  };

  return (
    <>
      <Head title={t('Settings', 'সেটিংস')} />
      <PageHeader title={t('Settings', 'সেটিংস')} icon="settings" crumbs={[[t('Settings', 'সেটিংস')]]}
        subtitle={<span className="flex flex-wrap items-center gap-2">{t('Payment mode', 'পেমেন্ট মোড')}: <Badge color={env.payment_mode === 'live' ? 'green' : 'gold'}>{env.payment_mode}</Badge><span className="text-xs">{t('(set in the server .env)', '(সার্ভারের .env-এ নির্ধারিত)')}</span></span>}
        actions={can('settings.manage') ? <button type="button" className="btn btn-outline btn-sm" onClick={purge} data-purge><Icon name="refresh-cw" size={16} />{t('Refresh website cache', 'ওয়েবসাইট ক্যাশ হালনাগাদ')}</button> : null} />

      <div className="grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav className="card p-2 lg:sticky lg:top-20 lg:self-start" aria-label={t('Setting groups', 'সেটিং গ্রুপ')}>
          {groups.map((g) => (
            <button key={g.key} type="button" className="side-link w-full" aria-current={g.key === cur ? 'page' : undefined} onClick={() => pick(g.key)} data-group={g.key}>
              <Icon name={g.icon} size={16} /><span className="flex-1 text-left">{g.label}</span>
            </button>
          ))}
          {revalidate ? <p className="mt-2 border-t border-ink-100 px-3 pt-3 text-xs muted dark:border-ink-800"><span className={cx('mr-1.5 inline-block h-2 w-2 rounded-full', revalidate.ok ? 'bg-emerald-500' : 'bg-rose-500')} />{revalidate.ok ? t('Website refreshed', 'ওয়েবসাইট হালনাগাদ') : t('Refresh failed', 'হালনাগাদ ব্যর্থ')} {ago(revalidate.at)}{revalidate.skipped ? ' (off)' : ''}</p> : null}
        </nav>
        {group ? (
          <Card title={<span className="flex items-center gap-2"><Icon name={group.icon} size={18} />{group.label}</span>}
            actions={<input type="search" className="input h-9 w-48 py-1 text-sm" placeholder={t('Filter…', 'ফিল্টার…')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('Filter settings', 'সেটিং ফিল্টার')} />}>
            <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-6" data-settings-form={group.key}>
              {items.map((i) => <div key={i.key} data-setting={i.key}>{render(i)}</div>)}
              {!items.length ? <p className="text-sm muted">{t('No setting matches.', 'কোনো সেটিং মেলেনি।')}</p> : null}
              <div className="sticky bottom-0 -mx-4 -mb-4 flex items-center justify-end gap-2 border-t border-ink-100 bg-white/90 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-900/90 sm:-mx-5 sm:-mb-5 sm:px-5">
                <span className="mr-auto text-xs muted">{dirty ? t('Unsaved changes', 'সংরক্ষণ হয়নি') : t('Saved settings apply to the website within seconds.', 'সংরক্ষিত সেটিং কয়েক সেকেন্ডে ওয়েবসাইটে কার্যকর হয়।')}</span>
                <button type="button" className="btn btn-ghost btn-sm" disabled={!dirty} onClick={() => setVals(initial)}>{t('Reset', 'আগের অবস্থা')}</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={!dirty || busy} data-save>{busy ? <Spinner /> : <Icon name="save" size={16} />}{t('Save', 'সংরক্ষণ')}</button>
              </div>
            </form>
          </Card>
        ) : null}
      </div>
    </>
  );
}
