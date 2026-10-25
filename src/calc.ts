import type { InvoiceData, LineItem } from './types';

/**
 * Every box on the form is free text. For sums, the first number in the text is used and
 * everything else is ignored: "10m" → 10, "£1,250.50" → 1250.5, "20% VAT" → 20.
 * Text with no number in it ("Free", "TBC") counts as nothing.
 */
export function extractNumber(raw: string): number | null {
  const match = /-?(?:\d[\d,]*(?:\.\d+)?|\.\d+)/.exec(raw);
  if (!match) return null;
  const n = Number(match[0].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** True when the text is just a number, optionally with £, % or thousands commas: "200", "£1,250", "20%". */
export function isPlainNumber(raw: string): boolean {
  return /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw.replace(/[£,%\s]/g, ''));
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Quantity × unit price. A quantity with no number in it (or left blank) counts as 1,
 * so "Call-out fee | | £50" totals £50. No number in the unit price means no total.
 */
export function lineTotal(item: LineItem): number | null {
  const price = extractNumber(item.unitPrice);
  if (price === null) return null;
  const qty = extractNumber(item.qty) ?? 1;
  return round2(qty * price);
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
  const discount = round2(extractNumber(data.discount) ?? 0);
  const taxRate = extractNumber(data.taxRate) ?? 0;
  const totalTax = round2(((subtotal - discount) * taxRate) / 100);
  const shipping = round2(extractNumber(data.shipping) ?? 0);
  const balanceDue = round2(subtotal - discount + totalTax + shipping);
  return { subtotal, discount, taxRate, totalTax, shipping, balanceDue };
}

const plain = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 800 → "800.00" (used in the small totals rows, which show no £ sign on the original). */
export const formatPlain = (n: number) => plain.format(n);

/** 800 → "£800.00" */
export const formatMoney = (n: number) => (n < 0 ? '-£' : '£') + plain.format(Math.abs(n));

/**
 * How a typed value appears on the invoice: a plain number gets tidied ("200" → "£200.00"),
 * anything with words in it appears exactly as typed ("£30 per m²", "Free").
 */
export function displayValue(raw: string, format: (n: number) => string): string {
  const text = raw.trim();
  if (!text) return '';
  const n = extractNumber(text);
  return n !== null && isPlainNumber(text) ? format(n) : text;
}

/** "2025-08-17" → "17/8/25", matching the original invoice. Other text is left alone. */
export function formatDate(text: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!m) return text;
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
