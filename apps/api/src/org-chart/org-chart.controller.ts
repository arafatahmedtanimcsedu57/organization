import { Controller, Get, Header, StreamableFile } from '@nestjs/common';
import type { BuildWarning } from '@org-chart/domain';
import { OrgChartService } from './org-chart.service.ts';
import { ChartPdfService } from './chart-pdf.service.ts';
import { annotateChartTree, type ChartNode } from './chart-node.ts';

/** `org-chart` capability: serves the built chart as JSON for the SPA, plus a print-ready PDF. */
@Controller('chart')
export class OrgChartController {
  constructor(
    private readonly orgChartService: OrgChartService,
    private readonly chartPdfService: ChartPdfService,
  ) {}

  @Get()
  async getChart(): Promise<{ roots: ChartNode[] }> {
    const model = await this.orgChartService.buildOrgModel();
    return { roots: annotateChartTree(model.roots) };
  }

  @Get('warnings')
  async getWarnings(): Promise<{ warnings: BuildWarning[] }> {
    const model = await this.orgChartService.buildOrgModel();
    return { warnings: model.warnings };
  }

  @Get('pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="organization-chart.pdf"')
  async getChartPdf(): Promise<StreamableFile> {
    const pdf = await this.chartPdfService.renderChartPdf();
    return new StreamableFile(pdf);
  }
}
