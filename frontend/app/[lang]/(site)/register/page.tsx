import type { Metadata } from 'next';
import { AuthPage, authMetadata } from '@/components/pages/Auth';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/register'>): Promise<Metadata> {
  return authMetadata((await params).lang as Lang, 'register');
}

export default async function RegisterPage({ params }: PageProps<'/[lang]/register'>) {
  return <AuthPage lang={(await params).lang as Lang} mode="register" />;
}
