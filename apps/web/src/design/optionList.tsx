import type { ReactElement } from 'react';

/**
 * Builds a `<select>`'s options in one pass.
 *
 * Every master-data form filters its rows before rendering them (inactive records stay
 * listed only while they are the current value), so this replaces the `.filter().map()`
 * pair those all used, and gives them one shared idiom.
 */
export function optionList<T>(
  rows: readonly T[] | undefined,
  keep: (row: T) => boolean,
  render: (row: T) => ReactElement,
): ReactElement[] {
  const options: ReactElement[] = [];
  for (const row of rows ?? []) {
    if (keep(row)) options.push(render(row));
  }
  return options;
}
