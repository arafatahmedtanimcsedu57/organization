/**
 * Renders the OrgNode tree into one self-contained, print-ready HTML document.
 *
 * Layout: "hybrid tree + rosters". Each department is a card containing its ranked
 * managers (one line each) and a wrapped grid of 課員 names. Cards nest to show the
 * hierarchy, connected by CSS guide lines. Everything (CSS included) is inlined so the
 * output is a single portable file; print styles target A3 landscape.
 */
import type { Member, OrgNode } from "./model.ts";
import { CHART_TITLE } from "./config.ts";

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** "(兼)" prefix for concurrent duties, else nothing. */
const kenmu = (m: Member): string => (m.concurrent ? '<span class="kenmu">(兼)</span>' : "");

function renderManagerLine(m: Member): string {
  return `<div class="mgr"><span class="pos">${esc(m.title)}</span>` +
    `<span class="name">${kenmu(m)}${esc(m.displayName)}</span></div>`;
}

function renderStaff(staff: Member[]): string {
  if (staff.length === 0) return "";
  const cells = staff
    .map((m) => `<span class="staff-name">${kenmu(m)}${esc(m.displayName)}</span>`)
    .join("");
  return `<div class="staff"><span class="staff-label">課員</span><div class="staff-grid">${cells}</div></div>`;
}

function renderNode(node: OrgNode): string {
  const en = node.nameEn ? `<span class="dept-en">${esc(node.nameEn)}</span>` : "";
  const head = node.head ? `<span class="dept-head">長: ${esc(node.head)}</span>` : "";
  const managers = node.managers.map(renderManagerLine).join("");
  const staff = renderStaff(node.staff);
  const children = node.children.length
    ? `<div class="children">${node.children.map(renderNode).join("")}</div>`
    : "";
  const empty = !managers && !staff ? '<div class="mgr empty">（在籍者なし）</div>' : "";
  return (
    `<div class="node">` +
    `<div class="card">` +
    `<div class="dept-name"><span class="dept-title">${esc(node.name)}${en}</span>${head}</div>` +
    `<div class="roster">${managers}${staff}${empty}</div>` +
    `</div>` +
    children +
    `</div>`
  );
}

const STYLE = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body {
  margin: 0; padding: 24px;
  font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans CJK JP", sans-serif;
  color: #1f2933; background: #f5f6f8;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
h1 { font-size: 20px; margin: 0 0 4px; }
.subtitle { color: #52606d; font-size: 12px; margin: 0 0 20px; }
.tree { display: block; }

/* A node = a card plus its (indented, connected) children. */
.node { position: relative; break-inside: auto; }
.children { margin-left: 28px; padding-left: 20px; border-left: 2px solid #cbd2d9; }
.children > .node::before {
  content: ""; position: absolute; left: -20px; top: 22px; width: 18px; height: 2px; background: #cbd2d9;
}

.card {
  display: inline-block; vertical-align: top; margin: 6px 0;
  border: 1px solid #b7c0cc; border-left: 4px solid #2f6f8f; border-radius: 6px;
  background: #fff; padding: 8px 12px; min-width: 260px; max-width: 640px;
  box-shadow: 0 1px 2px rgba(15,23,42,.06); break-inside: avoid;
}
.dept-name {
  display: flex; justify-content: space-between; align-items: baseline; gap: 12px;
  font-weight: 700; font-size: 14px; border-bottom: 1px solid #e4e7eb; padding-bottom: 4px; margin-bottom: 6px;
}
.dept-en { font-weight: 400; font-size: 11px; color: #7b8794; margin-left: 8px; }
.dept-head { flex: 0 0 auto; font-weight: 400; font-size: 11px; color: #52606d; white-space: nowrap; }

.roster { display: flex; flex-direction: column; gap: 3px; }
.mgr { display: flex; gap: 8px; font-size: 13px; align-items: baseline; }
.mgr .pos { flex: 0 0 76px; color: #52606d; font-size: 11px; text-align: right; }
.mgr .name { font-weight: 600; }
.mgr.empty { color: #9aa5b1; font-style: italic; }

.staff { display: flex; gap: 8px; margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e4e7eb; }
.staff-label { flex: 0 0 76px; color: #52606d; font-size: 11px; text-align: right; padding-top: 2px; }
.staff-grid { display: flex; flex-wrap: wrap; gap: 2px 10px; }
.staff-name { font-size: 12px; }

.kenmu { color: #b02a37; font-weight: 700; }

@page { size: A3 landscape; margin: 10mm; }
@media print {
  body { background: #fff; padding: 0; }
  .card { box-shadow: none; }
}
`;

export function renderHtml(roots: OrgNode[]): string {
  const body = roots.map(renderNode).join("");
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(CHART_TITLE)}</title>
<style>${STYLE}</style>
</head>
<body>
<h1>${esc(CHART_TITLE)}</h1>
<p class="subtitle">Generated from sys_user &amp; cmn_department. <span class="kenmu">(兼)</span> = 兼務 (concurrent duties).</p>
<div class="tree">${body}</div>
</body>
</html>
`;
}
