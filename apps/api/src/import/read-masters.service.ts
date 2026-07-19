import fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import type { Department, Employee } from '@org-chart/domain';

/** Read a sheet as an array of plain objects keyed by the header row. */
function readSheet(filePath: string, sheetName = 'Page 1'): Record<string, unknown>[] {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
  const sheet = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) throw new Error(`No sheet "${sheetName}" in ${filePath}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/** Trim and coerce a cell to string (SheetJS gives us strings via raw:false). */
const str = (v: unknown): string => (v == null ? '' : String(v).trim());

/**
 * Reads the `sys_user` / `cmn_department` xlsx masters (SheetJS, seed-time only) into
 * the shared `@org-chart/domain` row shapes. Only the "Page 1" sheet of each file is
 * read; encoding/title normalization happens later in the import pipeline, not here.
 */
@Injectable()
export class ReadMastersService {
  readDepartments(filePath: string): Department[] {
    return readSheet(filePath)
      .map((r) => ({
        id: str(r['ID']),
        name: str(r['Name']),
        parentName: str(r['Parent']),
        head: str(r['Department head']),
        sysId: str(r['Sys ID']),
      }))
      .filter((d) => d.name !== '');
  }

  readEmployees(filePath: string): Employee[] {
    return readSheet(filePath)
      .map((r) => ({
        lastName: str(r['Last name']),
        firstName: str(r['First name']),
        title: str(r['Title']),
        departmentName: str(r['Department']),
        userId: str(r['User ID']),
        sysId: str(r['Sys ID']),
      }))
      .filter((u) => u.lastName !== '' || u.firstName !== '');
  }
}
