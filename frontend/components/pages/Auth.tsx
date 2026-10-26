import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthForm, type AuthMode } from '@/components/auth/AuthForm';
import { Icon } from '@/components/icons/Icon';
import { Picture } from '@/components/ui/Picture';
import type { Lang } from '@/lib/format';
import { getI18n } from '@/lib/i18n';
import { Img } from '@/lib/img';
import { pathMetadata } from '@/lib/page';

const PATH: Record<AuthMode, string> = { login: '/login', register: '/register', forgot: '/forgot-password' };
const TITLE: Record<AuthMode, [string, string]> = { login: ['Sign in', 'সাইন ইন'], register: ['Create your account', 'অ্যাকাউন্ট খুলুন'], forgot: ['Reset password', 'পাসওয়ার্ড রিসেট'] };

export const authMetadata = (lang: Lang, mode: AuthMode): Promise<Metadata> => pathMetadata(lang, PATH[mode], TITLE[mode][lang === 'bn' ? 1 : 0], { noindex: true });

/** Split auth layout: photo + member perks on the left (lg+), the form on the right. */
export async function AuthPage({ lang, mode }: { lang: Lang; mode: AuthMode }) {
  const [i, photo] = await Promise.all([getI18n(lang), Img.key('cappadocia', lang)]);
  const t = i.t;
  const L = {
    method: t('Sign-in method', 'সাইন-ইন পদ্ধতি'), otpTab: t('Mobile OTP', 'মোবাইল ওটিপি'), pwTab: t('Email & password', 'ইমেইল ও পাসওয়ার্ড'),
    mobile: t('Mobile number', 'মোবাইল নম্বর'), mobileShort: t('Mobile', 'মোবাইল'), cc: i.d('+880'), sendOtp: t('Send OTP', 'ওটিপি পাঠান'),
    enterCode: t('Enter the 6-digit code sent by SMS.', 'এসএমএসে পাঠানো ৬ সংখ্যার কোড দিন।'), code: t('One-time code', 'ওয়ান-টাইম কোড'), digit: t('Digit', 'সংখ্যা'),
    digits: [1, 2, 3, 4, 5, 6].map((n) => i.d(n)).join(','), verify: t('Verify & sign in', 'যাচাই করে সাইন ইন'), resend: t('Resend code', 'কোড আবার পাঠান'),
    resent: t('A new code is on its way.', 'নতুন কোড পাঠানো হচ্ছে।'), email: t('Email', 'ইমেইল'), password: t('Password', 'পাসওয়ার্ড'), forgotQ: t('Forgot?', 'ভুলে গেছেন?'),
    showPw: t('Show password', 'পাসওয়ার্ড দেখান'), keep: t('Keep me signed in', 'সাইন ইন রাখুন'), signIn: t('Sign in', 'সাইন ইন'),
    first: t('First name', 'নামের প্রথম অংশ'), last: t('Last name', 'নামের শেষ অংশ'), newPw8: t('Password (8+ characters)', 'পাসওয়ার্ড (৮+ অক্ষর)'),
    agree: t('I agree to the', 'আমি সম্মত'), terms: t('Terms', 'শর্তাবলিতে'), and: t('and', 'ও'), privacy: t('Privacy policy', 'গোপনীয়তা নীতিতে'), create: t('Create account', 'অ্যাকাউন্ট খুলুন'),
    mobileOrEmail: t('Mobile or email', 'মোবাইল বা ইমেইল'), sendCode: t('Send code', 'কোড পাঠান'), newPw: t('New password', 'নতুন পাসওয়ার্ড'), update: t('Update password', 'পাসওয়ার্ড হালনাগাদ করুন'),
    sentTo: t('Code sent to', 'কোড পাঠানো হয়েছে'), changeNo: t('Change number', 'নম্বর বদলান'), wait: t('Please wait…', 'অপেক্ষা করুন…'),
    devCode: t('Test mode — your code', 'টেস্ট মোড — আপনার কোড'), error: t('Something went wrong. Please try again.', 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।'),
    tooMany: t('Too many attempts. Please wait a minute and try again.', 'অনেকবার চেষ্টা করা হয়েছে। এক মিনিট পর আবার চেষ্টা করুন।'),
  };
  const heading = { login: [t('Welcome back', 'আবার স্বাগতম'), t('Sign in with mobile OTP or email.', 'মোবাইল ওটিপি বা ইমেইল দিয়ে সাইন ইন করুন।')], register: [t('Create your account', 'অ্যাকাউন্ট খুলুন'), t('Free. Takes 30 seconds.', 'ফ্রি। ৩০ সেকেন্ড লাগে।')], forgot: [t('Reset password', 'পাসওয়ার্ড রিসেট'), t('We will send a 6-digit code to your mobile or email.', 'আপনার মোবাইল বা ইমেইলে ৬ সংখ্যার কোড পাঠাব।')] }[mode];
  const perks: [string, string][] = [['Member-only prices up to 8% off', 'সদস্যদের জন্য সর্বোচ্চ ৮% কম দাম'], ['Musafir Miles on every booking', 'প্রতিটি বুকিংয়ে মুসাফির মাইলস'], ['Offline e-tickets & itineraries', 'অফলাইন ই-টিকিট ও ভ্রমণসূচি']];
  return (
    <section className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink-950 lg:block">
        <Picture img={photo} alt="" className="img-cover absolute inset-0 opacity-70" sizes="50vw" width={1600} height={1000} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-white">
          <p className="text-3xl font-extrabold leading-tight">{t('Your trips, tickets and visa status in one place.', 'আপনার ট্রিপ, টিকিট ও ভিসার অবস্থা এক জায়গায়।')}</p>
          <ul className="mt-6 space-y-2 text-ink-200">{perks.map((p) => <li key={p[0]} className="flex gap-2"><Icon name="check" className="h-5 w-5 text-accent-300" /> {t(...p)}</li>)}</ul>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12"><div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold">{heading[0]}</h1><p className="mt-1 muted">{heading[1]}</p>
        <AuthForm mode={mode} L={L} links={{ forgot: i.u('/forgot-password'), terms: i.u('/terms'), privacy: i.u('/privacy') }} eye={<Icon name="eye" className="h-4 w-4" />} />
        <p className="mt-8 text-center text-sm muted">
          {mode === 'login'
            ? <>{t('New to Musafir?', 'মুসাফিরে নতুন?')} <Link className="link font-semibold" href={i.u('/register')}>{t('Create an account', 'অ্যাকাউন্ট খুলুন')}</Link></>
            : <>{t('Already have an account?', 'ইতিমধ্যে অ্যাকাউন্ট আছে?')} <Link className="link font-semibold" href={i.u('/login')}>{t('Sign in', 'সাইন ইন')}</Link></>}
        </p>
      </div></div>
    </section>
  );
}
