import { ApiButton, ApiForm, AvatarUpload } from '@/components/account/client';
import { accountCtx, accountMetadata, AccountHead } from '@/components/account/page';
import { Progress } from '@/components/account/ui';
import { Avatar } from '@/components/ui/basics';
import { me } from '@/lib/account';

export const generateMetadata = accountMetadata('profile');

export default async function Profile({ params }: PageProps<'/[lang]/account/profile'>) {
  const { lang, i } = await accountCtx(params);
  const { t, d, date } = i;
  const x = await me<any>('profile', lang, `/${lang}/account/profile`);
  const tr = x.travel ?? {};
  const hints: Record<string, string> = {
    name: t('Add your full name', 'আপনার পূর্ণ নাম যোগ করুন'), email: t('Add your email', 'ইমেইল যোগ করুন'), phone: t('Add your mobile number', 'মোবাইল নম্বর যোগ করুন'),
    dob: t('Add your date of birth', 'জন্ম তারিখ যোগ করুন'), gender: t('Choose your gender', 'লিঙ্গ নির্বাচন করুন'), address: t('Add your address', 'ঠিকানা যোগ করুন'),
    nid: t('Add your NID for domestic flights', 'দেশীয় ফ্লাইটের জন্য এনআইডি যোগ করুন'), interests: t('Pick a few travel interests', 'কয়েকটি ভ্রমণ আগ্রহ বেছে নিন'),
    emergency: t('Add an emergency contact', 'একজন জরুরি যোগাযোগ যোগ করুন'), photo: t('Add a profile photo', 'প্রোফাইল ছবি যোগ করুন'),
  };
  const missing: string[] = x.missing ?? [];
  const verified = <span className="badge badge-brand ml-1">{t('Verified', 'যাচাইকৃত')}</span>;
  const unverified = <span className="badge badge-gold ml-1">{t('Not verified', 'যাচাই হয়নি')}</span>;
  const interests: [string, string, string][] = [['beaches', 'Beaches', 'সৈকত'], ['mountains', 'Mountains', 'পাহাড়'], ['cruises', 'Cruises', 'ক্রুজ'], ['food', 'Food', 'খাবার'], ['adventure', 'Adventure', 'অ্যাডভেঞ্চার'], ['luxury', 'Luxury', 'বিলাসবহুল'], ['budget', 'Budget', 'বাজেট'], ['family', 'Family', 'পরিবার']];
  return (
    <>
      <AccountHead i={i} k="profile" sub={null} />
      <div className="grid gap-6 xl:grid-cols-[20rem_1fr]">
        <aside className="card h-fit p-5 text-center">
          <div className="relative mx-auto w-fit">
            {x.avatar
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={x.avatar} alt="" className="h-24 w-24 rounded-full object-cover" width={96} height={96} />
              : <Avatar initials={x.initials} className="h-24 w-24 text-2xl" />}
            <AvatarUpload label={t('Change photo', 'ছবি পরিবর্তন')} saved={t('Photo updated', 'ছবি আপডেট হয়েছে')} tooBig={t('Photos must be 2 MB or smaller.', 'ছবি ২ এমবি বা তার কম হতে হবে।')} />
          </div>
          <p className="mt-3 text-lg font-bold">{x.name}</p>
          <p className="text-sm muted">{x.tier ? `${x.tier.name} · ` : ''}{t('member since', 'সদস্য,')} {date(x.member_since)}</p>
          {x.avatar ? (
            <ApiButton method="DELETE" path="avatar" className="mt-2 text-xs font-semibold text-rose-700 hover:underline dark:text-rose-300" success={t('Photo removed', 'ছবি সরানো হয়েছে')} confirm={t('Remove your profile photo?', 'প্রোফাইল ছবি সরাবেন?')}>{t('Remove photo', 'ছবি সরান')}</ApiButton>
          ) : null}
          <p className="mt-1 text-xs muted">{t('JPG, PNG or WebP, up to 2 MB.', 'JPG, PNG বা WebP, সর্বোচ্চ ২ এমবি।')}</p>
          <div className="mt-5 text-left">
            <p className="text-sm font-semibold">{t(`Profile ${x.completeness}% complete`, `প্রোফাইল ${d(x.completeness)}% সম্পূর্ণ`)}</p>
            <Progress pct={x.completeness} label={t('Profile completeness', 'প্রোফাইল সম্পূর্ণতা')} className="mt-2" />
            <p className="mt-2 text-xs muted" data-profile-hint>{missing.length ? `${hints[missing[0]] ?? ''}${missing.length === 1 ? t(' to finish.', ' — তাহলেই সম্পূর্ণ।') : '.'}` : t('All done — thank you!', 'সব সম্পূর্ণ — ধন্যবাদ!')}</p>
          </div>
        </aside>
        <ApiForm path="profile" method="PUT" className="card p-4 sm:p-6" success={t('Profile saved.', 'প্রোফাইল সংরক্ষিত।')}>
          <h2 className="text-lg font-bold">{t('Personal details', 'ব্যক্তিগত তথ্য')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="field"><label className="label" htmlFor="pf-n">{t('Full name', 'পূর্ণ নাম')}</label><input id="pf-n" name="name" className="input" defaultValue={x.name} required minLength={2} maxLength={120} autoComplete="name" /></div>
            <div className="field"><label className="label" htmlFor="pf-d">{t('Date of birth', 'জন্ম তারিখ')}</label><input id="pf-d" name="dob" type="date" className="input" defaultValue={x.dob ?? ''} autoComplete="bday" /></div>
            <div className="field"><label className="label" htmlFor="pf-e">{t('Email', 'ইমেইল')} {x.email_verified ? verified : unverified}</label><input id="pf-e" name="email" type="email" className="input" defaultValue={x.email ?? ''} required autoComplete="email" /></div>
            <div className="field"><label className="label" htmlFor="pf-p">{t('Mobile', 'মোবাইল')} {x.phone_verified ? verified : unverified}</label><input id="pf-p" name="phone" type="tel" className="input" defaultValue={x.phone ?? ''} required autoComplete="tel" placeholder="+8801XXXXXXXXX" /></div>
            <div className="field"><label className="label" htmlFor="pf-g">{t('Gender', 'লিঙ্গ')}</label>
              <select id="pf-g" name="gender" className="input" defaultValue={x.gender ?? ''}>
                <option value="female">{t('Female', 'নারী')}</option><option value="male">{t('Male', 'পুরুষ')}</option><option value="other">{t('Other', 'অন্যান্য')}</option><option value="">{t('Prefer not to say', 'বলতে চাই না')}</option>
              </select></div>
            <div className="field"><label className="label" htmlFor="pf-nid">{t('NID (for domestic flights)', 'এনআইডি (দেশীয় ফ্লাইটের জন্য)')}</label>
              <input id="pf-nid" name="nid" className="input" inputMode="numeric" pattern="\d{10}|\d{13}|\d{17}" placeholder={x.nid_masked ?? t('10, 13 or 17 digits', '১০, ১৩ বা ১৭ সংখ্যা')} autoComplete="off" aria-describedby="pf-nid-h" />
              <p id="pf-nid-h" className="mt-1 text-xs muted">{x.nid_masked ? t('Saved and encrypted. Leave blank to keep it.', 'সংরক্ষিত ও এনক্রিপ্টেড। রাখতে ফাঁকা রাখুন।') : t('Stored encrypted.', 'এনক্রিপ্টেড অবস্থায় রাখা হয়।')}</p></div>
            <div className="field"><label className="label" htmlFor="pf-c">{t('City', 'শহর')}</label><input id="pf-c" name="city" className="input" defaultValue={x.city ?? ''} maxLength={120} autoComplete="address-level2" /></div>
            <div className="field"><label className="label" htmlFor="pf-a">{t('Address', 'ঠিকানা')}</label><input id="pf-a" name="address" className="input" defaultValue={x.address ?? ''} maxLength={300} autoComplete="street-address" /></div>
          </div>
          <h2 className="mt-8 text-lg font-bold">{t('Emergency contact', 'জরুরি যোগাযোগ')}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="field"><label className="label" htmlFor="ec-n">{t('Name', 'নাম')}</label><input id="ec-n" name="emergency[name]" className="input" defaultValue={x.emergency?.name ?? ''} maxLength={120} autoComplete="off" /></div>
            <div className="field"><label className="label" htmlFor="ec-p">{t('Phone', 'ফোন')}</label><input id="ec-p" name="emergency[phone]" type="tel" className="input" defaultValue={x.emergency?.phone ?? ''} maxLength={20} autoComplete="off" /></div>
          </div>
          <h2 className="mt-8 text-lg font-bold">{t('Travel preferences', 'ভ্রমণ পছন্দ')}</h2>
          <fieldset className="mt-3"><legend className="sr-only">{t('Interests', 'আগ্রহ')}</legend>
            <div className="flex flex-wrap gap-2">
              {interests.map(([k, en, bn]) => (
                <label key={k} className="chip relative cursor-pointer has-[:checked]:border-brand-600 has-[:checked]:bg-brand-700 has-[:checked]:text-white has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-500">
                  <input type="checkbox" name="travel[interests][]" value={k} className="sr-only" defaultChecked={(tr.interests ?? []).includes(k)} />{t(en, bn)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="field"><label className="label" htmlFor="tp-s">{t('Seat', 'সিট')}</label>
              <select id="tp-s" name="travel[seat]" className="input" defaultValue={tr.seat ?? ''}><option value="">{t('No preference', 'কোনো পছন্দ নেই')}</option><option value="window">{t('Window', 'জানালার পাশে')}</option><option value="aisle">{t('Aisle', 'আইলের পাশে')}</option></select></div>
            <div className="field"><label className="label" htmlFor="tp-m">{t('Meal', 'খাবার')}</label>
              <select id="tp-m" name="travel[meal]" className="input" defaultValue={tr.meal ?? 'none'}><option value="none">{t('No preference', 'কোনো পছন্দ নেই')}</option><option value="vegetarian">{t('Vegetarian', 'নিরামিষ')}</option><option value="halal">{t('Halal', 'হালাল')}</option><option value="diabetic">{t('Diabetic', 'ডায়াবেটিক')}</option></select></div>
            <div className="field"><label className="label" htmlFor="tp-r">{t('Room', 'রুম')}</label>
              <select id="tp-r" name="travel[room]" className="input" defaultValue={tr.room ?? ''}><option value="">{t('No preference', 'কোনো পছন্দ নেই')}</option><option value="king">{t('King bed', 'কিং বেড')}</option><option value="twin">{t('Twin beds', 'টুইন বেড')}</option></select></div>
          </div>
          <p className="mt-4 text-xs muted">{t('Changing your email or mobile means verifying it again.', 'ইমেইল বা মোবাইল বদলালে আবার যাচাই করতে হবে।')}</p>
          <div className="mt-6 flex justify-end gap-2"><button type="reset" className="btn btn-outline">{t('Reset', 'রিসেট')}</button><button className="btn btn-primary">{t('Save changes', 'পরিবর্তন সংরক্ষণ')}</button></div>
        </ApiForm>
      </div>
    </>
  );
}
