import type { InvoiceData, LineItem } from './types';

/**
 * What the form starts with the first time someone opens the page.
 * After that, whatever they type is remembered in their own browser.
 *
 * If you'd like your business details filled in for everyone who opens the page,
 * put them in DEFAULT_BUSINESS below. Bear in mind the site is public, so anything
 * here can be seen by anyone who looks at the page's code.
 */
export const DEFAULT_BUSINESS: InvoiceData['business'] = {
  name: '',
  address: '',
  phone: '',
  email: '',
};

export const DEFAULT_REMARKS = '';

export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function newItem(): LineItem {
  return { id: makeId(), description: '', qty: '', unitPrice: '' };
}

/** Today's date written the way the original invoice writes it: 17/8/25. */
export function todayText(): string {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
}

export function blankInvoice(business = DEFAULT_BUSINESS, remarks = DEFAULT_REMARKS): InvoiceData {
  return {
    business: { ...business },
    date: todayText(),
    invoiceNumber: '',
    customer: { name: '', address: '' },
    items: [newItem()],
    discount: '',
    taxRate: '',
    shipping: '',
    remarks,
  };
}
