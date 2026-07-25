import { describe, expect, test } from 'vitest';
import { pdfHref } from './PdfExportMenu';

/** The Download-PDF href builder: which `?divisions` the server is asked to render. */
describe('pdfHref', () => {
  test('omits the divisions param when every division is selected', () => {
    expect(pdfHref(['24500', '24501', '24502', '24503'], 4)).toBe('/api/chart/pdf');
  });

  test('omits the param when nothing is selected (server default = all)', () => {
    expect(pdfHref([], 4)).toBe('/api/chart/pdf');
  });

  test('joins a subset of ids into a comma-separated divisions param', () => {
    expect(pdfHref(['24500', '24502'], 4)).toBe('/api/chart/pdf?divisions=24500,24502');
  });

  test('encodes ids that are not URL-safe', () => {
    expect(pdfHref(['a b', 'c/d'], 3)).toBe('/api/chart/pdf?divisions=a%20b,c%2Fd');
  });
});
