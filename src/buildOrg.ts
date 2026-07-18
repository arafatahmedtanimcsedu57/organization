/**
 * Domain core: join the masters into a department tree with ordered rosters.
 *
 * Responsibilities:
 *   1. Build the department tree from cmn_department (parent-by-name).
 *   2. Place each user into their primary department (from sys_user) and any
 *      concurrent departments (from user_assignments) — the latter marked 兼務.
 *   3. Order each department's roster by position rank and split managers vs. staff.
 *   4. Compute a display name per person, disambiguating shared last names.
 *
 * Hierarchy comes from the department tree + title rank, NOT from sys_user.Manager
 * (which is empty for every row). See CLAUDE.md.
 */
import {
  DEPARTMENT_EN,
  DISPLAY_OVERRIDES,
  POSITION_RANK,
  STAFF_RANK,
  normalizeTitle,
} from "./config.ts";
import type {
  AssignmentRow,
  BuildWarning,
  DepartmentRow,
  Member,
  OrgModel,
  OrgNode,
  UserRow,
} from "./model.ts";

/** Rank index for a title; unknown titles sort last (and are reported as a warning). */
function rankOf(title: string): number {
  const idx = POSITION_RANK.indexOf(normalizeTitle(title));
  return idx === -1 ? POSITION_RANK.length : idx;
}

/**
 * Compute a display name (last name only) for every user, disambiguating collisions.
 * Rule: if a last name is unique company-wide, show just the last name; otherwise append
 * the first character of the given name in parentheses, e.g. 佐藤(悠) / 佐藤(晃).
 * DISPLAY_OVERRIDES (keyed by Sys ID) always wins.
 */
function computeDisplayNames(users: UserRow[]): Map<string, string> {
  const lastNameCounts = new Map<string, number>();
  for (const u of users) {
    lastNameCounts.set(u.lastName, (lastNameCounts.get(u.lastName) ?? 0) + 1);
  }
  const names = new Map<string, string>();
  for (const u of users) {
    const override = DISPLAY_OVERRIDES[u.sysId];
    if (override) {
      names.set(u.sysId, override);
      continue;
    }
    const collides = (lastNameCounts.get(u.lastName) ?? 0) > 1;
    const suffix = collides && u.firstName ? `(${[...u.firstName][0]})` : "";
    names.set(u.sysId, `${u.lastName}${suffix}`);
  }
  return names;
}

export function buildOrg(
  departments: DepartmentRow[],
  users: UserRow[],
  assignments: AssignmentRow[],
): OrgModel {
  const warnings: BuildWarning[] = [];
  const displayNames = computeDisplayNames(users);
  const userBySysId = new Map(users.map((u) => [u.sysId, u]));

  // --- Build department nodes and index them by both name and id. ---
  const nodes = new Map<string, OrgNode>(); // keyed by department name
  const nodeById = new Map<string, OrgNode>();
  for (const d of departments) {
    const node: OrgNode = {
      id: d.id,
      name: d.name,
      nameEn: DEPARTMENT_EN[d.name],
      head: d.head,
      managers: [],
      staff: [],
      children: [],
    };
    nodes.set(d.name, node);
    nodeById.set(d.id, node);
  }

  // --- Link the tree via parent name; collect roots (empty parent). ---
  const roots: OrgNode[] = [];
  for (const d of departments) {
    const node = nodes.get(d.name)!;
    if (d.parent === "") {
      roots.push(node);
    } else {
      const parent = nodes.get(d.parent);
      if (parent) {
        parent.children.push(node);
      } else {
        warnings.push({
          kind: "orphan-department",
          message: `Department "${d.name}" references missing parent "${d.parent}"; placed at top level.`,
        });
        roots.push(node);
      }
    }
  }

  // --- Helper to add a member to a department node. ---
  const placedUsers = new Set<string>();
  function addMember(node: OrgNode, user: UserRow, title: string, concurrent: boolean): void {
    const rank = rankOf(title);
    if (rank === POSITION_RANK.length) {
      warnings.push({
        kind: "unknown-title",
        message: `Unknown title "${title}" for ${user.lastName} ${user.firstName}; sorted last.`,
      });
    }
    const member: Member = {
      displayName: displayNames.get(user.sysId) ?? user.lastName,
      title,
      rank,
      concurrent,
      sysId: user.sysId,
    };
    if (rank >= STAFF_RANK) node.staff.push(member);
    else node.managers.push(member);
    placedUsers.add(user.sysId);
  }

  // --- Primary assignments come from sys_user (department name + title). ---
  for (const u of users) {
    const node = nodes.get(u.department);
    if (!node) {
      warnings.push({
        kind: "unmatched-department",
        message: `User ${u.lastName} ${u.firstName} has department "${u.department}" not found in cmn_department.`,
      });
      continue;
    }
    addMember(node, u, u.title, false);
  }

  // --- Concurrent (兼務) assignments come from user_assignments. ---
  let concurrentEntries = 0;
  for (const a of assignments) {
    if (a.type !== "concurrent") continue; // primary rows are informational only
    const user = userBySysId.get(a.userSysId);
    if (!user) {
      warnings.push({
        kind: "unknown-assignment-user",
        message: `Assignment references unknown user_sys_id "${a.userSysId}".`,
      });
      continue;
    }
    const node = nodeById.get(a.departmentId);
    if (!node) {
      warnings.push({
        kind: "unknown-assignment-department",
        message: `Assignment for ${user.lastName} references unknown department_id "${a.departmentId}".`,
      });
      continue;
    }
    addMember(node, user, a.title || user.title, true);
    concurrentEntries++;
  }

  // --- Order every roster by rank, then keep a stable name order within a rank. ---
  const byRankThenName = (a: Member, b: Member): number =>
    a.rank - b.rank || a.displayName.localeCompare(b.displayName, "ja");
  for (const node of nodes.values()) {
    node.managers.sort(byRankThenName);
    node.staff.sort(byRankThenName);
  }

  return {
    roots,
    warnings,
    stats: {
      departments: departments.length,
      peoplePlaced: placedUsers.size,
      concurrentEntries,
    },
  };
}
