import { formatDate } from './calc';
import { blankInvoice, makeId, newItem } from './defaults';
import type { InvoiceData } from './types';

const KEY = 'invoice-maker:v1';

/** Reads the last invoice from this browser, filling in anything missing with defaults. */
export function loadInvoice(): InvoiceData {
  const fallback = blankInvoice();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const saved = JSON.parse(raw) as Partial<InvoiceData>;
    const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
    const items = Array.isArray(saved.items)
      ? saved.items.map((it) => ({
          id: str(it?.id, makeId()),
          description: str(it?.description, ''),
          qty: str(it?.qty, ''),
          unitPrice: str(it?.unitPrice, ''),
        }))
      : [];
    return {
      business: {
        name: str(saved.business?.name, fallback.business.name),
        address: str(saved.business?.address, fallback.business.address),
        phone: str(saved.business?.phone, fallback.business.phone),
        email: str(saved.business?.email, fallback.business.email),
      },
      // Earlier versions stored the date as 2025-08-17; show it the way it's printed instead.
      date: formatDate(str(saved.date, fallback.date)),
      invoiceNumber: str(saved.invoiceNumber, ''),
      customer: {
        name: str(saved.customer?.name, ''),
        address: str(saved.customer?.address, ''),
      },
      items: items.length ? items : [newItem()],
      discount: str(saved.discount, ''),
      taxRate: str(saved.taxRate, ''),
      shipping: str(saved.shipping, ''),
      remarks: str(saved.remarks, fallback.remarks),
    };
  } catch {
    return fallback;
  }
}

export function saveInvoice(data: InvoiceData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing or storage full: the page still works, it just won't remember.
  }
}
