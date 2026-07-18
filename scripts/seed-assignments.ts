/**
 * One-off generator for data/user_assignments.xlsx — the additive concurrent-duties (兼務)
 * source described in docs/concurrent-duties-design.md.
 *
 * Run with:  npx tsx scripts/seed-assignments.ts
 *
 * After generation, maintainers edit the xlsx directly (add/remove rows) and re-run
 * `npm run chart`. Rows are keyed by Sys ID; the human-readable `note` column is ignored
 * by the generator and exists only to make hand-editing sane.
 *
 * Seeded with the concurrent placements visible in the legacy hand-made chart whose target
 * department exists in cmn_department. Two legacy (兼) cases are intentionally NOT seeded:
 *   - 悠一郎 佐藤 as 部長 of「ソリューション営業部」— that 部 node is absent from the master
 *     (present only in the reference legend); see docs/concurrent-duties-design.md.
 *   - 曠弌 佐藤 as 事業部長(兼) of システム事業部 — redundant: he is already the primary
 *     member of システム事業部 (代表取締役) in sys_user.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(rootDir, "data", "user_assignments.xlsx");

interface SeedRow {
  assignment_id: string;
  user_sys_id: string;
  department_id: string;
  title: string;
  is_primary: boolean;
  assignment_type: "primary" | "concurrent";
  valid_from: string;
  valid_to: string;
  note: string;
}

const rows: SeedRow[] = [
  {
    assignment_id: "A001",
    user_sys_id: "e9275f28c3e842109af532011501311b", // 邦義 照沼
    department_id: "24510", // ITサポート事業部 購買調達部
    title: "部長",
    is_primary: false,
    assignment_type: "concurrent",
    valid_from: "2024-04-01",
    valid_to: "",
    note: "照沼 邦義 — 兼務 部長 of 購買調達部 (primary: 事業部長 of ITサポート事業部)",
  },
  {
    assignment_id: "A002",
    user_sys_id: "50325bfcc3e082109af5320115013100", // 啓介 濱井
    department_id: "24111", // ソリューション営業部 1課1G
    title: "主任",
    is_primary: false,
    assignment_type: "concurrent",
    valid_from: "2024-04-01",
    valid_to: "",
    note: "濱井 啓介 — 兼務 主任 of 1課1G (primary: 課長 of ソリューション営業部 1課)",
  },
  {
    assignment_id: "A003",
    user_sys_id: "17525bfcc3e082109af5320115013104", // 真也 山田
    department_id: "24510", // ITサポート事業部 購買調達部
    title: "部長",
    is_primary: false,
    assignment_type: "concurrent",
    valid_from: "2024-04-01",
    valid_to: "",
    note: "山田 真也 — 兼務 部長 of 購買調達部 (primary: 課長 of ソリューション営業部 2課)",
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "assignments");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
fs.writeFileSync(outPath, buf);
console.log(`✓ Wrote ${path.relative(process.cwd(), outPath)} with ${rows.length} concurrent-duty rows.`);
