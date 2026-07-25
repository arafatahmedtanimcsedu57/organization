/**
 * Import-time normalization: makes titles/department names/names consistent as they
 * are read from the masters, so every downstream consumer (DB rows, the domain
 * package, the UI) sees the same values rather than re-deriving normalization at
 * render time. Never mutates the original files in `TryOutProgram/`.
 */

/** Full-width digits (０-９) -> ASCII, so `主任２` is stored equal to `主任2`. */
export function normalizeFullWidthDigits(value: string): string {
  return value.replace(/[０-９]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0xfee0));
}

// Windows-1252 byte -> Unicode code point, for the 0x80-0x9F range where it diverges
// from ISO-8859-1 (0xA0-0xFF matches Latin-1 directly and needs no table).
const CP1252_HIGH_CODEPOINTS: ReadonlyArray<number | undefined> = [
  0x20ac, undefined, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, undefined, 0x017d, undefined, undefined, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, undefined, 0x017e, 0x0178,
];

const CP1252_BYTE_FOR_CODEPOINT = new Map<number, number>();
CP1252_HIGH_CODEPOINTS.forEach((codePoint, i) => {
  if (codePoint !== undefined) CP1252_BYTE_FOR_CODEPOINT.set(codePoint, 0x80 + i);
});

/** The single byte a mis-decoded-as-Windows-1252 character would have come from, if any. */
function toCp1252Byte(codePoint: number): number | undefined {
  if (codePoint < 0x80 || (codePoint >= 0xa0 && codePoint <= 0xff)) return codePoint;
  return CP1252_BYTE_FOR_CODEPOINT.get(codePoint);
}

/**
 * Repairs values that were UTF-8 encoded then mis-decoded as Windows-1252 during an
 * earlier export (e.g. `sys_user`'s `choice_values` sheet: "å¥³" -> "女", "ç”·" -> "男").
 * Every character must map back to a single byte, and the re-decoded UTF-8 bytes must
 * be valid, or the input is returned unchanged - ordinary Japanese text (multi-byte
 * code points outside the Latin-1/CP1252 range) is never touched.
 */
export function repairMojibake(value: string): string {
  const bytes: number[] = [];
  for (const ch of value) {
    const byte = toCp1252Byte(ch.codePointAt(0)!);
    if (byte === undefined) return value;
    bytes.push(byte);
  }
  if (!bytes.some((b) => b >= 0x80)) return value; // plain ASCII: nothing to repair

  const repaired = Buffer.from(bytes).toString('utf8');
  return repaired.includes('�') ? value : repaired;
}

/** Full-width spaces (U+3000) collapsed to ASCII spaces, so join keys compare consistently. */
function normalizeSpaces(value: string): string {
  return value.replace(/　/g, ' ').trim();
}

/** Applied to every free-text cell read from the masters (names, titles, department names/parents). */
export function normalizeText(value: string): string {
  return normalizeSpaces(normalizeFullWidthDigits(repairMojibake(value)));
}
