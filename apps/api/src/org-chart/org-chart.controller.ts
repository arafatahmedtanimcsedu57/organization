import { Controller, Get, Header, Query, StreamableFile } from '@nestjs/common';
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
  async getChartPdf(
    /** Comma-separated division (root) ids to export; omit to render every division. */
    @Query('divisions') divisions?: string,
  ): Promise<StreamableFile> {
    const pdf = await this.chartPdfService.renderChartPdf({ divisions });
    return new StreamableFile(pdf);
  }
}
