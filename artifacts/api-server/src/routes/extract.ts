import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import multer from "multer";
import {
  DOCUMENT_TYPES,
  buildPageSchema,
  getDocumentType,
  presentExtraction,
  type DocumentTypeDef,
  type PresentedDocument,
} from "../lib/document-types";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";
import {
  mapExtractionToSection,
  pickAadhaarPortrait,
  extractTablesFromMarkerJson,
  extractTextBlocksFromMarkerJson,
  type Form7Table,
} from "../lib/profiles";

const router: IRouter = Router();

const DATALAB_BASE_URL = "https://www.datalab.to";
const ALLOWED_MODES = new Set(["fast", "balanced", "accurate"]);
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const DEFAULT_MODE = "accurate";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

interface JobMeta {
  documentTypeId: string;
  extractRequestId: string | null;
  markerRequestId: string | null;
  createdAt: number;
  /** Phone number of the profile to save into when extraction completes. */
  profilePhone: string | null;
  /** Whether we've already persisted this completed extraction (idempotency). */
  saved: boolean;
  /** Raw uploaded file stored as base64 so it can be shown alongside OCR output. */
  rawFileBase64: string;
  rawFileMimeType: string;
}

const jobs = new Map<string, JobMeta>();

async function getNextFarmerId(col: ReturnType<ReturnType<typeof getDb>["collection"]>): Promise<string> {
  const farmers = await col.find({}, { projection: { farmerId: 1 } }).toArray();
  let maxNum = 0;
  for (const f of farmers) {
    const m = String(f["farmerId"] ?? "").match(/F-(\d+)/);
    if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
  }
  return `F-${String(maxNum + 1).padStart(3, "0")}`;
}

function buildFarmerFieldsFromSection(section: string, data: Record<string, unknown>): Record<string, unknown> {
  const u: Record<string, unknown> = {};
  if (section === "aadhar") {
    if (data["name"]) u["name"] = data["name"];
    if (data["aadhaarNumber"]) u["aadhaar"] = data["aadhaarNumber"];
    if (data["fathersOrHusbandsName"]) u["fatherName"] = data["fathersOrHusbandsName"];
    if (data["dateOfBirth"]) u["dob"] = data["dateOfBirth"];
    if (data["gender"]) u["gender"] = data["gender"];
    if (data["address"]) u["address"] = data["address"];
    if (data["state"]) u["state"] = data["state"];
    if (data["mobileNumber"]) {
      const cleaned = String(data["mobileNumber"]).replace(/\D/g, "").slice(-10);
      if (cleaned.length === 10) u["aadhaarMobile"] = cleaned;
    }
  } else if (section === "passbook") {
    if (data["bankName"]) u["bankName"] = data["bankName"];
    if (data["branchName"]) u["branchName"] = data["branchName"];
    if (data["ifsc"]) u["ifsc"] = data["ifsc"];
    if (data["accountNumber"]) {
      u["accountNo"] = data["accountNumber"];
      u["bankAccount"] = String(data["accountNumber"]);
    }
    if (data["accountType"]) u["accountType"] = data["accountType"];
  } else if (section === "form7" || section === "form12" || section === "form8a") {
    if (data["village"]) u["village"] = data["village"];
    if (data["district"]) u["district"] = data["district"];
    if (data["taluka"]) u["taluka"] = data["taluka"];
    if (data["surveyNumber"]) u["surveyNumber"] = data["surveyNumber"];
    if (data["totalArea"]) u["land"] = data["totalArea"];
    if (section === "form12") {
      const crops = data["cropEntries"] as Array<{ cropName?: string }> | undefined;
      if (crops?.[0]?.["cropName"]) u["crop"] = crops[0]["cropName"];
    }
    if (section === "form7" || section === "form8a") {
      const names = (data["ownerNames"] ?? data["khatedarNames"]) as string[] | undefined;
      if (names && names.length > 0) u["farmerNames"] = names;
    }
  }
  return u;
}

// 4 hour TTL — accurate mode can take several minutes; give plenty of headroom.
const JOB_TTL_MS = 4 * 60 * 60 * 1000;
function gcJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, meta] of jobs) {
    if (meta.createdAt < cutoff) jobs.delete(id);
  }
}

function getApiKey(): string | null {
  const key = process.env["DATALAB_API_KEY"];
  return key && key.length > 0 ? key : null;
}

function describeUpstreamError(
  status: number,
  data: Record<string, unknown> | null,
): string {
  if (data) {
    if (typeof data["error"] === "string") return data["error"] as string;
    if (typeof data["detail"] === "string") return data["detail"] as string;
  }
  return `Datalab returned HTTP ${status}`;
}

async function submitExtract(
  apiKey: string,
  file: Express.Multer.File,
  def: DocumentTypeDef,
  mode: string,
): Promise<{ requestId: string | null; error: string | null }> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "application/octet-stream",
  });
  form.append("file", blob, file.originalname);
  form.append("mode", mode);
  form.append("output_format", "json");
  form.append("page_schema", JSON.stringify(buildPageSchema(def)));

  try {
    const upstream = await fetch(`${DATALAB_BASE_URL}/api/v1/extract`, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    const data = (await upstream.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!upstream.ok || !data) {
      return { requestId: null, error: describeUpstreamError(upstream.status, data) };
    }
    const id = data["request_id"];
    if (typeof id !== "string" || id.length === 0) {
      return { requestId: null, error: "Datalab did not return a request_id" };
    }
    return { requestId: id, error: null };
  } catch (err) {
    return {
      requestId: null,
      error: err instanceof Error ? err.message : "Failed to reach Datalab",
    };
  }
}

async function submitMarker(
  apiKey: string,
  file: Express.Multer.File,
  mode: string,
): Promise<{ requestId: string | null; error: string | null }> {
  const form = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], {
    type: file.mimetype || "application/octet-stream",
  });
  form.append("file", blob, file.originalname);
  form.append("output_format", "json");
  if (mode === "accurate") form.append("use_llm", "true");

  try {
    const upstream = await fetch(`${DATALAB_BASE_URL}/api/v1/marker`, {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: form,
    });
    const data = (await upstream.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!upstream.ok || !data) {
      return { requestId: null, error: describeUpstreamError(upstream.status, data) };
    }
    const id = data["request_id"];
    if (typeof id !== "string" || id.length === 0) {
      return { requestId: null, error: "Datalab did not return a request_id" };
    }
    return { requestId: id, error: null };
  } catch (err) {
    return {
      requestId: null,
      error: err instanceof Error ? err.message : "Failed to reach Datalab",
    };
  }
}

async function pollUpstream(
  apiKey: string,
  endpoint: "extract" | "marker",
  requestId: string,
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  try {
    const upstream = await fetch(
      `${DATALAB_BASE_URL}/api/v1/${endpoint}/${encodeURIComponent(requestId)}`,
      { headers: { "X-API-Key": apiKey } },
    );
    const data = (await upstream.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!upstream.ok || !data) {
      return { data: null, error: describeUpstreamError(upstream.status, data) };
    }
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to reach Datalab",
    };
  }
}

router.get("/document-types", (_req, res) => {
  res.json({
    types: Object.values(DOCUMENT_TYPES).map((d) => ({
      id: d.id,
      label: d.label,
      description: d.description,
    })),
  });
});

router.post(
  "/extract",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const apiKey = getApiKey();
    if (!apiKey) {
      req.log.error("DATALAB_API_KEY is not configured");
      res.status(500).json({ error: "Server is missing DATALAB_API_KEY" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded (field 'file')" });
      return;
    }

    const rawType =
      typeof req.body?.document_type === "string"
        ? req.body.document_type
        : "";
    const docDef = getDocumentType(rawType);
    if (!docDef) {
      res.status(400).json({
        error: `Invalid document_type. Expected one of: ${Object.keys(
          DOCUMENT_TYPES,
        ).join(", ")}`,
      });
      return;
    }

    const rawMode =
      typeof req.body?.mode === "string" ? req.body.mode : DEFAULT_MODE;
    const mode = ALLOWED_MODES.has(rawMode) ? rawMode : DEFAULT_MODE;

    // Optional: tie this extraction to a profile so the result is auto-saved
    // into the matching MongoDB user document the moment it finishes.
    const rawPhone =
      typeof req.body?.profile_phone === "string"
        ? req.body.profile_phone.trim()
        : "";
    const profilePhone = /^[0-9]{7,15}$/.test(rawPhone) ? rawPhone : null;

    // Fan out to both pipelines so the user gets structured fields AND the
    // original Datalab block / HTML / JSON view from a single upload.
    const [extractResult, markerResult] = await Promise.all([
      submitExtract(apiKey, file, docDef, mode),
      submitMarker(apiKey, file, mode),
    ]);

    if (!extractResult.requestId && !markerResult.requestId) {
      const message =
        extractResult.error ?? markerResult.error ?? "Datalab submission failed";
      req.log.warn(
        { extract: extractResult.error, marker: markerResult.error },
        "Both Datalab submissions failed",
      );
      res.status(502).json({ error: message });
      return;
    }

    gcJobs();
    const jobId = randomUUID().replace(/-/g, "");
    const rawFileBase64 = file.buffer.toString("base64");
    const rawFileMimeType = file.mimetype || "application/octet-stream";
    jobs.set(jobId, {
      documentTypeId: docDef.id,
      extractRequestId: extractResult.requestId,
      markerRequestId: markerResult.requestId,
      createdAt: Date.now(),
      profilePhone,
      saved: false,
      rawFileBase64,
      rawFileMimeType,
    });

    res.json({
      request_id: jobId,
      document_type: docDef.id,
      document_label: docDef.label,
      mode,
      profile_phone: profilePhone,
      pipelines: {
        extract: extractResult.requestId
          ? { status: "submitted" }
          : { status: "error", error: extractResult.error },
        marker: markerResult.requestId
          ? { status: "submitted" }
          : { status: "error", error: markerResult.error },
      },
    });
  },
);

/**
 * Persist a completed extraction into the farmers collection (idempotent).
 * Keyed by the farmer's mobile number. Creates the farmer record on first
 * upload, then merges subsequent document sections into the same record.
 * The admin dashboard can see the farmer immediately in Pending status.
 */
async function persistToProfile(
  meta: JobMeta,
  docDef: DocumentTypeDef,
  presented: PresentedDocument | null,
  markdown: string | null,
  marker: {
    html: string | null;
    images: Record<string, string> | null;
    json?: unknown;
  } | null,
  rawTables: Form7Table[],
  textBlocks: string[],
  aadharPhoto: { base64: string; mimeType: string } | null,
): Promise<{ saved: boolean; section: string | null; error: string | null }> {
  if (!meta.profilePhone) {
    return { saved: false, section: null, error: null };
  }

  const mapped = mapExtractionToSection(docDef.id, presented, markdown, marker);

  if (meta.saved) {
    return { saved: true, section: mapped?.section ?? null, error: null };
  }

  try {
    const now = new Date().toISOString();
    const mobile = meta.profilePhone;
    const db = getDb();
    const farmersCol = db.collection("farmers");

    // Step 1: Ensure farmer record exists and get farmerId.
    const existing = await farmersCol.findOne({ mobile }, { projection: { _id: 0, farmerId: 1 } });
    let resolvedFarmerId: string;
    if (!existing) {
      resolvedFarmerId = await getNextFarmerId(farmersCol);
      await farmersCol.insertOne({
        farmerId: resolvedFarmerId,
        mobile,
        status: "Draft",
        source: "mobile_ocr",
        name: "—",
        aadhaar: "—",
        village: "—",
        district: "—",
        surveyNumber: "—",
        bankAccount: "—",
        crop: "—",
        land: "—",
        addedAt: now,
        updatedAt: now,
        ocr: {},
        extractionData: {},
        docs: [],
        documents: [],
        notifications: [],
      });
    } else {
      resolvedFarmerId = String(existing["farmerId"] ?? "");
    }

    // Step 2: Always persist the raw image embedded in the farmer document.
    if (meta.rawFileBase64) {
      const docObj = {
        docType: docDef.id,
        base64: meta.rawFileBase64,
        mimeType: meta.rawFileMimeType,
        mobile,
        uploadedAt: now,
      };
      const updateResult = await farmersCol.updateOne(
        { mobile, "documents.docType": docDef.id },
        { $set: { "documents.$": docObj } },
      );
      if (updateResult.matchedCount === 0) {
        await farmersCol.updateOne(
          { mobile },
          { $push: { documents: docObj } } as Record<string, unknown>,
        );
      }
    }

    // Step 3: Save extracted fields only when we have meaningful data.
    if (!mapped || Object.keys(mapped.data).length === 0) {
      meta.saved = true;
      return {
        saved: true,
        section: mapped?.section ?? null,
        error: mapped ? "Extraction returned no usable fields to save." : "Could not map extraction to a profile section.",
      };
    }

    const extractionEntry = {
      filename: `${docDef.id}`,
      sections: presented ? presented.sections : [],
      rawTables,
      textBlocks,
      aadharPhoto,
    };
    const topLevel = buildFarmerFieldsFromSection(mapped.section, mapped.data as Record<string, unknown>);
    const docEntry = {
      name: docDef.label,
      fileName: `${docDef.id}.pdf`,
      size: "—",
      status: "uploaded",
      section: mapped.section,
      extractedAt: now,
    };

    const updateDoc: Record<string, unknown> = {
      [`ocr.${mapped.section}`]: mapped.data,
      [`extractionData.${docDef.id}`]: extractionEntry,
      updatedAt: now,
    };
    for (const [k, v] of Object.entries(topLevel)) {
      if (v !== undefined && v !== null && v !== "") updateDoc[k] = v;
    }
    await farmersCol.updateOne(
      { mobile },
      {
        $set: updateDoc,
        $push: { docs: docEntry } as Record<string, unknown>,
      },
    );

    meta.saved = true;
    return { saved: true, section: mapped.section, error: null };
  } catch (err) {
    return {
      saved: false,
      section: mapped?.section ?? null,
      error: err instanceof Error ? err.message : "Failed to save to farmers.",
    };
  }
}

router.get("/extract/:requestId", async (req, res): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    req.log.error("DATALAB_API_KEY is not configured");
    res.status(500).json({ error: "Server is missing DATALAB_API_KEY" });
    return;
  }

  const rawId = req.params.requestId;
  const requestId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (
    typeof requestId !== "string" ||
    requestId.length === 0 ||
    !/^[A-Za-z0-9_-]+$/.test(requestId)
  ) {
    res.status(400).json({ error: "Invalid requestId" });
    return;
  }

  const meta = jobs.get(requestId);
  if (!meta) {
    res.status(404).json({
      error:
        "Unknown extraction job. Please re-upload the document — server jobs expire after 30 minutes or are lost on restart.",
    });
    return;
  }
  const docDef = getDocumentType(meta.documentTypeId);
  if (!docDef) {
    res.status(500).json({ error: "Job has an unknown document type." });
    return;
  }

  // Fan out polling to both upstream pipelines in parallel.
  const [extractPoll, markerPoll] = await Promise.all([
    meta.extractRequestId
      ? pollUpstream(apiKey, "extract", meta.extractRequestId)
      : Promise.resolve({ data: null, error: "Pipeline was not started." }),
    meta.markerRequestId
      ? pollUpstream(apiKey, "marker", meta.markerRequestId)
      : Promise.resolve({ data: null, error: "Pipeline was not started." }),
  ]);

  type PipelineState = "complete" | "processing" | "error";
  function classify(
    poll: { data: Record<string, unknown> | null; error: string | null },
  ): { state: PipelineState; error?: string } {
    if (poll.error) return { state: "error", error: poll.error };
    if (!poll.data) return { state: "error", error: "No response from Datalab" };
    const s = poll.data["status"];
    if (typeof s === "string") {
      if (s === "complete") return { state: "complete" };
      if (s === "error") {
        const err =
          typeof poll.data["error"] === "string"
            ? (poll.data["error"] as string)
            : "Extraction failed.";
        return { state: "error", error: err };
      }
    }
    return { state: "processing" };
  }

  const extractClass = meta.extractRequestId
    ? classify(extractPoll)
    : { state: "error" as const, error: extractPoll.error ?? undefined };
  const markerClass = meta.markerRequestId
    ? classify(markerPoll)
    : { state: "error" as const, error: markerPoll.error ?? undefined };

  // Overall status — keep the client polling until both pipelines have
  // settled (either complete or error), then surface a combined result.
  let overall: PipelineState;
  if (extractClass.state === "processing" || markerClass.state === "processing") {
    overall = "processing";
  } else if (extractClass.state === "error" && markerClass.state === "error") {
    overall = "error";
  } else {
    overall = "complete";
  }

  if (overall === "processing") {
    res.json({
      status: "processing",
      document_type: docDef.id,
      document_label: docDef.label,
      pipelines: {
        extract: { status: extractClass.state },
        marker: { status: markerClass.state },
      },
    });
    return;
  }

  if (overall === "error") {
    res.json({
      status: "error",
      document_type: docDef.id,
      document_label: docDef.label,
      error:
        extractClass.error ?? markerClass.error ?? "Both extractions failed.",
      errors: {
        extract: extractClass.error,
        marker: markerClass.error,
      },
    });
    return;
  }

  // overall === "complete" — at least one pipeline succeeded.
  let structured: PresentedDocument | null = null;
  if (extractClass.state === "complete" && extractPoll.data) {
    structured = presentExtraction(
      docDef,
      extractPoll.data["extraction_schema_json"],
    );
  }

  let marker: {
    json: unknown;
    html: string | null;
    markdown: string | null;
    images: Record<string, string> | null;
  } | null = null;
  let pageCount: number | null = null;
  let runtime: number | null = null;

  if (markerClass.state === "complete" && markerPoll.data) {
    const m = markerPoll.data;
    marker = {
      json: m["json"] ?? null,
      html: typeof m["html"] === "string" ? (m["html"] as string) : null,
      markdown: typeof m["markdown"] === "string" ? (m["markdown"] as string) : null,
      images:
        m["images"] && typeof m["images"] === "object"
          ? (m["images"] as Record<string, string>)
          : null,
    };
    if (typeof m["page_count"] === "number") pageCount = m["page_count"] as number;
    if (typeof m["runtime"] === "number") runtime = m["runtime"] as number;
  }

  if (extractPoll.data) {
    if (pageCount === null && typeof extractPoll.data["page_count"] === "number") {
      pageCount = extractPoll.data["page_count"] as number;
    }
    if (runtime === null && typeof extractPoll.data["runtime"] === "number") {
      runtime = extractPoll.data["runtime"] as number;
    }
  }

  // For Aadhaar documents, pick the portrait server-side and include it
  // directly so the frontend never has to guess which image is the face.
  const aadharPhoto =
    docDef.id === "aadhar" && marker
      ? pickAadhaarPortrait(marker)
      : null;

  const rawTables = marker?.json ? extractTablesFromMarkerJson(marker.json) : [];
  const textBlocks = marker?.json ? extractTextBlocksFromMarkerJson(marker.json) : [];

  // Auto-save to MongoDB if a profile_phone was supplied at submission time.
  const persisted = await persistToProfile(
    meta,
    docDef,
    structured,
    marker?.markdown ?? null,
    marker
      ? { html: marker.html, images: marker.images, json: marker.json }
      : null,
    rawTables,
    textBlocks,
    aadharPhoto,
  );
  if (persisted.error) {
    logger.warn({ err: persisted.error, phone: meta.profilePhone }, "Profile save failed");
  }

  res.json({
    status: "complete",
    document_type: docDef.id,
    document_label: docDef.label,
    page_count: pageCount,
    runtime,
    structured: structured
      ? { sections: structured.sections, empty: structured.empty }
      : null,
    marker,
    raw_tables: rawTables,
    text_blocks: textBlocks,
    aadhar_photo: aadharPhoto,
    raw_file_base64: meta.rawFileBase64 ?? null,
    raw_file_mime_type: meta.rawFileMimeType ?? null,
    profile: meta.profilePhone
      ? {
          phone: meta.profilePhone,
          section: persisted.section,
          saved: persisted.saved,
          error: persisted.error,
        }
      : null,
    errors:
      extractClass.state === "error" || markerClass.state === "error"
        ? {
            extract: extractClass.error,
            marker: markerClass.error,
          }
        : undefined,
  });
});

export default router;
