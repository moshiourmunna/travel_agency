import type { Metadata } from 'next';
import { LegalPage, legalMetadata } from '@/components/pages/Legal';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  return legalMetadata((await params).lang as Lang, 'privacy');
}

export default async function PrivacyPage({ params }: PageProps<'/[lang]/privacy'>) {
  return <LegalPage lang={(await params).lang as Lang} slug="privacy" />;
}
