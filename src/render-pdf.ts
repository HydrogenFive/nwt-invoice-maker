import type { jsPDF } from 'jspdf';
import { createPdf, pdfFontName } from './fonts';
import type { Page } from './types';

/** Draws the laid-out pages into a new PDF document. */
export function renderPdf(pages: Page[], title: string): jsPDF {
  const doc = createPdf();
  doc.setProperties({ title, subject: title, creator: 'Invoice maker' });

  pages.forEach((page, index) => {
    if (index > 0) doc.addPage('a4', 'portrait');
    for (const op of page.ops) {
      switch (op.kind) {
        case 'rect':
          doc.setFillColor(op.fill);
          doc.rect(op.x, op.y, op.w, op.h, 'F');
          break;
        case 'line':
          doc.setDrawColor(op.color);
          doc.setLineWidth(op.width);
          doc.line(op.x1, op.y1, op.x2, op.y2);
          break;
        case 'text':
          doc.setFont(pdfFontName(op.weight), 'normal');
          doc.setFontSize(op.size);
          doc.setTextColor(op.color);
          doc.text(op.text, op.x, op.y, { align: op.align, baseline: 'alphabetic' });
          break;
      }
    }
  });
  return doc;
}
