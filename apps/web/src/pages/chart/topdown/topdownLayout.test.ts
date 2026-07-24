import { describe, expect, test } from 'vitest';
import type { Member } from '@org-chart/domain';
import type { ChartNode } from '../../../store/api/chartNode';
import { computeTopdownLayout, cardHeight, CARD_WIDTH } from './topdownLayout';

/** Task 2.5: layout invariants on a dataset shaped like the real 20-department masters. */

let sysSeq = 0;
function member(displayName: string, title: string, extra: Partial<Member> = {}): Member {
  return {
    displayName,
    title,
    rank: 5,
    concurrent: false,
    sysId: `sys-${sysSeq++}`,
    ...extra,
  };
}

function dept(
  id: string,
  name: string,
  branchId: string,
  tier: ChartNode['tier'],
  managers: Member[],
  staffCount: number,
  children: ChartNode[] = [],
): ChartNode {
  return {
    id,
    name,
    head: managers[0]?.displayName ?? '',
    managers,
    staff: Array.from({ length: staffCount }, (_, i) => member(`${name}員${i}`, '課員')),
    children,
    tier,
    branchId,
  };
}

/** Four divisions, ~20 departments, one wide roster and one deep branch — the real shape. */
function fixture(): ChartNode[] {
  const sales = dept('d1', '営業本部', 'd1', 'division', [member('佐藤(悠)', '本部長')], 2, [
    dept('d1a', '営業1部', 'd1', 'department', [member('田中', '部長')], 6),
    dept('d1b', '営業2部', 'd1', 'department', [member('鈴木', '部長')], 5),
    dept('d1c', 'ソリューション営業部', 'd1', 'department', [
      member('佐藤(悠)兼', '部長', {
        concurrent: true,
        sourceDepartmentName: '営業本部',
        sourceTitle: '本部長',
      }),
    ], 3),
  ]);

  // Deep + wide: a division whose SW開発課 fans into 5 groups (forces stacking at narrow widths).
  const system = dept('d2', 'システム事業部', 'd2', 'division', [member('高橋', '事業部長')], 1, [
    dept('d2a', 'SW開発部', 'd2', 'department', [member('伊藤', '部長')], 2, [
      dept('d2a1', 'SW開発課', 'd2', 'group', [member('渡辺', '課長')], 4, [
        dept('d2a1a', 'SW開発課 1G', 'd2', 'group', [member('山本洸', '主任')], 6),
        dept('d2a1b', 'SW開発課 2G', 'd2', 'group', [member('山本祥', '主任')], 6),
        dept('d2a1c', 'SW開発課 3G', 'd2', 'group', [member('山本皓', '主任')], 5),
        dept('d2a1d', 'SW開発課 4G', 'd2', 'group', [member('中村', '主任')], 5),
        dept('d2a1e', 'SW開発課 5G', 'd2', 'group', [member('小林', '主任')], 4),
      ]),
      dept('d2a2', 'QA課', 'd2', 'group', [member('加藤(健)', '課長')], 7),
    ]),
    dept('d2b', 'ITコンサル部', 'd2', 'department', [member('吉田', '部長')], 4),
  ]);

  const itSupport = dept('d3', 'ITサポート事業部', 'd3', 'division', [member('照沼', '事業部長')], 0, [
    dept('d3a', 'ITサポート部', 'd3', 'department', [
      member('甲斐', '課長'),
      member('鈴木(智)', '担当課長'),
      member('大西【大阪】', '主任'),
      member('濱井', '主任2'),
    ], 38, [
      dept('d3a1', 'サポート1課', 'd3', 'group', [member('中島（眞）', '課長')], 8),
      dept('d3a2', 'サポート2課', 'd3', 'group', [member('伊東(健)', '課長')], 9),
    ]),
  ]);

  const admin = dept('d4', '管理部', 'd4', 'division', [member('曠弌', '部長')], 4, [
    dept('d4a', '総務課', 'd4', 'group', [member('総務', '課長')], 3),
    dept('d4b', '経理課', 'd4', 'group', [member('経理', '課長')], 3),
  ]);

  return [sales, system, itSupport, admin];
}

function countNodes(roots: ChartNode[]): number {
  return roots.reduce((sum, r) => sum + 1 + countNodes(r.children), 0);
}

describe('computeTopdownLayout', () => {
  test('emits every department exactly once, with valid edges', () => {
    const roots = fixture();
    const layout = computeTopdownLayout(roots, { viewportWidth: 1400 });
    expect(layout.nodes).toHaveLength(countNodes(roots));
    expect(new Set(layout.nodes.map((n) => n.id)).size).toBe(layout.nodes.length);

    const ids = new Set(layout.nodes.map((n) => n.id));
    for (const edge of layout.edges) {
      expect(ids.has(edge.fromId)).toBe(true);
      expect(ids.has(edge.toId)).toBe(true);
    }
    // every non-root has exactly one incoming edge
    expect(layout.edges).toHaveLength(countNodes(roots) - roots.length);
  });

  test('no two cards overlap, at any viewport width', () => {
    for (const viewportWidth of [900, 1200, 1600, undefined]) {
      const layout = computeTopdownLayout(fixture(), { viewportWidth });
      for (let i = 0; i < layout.nodes.length; i++) {
        for (let j = i + 1; j < layout.nodes.length; j++) {
          const a = layout.nodes[i]!;
          const b = layout.nodes[j]!;
          const overlap =
            a.x < b.x + b.width &&
            b.x < a.x + a.width &&
            a.y < b.y + b.height &&
            b.y < a.y + a.height;
          expect(overlap, `${a.id} overlaps ${b.id} @ viewport ${viewportWidth}`).toBe(false);
        }
      }
    }
  });

  test('compaction: a narrow viewport stacks subtrees and shrinks total width', () => {
    const fanned = computeTopdownLayout(fixture()); // no budget: never stacks
    const compact = computeTopdownLayout(fixture(), { viewportWidth: 1100 });
    expect(fanned.nodes.some((n) => n.stacked)).toBe(false);
    expect(compact.nodes.some((n) => n.stacked)).toBe(true);
    expect(compact.width).toBeLessThan(fanned.width);
  });

  test('narrower viewports never widen the layout', () => {
    const wide = computeTopdownLayout(fixture(), { viewportWidth: 1600 });
    const narrow = computeTopdownLayout(fixture(), { viewportWidth: 900 });
    expect(narrow.width).toBeLessThanOrEqual(wide.width);
  });

  test('full rosters grow cards; expandedIds grows just that node', () => {
    const roots = fixture();
    const big = roots[2]!.children[0]!; // ITサポート部, 38 staff
    expect(cardHeight(big, true)).toBeGreaterThan(cardHeight(big, false));

    const compact = computeTopdownLayout(roots, { viewportWidth: 1400 });
    const expanded = computeTopdownLayout(roots, {
      viewportWidth: 1400,
      expandedIds: new Set(['d3a']),
    });
    const before = compact.nodes.find((n) => n.id === 'd3a')!;
    const after = expanded.nodes.find((n) => n.id === 'd3a')!;
    expect(after.height).toBeGreaterThan(before.height);
    expect(after.fullRoster).toBe(true);
  });

  test('resolves 兼務 cross-links from source department name to node ids', () => {
    const layout = computeTopdownLayout(fixture(), { viewportWidth: 1400 });
    expect(layout.kenmu).toHaveLength(1);
    const link = layout.kenmu[0]!;
    expect(link.fromId).toBe('d1'); // 営業本部
    expect(link.toId).toBe('d1c'); // ソリューション営業部
    expect(link.label).toContain('本部長');
  });

  test('cards keep a constant width so columns align', () => {
    const layout = computeTopdownLayout(fixture(), { viewportWidth: 1200 });
    for (const node of layout.nodes) expect(node.width).toBe(CARD_WIDTH);
  });
});
