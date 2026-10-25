import { PREVIEW_FONT_FAMILY } from './fonts';
import { PAGE_H, PAGE_W } from './layout';
import type { Page } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

const ANCHOR = { left: 'start', center: 'middle', right: 'end' } as const;

/** Draws one laid-out page as an SVG element sized to the page in points. */
export function renderPageSvg(page: Page): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${PAGE_W} ${PAGE_H}`);
  svg.setAttribute('class', 'sheet');
  svg.setAttribute('role', 'img');

  const el = (name: string, attrs: Record<string, string | number>) => {
    const node = document.createElementNS(SVG_NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
    svg.appendChild(node);
    return node;
  };

  el('rect', { x: 0, y: 0, width: PAGE_W, height: PAGE_H, fill: '#FFFFFF' });

  for (const op of page.ops) {
    switch (op.kind) {
      case 'rect':
        el('rect', { x: op.x, y: op.y, width: op.w, height: op.h, fill: op.fill });
        break;
      case 'line':
        el('line', {
          x1: op.x1,
          y1: op.y1,
          x2: op.x2,
          y2: op.y2,
          stroke: op.color,
          'stroke-width': op.width,
        });
        break;
      case 'text': {
        const node = el('text', {
          x: op.x,
          y: op.y,
          fill: op.color,
          'font-family': `${PREVIEW_FONT_FAMILY}, Roboto, Arial, sans-serif`,
          'font-size': op.size,
          'font-weight': op.weight === 'medium' ? 500 : 400,
          'text-anchor': ANCHOR[op.align],
          // jsPDF doesn't apply kerning, so turn it off here too and the two match exactly.
          style: 'font-kerning: none; white-space: pre',
        });
        node.textContent = op.text;
        break;
      }
    }
  }
  return svg;
}
