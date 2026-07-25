import fs from 'node:fs';
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { CANONICAL_TITLES, findTitleByLabel, type Department, type Employee } from '@org-chart/domain';
import { normalizeText } from './normalize.ts';

/** Read a sheet as an array of plain objects keyed by the header row. */
function readSheet(filePath: string, sheetName = 'Page 1'): Record<string, unknown>[] {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
  const sheet = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) throw new Error(`No sheet "${sheetName}" in ${filePath}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/** Coerce a cell to string and normalize it (mojibake repair, full-width digits, spacing). */
const str = (v: unknown): string => (v == null ? '' : normalizeText(String(v)));

/**
 * Reads the `sys_user` / `cmn_department` xlsx masters (SheetJS, seed-time only) into
 * the shared `@org-chart/domain` row shapes. Only the "Page 1" sheet of each file is
 * read. Every cell is normalized (see `./normalize.ts`) so downstream logic - the
 * database, `@org-chart/domain`, the UI - sees consistent values.
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
      .map((r) => {
        const title = str(r['Title']);
        return {
          lastName: str(r['Last name']),
          firstName: str(r['First name']),
          title,
          // Resolve the free-text master title to a managed title id against the
          // canonical seed (the DB is seeded with exactly these). '' when unrecognized.
          titleId: findTitleByLabel(CANONICAL_TITLES, title)?.id ?? '',
          departmentName: str(r['Department']),
          userId: str(r['User ID']),
          sysId: str(r['Sys ID']),
        };
      })
      .filter((u) => u.lastName !== '' || u.firstName !== '');
  }
}
