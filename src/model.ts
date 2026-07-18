/**
 * Shared data types for the organization-chart generator.
 *
 * The pipeline is: raw xlsx rows (readMasters) -> domain model (buildOrg) -> HTML (renderHtml).
 * See CLAUDE.md for the full description of the two source masters.
 */

/** A row from cmn_department.xlsx (sheet "Page 1"). Only the columns we use are typed. */
export interface DepartmentRow {
  id: string; // "24500"
  name: string; // "ITサポート事業部" — also the join key from sys_user.Department
  parent: string; // parent department *name* ("" = top level)
  head: string; // "邦義 照沼"
  sysId: string;
}

/** A row from sys_user.xlsx (sheet "Page 1"). Only the columns we use are typed. */
export interface UserRow {
  lastName: string; // "佐藤"
  firstName: string; // "曠弌"
  title: string; // position, e.g. "課長" — one of config.POSITION_RANK
  department: string; // single department name, matches DepartmentRow.name
  userId: string; // "0002"
  sysId: string;
}

/** Assignment kind. A person has exactly one `primary`; extra posts are `concurrent` (兼務). */
export type AssignmentType = "primary" | "concurrent";

/**
 * A row from data/user_assignments.xlsx — the additive concurrent-duties (兼務) source.
 * This is the Requirement-4 model; see docs/concurrent-duties-design.md.
 */
export interface AssignmentRow {
  userSysId: string; // FK -> UserRow.sysId
  departmentId: string; // FK -> DepartmentRow.id
  title: string; // position held *in that department*
  type: AssignmentType;
}

/** One person as they appear inside a single department's roster. */
export interface Member {
  displayName: string; // disambiguated last name, e.g. "佐藤(悠)"
  title: string;
  rank: number; // POSITION_RANK index; lower = higher in hierarchy
  concurrent: boolean; // true -> rendered with the (兼) prefix
  sysId: string;
}

/** A department node in the output tree: the department plus its ordered roster and children. */
export interface OrgNode {
  id: string;
  name: string;
  nameEn?: string;
  head: string;
  /** Ranked members shown line-by-line (everything above 課員). */
  managers: Member[];
  /** 課員-level members, shown as a wrapped name grid. */
  staff: Member[];
  children: OrgNode[];
}

/** Non-fatal problems found while building the model; surfaced by the CLI. */
export interface BuildWarning {
  kind:
    | "unmatched-department"
    | "unknown-title"
    | "orphan-department"
    | "unknown-assignment-user"
    | "unknown-assignment-department";
  message: string;
}

export interface OrgModel {
  roots: OrgNode[];
  warnings: BuildWarning[];
  stats: {
    departments: number;
    peoplePlaced: number;
    concurrentEntries: number;
  };
}
