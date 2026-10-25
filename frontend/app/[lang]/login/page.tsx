import type { Metadata } from 'next';
import { AuthPage, authMetadata } from '@/components/pages/Auth';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/login'>): Promise<Metadata> {
  return authMetadata((await params).lang as Lang, 'login');
}

export default async function LoginPage({ params }: PageProps<'/[lang]/login'>) {
  return <AuthPage lang={(await params).lang as Lang} mode="login" />;
}
