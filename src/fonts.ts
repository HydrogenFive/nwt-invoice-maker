/**
 * Loads Roboto (the typeface on the original invoice) once, for both the preview and the PDF.
 * The same font files are used by the browser for the on-screen preview and embedded in the PDF,
 * and all text measuring goes through jsPDF so line wrapping is identical in both.
 */
import { jsPDF } from 'jspdf';
import regularUrl from './fonts/Roboto-Regular.ttf?url';
import mediumUrl from './fonts/Roboto-Medium.ttf?url';
import type { FontWeight, Measure } from './types';

export const PREVIEW_FONT_FAMILY = 'InvoiceRoboto';

/** jsPDF font names for each weight. */
const PDF_FONT: Record<FontWeight, { file: string; name: string }> = {
  regular: { file: 'Roboto-Regular.ttf', name: 'Roboto' },
  medium: { file: 'Roboto-Medium.ttf', name: 'RobotoMedium' },
};

let fontData: Record<FontWeight, string> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load font ${url} (${res.status})`);
  return res.arrayBuffer();
}

/** Fetches the font files, registers them for the preview, and returns a text measurer. */
export async function loadFonts(): Promise<Measure> {
  const [regular, medium] = await Promise.all([fetchFont(regularUrl), fetchFont(mediumUrl)]);

  const faces = [
    new FontFace(PREVIEW_FONT_FAMILY, regular.slice(0), { weight: '400' }),
    new FontFace(PREVIEW_FONT_FAMILY, medium.slice(0), { weight: '500' }),
  ];
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => document.fonts.add(f));

  fontData = { regular: toBase64(regular), medium: toBase64(medium) };

  const measurer = createPdf();
  return (text, size, weight) => {
    measurer.setFont(PDF_FONT[weight].name, 'normal');
    measurer.setFontSize(size);
    return measurer.getTextWidth(text);
  };
}

/** A new A4 jsPDF document (points) with Roboto registered. */
export function createPdf(): jsPDF {
  if (!fontData) throw new Error('Fonts not loaded yet');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  for (const weight of ['regular', 'medium'] as const) {
    const { file, name } = PDF_FONT[weight];
    doc.addFileToVFS(file, fontData[weight]);
    doc.addFont(file, name, 'normal');
  }
  doc.setFont(PDF_FONT.regular.name, 'normal');
  return doc;
}

export function pdfFontName(weight: FontWeight): string {
  return PDF_FONT[weight].name;
}
