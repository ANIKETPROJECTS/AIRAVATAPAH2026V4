import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Landmark, Sprout, Shield, FileText, AlertCircle,
  CheckCircle2, Phone, Hash, BadgeCheck, Mail,
  CreditCard, ArrowRight, IndianRupee, LifeBuoy,
  FileStack, ClipboardCheck, UserCheck, Loader2, MapPin,
} from "lucide-react";
import type { FarmerRecord } from "@/data/farmerApi";
import { DocContentView } from "@/components/modules/FarmerReviewModal";
import {
  type DocTypeId,
  type ExtractionState,
  type LangCode,
  type FarmerProfile,
  DEFAULT_STATE,
  EMPTY_PROFILE,
  FarmerProfileCard,
  DOC_CARDS,
  DOC_CARD_SHORT,
  extractProfileFromStates,
} from "@/components/modules/NewRegistration";

/* ─────────────────────────── helpers ─────────────────────────── */
export function formatLandHAR(val: number | string | undefined): string {
  if (val === undefined || val === null || val === "" || val === "0" || val === 0) return "—";
  const s = String(val).trim();
  const parts = s.split(".");
  if (parts.length === 3) return `${parts[0]} हे. ${parts[1]} आर. ${parts[2]} चौ.मी.`;
  if (parts.length === 2) return parts[1] === "0" || parts[1] === "00" ? `${parts[0]} हे.` : `${parts[0]} हे. ${parts[1]} आर.`;
  return `${s} हे.`;
}
export function landToHa(val: number | string | undefined): number {
  if (!val) return 0;
  const parts = String(val).trim().split(".");
  return parseFloat(parts[0] || "0") + parseFloat(parts[1] || "0") / 100 + parseFloat(parts[2] || "0") / 10000;
}
function calcAge(dob?: string) {
  if (!dob) return "—";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  return `${age} वर्षे`;
}

/* ─────────────────────────── pill components ─────────────────────────── */
export function Pill({ label, map }: { label: string; map: Record<string, string> }) {
  return <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${map[label] || "bg-muted text-muted-foreground"}`}>{label}</span>;
}
export function SchemeStatusPill({ status }: { status?: string | null }) {
  if (!status) return <span className="text-[10px] italic text-muted-foreground/50">Not Applied</span>;
  const c: Record<string, string> = { "Disbursed": "bg-emerald-100 text-emerald-800 border-emerald-200", "Approved": "bg-teal-100 text-teal-800 border-teal-200", "Applied": "bg-green-100 text-green-800 border-green-200", "Rejected": "bg-slate-100 text-slate-600 border-slate-200" };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${c[status] || "bg-muted text-muted-foreground border-border"}`}>{status}</span>;
}
export const GSTATUS: Record<string, string> = { "Open": "bg-lime-100 text-lime-800", "In Progress": "bg-teal-100 text-teal-800", "Resolved": "bg-emerald-100 text-emerald-800", "Closed": "bg-slate-100 text-slate-600", "Escalated": "bg-orange-100 text-orange-800", "Rejected": "bg-red-100 text-red-700" };
export const GPRIORITY: Record<string, string> = { "High": "bg-lime-200 text-lime-900 font-bold", "Medium": "bg-green-100 text-green-800", "Low": "bg-slate-100 text-slate-600" };

/* ─────────────────────────── small components ─────────────────────────── */
function InfoBlock({ label, value, mono, highlight }: { label: string; value?: string | null; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</span>
      <span className={`text-sm ${mono ? "font-mono" : "font-medium"} ${highlight ? "text-emerald-700 font-semibold" : "text-foreground"}`}>
        {value || <span className="text-muted-foreground/40">—</span>}
      </span>
    </div>
  );
}
function SubHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border/40">
      {icon}{label}
    </div>
  );
}
function Section({ id, title, icon, children, badge }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode; badge?: number | string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div id={id} className="border border-border rounded-xl overflow-hidden scroll-mt-4">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
        <div className="flex items-center gap-2.5 font-semibold text-sm text-foreground">
          <span className="text-secondary">{icon}</span>
          {title}
          {badge !== undefined && <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-bold border border-secondary/20">{badge}</span>}
        </div>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="p-5 bg-white">{children}</div>}
    </div>
  );
}

/* ─────────────────────────── summary card (sub-page navigation) ─────────────────────────── */
function SummaryCard({ id, title, icon, badge, onClick, children }: {
  id: string; title: string; icon: React.ReactNode; badge?: string | number; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div id={id} className="border border-border rounded-xl overflow-hidden scroll-mt-4 group">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left bg-slate-50/70 hover:bg-secondary/5 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5 font-semibold text-sm text-foreground">
          <span className="text-secondary">{icon}</span>
          {title}
          {badge !== undefined && <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/15 text-secondary font-bold border border-secondary/20">{badge}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-secondary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Open page</span>
          <ArrowRight className="h-4 w-4 text-secondary" />
        </div>
      </button>
      <div className="px-5 py-4 bg-white">{children}</div>
    </div>
  );
}

/* ─────────────────────────── profile section ─────────────────────────── */
function DocTabIcon({ id }: { id: DocTypeId }) {
  if (id === "form7") return <FileStack className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "form12") return <Sprout className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "form8a") return <ClipboardCheck className="h-3.5 w-3.5 flex-shrink-0" />;
  if (id === "aadhar") return <CreditCard className="h-3.5 w-3.5 flex-shrink-0" />;
  return <Landmark className="h-3.5 w-3.5 flex-shrink-0" />;
}

function ProfileSection({
  farmer,
  docImages,
}: {
  farmer: FarmerRecord;
  docImages: Record<string, { base64: string; mimeType: string }>;
}) {
  const docStates = useMemo(() => {
    const states = Object.fromEntries(
      DOC_CARDS.map(c => [c.id, { ...DEFAULT_STATE }])
    ) as Record<DocTypeId, ExtractionState>;
    if (farmer.extractionData) {
      for (const [docId, saved] of Object.entries(farmer.extractionData)) {
        const s = saved as unknown as Record<string, unknown>;
        states[docId as DocTypeId] = {
          status: "complete",
          filename: (s["filename"] as string) ?? "",
          requestId: null,
          sections: Array.isArray(s["sections"]) ? s["sections"] as ExtractionState["sections"] : [],
          images: null,
          rawTables: Array.isArray(s["rawTables"]) ? s["rawTables"] as ExtractionState["rawTables"] : [],
          textBlocks: Array.isArray(s["textBlocks"]) ? s["textBlocks"] as string[] : [],
          aadharPhoto: (s["aadharPhoto"] as ExtractionState["aadharPhoto"]) ?? null,
          error: null,
        };
      }
    }
    return states;
  }, [farmer]);

  const completedCards = DOC_CARDS.filter(c => docStates[c.id].status === "complete");
  const [activeTab, setActiveTab] = useState<DocTypeId | "profile">(
    completedCards.length > 0 ? completedCards[0].id : "profile"
  );
  const [lang, setLang] = useState<LangCode>("en");

  const profile = useMemo<FarmerProfile>(() => {
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
    (Object.keys(extracted) as (keyof FarmerProfile)[]).forEach(k => {
      if (!base[k] && extracted[k]) base[k] = extracted[k]!;
    });
    return base;
  }, [farmer, docStates]);

  if (completedCards.length === 0 && !farmer.farmerProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <FileText className="h-10 w-10 text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground">No OCR documents have been processed for this farmer yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {completedCards.map(card => (
          <button
            key={card.id}
            onClick={() => setActiveTab(card.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              activeTab === card.id
                ? "bg-secondary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <DocTabIcon id={card.id} />
            {DOC_CARD_SHORT[card.id]?.["en"] ?? card.id}
          </button>
        ))}
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
            activeTab === "profile"
              ? "bg-secondary text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5 flex-shrink-0" />
          Farmer Profile
        </button>
      </div>

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
          onChange={() => {}}
          onApprove={() => {}}
          approved={false}
          onBack={() => {}}
          lang={lang}
          onLangChange={setLang}
          customPhoto={null}
          onCustomPhotoChange={() => {}}
          hideFooter={true}
          extraDocImages={Object.fromEntries(
            Object.entries(docImages).map(([k, v]) => [k, `data:${v.mimeType};base64,${v.base64}`])
          )}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── quick-jump nav ─────────────────────────── */
const SCROLL_SECTIONS = ["sec-profile", "sec-docs", "sec-apps", "sec-grievances"];
const NAV_ITEMS = [
  { id: "sec-profile",    label: "Profile",       navKey: null as string | null, icon: <UserCheck className="h-3.5 w-3.5" /> },
  { id: "sec-docs",       label: "Documents",     navKey: null,                  icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "sec-apps",       label: "Applications",  navKey: "applications",        icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "sec-grievances", label: "Grievances",    navKey: "grievances",          icon: <AlertCircle className="h-3.5 w-3.5" /> },
];

function QuickNav({ activeId, onJump, onNavigate }: { activeId: string; onJump: (id: string) => void; onNavigate: (key: string) => void }) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto px-4 py-2.5 bg-white border-b border-border" style={{ scrollbarWidth: "none" }}>
      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mr-1 flex-shrink-0">JUMP TO:</span>
      {NAV_ITEMS.map(s => (
        <button
          key={s.id}
          onClick={() => s.navKey ? onNavigate(s.navKey) : onJump(s.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0
            ${s.navKey
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              : activeId === s.id
                ? "bg-secondary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            }`}
        >
          {s.icon}{s.label}
          {s.navKey && <ArrowRight className="h-2.5 w-2.5 opacity-60" />}
        </button>
      ))}
    </div>
  );
}

/* ─────────────────────────── main card ─────────────────────────── */
export default function VerifiedFarmerCard({ farmer, onNavigate }: { farmer: FarmerRecord; onNavigate?: (section: string) => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [activeNav, setActiveNav] = useState("sec-profile");
  const [docImages, setDocImages] = useState<Record<string, { base64: string; mimeType: string }>>({});
  const [docsLoading, setDocsLoading] = useState(false);
  const initials = farmer.name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const regDate = new Date(farmer.addedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  useEffect(() => {
    if (!farmer.farmerId) return;
    setDocsLoading(true);
    fetch(`/api/farmers/${farmer.farmerId}/documents`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { documents: { docType: string; base64: string; mimeType: string }[] }) => {
        const map: Record<string, { base64: string; mimeType: string }> = {};
        for (const d of data.documents ?? []) map[d.docType] = { base64: d.base64, mimeType: d.mimeType };
        setDocImages(map);
      })
      .catch(() => {})
      .finally(() => setDocsLoading(false));
  }, [farmer.farmerId]);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible.length > 0) setActiveNav(visible[0].target.id);
    }, { threshold: 0.25, rootMargin: "-40px 0px -60% 0px" });
    SCROLL_SECTIONS.forEach(id => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  const handleJump = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); setActiveNav(id); }
  }, []);
  const nav = useCallback((key: string) => { onNavigate?.(key); }, [onNavigate]);

  const DOC_LABEL: Record<string, string> = { aadhar: "Aadhaar Card", bank_passbook: "Bank Passbook", form7: "7/12 Satbara (Form 7)", form12: "Form 12 — Crop Register", form8a: "Form 8A" };

  return (
    <div ref={cardRef} className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">

      {/* ═══════════════════ HEADER ═══════════════════ */}
      <div className="bg-white border-b border-border px-6 py-5">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-black text-xl text-white shadow-md">
              {initials}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow">
              <BadgeCheck className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{farmer.name}</h2>
              <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold">
                <BadgeCheck className="h-3 w-3" /> Verified
              </span>
              {farmer.source === "ocr" && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 font-semibold">AI-OCR</span>}
              {farmer.source === "mobile_ocr" && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200 font-semibold">Mobile OCR</span>}
              {farmer.source === "manual" && <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-semibold">Manual</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm text-slate-600">
              <span className="flex items-center gap-2"><Hash className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" /><span className="font-mono font-semibold text-slate-800">{farmer.farmerId}</span></span>
              {farmer.mobile && <span className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />{farmer.mobile}</span>}
              {farmer.email && <span className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />{farmer.email}</span>}
              <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />{farmer.village}, {farmer.district}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-start flex-shrink-0">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-center min-w-[120px]">
              <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider mb-0.5">क्षेत्रफळ</div>
              <div className="font-mono font-bold text-sm text-emerald-800 leading-snug">{formatLandHAR(farmer.land)}</div>
            </div>
            <div className="bg-lime-50 border border-lime-200 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
              <div className="text-[10px] text-lime-700 font-bold uppercase tracking-wider mb-0.5">पीक</div>
              <div className="font-semibold text-sm text-lime-900">{farmer.crop || "—"}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Reg. Date</div>
              <div className="font-semibold text-xs text-slate-700">{regDate}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ QUICK-JUMP NAV ═══════════════════ */}
      <QuickNav activeId={activeNav} onJump={handleJump} onNavigate={nav} />

      {/* ═══════════════════ BODY ═══════════════════ */}
      <div className="p-4 space-y-3 bg-slate-50/50">

        {/* 1 ── Profile (OCR extracted data) */}
        <Section id="sec-profile" title="Profile" icon={<UserCheck className="h-4 w-4" />}>
          {docsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading profile data...</span>
            </div>
          ) : (
            <ProfileSection farmer={farmer} docImages={docImages} />
          )}
        </Section>

        {/* 2 ── Original Documents */}
        <Section id="sec-docs" title="Original Documents" icon={<FileText className="h-4 w-4" />} badge={Object.keys(docImages).length}>
          <div className="space-y-4">
            {docsLoading && (
              <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading documents...</span>
              </div>
            )}

            {!docsLoading && Object.keys(docImages).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(docImages).map(([docType, img]) => (
                  <div key={docType} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                    <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-800">{DOC_LABEL[docType] ?? docType}</span>
                      <span className="ml-auto text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">Uploaded</span>
                    </div>
                    <div className="p-3 flex justify-center">
                      <img
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={DOC_LABEL[docType] ?? docType}
                        className="max-h-64 object-contain rounded-lg border border-slate-100 w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!docsLoading && farmer.docs && farmer.docs.length > 0 && (
              <div>
                <SubHeader icon={<FileText className="h-3.5 w-3.5" />} label="Document File Records" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {farmer.docs.map((doc, i) => (
                    <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${doc.status === "uploaded" ? "border-emerald-200 bg-emerald-50/40" : "border-slate-300 bg-slate-50"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${doc.status === "uploaded" ? "bg-emerald-100" : "bg-slate-200"}`}>
                        <FileText className={`h-5 w-5 ${doc.status === "uploaded" ? "text-emerald-600" : "text-slate-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-800 truncate mb-0.5">{doc.name}</div>
                        <div className="text-xs text-muted-foreground mb-1">{doc.fileName} · {doc.size}</div>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${doc.status === "uploaded" ? "bg-emerald-100 text-emerald-700" : doc.status === "failed" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-500"}`}>
                          {doc.status === "uploaded" ? "✓ Verified & Uploaded" : doc.status === "failed" ? "✗ Upload Failed" : "Not Submitted"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!docsLoading && Object.keys(docImages).length === 0 && (!farmer.docs || farmer.docs.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No document files on record for this farmer.</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── DIVIDER ── */}
        <div className="py-1 px-1">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Applications & Grievances — Opens in dedicated page</span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* 3 ── Applications (Scheme + Insurance + Subsidy) */}
        <SummaryCard id="sec-apps" title="Applications" icon={<Shield className="h-4 w-4" />} onClick={() => nav("applications")}>
          <p className="text-sm text-slate-600">View and manage all applications for this farmer — government schemes, crop &amp; life insurance (PMFBY, RWBCIS), and input subsidies (irrigation, fertilizer, equipment). Submit new applications and track status through approval.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 font-medium">
              <Shield className="h-3 w-3 inline mr-1" />Schemes
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">
              <LifeBuoy className="h-3 w-3 inline mr-1" />Insurance
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">
              <IndianRupee className="h-3 w-3 inline mr-1" />Subsidies
            </span>
          </div>
        </SummaryCard>

        {/* 4 ── Grievances */}
        <SummaryCard id="sec-grievances" title="Grievances" icon={<AlertCircle className="h-4 w-4" />} onClick={() => nav("grievances")}>
          <p className="text-sm text-slate-600">View, raise, and manage all grievances filed by or for this farmer — filter by status, priority, and category. Replies and resolution notes are tracked.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 border border-lime-200 font-medium">Open Grievances</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">Resolution Tracking</span>
          </div>
        </SummaryCard>

      </div>
    </div>
  );
}
