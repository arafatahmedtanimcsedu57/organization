import type { Member } from '@org-chart/domain';

/** One rendered roster line: consecutive same-title members share it. */
export interface TitleGroup {
  title: string;
  members: Member[];
}

/** Consecutive same-title members share one line (rosters arrive rank-ordered). */
export function groupByTitle(members: Member[]): TitleGroup[] {
  const groups: TitleGroup[] = [];
  for (const member of members) {
    const last = groups[groups.length - 1];
    if (last && last.title === member.title) last.members.push(member);
    else groups.push({ title: member.title, members: [member] });
  }
  return groups;
}

/** Chunk staff into fixed rows so the rendered height matches the layout's height model. */
export function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

/** A stable React key for a list of members (their ids never collide within one card). */
export function memberListKey(members: Member[], fallback: string): string {
  return members[0]?.sysId ?? fallback;
}
