import type { Metadata } from 'next';
import { AuthPage, authMetadata } from '@/components/pages/Auth';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/forgot-password'>): Promise<Metadata> {
  return authMetadata((await params).lang as Lang, 'forgot');
}

export default async function ForgotPasswordPage({ params }: PageProps<'/[lang]/forgot-password'>) {
  return <AuthPage lang={(await params).lang as Lang} mode="forgot" />;
}
