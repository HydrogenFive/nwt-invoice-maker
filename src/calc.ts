import type { InvoiceData, LineItem } from './types';

/** Parses what someone typed into a money/number box: "£1,250.50" → 1250.5. Blank or junk → null. */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[£,\s%]/g, '');
  if (cleaned === '' || cleaned === '.' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: LineItem): number | null {
  const qty = parseNumber(item.qty);
  const price = parseNumber(item.unitPrice);
  if (qty === null && price === null) return null;
  return round2((qty ?? 0) * (price ?? 0));
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxRate: number;
  totalTax: number;
  shipping: number;
  balanceDue: number;
}

export function computeTotals(data: InvoiceData): Totals {
  const subtotal = round2(data.items.reduce((sum, item) => sum + (lineTotal(item) ?? 0), 0));
  const discount = round2(parseNumber(data.discount) ?? 0);
  const taxRate = parseNumber(data.taxRate) ?? 0;
  const totalTax = round2(((subtotal - discount) * taxRate) / 100);
  const shipping = round2(parseNumber(data.shipping) ?? 0);
  const balanceDue = round2(subtotal - discount + totalTax + shipping);
  return { subtotal, discount, taxRate, totalTax, shipping, balanceDue };
}

const plain = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 800 → "800.00" (used in the small totals rows, which show no £ sign on the original). */
export const formatPlain = (n: number) => plain.format(n);

/** 800 → "£800.00" */
export const formatMoney = (n: number) => (n < 0 ? '-£' : '£') + plain.format(Math.abs(n));

/** Quantities show as typed numbers without trailing zeros: 4 → "4", 12.5 → "12.5". */
export function formatQty(raw: string): string {
  const n = parseNumber(raw);
  if (n === null) return raw.trim();
  return new Intl.NumberFormat('en-GB', { maximumFractionDigits: 3 }).format(n);
}

/** "2025-08-17" → "17/8/25", matching the original invoice. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])}/${Number(m[2])}/${m[1].slice(2)}`;
}

/** "Invoice for The Accommodation Team.pdf", with characters that aren't allowed in file names removed. */
export function fileNameFor(data: InvoiceData): string {
  const customer = data.customer.name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return customer ? `Invoice for ${customer}.pdf` : 'Invoice.pdf';
}
