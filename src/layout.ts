/**
 * Lays the invoice out as a list of simple drawing operations (rectangles, lines, text).
 * The on-screen preview (SVG) and the downloaded PDF both draw from this one layout,
 * so what you see is exactly what you download.
 *
 * Units are PDF points on an A4 page (595 × 842), measured from the top-left corner.
 * Positions and colours were taken from the original invoice design.
 */
import { computeTotals, displayValue, formatMoney, formatPlain, lineTotal } from './calc';
import type { DrawOp, FontWeight, InvoiceData, Measure, Page } from './types';

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;

const LEFT = 70;
/** Column edges of the items table: description | qty | unit price | total */
const COLS = [70, 310, 373, 462, 524] as const;
const TABLE_RIGHT = COLS[4];
const CONTENT_BOTTOM = PAGE_H - 60;
const CONTINUATION_TOP = 60;

const HEADER_H = 17;
const ROW_H = 18.2;
const MIN_ROWS = 6;
const TOTALS_ROW_H = 18.7;

const COLOR = {
  bar: '#E17879',
  header: '#C80000',
  headerRule: '#D94040',
  title: '#666666',
  sender: '#2A2D33',
  date: '#1E1E1E',
  billLabel: '#243150',
  body: '#000000',
  rule: '#E3E3E3',
  faintRule: '#EBEBEB',
  grid: '#D9D9D9',
  zebra: '#F3F3F3',
  remarks: '#222222',
  totalsLabel: '#2B2F36',
  totalsValue: '#3C3C3C',
  cellRule: '#EFEFEF',
  balanceRule: '#A9A9A9',
  balanceFill: '#D9EAD3',
  balanceEdge: '#B0BDAC',
  balanceLabel: '#2B2F38',
  balanceValue: '#1F1F1F',
  white: '#FFFFFF',
  pageNumber: '#8A8A8A',
};

/** Splits text into lines no wider than maxWidth, keeping the line breaks the person typed. */
export function wrapText(text: string, maxWidth: number, size: number, weight: FontWeight, measure: Measure): string[] {
  const out: string[] = [];
  for (const paragraph of text.replace(/\r/g, '').split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate, size, weight) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      // A single word longer than the line: break it by characters.
      while (measure(word, size, weight) > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && measure(word.slice(0, cut), size, weight) > maxWidth) cut--;
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      line = word;
    }
    out.push(line);
  }
  return out;
}

const splitLines = (text: string) =>
  text
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

/** Shrinks the font size until the text fits, for numbers in narrow columns. */
function fitSize(text: string, maxWidth: number, size: number, weight: FontWeight, measure: Measure, min = 6): number {
  let s = size;
  while (s > min && measure(text, s, weight) > maxWidth) s -= 0.25;
  return s;
}

export function layoutInvoice(data: InvoiceData, measure: Measure): Page[] {
  const pages: Page[] = [];
  let ops: DrawOp[] = [];

  const text = (
    x: number,
    y: number,
    value: string,
    size: number,
    color: string,
    weight: FontWeight = 'regular',
    align: 'left' | 'center' | 'right' = 'left',
  ) => {
    if (value) ops.push({ kind: 'text', x, y, text: value, size, weight, color, align });
  };
  const line = (x1: number, y1: number, x2: number, y2: number, color: string, width: number) =>
    ops.push({ kind: 'line', x1, y1, x2, y2, color, width });
  const rect = (x: number, y: number, w: number, h: number, fill: string) => ops.push({ kind: 'rect', x, y, w, h, fill });

  const newPage = () => {
    ops = [];
    pages.push({ ops });
    rect(LEFT, 10.5, PAGE_W - LEFT, 12.5, COLOR.bar);
  };

  // ── Top of page: bar, title, your details, date ───────────────────────────
  newPage();
  text(LEFT, 119.5, 'INVOICE', 24, COLOR.title);

  const senderLines = [data.business.name, ...splitLines(data.business.address), data.business.phone, data.business.email]
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => wrapText(l, 320, 10.8, 'regular', measure));
  senderLines.forEach((l, i) => text(LEFT, 190 + i * 14.5, l, 10.8, COLOR.sender));
  const senderLast = senderLines.length ? 190 + (senderLines.length - 1) * 14.5 : 190;

  // Date and invoice number sit on two faint lines at the right. Short text starts at the
  // left of the line, as on the original; longer text lines up with the line's right end.
  const RIGHT_X = 459;
  const RIGHT_END = 552;
  const rightText = (value: string, baseline: number) => {
    if (!value) return;
    const size = fitSize(value, RIGHT_END - LEFT - 330, 10.5, 'regular', measure, 8);
    if (measure(value, size, 'regular') <= RIGHT_END - RIGHT_X) text(RIGHT_X, baseline, value, size, COLOR.date);
    else text(RIGHT_END - 3, baseline, value, size, COLOR.date, 'regular', 'right');
  };
  rightText(data.date.trim(), 190);
  line(455, 196.5, RIGHT_END, 196.5, COLOR.faintRule, 0.75);
  rightText(data.invoiceNumber.trim() ? `Invoice no. ${data.invoiceNumber.trim()}` : '', 248);
  line(455, 254.5, RIGHT_END, 254.5, COLOR.faintRule, 0.75);

  // ── Bill to ───────────────────────────────────────────────────────────────
  const labelY = Math.max(318, senderLast + 52);
  text(LEFT, labelY, 'BILL TO', 8, COLOR.billLabel, 'medium');
  line(LEFT, labelY + 6.5, 280.5, labelY + 6.5, COLOR.rule, 0.75);
  line(309, labelY + 6.5, TABLE_RIGHT, labelY + 6.5, COLOR.rule, 0.75);

  const billLines = [data.customer.name, ...splitLines(data.customer.address)]
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((l) => wrapText(l, 230, 10.5, 'regular', measure));
  billLines.forEach((l, i) => text(LEFT, labelY + 19 + i * 18, l, 10.5, COLOR.body));
  const billLast = billLines.length ? labelY + 19 + (billLines.length - 1) * 18 : labelY;

  // ── Items table ───────────────────────────────────────────────────────────
  const drawTableHeader = (top: number) => {
    rect(LEFT, top, TABLE_RIGHT - LEFT, HEADER_H, COLOR.header);
    for (const x of COLS.slice(1, 4)) line(x, top, x, top + HEADER_H, COLOR.headerRule, 0.6);
    const labels = ['DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
    labels.forEach((label, i) => text((COLS[i] + COLS[i + 1]) / 2, top + 11.7, label, 8.8, COLOR.white, 'medium', 'center'));
  };
  const drawGrid = (top: number, bottom: number) => {
    if (bottom <= top) return;
    for (const x of COLS) line(x, top, x, bottom, COLOR.grid, 0.6);
    line(LEFT, bottom, TABLE_RIGHT, bottom, COLOR.grid, 0.6);
  };

  // Description, quantity and unit price print as typed (a plain number price is shown as money),
  // wrapping onto more lines if they don't fit their column.
  const cellLines = (value: string, width: number) => (value.trim() ? wrapText(value.trim(), width, 10, 'regular', measure) : []);
  const rows = data.items.map((item) => {
    const total = lineTotal(item);
    return {
      desc: cellLines(item.description, COLS[1] - COLS[0] - 6),
      qty: cellLines(item.qty, COLS[2] - COLS[1] - 6),
      unit: cellLines(displayValue(item.unitPrice, formatMoney), COLS[3] - COLS[2] - 12),
      total: total !== null ? formatMoney(total) : '',
    };
  });
  while (rows.length < MIN_ROWS) rows.push({ desc: [], qty: [], unit: [], total: '' });

  let y = Math.max(420, billLast + 29);
  drawTableHeader(y);
  y += HEADER_H;
  let segmentTop = y;

  rows.forEach((row, index) => {
    const lineCount = Math.max(row.desc.length, row.qty.length, row.unit.length, 1);
    const h = Math.max(ROW_H, 12.6 + (lineCount - 1) * 12 + 5.6);
    if (y + h > CONTENT_BOTTOM) {
      drawGrid(segmentTop, y);
      newPage();
      y = CONTINUATION_TOP;
      drawTableHeader(y);
      y += HEADER_H;
      segmentTop = y;
    }
    if (index % 2 === 1) rect(LEFT, y, TABLE_RIGHT - LEFT, h, COLOR.zebra);
    const base = y + 12.6;
    row.desc.forEach((l, i) => text(COLS[0] + 3, base + i * 12, l, 10, COLOR.body));
    row.qty.forEach((l, i) => text((COLS[1] + COLS[2]) / 2, base + i * 12, l, 10, COLOR.body, 'regular', 'center'));
    row.unit.forEach((l, i) => text(COLS[2] + 8, base + i * 12, l, 10, COLOR.body));
    text(COLS[4] - 4, base, row.total, fitSize(row.total, COLS[4] - COLS[3] - 8, 10, 'regular', measure), COLOR.body, 'regular', 'right');
    y += h;
  });
  drawGrid(segmentTop, y);

  // ── Remarks and totals ────────────────────────────────────────────────────
  // Discount, tax and shipping only appear when something has been typed in them.
  const totals = computeTotals(data);
  const totalRows: [string, string][] = [['SUBTOTAL', formatPlain(totals.subtotal)]];
  if (data.discount.trim()) totalRows.push(['DISCOUNT', displayValue(data.discount, formatPlain)]);
  if (data.taxRate.trim()) {
    totalRows.push(['TAX RATE', displayValue(data.taxRate, (n) => `${formatPlain(n)}%`)]);
    totalRows.push(['TOTAL TAX', formatPlain(totals.totalTax)]);
  }
  if (data.shipping.trim()) totalRows.push(['SHIPPING/HANDLING', displayValue(data.shipping, formatPlain)]);

  const totalsBlockH = totalRows.length * TOTALS_ROW_H + 36;
  if (y + totalsBlockH > CONTENT_BOTTOM) {
    newPage();
    y = CONTINUATION_TOP + 8;
  }
  const blockTop = y;

  // Remarks only appear when something has been typed in them.
  const remarkLines = data.remarks.trim() ? wrapText(data.remarks.trim(), 280, 9.5, 'regular', measure) : [];
  if (remarkLines.length) text(LEFT, blockTop + 12.5, 'Remarks / Payment Instructions:', 9, COLOR.remarks);

  const labelRight = COLS[3] - 4;
  const valueRight = COLS[4] - 4;
  const valueWidth = COLS[4] - COLS[3] - 8;
  totalRows.forEach(([label, value], i) => {
    const top = blockTop + i * TOTALS_ROW_H;
    text(labelRight, top + 12.2, label, 7.9, COLOR.totalsLabel, 'regular', 'right');
    text(valueRight, top + 12.6, value, fitSize(value, valueWidth, 9, 'regular', measure), COLOR.totalsValue, 'regular', 'right');
    if (i < totalRows.length - 1) line(COLS[3], top + TOTALS_ROW_H, COLS[4], top + TOTALS_ROW_H, COLOR.cellRule, 0.75);
  });

  const balanceTop = blockTop + totalRows.length * TOTALS_ROW_H;
  rect(COLS[3], balanceTop + 0.7, COLS[4] - COLS[3], 33.3, COLOR.balanceFill);
  line(COLS[2], balanceTop, COLS[4], balanceTop, COLOR.balanceRule, 1.4);
  line(COLS[3], balanceTop + 34, COLS[4], balanceTop + 34, COLOR.balanceEdge, 1.2);
  text(labelRight, balanceTop + 20.3, 'Balance Due', 12, COLOR.balanceLabel, 'medium', 'right');
  const balance = formatMoney(totals.balanceDue);
  text(valueRight, balanceTop + 27, balance, fitSize(balance, valueWidth, 10, 'regular', measure), COLOR.balanceValue, 'regular', 'right');

  // Remarks run down the left of the totals and carry on to another page if they're very long.
  let ry = blockTop + 12.5 + 15;
  for (const l of remarkLines) {
    if (ry > CONTENT_BOTTOM) {
      newPage();
      ry = CONTINUATION_TOP + 12;
    }
    text(LEFT, ry, l, 9.5, COLOR.sender);
    ry += 13;
  }

  // ── Page numbers, only when the invoice runs past one page ────────────────
  if (pages.length > 1) {
    pages.forEach((page, i) =>
      page.ops.push({
        kind: 'text',
        x: TABLE_RIGHT,
        y: PAGE_H - 34,
        text: `Page ${i + 1} of ${pages.length}`,
        size: 8,
        weight: 'regular',
        color: COLOR.pageNumber,
        align: 'right',
      }),
    );
  }

  return pages;
}
