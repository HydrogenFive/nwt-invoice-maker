/** Everything the person types into the form. Every field is free text, exactly as typed. */
export interface LineItem {
  id: string;
  description: string;
  qty: string;
  unitPrice: string;
}

export interface InvoiceData {
  business: {
    name: string;
    address: string; // multi-line
    phone: string;
    email: string;
  };
  date: string; // printed as typed, e.g. "17/8/25"
  invoiceNumber: string;
  customer: {
    name: string;
    address: string; // multi-line
  };
  items: LineItem[];
  discount: string; // amount in pounds; left off the invoice when blank
  taxRate: string; // percent; left off the invoice when blank
  shipping: string; // amount in pounds; left off the invoice when blank
  remarks: string; // multi-line; left off the invoice when blank
}

/** One drawing instruction on a page. Coordinates are PDF points (1/72 inch), origin top-left. */
export type FontWeight = 'regular' | 'medium';

export type DrawOp =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | {
      kind: 'text';
      x: number;
      y: number; // baseline
      text: string;
      size: number;
      weight: FontWeight;
      color: string;
      align: 'left' | 'center' | 'right';
    };

export interface Page {
  ops: DrawOp[];
}

/** Measures the advance width of a string in points. */
export type Measure = (text: string, size: number, weight: FontWeight) => number;
