import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer from 'puppeteer-core';
import type { AppConfig } from '../config/configuration.ts';

/**
 * `org-chart` capability: renders `GET /chart/pdf` by launching headless Chrome against the
 * SPA's own `/chart?print=1` route, so the PDF and the interactive view share one React
 * component/data source instead of a second server-side template drifting from it.
 */
@Injectable()
export class ChartPdfService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  async renderChartPdf(): Promise<Buffer> {
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

      const printUrl = new URL('/chart?print=1', webBaseUrl).toString();
      await page.goto(printUrl, { waitUntil: 'networkidle0' });

      const pdf = await page.pdf({
        format: 'A4',
        landscape: false,
        printBackground: true,
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
