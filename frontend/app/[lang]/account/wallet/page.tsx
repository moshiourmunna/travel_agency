import { AmountChips, ApiForm, Modal, ReturnNotice, TopupForm } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead, gatewayOptions } from '@/components/account/page';
import { Icon } from '@/components/icons/Icon';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('wallet');

export default async function Wallet({ params }: PageProps<'/[lang]/account/wallet'>) {
  const { lang, i } = await accountCtx(params);
  const { t, d, num, bdt, date } = i;
  const x = await me<any>('wallet', lang, `/${lang}/account/wallet`);
  const nt = x.user.next_tier;
  const tierIdx = x.tiers.findIndex((z: any) => z.current);
  const close = t('Close', 'বন্ধ করুন');
  const gws = gatewayOptions(i, x.topup_gateways ?? []);
  return (
    <>
      <ReturnNotice param="topup" messages={{
        success: [t('Money added to your wallet.', 'ওয়ালেটে টাকা যোগ হয়েছে।'), 'ok'],
        failed: [t('The payment did not go through — nothing was charged.', 'পেমেন্ট সম্পন্ন হয়নি — কোনো টাকা কাটা হয়নি।'), 'error'],
        cancelled: [t('Top-up cancelled.', 'টপ-আপ বাতিল করা হয়েছে।'), 'error'],
      }} />
      <AccountHead i={i} k="wallet" sub={t('Wallet credit is used automatically at checkout. Miles never expire while you travel once a year.', 'চেকআউটে ওয়ালেট ক্রেডিট স্বয়ংক্রিয়ভাবে ব্যবহার হয়। বছরে একবার ভ্রমণ করলে মাইলস মেয়াদোত্তীর্ণ হয় না।')} />
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-5 text-white shadow-lg sm:p-6" aria-labelledby="w-h">
          <div className="flex items-center justify-between"><h2 id="w-h" className="text-sm font-semibold text-brand-100">{t('Wallet balance', 'ওয়ালেট ব্যালান্স')}</h2><Icon name="wallet" className="h-6 w-6 text-brand-100" /></div>
          <p className="mt-2 text-4xl font-extrabold" data-wallet-balance>{bdt(x.balance)}</p>
          {x.gift_credit > 0 ? <p className="mt-1 text-sm text-brand-100">{lang === 'bn' ? `${bdt(x.gift_credit)} গিফট কার্ড ক্রেডিট সহ` : `Includes ${bdt(x.gift_credit)} gift-card credit`}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {gws.length ? (
              <Modal id="topup" triggerClass="btn btn-accent btn-sm" trigger={<><Icon name="plus" className="h-4 w-4" /> {t('Add money', 'টাকা যোগ')}</>} title={t('Add money to wallet', 'ওয়ালেটে টাকা যোগ')} closeLabel={close}>
                <TopupForm labels={{ error: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।') }}>
                  <div className="field mt-4"><label className="label" htmlFor="tu-a">{t('Amount (৳)', 'পরিমাণ (৳)')}</label>
                    <input id="tu-a" name="amount" type="number" inputMode="numeric" min={500} max={200000} step={100} className="input" defaultValue={5000} required />
                    <p className="mt-1 text-xs muted">{lang === 'bn' ? `${bdt(500)} থেকে ${bdt(200000)}` : `${bdt(500)} to ${bdt(200000)}`}</p></div>
                  <AmountChips id="tu-a" values={[2000, 5000, 10000, 25000]} labels={[2000, 5000, 10000, 25000].map((v) => bdt(v))} />
                  <div className="field mt-4"><label className="label" htmlFor="tu-m">{t('Pay with', 'পরিশোধ মাধ্যম')}</label>
                    <select id="tu-m" name="gateway" className="input">{gws.map((g) => <option key={g.code} value={g.code}>{g.label}</option>)}</select></div>
                  <div className="mt-6 flex justify-end gap-2"><button className="btn btn-primary">{t('Continue', 'এগিয়ে যান')}</button></div>
                </TopupForm>
              </Modal>
            ) : null}
            <Modal id="redeem" triggerClass="btn btn-sm border border-white/30 bg-white/10 text-white hover:bg-white/20" trigger={<><Icon name="gift" className="h-4 w-4" /> {t('Redeem gift card', 'গিফট কার্ড রিডিম')}</>} title={t('Redeem a gift card', 'গিফট কার্ড রিডিম করুন')} closeLabel={close}>
              <ApiForm path="wallet/redeem" reset success={t('Gift card added to your wallet.', 'গিফট কার্ড ওয়ালেটে যোগ হয়েছে।')}>
                <p className="mt-2 text-sm muted">{t('The full card balance moves to your wallet and can be used on any booking.', 'কার্ডের পুরো ব্যালান্স ওয়ালেটে যাবে, যেকোনো বুকিংয়ে ব্যবহার করা যাবে।')}</p>
                <div className="field mt-4"><label className="label" htmlFor="gc-c">{t('Gift card code', 'গিফট কার্ড কোড')}</label>
                  <input id="gc-c" name="code" className="input uppercase tracking-wider" required maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} /></div>
                <div className="mt-6 flex justify-end"><button className="btn btn-primary">{t('Redeem', 'রিডিম')}</button></div>
              </ApiForm>
            </Modal>
          </div>
        </section>
        <section className="rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 p-5 text-white shadow-lg ring-1 ring-accent-400/30 sm:p-6" aria-labelledby="m-h">
          <div className="flex items-center justify-between"><h2 id="m-h" className="text-sm font-semibold text-accent-200">{t('Musafir Miles', 'মুসাফির মাইলস')}{x.user.tier ? ` · ${x.user.tier.name}` : ''}</h2><Icon name="award" className="h-6 w-6 text-accent-300" /></div>
          <p className="mt-2 text-4xl font-extrabold">{num(x.user.miles)}</p>
          <p className="mt-1 text-sm text-ink-100">≈ {bdt(x.miles_value)} {t('off your next trip', 'পরবর্তী ট্রিপে ছাড়')}</p>
          {nt ? (
            <>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={nt.progress} aria-valuemin={0} aria-valuemax={100} aria-label={lang === 'bn' ? `${nt.name}-এর দিকে অগ্রগতি` : `Progress to ${nt.name}`}><div className="h-full rounded-full bg-accent-400" style={{ width: `${nt.progress}%` }} /></div>
              <p className="mt-1.5 text-xs text-ink-100">{num(nt.to_go)} {lang === 'bn' ? `মাইলস বাকি ${nt.name}-এ` : `Miles to ${nt.name}`}</p>
            </>
          ) : <p className="mt-4 text-xs text-ink-100">{t('Top tier — enjoy every perk', 'সর্বোচ্চ স্তর — সব সুবিধা উপভোগ করুন')}</p>}
        </section>
      </div>

      <section className="mt-6" aria-labelledby="tier-h">
        <h2 id="tier-h" className="text-lg font-bold">{t('Membership tiers', 'সদস্য স্তর')}</h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {x.tiers.map((z: any, k: number) => (
            <li key={z.code} className={`card p-4 ${z.current ? 'ring-2 ring-brand-600' : ''}`} data-tier={z.code}>
              <div className="flex items-center justify-between"><p className="font-bold">{z.name}</p>
                {z.current ? <span className="badge badge-brand">{t('You', 'আপনি')}</span> : k < tierIdx ? <Icon name="circle-check" className="h-5 w-5 text-brand-700 dark:text-brand-300" /> : <Icon name="lock" className="h-4 w-4 text-ink-500 dark:text-ink-300" />}</div>
              <p className="mt-1 text-xs muted">{num(z.min_miles)}+ {t('Miles', 'মাইলস')}</p>
              <p className="mt-2 text-sm">{z.perks.join(' · ')}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-6" aria-labelledby="wt-h">
          <h2 id="wt-h" className="text-lg font-bold">{t('Wallet activity', 'ওয়ালেট লেনদেন')}</h2>
          {x.wallet_tx.length ? (
            <ul className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
              {x.wallet_tx.map((w: any, k: number) => {
                const plus = w.direction === 'credit';
                return (
                  <li key={k} className="flex items-center gap-3 py-3" data-wallet-tx={w.direction}>
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${plus ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300'}`}><Icon name={w.icon || (plus ? 'plus' : 'wallet')} className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{w.text}</p><p className="text-xs muted">{date(w.date)}</p></div>
                    <p className={`font-bold ${plus ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>{plus ? '+' : '−'}{bdt(Math.abs(w.amount))}</p>
                  </li>
                );
              })}
            </ul>
          ) : <p className="mt-3 text-sm muted">{t('No wallet activity yet.', 'এখনও কোনো ওয়ালেট লেনদেন নেই।')}</p>}
        </section>
        <section className="card p-4 sm:p-6" aria-labelledby="mt-h">
          <h2 id="mt-h" className="text-lg font-bold">{t('Miles earned', 'অর্জিত মাইলস')}</h2>
          {x.miles_tx.length ? (
            <ul className="mt-3 divide-y divide-ink-100 dark:divide-ink-800">
              {x.miles_tx.map((m: any, k: number) => (
                <li key={k} className="flex items-center gap-3 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-100 text-accent-800 dark:bg-accent-400/15 dark:text-accent-200"><Icon name="award" className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{m.text}</p><p className="text-xs muted">{date(m.date)}</p></div>
                  <p className="font-bold text-accent-800 dark:text-accent-200">{m.miles >= 0 ? '+' : '−'}{num(Math.abs(m.miles))}</p>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm muted">{t('Book a trip to start earning Miles.', 'মাইলস পেতে একটি ট্রিপ বুক করুন।')}</p>}
          <p className="mt-3 text-xs muted">{lang === 'bn' ? `প্রতি ${bdt(100)} খরচে ${d(1)} মাইল। চেকআউটে ${d(10)} মাইলস = ${bdt(1)}।` : `Earn 1 Mile per ${bdt(100)} spent. 10 Miles = ${bdt(1)} at checkout.`}</p>
        </section>
      </div>
    </>
  );
}
