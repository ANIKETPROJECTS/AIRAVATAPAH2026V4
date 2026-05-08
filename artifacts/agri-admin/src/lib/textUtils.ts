/**
 * Strip OCR artefacts from human-readable name and place values so they
 * display cleanly regardless of when the record was extracted.
 *
 * Removes:
 *  - Devanagari dandas  ।  (U+0964)  and  ॥  (U+0965) — picked up as table-line separators
 *  - ASCII pipe characters  |  — table-border artefact
 *  - Parenthesised groups that contain only symbols / whitespace, e.g. (॥॥॥)
 *  - Other stray symbol characters that shouldn't appear in a proper name
 *  - Leading / trailing punctuation and extra whitespace
 */
export function sanitizeName(v: string | null | undefined): string {
  if (!v) return "";
  let s = v
    .replace(/\([\u0964\u0965|,.\-/\\*#@!^~`_=+<>:;\s]*\)/g, "")
    .replace(/[\u0964\u0965]/g, "")
    .replace(/\|/g, "")
    .replace(/[\\#@!^~`_=+<>]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  s = s.replace(/^[,.\-/;:]+|[,.\-/;:]+$/g, "").trim();
  return s;
}
