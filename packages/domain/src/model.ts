/**
 * Framework-free domain types shared by apps/api and apps/web.
 *
 * These mirror the persisted shapes (see openspec design.md's data model) but carry no
 * ORM/HTTP concerns - they are the inputs and outputs of the pure org-chart build logic.
 */

/** A department, joined by name to build the tree (`parentName` = "" means a root). */
export interface Department {
  id: string; // "24500"
  name: string; // "ITサポート事業部" - the join key from Employee.departmentName
  parentName: string; // parent department *name* ("" = top level)
  head: string; // "邦義 照沼"
  sysId: string;
}

/** An employee's home posting (their single `Department` in the source master). */
export interface Employee {
  sysId: string; // 32-char hex, stable identifier
  userId: string; // "0002"
  lastName: string; // "佐藤"
  firstName: string; // "曠弌"
  title: string; // position, e.g. "課長" - one of the known position ranks
  departmentName: string; // single department name, matches Department.name
}

/** Assignment kind. A person has exactly one `primary`; extra posts are `concurrent` (兼務). */
export type AssignmentType = "primary" | "concurrent";

/** A concurrent-duties (兼務) posting: a person holding a second post in another department. */
export interface Assignment {
  employeeSysId: string; // FK -> Employee.sysId
  departmentId: string; // FK -> Department.id
  title: string; // position held *in that department*
  type: AssignmentType;
}

/** One person as they appear inside a single department's roster. */
export interface Member {
  displayName: string; // disambiguated last name, e.g. "佐藤(悠)"
  title: string;
  rank: number; // position rank index; lower = higher in hierarchy
  concurrent: boolean; // true -> rendered with the (兼) prefix
  sysId: string;
  /** Home department name; set only when `concurrent` - feeds the sourced (兼) chip. */
  sourceDepartmentName?: string;
  /** Home title; set only when `concurrent` - feeds the sourced (兼) chip. */
  sourceTitle?: string;
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

/** Non-fatal problems found while building the model; surfaced to the caller. */
export interface BuildWarning {
  kind:
    | "unmatched-department"
    | "unknown-title"
    | "orphan-department"
    | "unknown-assignment-user"
    | "unknown-assignment-department";
  message: string;
}

/** The full result of building the org chart from the masters. */
export interface OrgModel {
  roots: OrgNode[];
  warnings: BuildWarning[];
  stats: {
    departments: number;
    peoplePlaced: number;
    concurrentEntries: number;
  };
}
