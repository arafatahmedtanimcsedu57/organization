import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-core';
import type { AppConfig } from '../config/configuration.ts';

/** Options for `renderChartPdf`. */
export interface RenderChartPdfOptions {
  /** Comma-separated division (root) ids to export; omit to render every division. */
  divisions?: string;
}

/** "July 2026" - matches the cover block's `effectiveDateLabel()` (`reportUtils.ts`), computed
 * the same way (current month/year) so the two never disagree. */
function effectiveDateLabel(): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
}

/**
 * Running footer only - the company name / title / totals / legend live in the document's own
 * cover block (see `TopdownPrint`'s `ReportCover`), not a repeating page header, so continuation
 * pages start right at the content like a real document. Font size must be set inline (the
 * Chrome default is 0); `pageNumber`/`totalPages` are filled in by Chrome. Padding matches the
 * page's left/right margin.
 */
const PDF_FOOTER = `<div style="width:100%;font-family:'Noto Sans JP','Noto Sans CJK JP',sans-serif;font-size:8.5px;color:#8a8a8a;padding:0 14mm;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;">
  <span>株式会社シスラボ · SYSLAB CO. LTD.</span>
  <span>Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  <span>Organization Chart · Effective ${effectiveDateLabel()}</span>
</div>`;

/**
 * `org-chart` capability: renders `GET /chart/pdf` by launching headless Chrome against the
 * SPA's own `/chart?print=1` route, so the PDF and the interactive view share one React
 * component/data source instead of a second server-side template drifting from it. The
 * print route renders a **document report** (A4 portrait, readable outline) with a cover
 * block and one division per page (see `TopdownPrint`), plus a running page-number footer.
 */
@Injectable()
export class ChartPdfService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async renderChartPdf({ divisions }: RenderChartPdfOptions = {}): Promise<Buffer> {
    const { webBaseUrl, chromiumExecutablePath, timeoutMs } = this.configService.get('pdf', { infer: true });

    const browser = await puppeteer.launch({
      executablePath: chromiumExecutablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      page.setDefaultNavigationTimeout(timeoutMs);
      page.setDefaultTimeout(timeoutMs);

      // Forward the division selection to the print route so the PDF renders only what was
      // asked for (absent = all divisions).
      const printPath = divisions
        ? `/chart?print=1&divisions=${encodeURIComponent(divisions)}`
        : '/chart?print=1';
      const printUrl = new URL(printPath, webBaseUrl).toString();
      await page.goto(printUrl, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        landscape: false, // portrait: the report reads top-to-bottom like a document
        printBackground: true,
        displayHeaderFooter: true,
        // No running header - the cover block is the document's title, not a repeating band.
        // Matches the `@page` margin in tailwind.css's report styles.
        margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
        headerTemplate: '<span></span>',
        footerTemplate: PDF_FOOTER,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
