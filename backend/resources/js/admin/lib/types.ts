export type Tr = { en: string; bn: string };
export type Opt = { value: string | number; label: string; color?: string };

export type NavItem = { key: string; label: string; icon: string; href: string; badge?: number | null };
export type NavGroup = { label: string | null; items: NavItem[] };

export type Shared = {
  locale: 'en' | 'bn';
  app: { name: string; frontend: string; base: string; env: string; payment_mode: string };
  auth: { user: { id: number; name: string; email: string; initials: string; title?: string | null; role?: string | null }; permissions: string[] } | null;
  nav: NavGroup[];
  flash: { success?: string; error?: string; warning?: string; revalidated?: string[] };
  errors: Record<string, string>;
};

export type FieldDef = {
  type: string;
  name: string;
  label: string;
  required?: boolean;
  help?: string | null;
  span?: number;
  options?: Opt[];
  fields?: FieldDef[];
  meta?: Record<string, any>;
  readonly?: boolean;
  createOnly?: boolean;
  blank?: Record<string, any>;
};

export type Section = { title: string; aside: boolean; tab: string | null; fields: FieldDef[] };

export type ResourceMeta = { slug: string; label: string; singular: string; icon: string; softDeletes: boolean; reorder: string | null; creatable: boolean; editable: boolean; deletable: boolean; hasDetail: boolean };

export type ColDef = { key: string; type: string; label: string; sortable: boolean; hideMobile: boolean };
export type FilterDef = { key: string; label: string; options: Opt[] };
export type ActionDef = { key: string; label: string; confirm?: string; fields?: FieldDef[]; blank?: Record<string, any>; bulk?: boolean; tone?: string; icon?: string };
export type Badge = { value: string; label: string; color: string };

export type Row = { id: number; title: string; cells: Record<string, any>; trashed: boolean; url: string | null; href: string | null; actions: string[]; deletable: boolean };
export type Pagination = { page: number; last: number; total: number; per?: number; from: number | null; to: number | null };

export type DetailRow = { label: string; value: any; type?: 'money' | 'list' | 'link' | 'pre' | 'diff' | 'json'; href?: string | null; text?: string };

export type Media = {
  id: number; key: string | null; name: string; alt: Tr; thumb: string | null; url: string | null; card: string | null; width: number | null; height: number | null;
  size: number | null; mime: string | null; file_name: string | null; folder_id: number | null; credit: string | null; credit_url: string | null; license: string | null;
  focal: [number, number]; created_at: string | null; trashed: boolean;
};
