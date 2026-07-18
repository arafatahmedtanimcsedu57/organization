/**
 * CLI entry point: read the masters, build the org model, render HTML, write it out,
 * and print a summary + any data warnings. Run with `npm run chart`.
 */
import fs from "node:fs";
import path from "node:path";
import { PATHS } from "./config.ts";
import { readAssignments, readDepartments, readUsers } from "./readMasters.ts";
import { buildOrg } from "./buildOrg.ts";
import { renderHtml } from "./renderHtml.ts";

function main(): void {
  const departments = readDepartments(PATHS.department);
  const users = readUsers(PATHS.sysUser);
  const assignments = readAssignments(PATHS.assignments);

  const model = buildOrg(departments, users, assignments);
  const html = renderHtml(model.roots);

  fs.mkdirSync(path.dirname(PATHS.output), { recursive: true });
  fs.writeFileSync(PATHS.output, html, "utf-8");

  const { departments: nDept, peoplePlaced, concurrentEntries } = model.stats;
  console.log(`✓ Wrote ${path.relative(process.cwd(), PATHS.output)}`);
  console.log(
    `  ${nDept} departments · ${model.roots.length} roots · ${peoplePlaced} people placed · ${concurrentEntries} concurrent (兼務) entries`,
  );

  if (model.warnings.length === 0) {
    console.log("  No data warnings.");
  } else {
    console.warn(`  ${model.warnings.length} warning(s):`);
    for (const w of model.warnings) console.warn(`    [${w.kind}] ${w.message}`);
  }
}

main();
