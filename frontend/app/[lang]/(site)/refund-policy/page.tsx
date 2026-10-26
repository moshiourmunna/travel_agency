import type { Metadata } from 'next';
import { LegalPage, legalMetadata } from '@/components/pages/Legal';
import type { Lang } from '@/lib/format';

export async function generateMetadata({ params }: PageProps<'/[lang]/refund-policy'>): Promise<Metadata> {
  return legalMetadata((await params).lang as Lang, 'refund-policy');
}

export default async function RefundPolicyPage({ params }: PageProps<'/[lang]/refund-policy'>) {
  return <LegalPage lang={(await params).lang as Lang} slug="refund-policy" />;
}
