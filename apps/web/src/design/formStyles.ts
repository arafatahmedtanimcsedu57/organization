/**
 * Shared Tailwind utility strings for the admin page/form/table primitives.
 * Keeping these DRY in TypeScript (rather than a per-screen stylesheet) is how the
 * repeated `.page` / `.field` / `.inp` / `.person` patterns are expressed under Tailwind.
 * `.page` / `.page-head` / `.ph-actions` / `.person` / `.dept` keep their class names as
 * hooks for the print stylesheet and the E2E suite; all visual styling is utilities.
 */

export const PAGE = 'page px-7 pt-6 pb-[60px] max-w-[1180px] mx-auto w-full max-[640px]:p-4';
export const PAGE_HEAD = 'page-head flex items-start justify-between gap-4 mb-5';
export const PH_ACTIONS = 'ph-actions flex gap-2 shrink-0';
export const PAGE_TITLE = 'text-[28px] font-bold leading-tight';

export const FIELD = 'mb-[14px]';
export const LABEL = 'block text-[12.5px] font-semibold text-ink mb-[5px]';
export const INPUT =
  'w-full h-[34px] border border-line-strong rounded-md px-[11px] font-jp text-[13.5px] text-ink bg-surface transition-[box-shadow,border-color] duration-150 ease-brand focus:outline-none focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,128,96,0.14)]';
export const FIELD_ERR = 'text-[12px] text-crit-ink mt-1';
export const TWO = 'grid grid-cols-2 gap-3';

export const UID = 'font-mono text-[12px] text-sub tabular-nums';
export const PERSON = 'person flex items-center gap-2.5';
export const PERSON_AVATAR =
  'w-7 h-7 rounded-full bg-[linear-gradient(135deg,#00806022,#00806055)] text-brand-dark grid place-items-center font-bold text-[11px] shrink-0';
export const PERSON_NAME = 'font-jp font-semibold text-strong text-[13.5px]';
export const PERSON_SUB = 'block text-[11px] text-sub';
export const DEPT = 'dept font-jp text-ink text-[13px]';
