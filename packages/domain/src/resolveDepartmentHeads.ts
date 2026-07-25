/**
 * Resolves each department's head *display name* from the authoritative
 * `headSysId` reference. The department master stores the head as a hand-typed
 * "First Last" name with no link to an employee, so it can drift (a misspelling,
 * or a phantom name that appears nowhere in `sys_user`); anchoring the head to an
 * `Employee.sysId` makes it the same person as everyone else in the roster and
 * survives that employee later being renamed.
 *
 * Resolution order, per department:
 *   1. `headSysId` -> that employee's name (authoritative)
 *   2. the legacy free-text `head` from the master, if non-empty
 *   3. the top-ranked roster member (derive-by-rank) as a last resort
 *
 * A `headSysId` that matches no known employee is reported as an `unknown-head`
 * warning and falls through to the fallbacks. Runs *after* placement, since the
 * derive-by-rank fallback reads the already-ranked roster.
 */
import type { DepartmentTree } from "./buildTree.ts";
import type { BuildWarning, Employee } from "./model.ts";

/** Display form of a head's name, matching the master's "First Last" order. */
function fullName(e: Employee): string {
  return `${e.firstName} ${e.lastName}`;
}

export function resolveDepartmentHeads(
  tree: DepartmentTree,
  employees: Employee[],
): BuildWarning[] {
  const warnings: BuildWarning[] = [];
  const bySysId = new Map(employees.map((e) => [e.sysId, e]));

  for (const node of tree.byId.values()) {
    if (node.headSysId) {
      const head = bySysId.get(node.headSysId);
      if (head) {
        node.head = fullName(head);
        continue;
      }
      warnings.push({
        kind: "unknown-head",
        message: `Department "${node.name}" head references unknown employee sysId "${node.headSysId}".`,
      });
    }

    // No usable reference: keep any human-entered head text, else derive the
    // head from the highest-ranked person actually placed in this department.
    if (node.head) continue;
    const top = node.managers[0];
    if (top) {
      const emp = bySysId.get(top.sysId);
      node.head = emp ? fullName(emp) : top.displayName;
    }
  }

  return warnings;
}
