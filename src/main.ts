import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import './style.css';

import { computeTotals, fileNameFor, formatMoney, lineTotal } from './calc';
import { blankInvoice, newItem } from './defaults';
import { loadFonts } from './fonts';
import { layoutInvoice } from './layout';
import { renderPdf } from './render-pdf';
import { renderPageSvg } from './render-svg';
import { loadInvoice, saveInvoice } from './storage';
import type { InvoiceData, LineItem, Measure } from './types';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const form = $<HTMLFormElement>('editor');
const itemsList = $<HTMLOListElement>('items');
const itemTemplate = $<HTMLTemplateElement>('item-template');
const pagesEl = $<HTMLDivElement>('pages');
const balanceEl = $<HTMLElement>('balance-due');
const fileNameEl = $<HTMLSpanElement>('file-name');
const downloadBtn = $<HTMLButtonElement>('download');
const toast = $<HTMLDivElement>('toast');
const toastText = $<HTMLSpanElement>('toast-text');
const toastUndo = $<HTMLButtonElement>('toast-undo');

let data: InvoiceData = loadInvoice();
let measure: Measure | null = null;

// ── Reading and writing simple fields ("business.name", "date", …) ─────────
type FieldPath = string;

function getField(path: FieldPath): string {
  return path.split('.').reduce<any>((obj, key) => obj?.[key], data) ?? '';
}

function setField(path: FieldPath, value: string) {
  const keys = path.split('.');
  const last = keys.pop()!;
  const target = keys.reduce<any>((obj, key) => obj[key], data);
  target[last] = value;
}

function fillForm() {
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]').forEach((el) => {
    el.value = getField(el.dataset.field!);
  });
  renderItems();
}

// ── Line items ─────────────────────────────────────────────────────────────
function renderItems(focusId?: string) {
  itemsList.replaceChildren();
  data.items.forEach((item, index) => {
    const li = (itemTemplate.content.firstElementChild as HTMLLIElement).cloneNode(true) as HTMLLIElement;
    li.dataset.id = item.id;
    const n = index + 1;

    li.querySelectorAll<HTMLInputElement>('[data-item-field]').forEach((input) => {
      const key = input.dataset.itemField as keyof Omit<LineItem, 'id'>;
      const id = `item-${item.id}-${key}`;
      input.id = id;
      input.value = item[key];
      const label = input.closest('.field')!.querySelector('label')!;
      label.htmlFor = id;
      input.setAttribute('aria-label', `${label.textContent} for item ${n}`);
    });
    if (index > 0) li.classList.add('item-compact');

    const remove = li.querySelector<HTMLButtonElement>('[data-remove]')!;
    remove.setAttribute('aria-label', `Remove item ${n}`);
    remove.title = 'Remove item';

    itemsList.appendChild(li);
  });
  updateItemTotals();
  if (focusId) itemsList.querySelector<HTMLInputElement>(`#item-${focusId}-description`)?.focus();
}

function updateItemTotals() {
  itemsList.querySelectorAll<HTMLLIElement>('.item').forEach((li) => {
    const item = data.items.find((it) => it.id === li.dataset.id);
    if (!item) return;
    const total = lineTotal(item);
    li.querySelector('output')!.textContent = total === null ? '—' : formatMoney(total);
  });
}

itemsList.addEventListener('input', (e) => {
  const input = e.target as HTMLInputElement;
  const li = input.closest<HTMLLIElement>('.item');
  const key = input.dataset.itemField as keyof Omit<LineItem, 'id'> | undefined;
  if (!li || !key) return;
  const item = data.items.find((it) => it.id === li.dataset.id);
  if (!item) return;
  item[key] = input.value;
  updateItemTotals();
  changed();
});

itemsList.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-remove]');
  if (!btn) return;
  const li = btn.closest<HTMLLIElement>('.item')!;
  const index = data.items.findIndex((it) => it.id === li.dataset.id);
  if (index < 0) return;
  const before = structuredClone(data);
  data.items.splice(index, 1);
  if (data.items.length === 0) data.items.push(newItem());
  renderItems();
  const next = itemsList.querySelectorAll<HTMLButtonElement>('[data-remove]')[Math.min(index, data.items.length - 1)];
  next?.focus();
  changed();
  showToast('Item removed.', before);
});

$<HTMLButtonElement>('add-item').addEventListener('click', () => {
  const item = newItem();
  data.items.push(item);
  renderItems(item.id);
  changed();
});

// Pressing Enter in an item's price adds a new item, so a list can be typed without the mouse.
itemsList.addEventListener('keydown', (e) => {
  const input = e.target as HTMLInputElement;
  if (e.key !== 'Enter' || input.dataset.itemField !== 'unitPrice') return;
  e.preventDefault();
  const li = input.closest<HTMLLIElement>('.item')!;
  const isLast = data.items[data.items.length - 1]?.id === li.dataset.id;
  if (isLast) {
    const item = newItem();
    data.items.push(item);
    renderItems(item.id);
    changed();
  }
});

// ── Other fields ───────────────────────────────────────────────────────────
form.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (!el.dataset.field) return;
  setField(el.dataset.field, el.value);
  changed();
});
form.addEventListener('submit', (e) => e.preventDefault());

// ── Preview ────────────────────────────────────────────────────────────────
let frame = 0;
function changed() {
  saveInvoice(data);
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(update);
}

function update() {
  const totals = computeTotals(data);
  balanceEl.textContent = formatMoney(totals.balanceDue);
  fileNameEl.textContent = fileNameFor(data);
  if (!measure) return;

  const pages = layoutInvoice(data, measure);
  const sheets = pages.map((page, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'page';
    const svg = renderPageSvg(page);
    svg.setAttribute('aria-label', pages.length > 1 ? `Invoice preview, page ${i + 1} of ${pages.length}` : 'Invoice preview');
    wrap.appendChild(svg);
    return wrap;
  });
  pagesEl.replaceChildren(...sheets);
}

// ── Download ───────────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', () => {
  if (!measure) return;
  const fileName = fileNameFor(data);
  const doc = renderPdf(layoutInvoice(data, measure), fileName.replace(/\.pdf$/, ''));
  doc.save(fileName);
});

// ── New invoice (keeps your details and payment instructions) ───────────────
document.querySelectorAll<HTMLButtonElement>('[data-new-invoice]').forEach((btn) =>
  btn.addEventListener('click', () => {
    const before = structuredClone(data);
    data = blankInvoice(data.business, data.remarks);
    fillForm();
    changed();
    showToast('Started a new invoice. Your details and remarks were kept.', before);
    $<HTMLInputElement>('customer-name').focus();
  }),
);

// ── Undo toast ─────────────────────────────────────────────────────────────
let undoState: InvoiceData | null = null;
let toastTimer = 0;
function showToast(message: string, restore: InvoiceData) {
  undoState = restore;
  toastText.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.hidden = true), 8000);
}
toastUndo.addEventListener('click', () => {
  if (!undoState) return;
  data = undoState;
  undoState = null;
  toast.hidden = true;
  fillForm();
  changed();
});

// ── Edit / Preview switch on small screens ─────────────────────────────────
document.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.viewButton!;
    document.body.dataset.view = view;
    document.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((b) => {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    window.scrollTo({ top: 0 });
  });
});

// ── Start ──────────────────────────────────────────────────────────────────
fillForm();
update();
loadFonts()
  .then((m) => {
    measure = m;
    downloadBtn.disabled = false;
    update();
  })
  .catch((err) => {
    console.error(err);
    pagesEl.replaceChildren(
      Object.assign(document.createElement('p'), {
        className: 'loading',
        textContent: 'The preview couldn’t load its fonts. Check your connection and reload the page.',
      }),
    );
  });
