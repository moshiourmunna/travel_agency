import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n';
import { clean, cn, money, num, query, ucfirst } from '@/lib/utils';
import { pages } from '@/components/admin/pagination';

describe('money / num (same grouping as PHP money())', () => {
  it.each([[0, '৳ 0'], [999, '৳ 999'], [1000, '৳ 1,000'], [845000, '৳ 8,45,000'], [1670000, '৳ 16,70,000'], [123456789, '৳ 12,34,56,789'], [-5000, '৳ -5,000'], ['392000', '৳ 3,92,000'], [null, '৳ 0'], [1234.6, '৳ 1,235']])('%s → %s', (n, out) => {
    expect(money(n as number)).toBe(out);
  });
  it('num drops the symbol', () => expect(num(845000)).toBe('8,45,000'));
});

describe('query / clean', () => {
  it('drops empty values', () => expect(query({ q: '', status: 'paid', page: 2, x: null, y: undefined })).toBe('?status=paid&page=2'));
  it('returns empty string when nothing left', () => expect(query({ a: '' })).toBe(''));
  it('clean removes blanks only', () => expect(clean({ a: '', b: '0', c: 0, d: null })).toEqual({ b: '0', c: 0 }));
});

describe('helpers', () => {
  it('ucfirst replaces underscores', () => expect(ucfirst('docs_pending')).toBe('Docs pending'));
  it('ucfirst handles null', () => expect(ucfirst(null)).toBe(''));
  it('cn merges tailwind conflicts', () => expect(cn('px-2', 'px-4', false && 'x')).toBe('px-4'));
});

describe('translate (Laravel-style)', () => {
  const bn = { Bookings: 'বুকিং', ':n bookings': ':n টি বুকিং', 'Hello :name': 'Hi :Name / :name' };
  it('uses the dictionary', () => expect(translate(bn, 'Bookings')).toBe('বুকিং'));
  it('falls back to key', () => expect(translate(bn, 'Missing key')).toBe('Missing key'));
  it('falls back without a dictionary', () => expect(translate(undefined, 'X :a', { a: 1 })).toBe('X 1'));
  it('replaces placeholders', () => expect(translate(bn, ':n bookings', { n: 5 })).toBe('5 টি বুকিং'));
  it('replaces longer keys first (:total vs :to)', () => expect(translate({}, ':from–:to of :total', { from: 1, to: 20, total: 90 })).toBe('1–20 of 90'));
  it('supports :Ucfirst placeholders', () => expect(translate(bn, 'Hello :name', { name: 'rahim' })).toBe('Hi Rahim / rahim'));
});

describe('pagination window', () => {
  it('short lists show every page', () => expect(pages(2, 4)).toEqual([1, 2, 3, 4]));
  it('long lists collapse with ellipses', () => expect(pages(6, 20)).toEqual([1, '…', 5, 6, 7, '…', 20]));
  it('start of range', () => expect(pages(1, 10)).toEqual([1, 2, '…', 10]));
  it('end of range', () => expect(pages(10, 10)).toEqual([1, '…', 9, 10]));
  it('single page', () => expect(pages(1, 1)).toEqual([1]));
});
