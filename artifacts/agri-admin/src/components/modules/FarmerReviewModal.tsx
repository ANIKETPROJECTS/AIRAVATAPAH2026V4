import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X, CheckCircle2, XCircle, ShieldCheck, Loader2,
  FileStack, Sprout, ClipboardCheck, CreditCard, BookOpen,
  UserCheck, RotateCcw, AlertTriangle, FileText, MessageSquare, ImageIcon, ZoomIn,
} from "lucide-react";
import {
  type DocTypeId,
  type ExtractionState,
  type LangCode,
  DEFAULT_STATE,
  EMPTY_PROFILE,
  FarmerProfileCard,
  FieldsTable,
  DOC_CARDS,
  DOC_CARD_SHORT,
  type FarmerProfile,
  extractProfileFromStates,
  DocLightbox,
} from "./NewRegistration";
import { apiUpdateFarmer, type FarmerRecord } from "@/data/farmerApi";

type DocStates = Record<DocTypeId, ExtractionState>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Verified:  "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-700",
    Pending:   "bg-yellow-100 text-yellow-700",
    Active:    "bg-green-100 text-green-700",
    Inactive:  "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function DocTabIcon({ id }: { id: DocTypeId }) {
  if (id === "form7") return <FileStack className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "form12") return <Sprout className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "form8a") return <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "aadhar") return <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />;
  return <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />;
}

export function DocContentView({
  state,
  docId,
  lang,
  rawDocImage,
}: {
  state: ExtractionState;
  docId: DocTypeId;
  lang: LangCode;
  rawDocImage?: { base64: string; mimeType: string } | null;
}) {
  const [showRawText, setShowRawText] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const hasFields = state.sections.some(s =>
    s.fields.some(f => f.value && f.value !== "—")
  );
  const hasTables = state.sections.some(s => s.tables && s.tables.length > 0);
  const hasRawTables = state.rawTables && state.rawTables.length > 0;
  const hasTextBlocks = state.textBlocks && state.textBlocks.length > 0;
  const hasMeaningfulContent = hasFields || hasTables || hasRawTables;

  const docImageSrc = rawDocImage
    ? `data:${rawDocImage.mimeType};base64,${rawDocImage.base64}`
    : state.rawFileDataUrl ?? null;

  return (
    <div className="space-y-4">
      {state.filename && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border">
          <FileText className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="font-mono truncate">{state.filename}</span>
        </div>
      )}

      {docId === "aadhar" && state.aadharPhoto && (
        <div className="flex justify-center mb-2">
          <img
            src={`data:${state.aadharPhoto.mimeType};base64,${state.aadharPhoto.base64}`}
            alt="Aadhaar photo"
            className="h-28 w-28 rounded-full object-cover border-4 border-border shadow"
          />
        </div>
      )}

      {lightboxSrc && (
        <DocLightbox
          src={lightboxSrc}
          label="Original Document"
          onClose={() => setLightboxSrc(null)}
        />
      )}

      {docImageSrc ? (
        <div className="flex gap-4 items-start">
          <div className="w-[220px] flex-shrink-0 sticky top-2">
            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30">
                <ImageIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="text-[11px] font-semibold text-muted-foreground truncate flex-1">Original Document</span>
                <button
                  type="button"
                  onClick={() => setLightboxSrc(docImageSrc)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
                  title="View fullscreen"
                >
                  <ZoomIn className="h-3 w-3" />
                  Expand
                </button>
              </div>
              <button
                type="button"
                onClick={() => setLightboxSrc(docImageSrc)}
                className="w-full block focus:outline-none group relative"
                title="Click to view fullscreen"
              >
                <img
                  src={docImageSrc}
                  alt="Original uploaded document"
                  className="w-full object-contain max-h-[480px] bg-white"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white text-xs font-semibold rounded-full px-3 py-1.5 flex items-center gap-1.5">
                    <ZoomIn className="h-3.5 w-3.5" />
                    View fullscreen
                  </div>
                </div>
              </button>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {(state.sections.length > 0 || hasRawTables) && (
              <FieldsTable
                sections={state.sections}
                rawTables={state.rawTables ?? []}
                textBlocks={[]}
                docId={docId}
                lang={lang}
              />
            )}
          </div>
        </div>
      ) : (
        (state.sections.length > 0 || hasRawTables) && (
          <FieldsTable
            sections={state.sections}
            rawTables={state.rawTables ?? []}
            textBlocks={[]}
            docId={docId}
            lang={lang}
          />
        )
      )}

      {!hasMeaningfulContent && state.sections.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Limited structured data extracted</p>
            <p className="text-xs mt-1 opacity-80">
              The OCR could not extract structured fields from this document.
              {hasTextBlocks ? " Raw text is available below." : " The document may be unclear or in an unsupported format."}
            </p>
          </div>
        </div>
      )}

      {state.sections.length === 0 && !hasRawTables && !hasTextBlocks && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <BookOpen className="h-10 w-10 opacity-20" />
          <p className="text-sm">No data extracted from this document.</p>
        </div>
      )}

      {hasTextBlocks && (
        <div>
          <button
            type="button"
            onClick={() => setShowRawText(o => !o)}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors w-full text-left px-1 py-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            Raw extracted text ({state.textBlocks.length} block{state.textBlocks.length !== 1 ? "s" : ""})
            <span className="ml-auto text-[10px]">{showRawText ? "▲ hide" : "▼ show"}</span>
          </button>
          {(showRawText || !hasMeaningfulContent) && (
            <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
              {state.textBlocks.map((tb, i) => (
                <div key={i} className="border-l-4 border-l-border bg-muted/30 border border-border rounded-md px-4 py-3 text-xs whitespace-pre-wrap break-words text-foreground font-mono">
                  {tb}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RejectReasonDialog({
  onCancel,
  onConfirm,
  saving,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  saving: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-red-50">
          <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-base text-red-800">Reject Registration</h3>
            <p className="text-xs text-red-600 mt-0.5">This action will notify the farmer of the rejection.</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">
              <MessageSquare className="h-4 w-4 inline mr-1.5 text-muted-foreground" />
              Reason for Rejection
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Aadhaar document is unclear / blurry. Please re-upload a clear scan.&#10;&#10;Or: Land records (Form 7/12) do not match the declared survey number."
              rows={5}
              autoFocus
              className="w-full text-sm px-3 py-2.5 rounded-lg border border-border bg-muted/20 focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-300 resize-none transition-all"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              This reason will be shown to the farmer in their mobile app.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/20">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={saving || !reason.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Confirm Rejection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FarmerReviewModal({
  farmer,
  onClose,
  onUpdated,
}: {
  farmer: FarmerRecord;
  onClose: () => void;
  onUpdated: (f: FarmerRecord) => void;
}) {
  const [lang, setLang] = useState<LangCode>("mr");
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [modalStep, setModalStep] = useState<"review" | "verify">("review");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [docImages, setDocImages] = useState<Record<string, { base64: string; mimeType: string }>>({});

  useEffect(() => {
    if (!farmer.farmerId) return;
    fetch(`/api/farmers/${farmer.farmerId}/documents`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { documents: { docType: string; base64: string; mimeType: string }[] }) => {
        const map: Record<string, { base64: string; mimeType: string }> = {};
        for (const d of data.documents ?? []) {
          map[d.docType] = { base64: d.base64, mimeType: d.mimeType };
        }
        setDocImages(map);
      })
      .catch(() => {});
  }, [farmer.farmerId]);

  const docStates: DocStates = useMemo(() => {
    const states = Object.fromEntries(
      DOC_CARDS.map(c => [c.id, { ...DEFAULT_STATE }])
    ) as DocStates;
    if (farmer.extractionData) {
      for (const [docId, saved] of Object.entries(farmer.extractionData)) {
        states[docId as DocTypeId] = {
          status: "complete",
          filename: saved.filename ?? "",
          requestId: null,
          sections: Array.isArray(saved.sections) ? saved.sections : [],
          images: null,
          rawTables: Array.isArray(saved.rawTables) ? saved.rawTables : [],
          textBlocks: Array.isArray(saved.textBlocks) ? saved.textBlocks : [],
          aadharPhoto: saved.aadharPhoto ?? null,
          error: null,
        };
      }
    }
    return states;
  }, [farmer]);

  const initialProfile: FarmerProfile = useMemo(() => {
    if (farmer.farmerProfile) return farmer.farmerProfile as unknown as FarmerProfile;
    const base: FarmerProfile = {
      ...EMPTY_PROFILE,
      name: farmer.name ?? "",
      village: farmer.village ?? "",
      taluka: farmer.taluka ?? "",
      district: farmer.district ?? "",
      aadhaar: farmer.aadhaar ?? "",
      khateNumber: farmer.khateNumber ?? "",
      surveyNumber: farmer.surveyNumber ?? "",
      land: String(farmer.land ?? ""),
      crop: farmer.crop ?? "",
      bankAccount: farmer.bankAccount ?? "",
    };
    const extracted = extractProfileFromStates(docStates);
    (Object.keys(extracted) as (keyof FarmerProfile)[]).forEach((k) => {
      if (!base[k] && extracted[k]) base[k] = extracted[k]!;
    });
    return base;
  }, [farmer, docStates]);

  const [profile, setProfile] = useState<FarmerProfile>(initialProfile);

  const handleProfileChange = (field: keyof FarmerProfile, value: string) => {
    setProfile(p => ({ ...p, [field]: value }));
  };

  const completedCards = DOC_CARDS.filter(c => docStates[c.id].status === "complete");
  const [activeTab, setActiveTab] = useState<DocTypeId | "profile">(
    completedCards.length > 0 ? completedCards[0].id : "profile"
  );

  const handleUpdateStatus = async (status: FarmerRecord["status"], rejectionReason?: string) => {
    setSaving(status);
    try {
      const payload: Partial<FarmerRecord> = {
        status,
        farmerProfile: profile as unknown as Record<string, string>,
        name: profile.name || farmer.name,
        village: profile.village || farmer.village,
        taluka: profile.taluka || farmer.taluka,
        district: profile.district || farmer.district,
        khateNumber: profile.khateNumber || farmer.khateNumber,
      };
      if (rejectionReason) payload.rejectionReason = rejectionReason;
      const updated = await apiUpdateFarmer(farmer.farmerId, payload);
      onUpdated(updated);
      onClose();
    } catch {
      setSaving(null);
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    setShowRejectDialog(false);
    await handleUpdateStatus("Cancelled", reason);
  };

  const isPending = farmer.status === "Pending";
  const isVerified = farmer.status === "Verified";
  const isCancelled = farmer.status === "Cancelled";

  const content = (
    <div
      className="fixed inset-0 bg-background flex flex-col"
      style={{ zIndex: 9999 }}
    >
      {/* Rejection reason dialog overlay */}
      {showRejectDialog && (
        <RejectReasonDialog
          onCancel={() => setShowRejectDialog(false)}
          onConfirm={handleRejectConfirm}
          saving={!!saving}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-base">{farmer.name}</h2>
              <StatusBadge status={farmer.status} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {farmer.farmerId}
              {farmer.aadhaar ? ` · Aadhaar: ${farmer.aadhaar}` : ""}
              {farmer.khateNumber && farmer.khateNumber !== "—" ? ` · Khate: ${farmer.khateNumber}` : ""}
              {farmer.village ? ` · ${farmer.village}, ${farmer.district}` : ""}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors">
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border bg-muted/30 flex-shrink-0 overflow-x-auto">
        {completedCards.map(card => (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === card.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <DocTabIcon id={card.id} />
            {DOC_CARD_SHORT[card.id]?.["en"] ?? card.id}
          </button>
        ))}
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
          Farmer Profile
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {completedCards.length === 0 && activeTab !== "profile" && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <BookOpen className="h-10 w-10 opacity-20" />
            <p className="text-sm font-medium">No documents saved for this farmer.</p>
            <p className="text-xs opacity-70">Documents were not uploaded during registration.</p>
          </div>
        )}

        {activeTab !== "profile" && docStates[activeTab as DocTypeId]?.status === "complete" && (
          <DocContentView
            state={docStates[activeTab as DocTypeId]}
            docId={activeTab as DocTypeId}
            lang={lang}
            rawDocImage={docImages[activeTab as string] ?? null}
          />
        )}

        {activeTab === "profile" && (
          <FarmerProfileCard
            docStates={docStates}
            profile={profile}
            onChange={handleProfileChange}
            onApprove={() => {}}
            approved={false}
            onBack={() => setActiveTab(completedCards[0]?.id ?? "profile")}
            lang={lang}
            onLangChange={setLang}
            customPhoto={customPhoto}
            onCustomPhotoChange={setCustomPhoto}
            hideFooter={true}
            extraDocImages={Object.fromEntries(
              Object.entries(docImages).map(([k, v]) => [k, `data:${v.mimeType};base64,${v.base64}`])
            )}
          />
        )}
      </div>

      {/* ── Footer actions ── */}
      <div className="flex-shrink-0 border-t border-border bg-card px-6 py-4">

        {/* Pending — step 1: Review documents, then decide */}
        {isPending && modalStep === "review" && (
          <div className="flex items-center gap-3 justify-between flex-wrap gap-y-2">
            <p className="text-sm text-muted-foreground">Review all documents and farmer profile before deciding.</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalStep("verify")}
                disabled={!!saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                Accept Farmer
              </button>
            </div>
          </div>
        )}

        {/* Pending — step 2: Approve verification or Reject with reason */}
        {isPending && modalStep === "verify" && (
          <div className="flex items-center gap-3 justify-between flex-wrap gap-y-2">
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              Farmer accepted — verify data and approve, or reject if any issue is found.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setModalStep("review")}
                disabled={!!saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={() => setShowRejectDialog(true)}
                disabled={!!saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {saving === "Cancelled" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Reject
              </button>
              <button
                onClick={() => handleUpdateStatus("Verified")}
                disabled={!!saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50 shadow-sm"
              >
                {saving === "Verified" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Approve Verification
              </button>
            </div>
          </div>
        )}

        {/* Verified — read-only */}
        {isVerified && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-emerald-50 border-emerald-200 text-emerald-700">
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              This farmer has been verified and approved.
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Cancelled — show rejection reason and Restore option */}
        {isCancelled && (
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-red-50 border-red-200 text-red-700">
                <XCircle className="h-4 w-4 flex-shrink-0" />
                This farmer registration was rejected.
              </div>
              {farmer.rejectionReason && (
                <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg border bg-red-50/50 border-red-100 text-red-600 max-w-lg">
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span><strong>Reason:</strong> {farmer.rejectionReason}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleUpdateStatus("Pending")}
                disabled={!!saving}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 text-sm font-medium hover:bg-yellow-100 transition-colors disabled:opacity-50"
              >
                {saving === "Pending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Restore to Pending
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted/40 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
