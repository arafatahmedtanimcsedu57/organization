import { memo, type CSSProperties, type MouseEvent } from 'react';
import type { ChartTier } from '../../../store/api/chartNode';
import { branchColorFor } from '../branchColor';
import { NodeRoster } from './NodeRoster';
import type { LayoutNode } from './topdownLayout';

const NAME_TIER: Record<ChartTier, string> = {
  division: 'text-[15px] font-bold',
  department: 'text-[13.5px] font-bold',
  group: 'text-[12.5px] font-semibold',
};

export interface TopdownNodeProps {
  item: LayoutNode;
  highlighted?: boolean;
  selected?: boolean;
  /** Everyone holding a 兼務 posting; their name rows in this card become hover-linkable. */
  kenmuSysIds?: ReadonlySet<string>;
  /** The hovered person, but only when this card holds them — so a hover elsewhere on the
   * canvas leaves this card's memoized render untouched. */
  hoveredSysId?: string | null;
  onHoverMember?: (sysId: string | null) => void;
  onSelect?: (item: LayoutNode) => void;
  onToggleExpand?: (id: string) => void;
  /** Hover in/out — drives the canvas's 兼務 link spotlight. */
  onHover?: (id: string | null) => void;
}

/**
 * One department card, absolutely positioned in diagram coordinates by the canvas.
 *
 * The card is a focusable `role="group"`, not a button: it contains its own buttons (the
 * roster expanders), and nesting controls inside a control strips their semantics for
 * screen readers. Enter/Space on the card still selects it.
 */
function TopdownNodeComponent({
  item,
  highlighted = false,
  selected = false,
  kenmuSysIds,
  hoveredSysId = null,
  onHoverMember,
  onSelect,
  onToggleExpand,
  onHover,
}: TopdownNodeProps) {
  const { node, fullRoster } = item;
  const { rail, tint } = branchColorFor(item.branchId);
  const memberCount = node.managers.length + node.staff.length;
  // Ring the card when the hovered person appears in it — so "every other place" pops even
  // when the specific name is collapsed behind a ＋N / ×N roster row.
  const hasHoveredMember = hoveredSysId != null;

  const style: CSSProperties = {
    left: item.x,
    top: item.y,
    width: item.width,
    height: item.height,
    ['--rail' as string]: rail,
    ['--tint' as string]: tint,
  };

  const handleExpand = (event: MouseEvent) => {
    event.stopPropagation();
    onToggleExpand?.(node.id);
  };

  return (
    <div
      role="group"
      tabIndex={0}
      data-node-id={node.id}
      aria-label={`${node.name} — ${memberCount}名`}
      onClick={() => onSelect?.(item)}
      onMouseEnter={() => onHover?.(node.id)}
      onMouseLeave={() => onHover?.(null)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(item);
        }
      }}
      style={style}
      className={`topdown-node absolute cursor-pointer text-left flex flex-col overflow-hidden rounded-lg border bg-surface shadow-1 transition-shadow duration-150 ease-brand hover:shadow-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        highlighted || selected
          ? 'ring-2 ring-brand shadow-2 border-brand'
          : hasHoveredMember
            ? 'ring-2 ring-brand/60 shadow-2 border-brand'
            : 'border-line'
      }`}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--rail,var(--color-line-strong))]"
      />
      <div
        className={`flex items-center gap-2 pl-[13px] pr-[10px] py-[8px] border-b border-line-2 shrink-0 ${
          node.tier === 'division' ? 'bg-[var(--tint,var(--color-surface-sub))]' : 'bg-surface-sub'
        }`}
      >
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0 bg-[var(--rail,var(--color-line-strong))]"
        />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`dn block truncate font-jp text-strong ${NAME_TIER[node.tier]}`}>
            {node.name}
          </span>
          <span className="block truncate text-[10.5px] text-sub">
            {node.nameEn || node.head || ' '}
          </span>
        </span>
        <button
          type="button"
          onClick={handleExpand}
          title={fullRoster ? 'Collapse roster' : 'Expand roster'}
          className="shrink-0 rounded-full bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-muted hover:text-ink"
        >
          {memberCount}名
        </button>
      </div>

      <NodeRoster
        node={node}
        fullRoster={fullRoster}
        kenmuSysIds={kenmuSysIds}
        hoveredSysId={hoveredSysId}
        onHoverMember={onHoverMember}
        onExpand={handleExpand}
      />
    </div>
  );
}

/** Memoized: a chart of ~20 cards re-renders on every hover otherwise. */
export const TopdownNode = memo(TopdownNodeComponent);
