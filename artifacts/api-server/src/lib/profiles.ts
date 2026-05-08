/**
 * Profile schema mapping
 * ----------------------
 * The MongoDB `users` collection in `apnaapp` already contains documents with
 * this shape (one document per phone-number-identified profile):
 *
 *   {
 *     _id: ObjectId,
 *     phone: string,                    // unique profile identifier
 *     createdAt: ISODate,
 *     updatedAt: ISODate,
 *     aadhar?: AadharSubdoc,
 *     passbook?: PassbookSubdoc,
 *     form7?: Form7Subdoc,
 *     form12?: Form12Subdoc,
 *   }
 *
 * The aadhar / passbook sub-documents below match the existing user document's
 * structure exactly. form7 / form12 follow the same naming pattern (camelCase
 * keys derived from the extractor's snake_case keys + `rawText`).
 *
 * `mapExtractionToSection` accepts the structured extractor output and returns
 * a sub-document ready to be persisted under the matching profile section.
 */
import type { PresentedDocument, PresentedSection } from "./document-types";

export type ProfileSection = "aadhar" | "passbook" | "form7" | "form12" | "form8a";

/** Section names valid as the URL `:section` parameter and the user's hamburger menu. */
export const PROFILE_SECTIONS: ProfileSection[] = [
  "aadhar",
  "passbook",
  "form7",
  "form12",
  "form8a",
];

/** Maps the public document type id used by the frontend to the profile section. */
export function documentTypeToSection(documentType: string): ProfileSection | null {
  switch (documentType) {
    case "aadhar":
      return "aadhar";
    case "bank_passbook":
      return "passbook";
    case "form7":
      return "form7";
    case "form12":
      return "form12";
    case "form8a":
      return "form8a";
    default:
      return null;
  }
}

/* ------------------------------------------------------------------------- */
/* Sub-document shapes (must match the existing MongoDB document exactly).   */
/* ------------------------------------------------------------------------- */

/** A picture pulled from the document (Aadhaar portrait, signature, logo, …). */
export interface ProfileImage {
  /** Original Datalab filename (e.g. "_page_0_Picture_1.jpeg"). */
  name: string;
  /** Inferred MIME type, ready for use in a `data:` URL. */
  mimeType: string;
  /** Bare base64 payload (no `data:` prefix). */
  base64: string;
}

export interface AadharSubdoc {
  name?: string;
  aadhaarNumber?: string;
  vid?: string;
  dateOfBirth?: string;
  gender?: string;
  fathersOrHusbandsName?: string;
  address?: string;
  pincode?: string;
  state?: string;
  mobileNumber?: string;
  issueDate?: string;
  enrolmentNumber?: string;
  photoBase64?: string;
  photoMimeType?: string;
}

export interface PassbookTransaction {
  date?: string;
  particulars?: string;
  chequeRef?: string;
  withdrawal?: string;
  deposit?: string;
  balance?: string;
}

export interface PassbookSubdoc {
  bankName?: string;
  branchName?: string;
  branchAddress?: string;
  ifsc?: string;
  micr?: string;
  accountHolderName?: string;
  jointHolders?: string[];
  nomineeName?: string;
  nomineeRelationship?: string;
  address?: string;
  mobileNumber?: string;
  email?: string;
  cifNumber?: string;
  accountNumber?: string;
  accountType?: string;
  branchCode?: string;
  accountOpeningDate?: string;
  currentBalance?: string;
  transactions?: PassbookTransaction[];
  rawText?: string;
  html?: string;
  images?: ProfileImage[];
}

/** A single ownership row from the Form 7 main table. */
export interface Form7OwnershipEntry {
  khateNumber?: string;
  ownerName?: string;
  area?: string;
  assessment?: string;
  collectionCharges?: string;
  mutationNumber?: string;
  tenantRentOtherRights?: string;
}

/**
 * A Table block lifted verbatim from Datalab Marker's structured JSON output.
 * `rows` includes every cell (including blanks and category sub-rows like
 * "जिरायत", "बागायत", "एकूण", etc.) so no detail is lost. `html` is the
 * Marker-rendered table HTML for faithful re-rendering on the profile page.
 */
export interface Form7Table {
  /** "/page/0/Table/8" — useful for ordering when multiple tables are present. */
  blockId?: string;
  /** Page index the table came from. */
  page?: number;
  /** Column header texts pulled from `<thead>`. May be empty. */
  headers: string[];
  /** Every body row as `string[]`, in document order. */
  rows: string[][];
  /** Raw `<table>…</table>` HTML emitted by Marker. */
  html: string;
}

/** Form 7 (Maharashtra 7/12 Ownership Register). Stores extractor fields as-is + rawText. */
export interface Form7Subdoc {
  village?: string;
  taluka?: string;
  district?: string;
  surveyNumber?: string;
  puId?: string;
  occupantClass?: string;
  ownerNames?: string[];
  khateNumber?: string;
  ownerShare?: string;
  modeOfAcquisition?: string;
  totalArea?: string;
  landRevenueAssessment?: string;
  collectionCharges?: string;
  nonAgriculturalArea?: string;
  nonCultivatedArea?: string;
  tenantName?: string;
  tenantRent?: string;
  otherRights?: string;
  encumbrances?: string;
  lastMutationNumber?: string;
  lastMutationDate?: string;
  pendingMutation?: string;
  oldMutationNumbers?: string[];
  boundaryAndSurveyMarks?: string;
  ownershipEntries?: Form7OwnershipEntry[];
  /** Every Table block from the source document, captured verbatim. */
  tables?: Form7Table[];
  /** Free-form text blocks captured verbatim from the source document. */
  textBlocks?: string[];
  rawText?: string;
  html?: string;
}

/** Form 12 (Maharashtra 7/12 Crop Inspection Register). */
export interface Form12Subdoc {
  village?: string;
  taluka?: string;
  district?: string;
  surveyNumber?: string;
  khateNumber?: string;
  cropEntries?: Array<{
    year?: string;
    season?: string;
    khateNumber?: string;
    cropType?: string;
    cropName?: string;
    irrigatedArea?: string;
    unirrigatedArea?: string;
    irrigationSource?: string;
    landUseNature?: string;
    area?: string;
    remarks?: string;
  }>;
  /**
   * Every Table block lifted verbatim from the source document. Reuses the
   * Form7Table shape because it's a generic `{headers, rows, html}` capture.
   * On Form 12 this preserves the full crop-inspection table layout
   * (merged headers like पिकाखालील क्षेत्राचा तपशील, sub-headers, blank
   * cells, sub-row crops like भात / गवत, etc.).
   */
  tables?: Form7Table[];
  /** Free-form text blocks captured verbatim from the source document. */
  textBlocks?: string[];
  rawText?: string;
  html?: string;
  images?: ProfileImage[];
}

/**
 * Form 8A (Maharashtra Village Form 8A — धारण जमिनींची नोंदवही).
 *
 * One row per survey-number holding under a khate. The Marathi header layout
 * is preserved here — every printed column is captured.
 */
export interface Form8aHolding {
  /** Column (१) गाव नमुना सहा मधील नोंद — full khata reference text. */
  villageForm6Entry?: string;
  /** Column (२) भूमापन क्रमांक व उपविभाग क्रमांक. */
  surveyNumberWithSubdivision?: string;
  /** Column (३) क्षेत्र — area / extent value as printed. */
  areaOrExtent?: string;
  /** Column (४) आकारणी किंवा जुडी. */
  assessmentOrJudi?: string;
  /** Column (५) दुमाला जमिनीवरील नुकसान. */
  damageOnInheritedLand?: string;
  /** Column (६अ) जि.प. local cess. */
  zpLocalCess?: string;
  /** Column (६ब) ग्रा.प. local cess. */
  gpLocalCess?: string;
  /** Column (७) वसुलीसाठी sub-total. */
  recoveryTotal?: string;
  /** Right-most एकूण row total. */
  rowTotal?: string;
}

export interface Form8aSubdoc {
  year?: string;
  reportDate?: string;
  village?: string;
  taluka?: string;
  district?: string;
  khateNumber?: string;
  accountType?: string;
  khatedarNames?: string[];
  khatedarAddress?: string;
  /** Bold "एकूण" totals row, broken out per column. */
  totalArea?: string;
  totalAssessmentOrJudi?: string;
  totalDamageOnInheritedLand?: string;
  totalZpLocalCess?: string;
  totalGpLocalCess?: string;
  totalRecoveryAmount?: string;
  grandTotal?: string;
  /** One entry per survey-number holding row (totals row excluded). */
  holdings?: Form8aHolding[];
  /** Every Table block from the source document, captured verbatim. */
  tables?: Form7Table[];
  /** Free-form text blocks (e.g. the सूचना disclaimer) captured verbatim. */
  textBlocks?: string[];
  rawText?: string;
  html?: string;
}

export interface UserProfile {
  phone: string;
  /** Human-readable name supplied at profile creation. */
  name?: string;
  /** Auto-generated short code (e.g. "P-A4F2") to disambiguate same-name profiles. */
  code?: string;
  createdAt: string;
  updatedAt: string;
  aadhar?: AadharSubdoc;
  passbook?: PassbookSubdoc;
  form7?: Form7Subdoc;
  form12?: Form12Subdoc;
  form8a?: Form8aSubdoc;
}

/* ------------------------------------------------------------------------- */
/* Helpers to read fields out of the structured extraction result.           */
/* ------------------------------------------------------------------------- */

/** Flatten { sectionTitle: { fieldKey: value } } so we can look up by extractor field key. */
function flattenFields(sections: PresentedSection[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of sections) {
    for (const f of s.fields) {
      if (f.value !== undefined && f.value !== null && f.value !== "") {
        out[f.key] = f.value;
      }
    }
  }
  return out;
}

/**
 * Return value if it's a real value, otherwise undefined.
 *
 * `presentExtraction` substitutes the em-dash "—" for fields the LLM did not
 * find, so we treat that as missing too — otherwise we'd overwrite a previously
 * populated MongoDB field with a placeholder.
 */
function nonEmpty(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed === "—" || trimmed === "-" || trimmed === "null") return undefined;
  return trimmed;
}

/**
 * Clean a human-readable name or place field by stripping OCR artefacts:
 * table-border pipe characters `|`, parenthesised groups that contain only
 * symbols, backslashes, and other stray punctuation that should not appear
 * in a village name, person name, taluka, or district.
 * Letters (Latin, Devanagari), digits, spaces, and meaningful hyphens are kept.
 */
function cleanName(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  let s = v
    // Remove parenthesised groups that contain only symbols, dandas, pipes, whitespace
    .replace(/\([\u0964\u0965|,.\-/\\*#@!^~`_=+<>:;\s]*\)/g, "")
    // Remove Devanagari dandas (। U+0964, ॥ U+0965) — common OCR table-line artefact
    .replace(/[\u0964\u0965]/g, "")
    // Remove all ASCII pipe characters
    .replace(/\|/g, "")
    // Remove other stray symbol artefacts
    .replace(/[\\#@!^~`_=+<>]/g, "")
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    .trim();
  // Strip leading/trailing punctuation only
  s = s.replace(/^[,.\-/;:]+|[,.\-/;:]+$/g, "").trim();
  if (!s || s === "—" || s === "-" || s === "null") return undefined;
  return s;
}

/**
 * Strip trailing administrative annotations from a survey number string.
 * Form 8A cells often print notes like 'भूमिअभिलेख निर्णयात्' in the same
 * cell as the survey number (e.g. '77/3 भूमिअभिलेख निर्णयात्').
 * We keep only the leading numeric/alphanumeric survey number token.
 */
function cleanSurveyNumber(v: string | undefined): string | undefined {
  if (typeof v !== "string") return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;
  // Match the survey number: digits optionally followed by "/" and more digits/letters
  const match = trimmed.match(/^(\d+(?:\/[\dA-Za-z]+)*)/);
  if (match) return match[1];
  // Fallback: strip anything after the first Devanagari character
  const devanagariIdx = trimmed.search(/[\u0900-\u097F]/);
  return (devanagariIdx > 0 ? trimmed.slice(0, devanagariIdx) : trimmed).trim() || undefined;
}

/* ------------------------------------------------------------------------- */
/* Mapping: extractor output -> profile sub-document.                        */
/* ------------------------------------------------------------------------- */

export interface MappedExtraction {
  section: ProfileSection;
  data:
    | AadharSubdoc
    | PassbookSubdoc
    | Form7Subdoc
    | Form12Subdoc
    | Form8aSubdoc;
}

/** Optional Datalab Marker output — full HTML + every embedded image. */
export interface MarkerInput {
  html: string | null;
  images: Record<string, string> | null;
  /** Marker's structured block tree (Document → Page → PictureGroup → …). */
  json?: unknown;
}

/** Guess the MIME type from a filename extension. */
function guessMimeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  return "image/jpeg";
}

/** Strip a `data:...;base64,` prefix if present, leaving the bare payload. */
function stripDataUrlPrefix(value: string): string {
  const m = value.match(/^data:[^;]+;base64,(.*)$/);
  return m ? m[1] : value;
}

/** Convert Datalab's images map into our persistent ProfileImage[] form. */
function normalizeImages(
  images: Record<string, string> | null | undefined,
): ProfileImage[] | undefined {
  if (!images) return undefined;
  const out: ProfileImage[] = [];
  for (const [name, value] of Object.entries(images)) {
    if (typeof value !== "string" || value.length === 0) continue;
    out.push({
      name,
      mimeType: guessMimeFromName(name),
      base64: stripDataUrlPrefix(value),
    });
  }
  return out.length > 0 ? out : undefined;
}

/** Strip HTML tags and collapse whitespace. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Remove every `<img>` tag and Marker's surrounding `img-description` /
 * `img-alt` divs from an HTML fragment. Used when a profile section is
 * persisted without its image bytes — leaving the `<img src="…">` in place
 * would just render as a broken-image placeholder on the profile page.
 */
function stripImgTags(html: string): string {
  return html
    .replace(/<img\b[^>]*\/?>/gi, "")
    .replace(
      /<div\b[^>]*class=["'][^"']*\bimg-(?:description|alt)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi,
      "",
    );
}

/**
 * Parse a `<table>...</table>` HTML fragment into a `{headers, rows}` matrix.
 * Every cell's text is preserved (including blanks), so nothing is lost
 * relative to what Marker rendered.
 */
function parseHtmlTable(html: string): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];

  const theadMatch = html.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const headerTr = theadMatch[1].match(/<tr\b[^>]*>([\s\S]*?)<\/tr>/i);
    if (headerTr) {
      const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
      let m: RegExpExecArray | null;
      while ((m = cellRe.exec(headerTr[1])) !== null) {
        headers.push(stripHtml(m[1]));
      }
    }
  }

  const bodyHtml = html.replace(/<thead\b[\s\S]*?<\/thead>/gi, "");
  const trRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(bodyHtml)) !== null) {
    const cellRe = /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi;
    const cells: string[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(trMatch[1])) !== null) {
      cells.push(stripHtml(cellMatch[1]));
    }
    if (cells.length > 0) rows.push(cells);
  }

  return { headers, rows };
}

/**
 * Walk Marker's structured block tree and return every Table block, parsed
 * into `{headers, rows, html}`. Used for documents (like Form 7) where the
 * source table contains rich category sub-rows we don't want to lose.
 */
export function extractTablesFromMarkerJson(json: unknown): Form7Table[] {
  const tables: Form7Table[] = [];
  if (!json || typeof json !== "object") return tables;

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const blockType = n["block_type"];
    if (typeof blockType === "string" && /^table$/i.test(blockType)) {
      const rawHtml = typeof n["html"] === "string" ? (n["html"] as string) : "";
      if (rawHtml) {
        const cleanedHtml = stripImgTags(rawHtml).trim();
        const { headers, rows } = parseHtmlTable(cleanedHtml);
        tables.push({
          blockId: typeof n["id"] === "string" ? (n["id"] as string) : undefined,
          page: typeof n["page"] === "number" ? (n["page"] as number) : undefined,
          headers,
          rows,
          html: cleanedHtml,
        });
      }
    }
    const children = n["children"];
    if (Array.isArray(children)) {
      for (const c of children) walk(c);
    }
  }

  walk(json);
  return tables;
}

/**
 * Walk Marker's block tree and collect every free-form text block (paragraphs,
 * section headers, list items, etc.) as plain strings. This catches any
 * detail that doesn't fall inside a Table or Picture (e.g. the "जुने फेरफार
 * क्र : (१) (११८) …" footer text on Form 7).
 */
export function extractTextBlocksFromMarkerJson(json: unknown): string[] {
  const out: string[] = [];
  if (!json || typeof json !== "object") return out;

  const seen = new Set<string>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    const blockType = n["block_type"];
    if (typeof blockType === "string" && /^(text|sectionheader|listitem|caption)$/i.test(blockType)) {
      const html = typeof n["html"] === "string" ? (n["html"] as string) : "";
      if (html) {
        const text = stripHtml(html);
        if (text && !seen.has(text)) {
          seen.add(text);
          out.push(text);
        }
      }
    }
    const children = n["children"];
    if (Array.isArray(children)) {
      for (const c of children) walk(c);
    }
  }

  walk(json);
  return out;
}

const PORTRAIT_RE = /portrait|photograph|\bphoto\b|cardholder|face\b|head\s*shot|headshot|passport\s*photo|user\s*image|profile\s*image/i;
const NON_PORTRAIT_RE =
  /qr[\s-]*code|qrcode|barcode|\blogo\b|signature|emblem|ashoka|hologram|watermark|stamp|seal/i;

interface CaptionedImage {
  filename: string;
  caption: string;
}

/**
 * Walk Datalab Marker's structured block tree and return every image filename
 * paired with the caption text that lives in the same parent group.
 *
 * Marker emits each picture inside a `PictureGroup` whose children are
 * typically `[Picture, Caption]`. The Picture's html contains the `<img src>`,
 * the Caption's html contains the human-readable label ("Portrait photo",
 * "QR code", …). Walking the tree gives us the *exact* pairing and avoids the
 * ambiguity of a windowed text search.
 */
function captionsFromMarkerBlocks(json: unknown): CaptionedImage[] {
  const out: CaptionedImage[] = [];
  if (!json || typeof json !== "object") return out;

  const SRC_RE = /<img[^>]+src=["']([^"']+)["']/i;

  // Pull every <img> in the html and capture its alt text alongside the src.
  // Datalab Marker labels each picture's content via the `alt` attribute
  // (e.g. alt="Portrait photo", alt="Aadhaar logo"), which is the most
  // reliable per-image label available — more reliable than scanning for
  // sibling Caption blocks.
  function imgsIn(html: unknown): Array<{ src: string; alt: string }> {
    if (typeof html !== "string") return [];
    const all: Array<{ src: string; alt: string }> = [];
    const re = /<img\b[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      const tag = m[0];
      const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
      if (!srcMatch) continue;
      const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
      all.push({ src: srcMatch[1], alt: altMatch ? altMatch[1] : "" });
    }
    return all;
  }

  function textOf(node: Record<string, unknown> | null): string {
    if (!node) return "";
    const html = node["html"];
    return typeof html === "string" ? stripHtml(html) : "";
  }

  function isCaption(node: Record<string, unknown> | null): boolean {
    if (!node) return false;
    const t = node["block_type"];
    return typeof t === "string" && /caption|sectionheader|text/i.test(t);
  }

  function isPicture(node: Record<string, unknown> | null): boolean {
    if (!node) return false;
    const t = node["block_type"];
    return typeof t === "string" && /picture|figure/i.test(t);
  }

  function walk(node: unknown, parentSiblings: unknown[]): void {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;

    // Pair pictures with their nearest caption within the current sibling list.
    if (isPicture(n)) {
      const myIdx = parentSiblings.indexOf(n);
      const imgs = imgsIn(n["html"]);

      // Look for a caption inside this picture's own children too.
      const childCaption = (Array.isArray(n["children"]) ? n["children"] : [])
        .map((c) => textOf(c as Record<string, unknown>))
        .filter(Boolean)
        .join(" ");

      // Look for caption siblings (next then previous).
      const siblingCaptions: string[] = [];
      if (myIdx >= 0) {
        for (let i = myIdx + 1; i < parentSiblings.length && i <= myIdx + 2; i++) {
          if (isCaption(parentSiblings[i] as Record<string, unknown>)) {
            siblingCaptions.push(textOf(parentSiblings[i] as Record<string, unknown>));
          }
        }
        for (let i = myIdx - 1; i >= 0 && i >= myIdx - 2; i--) {
          if (isCaption(parentSiblings[i] as Record<string, unknown>)) {
            siblingCaptions.push(textOf(parentSiblings[i] as Record<string, unknown>));
          }
        }
      }

      const ambientCaption = `${childCaption} ${siblingCaptions.join(" ")}`.trim();
      for (const img of imgs) {
        // Prepend the per-image alt text (Datalab's authoritative label) so
        // it dominates any ambient caption text picked up from siblings.
        const caption = `${img.alt} ${ambientCaption}`.trim();
        out.push({ filename: img.src, caption });
      }
    }

    // Recurse into children.
    const children = n["children"];
    if (Array.isArray(children)) {
      for (const child of children) walk(child, children);
    }
  }

  // Top-level walk: treat the json root's children as the first sibling list.
  const root = json as Record<string, unknown>;
  const topChildren = Array.isArray(root["children"]) ? root["children"] : [];
  walk(json, topChildren);

  // Extra pass: if Picture blocks were rendered as a standalone <img> elsewhere
  // in the html (no Picture wrapper), scan all blocks for img + caption pairs.
  void SRC_RE;
  return out;
}

/**
 * Pull captions straight from `<img alt="…" src="…">` tags anywhere in the
 * given HTML. This is Datalab Marker's most explicit per-image label and
 * should be trusted over any ambient text-window search.
 */
function captionsFromImgAlts(
  html: string | null | undefined,
): CaptionedImage[] {
  if (!html) return [];
  const out: CaptionedImage[] = [];
  const re = /<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    const alt = altMatch ? altMatch[1] : "";
    if (!alt) continue;
    out.push({ filename: srcMatch[1], caption: alt });
  }
  return out;
}

/**
 * Fallback: match each image filename to a caption using a windowed text
 * search over the markdown / HTML. Marker's markdown places captions on the
 * line immediately before or after `![](filename)`.
 */
function captionsFromText(
  filenames: string[],
  markdown: string | null | undefined,
  html: string | null | undefined,
): CaptionedImage[] {
  const out: CaptionedImage[] = [];
  for (const fn of filenames) {
    const captions: string[] = [];
    for (const corpus of [markdown, html]) {
      if (!corpus) continue;
      const idx = corpus.indexOf(fn);
      if (idx < 0) continue;
      const before = corpus.slice(Math.max(0, idx - 400), idx);
      const after = corpus.slice(idx + fn.length, idx + fn.length + 400);
      captions.push(`${stripHtml(after)} ${stripHtml(before)}`);
    }
    out.push({ filename: fn, caption: captions.join(" ") });
  }
  return out;
}

/**
 * Score a caption: large positive for portrait keywords, large negative for
 * known non-portrait keywords (QR code, logo, signature, …).
 */
function scoreCaption(caption: string): number {
  let score = 0;
  if (PORTRAIT_RE.test(caption)) score += 1000;
  if (NON_PORTRAIT_RE.test(caption)) score -= 1000;
  return score;
}

/**
 * Pick the actual face photo from an Aadhaar's images.
 *
 * Aadhaar PDFs typically contain four pictures: the State Emblem, the UIDAI
 * Aadhaar logo, the QR code, and the cardholder's portrait. The QR code is
 * usually the biggest by raw byte count, so a naive "biggest wins" heuristic
 * picks the wrong one.
 *
 * Strategy:
 * 1. Use Marker's structured block tree (most reliable) to pair each Picture
 *    block with its Caption sibling.
 * 2. Fall back to a windowed text search in the markdown / HTML.
 * 3. If nothing labels the images, fall back to picking the image with an
 *    aspect ratio + size profile most consistent with a portrait JPEG, with
 *    a hard penalty for very-large PNGs (which are almost always QR codes).
 */
function pickPortrait(
  images: ProfileImage[] | undefined,
  markdown: string | null | undefined,
  html: string | null | undefined,
  markerJson: unknown,
): { base64: string; mimeType: string } | undefined {
  if (!images || images.length === 0) return undefined;

  // Build {filename -> caption} from the most reliable source available.
  const fromBlocks = captionsFromMarkerBlocks(markerJson);
  const fromText = captionsFromText(
    images.map((i) => i.name),
    markdown,
    html,
  );
  const fromAlts = captionsFromImgAlts(html);

  const captionByFile = new Map<string, string>();
  for (const c of fromText) {
    if (c.caption) captionByFile.set(c.filename, c.caption);
  }
  // Block-derived captions take precedence over windowed text matches.
  for (const c of fromBlocks) {
    if (c.caption) captionByFile.set(c.filename, c.caption);
  }
  // <img alt="…"> labels (Datalab's per-image authoritative tag) win outright.
  for (const c of fromAlts) {
    if (c.caption) captionByFile.set(c.filename, c.caption);
  }

  // Score each image. PNG files in an Aadhaar are almost always QR codes /
  // logos (the portrait is a JPEG photograph), so we add a strong implicit
  // prior against PNGs when no caption disambiguates.
  let best: { img: ProfileImage; score: number; caption: string } | null = null;
  for (const img of images) {
    const caption = captionByFile.get(img.name) ?? "";
    let score = scoreCaption(caption);

    // Format prior: portraits are JPEGs, QR codes / logos are PNGs.
    if (img.mimeType === "image/png") score -= 50;
    if (img.mimeType === "image/jpeg" || img.mimeType === "image/jpg") score += 25;

    // Mild size tiebreaker — but capped, so a giant QR code can't out-score
    // a properly labeled portrait.
    score += Math.min(10, Math.log10(img.base64.length + 1));

    if (!best || score > best.score) best = { img, score, caption };
  }

  if (!best) return undefined;
  return { base64: best.img.base64, mimeType: best.img.mimeType };
}

/** Exposed for unit tests / route logging. */
export function debugPickPortraitDecision(
  images: ProfileImage[] | undefined,
  markdown: string | null | undefined,
  html: string | null | undefined,
  markerJson: unknown,
): Array<{ filename: string; caption: string; score: number; mimeType: string; bytes: number }> {
  if (!images || images.length === 0) return [];
  const fromBlocks = captionsFromMarkerBlocks(markerJson);
  const fromText = captionsFromText(images.map((i) => i.name), markdown, html);
  const fromAlts = captionsFromImgAlts(html);
  const captionByFile = new Map<string, string>();
  for (const c of fromText) if (c.caption) captionByFile.set(c.filename, c.caption);
  for (const c of fromBlocks) if (c.caption) captionByFile.set(c.filename, c.caption);
  for (const c of fromAlts) if (c.caption) captionByFile.set(c.filename, c.caption);

  return images.map((img) => {
    const caption = captionByFile.get(img.name) ?? "";
    let score = scoreCaption(caption);
    if (img.mimeType === "image/png") score -= 50;
    if (img.mimeType === "image/jpeg" || img.mimeType === "image/jpg") score += 25;
    score += Math.min(10, Math.log10(img.base64.length + 1));
    return {
      filename: img.name,
      caption: caption.slice(0, 120),
      score,
      mimeType: img.mimeType,
      bytes: img.base64.length,
    };
  });
}

/**
 * Convert the structured extraction result into a sub-document matching the
 * persisted MongoDB user schema.
 *
 * `markdown` is captured into the `rawText` field on every section, mirroring
 * the existing user document. `marker` (when present) carries the full HTML
 * rendering and every embedded picture so the profile page can show the same
 * visual the user saw on the extract page.
 */
export function mapExtractionToSection(
  documentType: string,
  presented: PresentedDocument | null,
  markdown: string | null,
  marker?: MarkerInput | null,
): MappedExtraction | null {
  const section = documentTypeToSection(documentType);
  if (!section) return null;

  const fields = presented ? flattenFields(presented.sections) : {};
  const rawText = nonEmpty(markdown ?? undefined);
  const html = nonEmpty(marker?.html ?? undefined);
  const images = normalizeImages(marker?.images);

  switch (section) {
    case "aadhar": {
      // Per product requirements, the Aadhaar profile keeps only the portrait
      // photo and a fixed list of identity fields — no raw OCR text, no full
      // HTML rendering, and no other Datalab-extracted images (logo,
      // signature, …).
      const portrait = pickPortrait(
        images,
        markdown,
        marker?.html,
        marker?.json,
      );
      // Diagnostic log so a misclassified portrait is debuggable from server
      // logs without having to re-run the upload.
      if (images && images.length > 0) {
        const decisions = debugPickPortraitDecision(
          images,
          markdown,
          marker?.html,
          marker?.json,
        );
        // eslint-disable-next-line no-console
        console.log(
          "[aadhar.pickPortrait]",
          JSON.stringify({ chosen: portrait ? images.find((i) => i.base64 === portrait.base64)?.name : null, decisions }, null, 2),
        );
      }
      const data: AadharSubdoc = stripUndefined({
        name: cleanName(fields["full_name"]),
        aadhaarNumber: nonEmpty(fields["aadhaar_number"]),
        vid: nonEmpty(fields["vid"]),
        dateOfBirth: nonEmpty(fields["date_of_birth"]),
        gender: nonEmpty(fields["gender"]),
        fathersOrHusbandsName: cleanName(fields["fathers_or_husbands_name"]),
        address: nonEmpty(fields["address"]),
        pincode: nonEmpty(fields["pincode"]),
        state: nonEmpty(fields["state"]),
        mobileNumber: nonEmpty(fields["mobile_number"]),
        issueDate: nonEmpty(fields["issue_date"]),
        enrolmentNumber: nonEmpty(fields["enrolment_number"]),
        photoBase64: portrait?.base64,
        photoMimeType: portrait?.mimeType,
      });
      return { section, data };
    }

    case "passbook": {
      // Branch code: the existing user has a 5-digit `branchCode`. The
      // extractor doesn't return one directly, so derive it from the IFSC
      // (last 6 chars after the bank prefix), e.g. SBIN0013035 -> 13035.
      const ifsc = nonEmpty(fields["ifsc_code"]);
      const branchCodeFromIfsc =
        ifsc && /^[A-Z]{4}0\d{6}$/.test(ifsc) ? ifsc.slice(6) : undefined;

      // Joint holders may come back as a CSV string (the flattenFields helper
      // joins string[] values), so split them back out into an array.
      const jointHoldersCsv = nonEmpty(fields["joint_holders"]);
      const jointHolders = jointHoldersCsv
        ? jointHoldersCsv.split(/\s*,\s*/).filter(Boolean)
        : undefined;

      // Pull the optional Transactions ledger from the document tables, the
      // same way Form 12's crop_entries are pulled.
      const txnRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "transactions")?.rows ?? [];

      const transactions = txnRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            date: nonEmpty(v["date"]),
            particulars: nonEmpty(v["particulars"]),
            chequeRef: nonEmpty(v["cheque_ref"]),
            withdrawal: nonEmpty(v["withdrawal"]),
            deposit: nonEmpty(v["deposit"]),
            balance: nonEmpty(v["balance"]),
          });
          return Object.keys(entry).length > 0 ? entry : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      const data: PassbookSubdoc = stripUndefined({
        bankName: nonEmpty(fields["bank_name"]),
        branchName: nonEmpty(fields["branch_name"]),
        branchAddress: nonEmpty(fields["branch_address"]),
        ifsc,
        micr: nonEmpty(fields["micr_code"]),
        accountHolderName: nonEmpty(fields["account_holder_name"]),
        jointHolders,
        nomineeName: nonEmpty(fields["nominee_name"]),
        nomineeRelationship: nonEmpty(fields["nominee_relationship"]),
        address: nonEmpty(fields["address"]),
        mobileNumber: nonEmpty(fields["mobile_number"]),
        email: nonEmpty(fields["email"]),
        cifNumber: nonEmpty(fields["customer_id"]),
        accountNumber: nonEmpty(fields["account_number"]),
        accountType: nonEmpty(fields["account_type"]),
        branchCode: branchCodeFromIfsc,
        accountOpeningDate: nonEmpty(fields["opening_date"]),
        currentBalance: nonEmpty(fields["current_balance"]),
        transactions: transactions.length > 0 ? transactions : undefined,
        rawText,
        html,
        images,
      });
      return { section, data };
    }

    case "form7": {
      const ownerNamesCsv = nonEmpty(fields["owner_names"]);
      const ownerNames = ownerNamesCsv
        ? ownerNamesCsv.split(/\s*,\s*/).map(cleanName).filter((n): n is string => !!n)
        : undefined;

      const oldMutationNumbersCsv = nonEmpty(fields["old_mutation_numbers"]);
      const oldMutationNumbers = oldMutationNumbersCsv
        ? oldMutationNumbersCsv.split(/\s*,\s*/).filter(Boolean)
        : undefined;

      // Pull every row of the main ownership / khata table.
      const ownershipRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "ownership_entries")?.rows ?? [];

      const ownershipEntries = ownershipRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            khateNumber: nonEmpty(v["khate_number"]),
            ownerName: cleanName(v["owner_name"]),
            area: nonEmpty(v["area"]),
            assessment: nonEmpty(v["assessment"]),
            collectionCharges: nonEmpty(v["collection_charges"]),
            mutationNumber: nonEmpty(v["mutation_number"]),
            tenantRentOtherRights: nonEmpty(v["tenant_rent_other_rights"]),
          });
          return Object.keys(entry).length > 0 ? entry : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Per product requirement: don't persist any pictures (state emblem,
      // watermark, etc.) on Form 7 profiles, and strip <img> tags out of the
      // saved HTML so it doesn't reference image bytes we deliberately
      // dropped (which would render as broken images on the profile page).
      const htmlNoImages = html ? stripImgTags(html) : undefined;

      // Capture every Table block from the source document verbatim so the
      // many sub-rows (cultivated area / जिरायत / बागायत / तरी / एकूण /
      // पोटखराब क्षेत्र / वर्ग अ / वर्ग ब / पो.स.क्षेत्र / etc.) and any
      // detail not covered by the structured fields are preserved.
      const tablesFromBlocks = extractTablesFromMarkerJson(marker?.json);
      const textBlocks = extractTextBlocksFromMarkerJson(marker?.json);

      const data: Form7Subdoc = stripUndefined({
        village: cleanName(fields["village"]),
        taluka: cleanName(fields["taluka"]),
        district: cleanName(fields["district"]),
        surveyNumber: cleanSurveyNumber(fields["survey_number"]),
        puId: nonEmpty(fields["pu_id"]),
        occupantClass: nonEmpty(fields["occupant_class"]),
        ownerNames,
        khateNumber: nonEmpty(fields["khate_number"]),
        ownerShare: nonEmpty(fields["owner_share"]),
        modeOfAcquisition: nonEmpty(fields["mode_of_acquisition"]),
        totalArea: nonEmpty(fields["total_area"]),
        landRevenueAssessment: nonEmpty(fields["land_revenue_assessment"]),
        collectionCharges: nonEmpty(fields["collection_charges"]),
        nonAgriculturalArea: nonEmpty(fields["non_agricultural_area"]),
        nonCultivatedArea: nonEmpty(fields["non_cultivated_area"]),
        tenantName: cleanName(fields["tenant_name"]),
        tenantRent: nonEmpty(fields["tenant_rent"]),
        otherRights: nonEmpty(fields["other_rights"]),
        encumbrances: nonEmpty(fields["encumbrances"]),
        lastMutationNumber: nonEmpty(fields["last_mutation_number"]),
        lastMutationDate: nonEmpty(fields["last_mutation_date"]),
        pendingMutation: nonEmpty(fields["pending_mutation"]),
        oldMutationNumbers,
        boundaryAndSurveyMarks: nonEmpty(fields["boundary_and_survey_marks"]),
        ownershipEntries:
          ownershipEntries.length > 0 ? ownershipEntries : undefined,
        tables: tablesFromBlocks.length > 0 ? tablesFromBlocks : undefined,
        textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
        rawText,
        html: htmlNoImages,
      });
      return { section, data };
    }

    case "form12": {
      const cropRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "crop_entries")?.rows ?? [];

      const cropEntries = cropRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            year: nonEmpty(v["year"]),
            season: nonEmpty(v["season"]),
            khateNumber: nonEmpty(v["khate_number"]),
            cropType: nonEmpty(v["crop_type"]),
            cropName: nonEmpty(v["crop_name"]),
            irrigatedArea: nonEmpty(v["irrigated_area"]),
            unirrigatedArea: nonEmpty(v["unirrigated_area"]),
            irrigationSource: nonEmpty(v["irrigation_source"]),
            landUseNature: nonEmpty(v["land_use_nature"]),
            area: nonEmpty(v["area"]),
            remarks: nonEmpty(v["remarks"]),
          });
          return Object.keys(entry).length > 0 ? entry : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Capture every Table block from the source document verbatim so the
      // full crop-inspection layout (merged headers like
      // पिकाखालील क्षेत्राचा तपशील / मिश्र पिकाखालील क्षेत्र /
      // निर्भळ पिकाखालील क्षेत्र / लागवडीसाठी उपलब्ध असलेली जमीन,
      // their sub-headers, blank columns, and per-year sub-rows
      // भात / गवत etc.) is preserved — not just the flattened cropEntries.
      const tablesFromBlocks = extractTablesFromMarkerJson(marker?.json);
      const textBlocks = extractTextBlocksFromMarkerJson(marker?.json);

      // Strip <img> tags from the saved HTML for visual consistency with
      // Form 7 (and so any image-bytes we don't persist don't render as
      // broken-image placeholders).
      const htmlNoImages = html ? stripImgTags(html) : undefined;

      const data: Form12Subdoc = stripUndefined({
        village: cleanName(fields["village"]),
        taluka: cleanName(fields["taluka"]),
        district: cleanName(fields["district"]),
        surveyNumber: cleanSurveyNumber(fields["survey_number"]),
        khateNumber: nonEmpty(fields["khate_number"]),
        cropEntries: cropEntries.length > 0 ? cropEntries : undefined,
        tables: tablesFromBlocks.length > 0 ? tablesFromBlocks : undefined,
        textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
        rawText,
        html: htmlNoImages,
        images,
      });
      return { section, data };
    }

    case "form8a": {
      const khatedarNamesCsv = nonEmpty(fields["khatedar_names"]);
      const khatedarNames = khatedarNamesCsv
        ? khatedarNamesCsv.split(/\s*,\s*/).map(cleanName).filter((n): n is string => !!n)
        : undefined;

      // Pull every row of the holdings table. The structured extractor is
      // instructed to skip the bold "एकूण" totals row, but defend against
      // the AI accidentally including it by filtering rows whose first cell
      // begins with "एकूण".
      const holdingsRows =
        presented?.sections
          .flatMap((s) => s.tables)
          .find((t) => t.key === "holdings")?.rows ?? [];

      const holdings = holdingsRows
        .map((row) => {
          const v = row.values as Record<string, string>;
          const entry = stripUndefined({
            villageForm6Entry: cleanName(v["village_form_6_entry"]),
            surveyNumberWithSubdivision: cleanSurveyNumber(
              v["survey_number_with_subdivision"],
            ),
            areaOrExtent: nonEmpty(v["area_or_extent"]),
            assessmentOrJudi: nonEmpty(v["assessment_or_judi"]),
            damageOnInheritedLand: nonEmpty(v["damage_on_inherited_land"]),
            zpLocalCess: nonEmpty(v["zp_local_cess"]),
            gpLocalCess: nonEmpty(v["gp_local_cess"]),
            recoveryTotal: nonEmpty(v["recovery_total"]),
            rowTotal: nonEmpty(v["row_total"]),
          });
          if (Object.keys(entry).length === 0) return null;
          // Drop a stray totals row if the model leaked it through.
          if ((entry.villageForm6Entry ?? "").trim().startsWith("एकूण")) {
            return null;
          }
          return entry;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);

      // Capture every Table block from the source document verbatim so the
      // full 8A layout (header rows, totals row, embedded notes, etc.) is
      // preserved alongside the structured holdings array.
      const tablesFromBlocks = extractTablesFromMarkerJson(marker?.json);
      const textBlocks = extractTextBlocksFromMarkerJson(marker?.json);

      // Strip <img> tags from the saved HTML so any image bytes we don't
      // persist don't render as broken-image placeholders, mirroring the
      // Form 7 / Form 12 behaviour.
      const htmlNoImages = html ? stripImgTags(html) : undefined;

      const data: Form8aSubdoc = stripUndefined({
        year: nonEmpty(fields["year"]),
        reportDate: nonEmpty(fields["report_date"]),
        village: cleanName(fields["village"]),
        taluka: cleanName(fields["taluka"]),
        district: cleanName(fields["district"]),
        khateNumber: nonEmpty(fields["khate_number"]),
        accountType: nonEmpty(fields["account_type"]),
        khatedarNames,
        khatedarAddress: nonEmpty(fields["khatedar_address"]),
        totalArea: nonEmpty(fields["total_area"]),
        totalAssessmentOrJudi: nonEmpty(fields["total_assessment_or_judi"]),
        totalDamageOnInheritedLand: nonEmpty(
          fields["total_damage_on_inherited_land"],
        ),
        totalZpLocalCess: nonEmpty(fields["total_zp_local_cess"]),
        totalGpLocalCess: nonEmpty(fields["total_gp_local_cess"]),
        totalRecoveryAmount: nonEmpty(fields["total_recovery_amount"]),
        grandTotal: nonEmpty(fields["grand_total"]),
        holdings: holdings.length > 0 ? holdings : undefined,
        tables: tablesFromBlocks.length > 0 ? tablesFromBlocks : undefined,
        textBlocks: textBlocks.length > 0 ? textBlocks : undefined,
        rawText,
        html: htmlNoImages,
      });
      return { section, data };
    }
  }
}

/** Drop keys whose value is undefined so MongoDB $set doesn't write empty fields. */
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}

/**
 * Exported helper: given raw Datalab Marker output, pick the cardholder's
 * portrait photo using the full multi-strategy algorithm (block tree captions,
 * img alt attributes, windowed text search, JPEG/PNG format prior).
 *
 * Returns `{ base64, mimeType }` of the best-matching image, or null.
 * This is used by the extract route to attach the portrait directly in the
 * API response so the frontend never has to guess which image is the face.
 */
export function pickAadhaarPortrait(marker: {
  images: Record<string, string> | null | undefined;
  markdown?: string | null;
  html?: string | null;
  json?: unknown;
} | null | undefined): { base64: string; mimeType: string } | null {
  if (!marker) return null;
  const images = normalizeImages(marker.images);
  const portrait = pickPortrait(images, marker.markdown, marker.html, marker.json);
  return portrait ?? null;
}
