export type Option = { value: string; label: string };
export type Meta = { current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null };
export type Paged<T> = { data: T[]; meta: Meta };
export type Lang = { code: string; label: string; native: string; dir: 'ltr' | 'rtl' };
export type SharedProps = {
  auth: { user: { id: number; name: string; email: string | null; initials: string; role: string; isOwner: boolean } | null };
  flash: { ok?: string | null; err?: string | null };
  errors: Record<string, string>;
  locale: string;
  dir: 'ltr' | 'rtl';
  languages: Lang[];
  modules: Record<string, boolean>;
  t: Record<string, string>;
  nav: { resources: { key: string; label: string }[] };
  site: { name: string };
  [key: string]: unknown;
};
export type BookingRow = {
  id: number; ref: string; type: string; customer: { id: number; name: string | null; phone: string | null; email?: string | null };
  package: string | null; room_type: string | null; pax: number; total: number; paid: number; due: number; progress: number;
  status: string; status_label: string; status_tone: Tone; payment_status: string; payment_status_label: string;
  payment_mode: string; payment_mode_label: string; agent: string | null; created: string; trashed: boolean;
};
export type PaymentRow = {
  id: number; method: string; method_label: string; txn: string | null; amount: number; refunded: number; status: string; status_label: string; status_tone: Tone;
  date: string | null; note: string | null; has_slip: boolean; booking: { ref: string; customer: string | null } | null; recorder: string | null;
};
export type Tone = 'ok' | 'no' | 'pen' | 'inf';
