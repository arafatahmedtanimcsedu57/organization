import { Controller, Get } from '@nestjs/common';
import type { BuildWarning } from '@org-chart/domain';
import { OrgChartService } from './org-chart.service.ts';
import { annotateChartTree, type ChartNode } from './chart-node.ts';

/** `org-chart` capability: serves the built chart as JSON for the SPA. */
@Controller('chart')
export class OrgChartController {
  constructor(private readonly orgChartService: OrgChartService) {}

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
}
