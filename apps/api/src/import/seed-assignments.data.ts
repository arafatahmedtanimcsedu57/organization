import type { Assignment } from '@org-chart/domain';

/**
 * The three concurrent-duty (兼務) postings from the legacy hand-made chart whose
 * target department exists in `cmn_department` (verifiable against the provided
 * masters). Two further legacy (兼) cases are intentionally NOT seeded here because
 * their target department is absent from the master:
 *   - 佐藤 悠一郎 as 部長 (兼) of「ソリューション営業部」- that 部 node doesn't exist
 *     (only its 課/G children do); see docs/concurrent-duties-design.md.
 *   - 佐藤 曠弌 as 事業部長 (兼) of システム事業部 - redundant: he is already the
 *     primary member there (代表取締役) in sys_user.
 */
// `titleId` is resolved from `title` at seed time (see SeedAssignmentsService).
export const SEED_ASSIGNMENTS: Omit<Assignment, 'titleId'>[] = [
  {
    employeeSysId: 'e9275f28c3e842109af532011501311b', // 照沼 邦義 (primary: 事業部長 of ITサポート事業部)
    departmentId: '24510', // ITサポート事業部 購買調達部
    title: '部長',
    type: 'concurrent',
  },
  {
    employeeSysId: '50325bfcc3e082109af5320115013100', // 濱井 啓介 (primary: 課長 of ソリューション営業部 1課)
    departmentId: '24111', // ソリューション営業部 1課1G
    title: '主任',
    type: 'concurrent',
  },
  {
    employeeSysId: '17525bfcc3e082109af5320115013104', // 山田 真也 (primary: 課長 of ソリューション営業部 2課)
    departmentId: '24510', // ITサポート事業部 購買調達部
    title: '部長',
    type: 'concurrent',
  },
];
