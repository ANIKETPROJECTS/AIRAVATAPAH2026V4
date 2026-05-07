import { useState, useRef, useEffect, useCallback } from "react";
import {
  User, MapPin, Landmark, Sprout, Shield, FileText, AlertCircle,
  CheckCircle2, Phone, Mail,
  Droplets, BadgeCheck,
  Hash, Fingerprint, CreditCard, Building2,
  Wheat, Layers, Zap,
  ArrowRight, IndianRupee, LifeBuoy,
} from "lucide-react";
import type { FarmerRecord, OcrDocSection } from "@/data/farmerApi";

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

/* ─────────────────────────── quick-jump nav ─────────────────────────── */
const SCROLL_SECTIONS = ["sec-personal", "sec-land", "sec-bank", "sec-docs"];
const NAV_ITEMS = [
  { id: "sec-personal",      label: "Personal",          navKey: null as string | null, icon: <User className="h-3.5 w-3.5" /> },
  { id: "sec-land",          label: "Land",              navKey: null,                  icon: <Sprout className="h-3.5 w-3.5" /> },
  { id: "sec-bank",          label: "Bank",              navKey: null,                  icon: <Landmark className="h-3.5 w-3.5" /> },
  { id: "sec-docs",          label: "Documents",         navKey: null,                  icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "sec-scheme-apps",   label: "Scheme Apps",       navKey: "scheme_apps",         icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "sec-ins-apps",      label: "Insurance Apps",    navKey: "insurance_apps",      icon: <LifeBuoy className="h-3.5 w-3.5" /> },
  { id: "sec-sub-apps",      label: "Subsidy Apps",      navKey: "subsidy_apps",        icon: <IndianRupee className="h-3.5 w-3.5" /> },
  { id: "sec-grievances",    label: "Grievances",        navKey: "grievances",          icon: <AlertCircle className="h-3.5 w-3.5" /> },
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
  const [activeNav, setActiveNav] = useState("sec-personal");
  const ha = landToHa(farmer.land);
  const initials = farmer.name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const regDate = new Date(farmer.addedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

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

  /* OCR doc keys */
  const ocrKeys = farmer.ocr ? (Object.keys(farmer.ocr) as Array<keyof typeof farmer.ocr>) : [];
  const DOC_LABEL: Record<string, string> = { aadhar: "Aadhaar Card", passbook: "Bank Passbook", form7: "7/12 Satbara (Form 7)", form12: "Form 12 — Crop Register", form8a: "Form 8A" };
  const SKIP_FIELDS = new Set(["rawText", "html", "photoBase64", "photoMimeType", "images", "transactions", "tables", "textBlocks", "cropEntries", "ownershipEntries", "holdings"]);

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

        {/* 1 ── Personal & Identity */}
        <Section id="sec-personal" title="Personal & Identity Details" icon={<User className="h-4 w-4" />}>
          <div className="space-y-5">
            <div>
              <SubHeader icon={<Fingerprint className="h-3.5 w-3.5" />} label="Identity Information" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Full Name" value={farmer.name} />
                <InfoBlock label="Father / Husband" value={farmer.fatherName} />
                <InfoBlock label="Date of Birth" value={farmer.dob} />
                <InfoBlock label="Age" value={calcAge(farmer.dob)} />
                <InfoBlock label="Gender" value={farmer.gender} />
                <InfoBlock label="Category" value={farmer.category || "General"} />
                <InfoBlock label="Religion" value={farmer.religion} />
                <InfoBlock label="Differently Abled" value={farmer.diffAbled ? "Yes" : "No"} />
                {farmer.diffAbled && <InfoBlock label="Disability Type" value={farmer.disabilityType} />}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <SubHeader icon={<CreditCard className="h-3.5 w-3.5" />} label="Identification Numbers" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Aadhaar" value={farmer.aadhaar} mono />
                <InfoBlock label="PAN Card" value="—" mono />
                <InfoBlock label="Voter ID" value="—" mono />
                <InfoBlock label="Ration Card" value="—" mono />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <SubHeader icon={<Phone className="h-3.5 w-3.5" />} label="Contact & Address" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Mobile" value={farmer.mobile} mono />
                <InfoBlock label="Alt. Mobile" value={farmer.altMobile} mono />
                <InfoBlock label="Email" value={farmer.email} />
                <InfoBlock label="Village" value={farmer.village} />
                <InfoBlock label="Taluka" value={farmer.taluka} />
                <InfoBlock label="District" value={farmer.district} />
                <InfoBlock label="State" value="Maharashtra" />
              </div>
            </div>
          </div>
        </Section>

        {/* 2 ── Land & Agriculture */}
        <Section id="sec-land" title="Land & Agriculture Details" icon={<Sprout className="h-4 w-4" />} badge={farmer.landParcels?.length ?? 1}>
          <div className="space-y-5">
            {farmer.landParcels && farmer.landParcels.length > 0 ? farmer.landParcels.map((lp, i) => (
              <div key={i} className={farmer.landParcels!.length > 1 ? "border border-slate-200 rounded-xl p-4 bg-white" : ""}>
                {farmer.landParcels!.length > 1 && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-secondary text-white text-xs font-bold flex items-center justify-center">{i + 1}</div>
                    <span className="text-sm font-semibold text-slate-700">Land Parcel {i + 1}</span>
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <SubHeader icon={<MapPin className="h-3.5 w-3.5" />} label="Location" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                      <InfoBlock label="Survey / Gat No." value={lp.surveyNo} mono />
                      <InfoBlock label="Khate No." value={farmer.khateNumber} mono />
                      <InfoBlock label="Village" value={lp.village} />
                      <InfoBlock label="Taluka" value={lp.taluka} />
                      <InfoBlock label="District" value={lp.district} />
                      <InfoBlock label="State" value={lp.state || "Maharashtra"} />
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <SubHeader icon={<Layers className="h-3.5 w-3.5" />} label="Area & Ownership" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                      <InfoBlock label="Total Area" value={formatLandHAR(lp.totalArea)} mono highlight />
                      <InfoBlock label="Irrigated Area" value={lp.irrigatedArea ? formatLandHAR(lp.irrigatedArea) : "—"} mono />
                      <InfoBlock label="Ownership Type" value={lp.ownershipType || "—"} />
                      <InfoBlock label="Soil Type" value={lp.soilType || "—"} />
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                    <SubHeader icon={<Wheat className="h-3.5 w-3.5" />} label="Crops & Farming" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4 mb-4">
                      <InfoBlock label="Primary Crop (Kharif)" value={lp.primaryCrop || farmer.crop} />
                      <InfoBlock label="Secondary Crop (Rabi)" value={lp.secondaryCrop || "—"} />
                      <InfoBlock label="Farming Type" value={lp.farmingType || "Conventional"} />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">Irrigation Sources</div>
                    <div className="flex flex-wrap gap-2">
                      {lp.irrigationSources && lp.irrigationSources.length > 0
                        ? lp.irrigationSources.map(src => (
                          <span key={src} className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1.5 font-medium">
                            <Droplets className="h-3 w-3" />{src}
                          </span>))
                        : <span className="text-sm text-muted-foreground/60">Not specified</span>}
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Survey / Gat No." value={farmer.surveyNumber} mono />
                <InfoBlock label="Khate No." value={farmer.khateNumber} mono />
                <InfoBlock label="Village" value={farmer.village} />
                <InfoBlock label="District" value={farmer.district} />
                <InfoBlock label="Total Area" value={formatLandHAR(farmer.land)} mono highlight />
                <InfoBlock label="Ownership Type" value="Own" />
                <InfoBlock label="Primary Crop" value={farmer.crop} />
                <InfoBlock label="Farming Type" value="Conventional" />
              </div>
            )}
          </div>
        </Section>

        {/* 3 ── Bank & Financial */}
        <Section id="sec-bank" title="Bank & Financial Details" icon={<Landmark className="h-4 w-4" />}>
          <div className="space-y-5">
            <div>
              <SubHeader icon={<Building2 className="h-3.5 w-3.5" />} label="Bank Account" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Bank Name" value={farmer.bankName} />
                <InfoBlock label="Branch" value={farmer.branchName} />
                <InfoBlock label="IFSC Code" value={farmer.ifsc} mono />
                <InfoBlock label="Account Number" value={farmer.accountNo || farmer.bankAccount} mono />
                <InfoBlock label="Account Type" value={farmer.accountType || "Savings"} />
                <InfoBlock label="Account Holder" value={farmer.name} />
              </div>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <SubHeader icon={<Zap className="h-3.5 w-3.5" />} label="DBT & Linkage Status" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-4">
                <InfoBlock label="Aadhaar–Bank Linked" value={farmer.aadhaarLinked || "Yes"} />
                <InfoBlock label="NPCI / DBT Status" value={farmer.npciStatus || "Active"} />
                <InfoBlock label="eKYC Status" value="Completed" />
              </div>
            </div>
          </div>
        </Section>

        {/* 4 ── Original Documents */}
        <Section id="sec-docs" title="Original Documents" icon={<FileText className="h-4 w-4" />} badge={farmer.docs?.length ?? 0}>
          <div className="space-y-5">

            {/* Document image previews from OCR */}
            {ocrKeys.length > 0 && (
              <div>
                <SubHeader icon={<FileText className="h-3.5 w-3.5" />} label="Uploaded Document Previews" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ocrKeys.map(key => {
                    const section = farmer.ocr?.[key] as OcrDocSection | undefined;
                    if (!section) return null;
                    const photo = (section["photoBase64"] ?? section["aadharPhoto"]) as string | undefined;
                    const mimeType = (section["photoMimeType"] ?? "image/jpeg") as string;
                    return (
                      <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-800">{DOC_LABEL[key] ?? key}</span>
                          <span className="ml-auto text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">AI-OCR</span>
                        </div>
                        {photo ? (
                          <div className="p-3 flex justify-center">
                            <img src={`data:${mimeType};base64,${photo}`} alt={DOC_LABEL[key] ?? key} className="max-h-48 object-contain rounded-lg border border-slate-100" />
                          </div>
                        ) : (
                          <div className="p-4 flex items-center gap-3 text-muted-foreground">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><FileText className="h-5 w-5 text-slate-400" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-700">{DOC_LABEL[key] ?? key}</div>
                              <div className="text-xs text-muted-foreground">Data extracted — no image preview</div>
                            </div>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Document metadata tiles */}
            {farmer.docs && farmer.docs.length > 0 ? (
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
            ) : ocrKeys.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No document files on record for this farmer.</p>
              </div>
            )}

            {/* OCR Extracted Fields */}
            {ocrKeys.length > 0 && (
              <div>
                <SubHeader icon={<FileText className="h-3.5 w-3.5" />} label="Extracted Document Data" />
                <div className="space-y-4">
                  {ocrKeys.map(key => {
                    const data = farmer.ocr?.[key] as OcrDocSection | undefined;
                    if (!data) return null;
                    const fields = Object.entries(data).filter(([k, v]) =>
                      !SKIP_FIELDS.has(k) && v !== null && v !== undefined && v !== "" && !Array.isArray(v) && typeof v !== "object"
                    );
                    const arrayFields = Object.entries(data).filter(([k, v]) =>
                      !SKIP_FIELDS.has(k) && Array.isArray(v) && (v as unknown[]).length > 0
                    );
                    if (fields.length === 0 && arrayFields.length === 0) return null;
                    return (
                      <div key={key} className="border border-border/60 rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-teal-50 text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />{DOC_LABEL[key] ?? key}
                        </div>
                        <div className="p-3">
                          {fields.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                              {fields.map(([k, v]) => (
                                <div key={k} className="flex flex-col gap-0.5">
                                  <span className="text-[10px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  <span className="text-xs font-medium">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {arrayFields.map(([k, v]) => (
                            <div key={k} className="mt-2">
                              <div className="text-[10px] text-muted-foreground capitalize mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</div>
                              <div className="flex flex-wrap gap-1">
                                {(v as string[]).map((item, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 bg-muted/40 rounded">{String(item)}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
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

        {/* 5 ── Scheme Applications */}
        <SummaryCard id="sec-scheme-apps" title="Scheme Applications" icon={<Shield className="h-4 w-4" />} onClick={() => nav("scheme_apps")}>
          <p className="text-sm text-slate-600">View all government scheme applications for this farmer — submit new applications, track status (Pending, Under Review, Approved, Rejected), and update status.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 font-medium">Central Govt. Schemes</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium">State — Maharashtra</span>
          </div>
        </SummaryCard>

        {/* 6 ── Insurance Applications */}
        <SummaryCard id="sec-ins-apps" title="Insurance Applications" icon={<LifeBuoy className="h-4 w-4" />} onClick={() => nav("insurance_apps")}>
          <p className="text-sm text-slate-600">Manage crop and life insurance applications — PMFBY, RWBCIS, and other insurance schemes. Track claim status through to settlement.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">Crop Insurance</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 border border-teal-200 font-medium">Claims & Settlement</span>
          </div>
        </SummaryCard>

        {/* 7 ── Subsidy Applications */}
        <SummaryCard id="sec-sub-apps" title="Subsidy Applications" icon={<IndianRupee className="h-4 w-4" />} onClick={() => nav("subsidy_apps")}>
          <p className="text-sm text-slate-600">Review and submit subsidy applications — drip irrigation, fertilizer, seed, and equipment subsidies from state and central government programmes.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium">Input Subsidies</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-lime-100 text-lime-700 border border-lime-200 font-medium">Equipment & Irrigation</span>
          </div>
        </SummaryCard>

        {/* 8 ── Grievances */}
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
