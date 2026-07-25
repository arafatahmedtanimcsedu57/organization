import { describe, expect, it } from 'vitest';
import { buildDepartmentLabels, departmentLabel, type LabelTreeNode } from './nodeLabel';

describe('departmentLabel', () => {
  it('strips an English parent prefix and its separator', () => {
    expect(departmentLabel('Software Development Section – Group 1', 'Software Development Section')).toBe(
      'Group 1',
    );
    expect(
      departmentLabel('IT Support Division – Purchasing & Procurement Dept.', 'IT Support Division'),
    ).toBe('Purchasing & Procurement Dept.');
  });

  it('strips a Japanese parent prefix and its (full-width) separator', () => {
    expect(departmentLabel('SW開発課 1G', 'SW開発課')).toBe('1G');
    expect(departmentLabel('ソリューション営業部　1課', 'ソリューション営業部')).toBe('1課');
  });

  it('keeps the full name when the parent is not a leading prefix', () => {
    expect(departmentLabel('Solution Sales Dept. – Section 1', 'Sales Division')).toBe(
      'Solution Sales Dept. – Section 1',
    );
  });

  it('keeps the full name for a top-level node (no parent)', () => {
    expect(departmentLabel('System Division', null)).toBe('System Division');
    expect(departmentLabel('System Division', undefined)).toBe('System Division');
  });

  it('never returns an empty label', () => {
    expect(departmentLabel('SW開発課', 'SW開発課')).toBe('SW開発課');
  });
});

const node = (id: string, name: string, children: LabelTreeNode[] = []): LabelTreeNode => ({
  id,
  name,
  children,
});

describe('buildDepartmentLabels', () => {
  it('distinguishes siblings that share a stem the parent does not (invented grouping)', () => {
    const roots = [
      node('sales', 'Sales Division', [
        node('s1', 'Solution Sales Dept. – Section 1'),
        node('s2', 'Solution Sales Dept. – Section 2'),
        node('ops', 'Sales Division – Operations Section'),
        node('care', 'Sales Division – Nursing Care'),
      ]),
    ];
    const labels = buildDepartmentLabels(roots);
    // The two "Solution Sales Dept." siblings drop the shared stem but keep "Section".
    expect(labels.get('s1')).toBe('Section 1');
    expect(labels.get('s2')).toBe('Section 2');
    // The others are already distinct after the parent strip.
    expect(labels.get('ops')).toBe('Operations Section');
    expect(labels.get('care')).toBe('Nursing Care');
    // The division itself keeps its full name.
    expect(labels.get('sales')).toBe('Sales Division');
  });

  it('does not collapse numbered siblings to a bare number', () => {
    const roots = [
      node('dev', 'Software Development Section', [
        node('g1', 'Software Development Section – Group 1'),
        node('g2', 'Software Development Section – Group 2'),
        node('g3', 'Software Development Section – Group 3'),
      ]),
    ];
    const labels = buildDepartmentLabels(roots);
    expect(labels.get('g1')).toBe('Group 1');
    expect(labels.get('g2')).toBe('Group 2');
    expect(labels.get('g3')).toBe('Group 3');
  });
});
