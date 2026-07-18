/**
 * Reads the three xlsx sources with SheetJS and maps them to typed rows.
 *
 * SheetJS decodes the shared-strings table as UTF-16 internally, so Japanese text
 * comes through correctly. We only ever read the "Page 1" sheet of each master and
 * ignore auxiliary sheets (e.g. sys_user's "choice_values", which contains known mojibake).
 */
import fs from "node:fs";
import * as XLSX from "xlsx";
import type { AssignmentRow, DepartmentRow, UserRow } from "./model.ts";

/** Read a sheet as an array of plain objects keyed by the header row. */
function readSheet(
  filePath: string,
  sheetName = "Page 1",
): Record<string, unknown>[] {
  const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });
  const sheet = wb.Sheets[sheetName] ?? wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) throw new Error(`No sheet "${sheetName}" in ${filePath}`);
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
}

/** Trim and coerce a cell to string (SheetJS gives us strings via raw:false). */
const str = (v: unknown): string => (v == null ? "" : String(v).trim());

export function readDepartments(filePath: string): DepartmentRow[] {
  return readSheet(filePath)
    .map((r) => ({
      id: str(r["ID"]),
      name: str(r["Name"]),
      parent: str(r["Parent"]),
      head: str(r["Department head"]),
      sysId: str(r["Sys ID"]),
    }))
    .filter((d) => d.name !== "");
}

export function readUsers(filePath: string): UserRow[] {
  return readSheet(filePath)
    .map((r) => ({
      lastName: str(r["Last name"]),
      firstName: str(r["First name"]),
      title: str(r["Title"]),
      department: str(r["Department"]),
      userId: str(r["User ID"]),
      sysId: str(r["Sys ID"]),
    }))
    .filter((u) => u.lastName !== "" || u.firstName !== "");
}

/**
 * Read the additive concurrent-duties sheet. Returns [] if the file is absent so the
 * generator still runs on the base masters alone. Columns match docs/concurrent-duties-design.md.
 */
export function readAssignments(filePath: string): AssignmentRow[] {
  if (!fs.existsSync(filePath)) return [];
  return readSheet(filePath, "assignments")
    .map((r) => ({
      userSysId: str(r["user_sys_id"]),
      departmentId: str(r["department_id"]),
      title: str(r["title"]),
      type: (str(r["assignment_type"]) === "primary"
        ? "primary"
        : "concurrent") as AssignmentRow["type"],
    }))
    .filter((a) => a.userSysId !== "" && a.departmentId !== "");
}
