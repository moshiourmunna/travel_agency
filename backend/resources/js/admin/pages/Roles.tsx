import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { Badge, Card, Modal, PageHeader, Spinner, cx, useConfirm } from '@/components/ui';
import { Input, Select } from '@/fields/basic';
import { useAdminUrl } from '@/lib/http';
import { useT } from '@/lib/i18n';
import type { Shared } from '@/lib/types';

type Role = { id: number; name: string; label: string; users: number; permissions: string[]; locked: boolean; builtin: boolean };
type Group = { key: string; label: string; perms: { name: string; label: string }[] };

/** Role × permission matrix. Owner is fixed (always everything). */
export default function Roles({ roles, groups }: { roles: Role[]; groups: Group[] }) {
  const { t, num } = useT();
  const url = useAdminUrl();
  const confirm = useConfirm();
  const errors = (usePage().props as unknown as Shared).errors;
  const [cur, setCur] = useState(roles.find((r) => !r.locked)?.id ?? roles[0]?.id);
  const role = roles.find((r) => r.id === cur)!;
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [nw, setNw] = useState<{ name: string; copy: number | null }>({ name: '', copy: null });
  useEffect(() => setPerms(role?.permissions ?? []), [cur, roles]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!role && JSON.stringify([...perms].sort()) !== JSON.stringify([...role.permissions].sort());
  const toggle = (p: string) => setPerms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));

  return (
    <>
      <Head title={t('Roles & permissions', 'রোল ও অনুমতি')} />
      <PageHeader title={t('Roles & permissions', 'রোল ও অনুমতি')} icon="shield-check" crumbs={[[t('Roles', 'রোল')]]} subtitle={t('What each staff role can see and do.', 'প্রতিটি স্টাফ রোল কী দেখতে ও করতে পারে।')}
        actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(true)}><Icon name="plus" size={16} />{t('New role', 'নতুন রোল')}</button>} />
      <div className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <nav className="card p-2 lg:self-start">
          {roles.map((r) => (
            <button key={r.id} type="button" className="side-link w-full" aria-current={r.id === cur ? 'page' : undefined} onClick={() => setCur(r.id)} data-role={r.name}>
              <Icon name={r.locked ? 'crown' : 'user-cog'} size={16} /><span className="flex-1 text-left">{r.label}</span><span className="text-xs tabular-nums muted">{num(r.users)}</span>
            </button>
          ))}
        </nav>
        {role ? (
          <Card title={<span className="flex items-center gap-2">{role.label}<span className="font-mono text-xs muted">{role.name}</span>{role.locked ? <Badge color="gold">{t('full access', 'সম্পূর্ণ অ্যাক্সেস')}</Badge> : null}</span>}
            actions={<>
              {!role.builtin && !role.locked ? <button type="button" className="btn btn-ghost btn-sm text-rose-700" onClick={async () => { if (await confirm({ title: t(`Delete role “${role.label}”?`, `“${role.label}” রোল মুছবেন?`), body: role.users ? t(`${role.users} staff still have this role — move them first.`, `${role.users} জন স্টাফের এই রোল আছে — আগে তাদের সরান।`) : undefined, danger: true, confirm: t('Delete', 'মুছুন') })) router.delete(url('/roles/' + role.id)); }}><Icon name="trash-2" size={15} />{t('Delete', 'মুছুন')}</button> : null}
              {!role.locked ? <button type="button" className="btn btn-primary btn-sm" disabled={!dirty || busy} onClick={() => router.put(url('/roles/' + role.id), { permissions: perms }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) })} data-save>{busy ? <Spinner /> : <Icon name="save" size={16} />}{t('Save', 'সংরক্ষণ')}</button> : null}
            </>}>
            {errors.permissions ? <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200" role="alert">{errors.permissions}</p> : null}
            {role.locked ? <p className="mb-4 text-sm muted">{t('The owner role always has every permission and cannot be changed.', 'মালিক রোলের সব অনুমতি সবসময় থাকে, পরিবর্তন করা যায় না।')}</p> : null}
            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((g) => {
                const all = g.perms.every((p) => role.locked || perms.includes(p.name));
                return (
                  <fieldset key={g.key} className="rounded-xl border border-ink-100 p-3 dark:border-ink-800" disabled={role.locked}>
                    <legend className="flex w-full items-center justify-between px-1 text-sm font-bold">
                      {g.label}
                      {!role.locked ? <button type="button" className="text-xs font-semibold text-brand-700 hover:underline dark:text-brand-300" onClick={() => setPerms((s) => (all ? s.filter((x) => !g.perms.some((p) => p.name === x)) : [...new Set([...s, ...g.perms.map((p) => p.name)])]))}>{all ? t('None', 'কোনোটি না') : t('All', 'সব')}</button> : null}
                    </legend>
                    <div className="mt-1 space-y-1.5">
                      {g.perms.map((p) => (
                        <label key={p.name} className={cx('flex items-start gap-2 rounded-lg px-1 py-1 text-sm', !role.locked && 'hover:bg-ink-50 dark:hover:bg-ink-800/50')}>
                          <input type="checkbox" className="check mt-0.5" checked={role.locked || perms.includes(p.name)} onChange={() => toggle(p.name)} data-perm={p.name} />
                          <span><span className="text-ink-800 dark:text-ink-100">{p.label}</span> <span className="font-mono text-[10px] muted">{p.name}</span></span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </Card>
        ) : null}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title={t('New role', 'নতুন রোল')} size="sm"
        footer={<><button type="button" className="btn btn-outline btn-sm" onClick={() => setAdding(false)}>{t('Cancel', 'বাতিল')}</button>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => router.post(url('/roles'), nw, { onSuccess: () => { setAdding(false); setNw({ name: '', copy: null }); } })}>{t('Create', 'তৈরি')}</button></>}>
        <div className="space-y-4">
          <Input label={t('Role name (lower case, e.g. branch_manager)', 'রোলের নাম (ছোট হাতের, যেমন branch_manager)')} value={nw.name} onChange={(v) => setNw({ ...nw, name: v.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} error={errors.name} required />
          <Select label={t('Start with the permissions of', 'যে রোলের অনুমতি দিয়ে শুরু')} value={nw.copy} onChange={(v) => setNw({ ...nw, copy: v })} options={roles.map((r) => ({ value: r.id, label: r.label }))} placeholder={t('Nothing (empty role)', 'কিছু না (খালি রোল)')} />
        </div>
      </Modal>
    </>
  );
}
