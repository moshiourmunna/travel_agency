import type { Metadata } from 'next';
import { LegalPage, legalMetadata } from '@/components/pages/Legal';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/terms'>): Promise<Metadata> {
  return legalMetadata((await params).lang as Lang, 'terms');
}

export default async function TermsPage({ params }: PageProps<'/[lang]/terms'>) {
  return <LegalPage lang={(await params).lang as Lang} slug="terms" />;
}
