import { notFound } from 'next/navigation';

/** Any unknown path under a locale renders the localised not-found page (inside the site chrome). */
export default function Missing() {
  notFound();
}
