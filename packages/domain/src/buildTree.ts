/**
 * Department tree builder: links departments by parent name (never by
 * sys_user.Manager, which is empty for every row - see CLAUDE.md).
 */
import type { BuildWarning, Department, OrgNode } from "./model.ts";

export interface DepartmentTree {
  roots: OrgNode[];
  /** Department nodes keyed by `Department.name` - the join key from `Employee.departmentName`. */
  byName: Map<string, OrgNode>;
  /** Department nodes keyed by `Department.id`. */
  byId: Map<string, OrgNode>;
  warnings: BuildWarning[];
}

/**
 * Build the department tree from the flat department master using parent-by-name
 * links. Departments whose `parentName` matches no other department (and is not
 * the empty-string root marker) are placed at the top level with a warning.
 */
export function buildDepartmentTree(departments: Department[]): DepartmentTree {
  const warnings: BuildWarning[] = [];
  const byName = new Map<string, OrgNode>();
  const byId = new Map<string, OrgNode>();

  for (const d of departments) {
    const node: OrgNode = {
      id: d.id,
      name: d.name,
      head: d.head,
      managers: [],
      staff: [],
      children: [],
    };
    byName.set(d.name, node);
    byId.set(d.id, node);
  }

  const roots: OrgNode[] = [];
  for (const d of departments) {
    const node = byName.get(d.name)!;
    if (d.parentName === "") {
      roots.push(node);
      continue;
    }
    const parent = byName.get(d.parentName);
    if (parent) {
      parent.children.push(node);
    } else {
      warnings.push({
        kind: "orphan-department",
        message: `Department "${d.name}" references missing parent "${d.parentName}"; placed at top level.`,
      });
      roots.push(node);
    }
  }

  return { roots, byName, byId, warnings };
}
