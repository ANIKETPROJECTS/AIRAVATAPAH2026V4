import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, LayoutGrid, LayoutList, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, ArrowLeft, Users, CheckCircle2,
  XCircle, FileText, Shield, Info, MapPin, Sprout,
  Landmark, Phone, CreditCard, AlertTriangle, Clock,
  BadgeCheck, TrendingUp, BarChart2, RefreshCw,
} from "lucide-react";
import { apiFetchFarmers, type FarmerRecord } from "@/data/farmerApi";

/* ═══════════ Types ════════════ */
interface EligibilityParam { parameter: string; rule: string; validation: string; }
interface Scheme {
  id: string; name: string; type: "CENTRAL" | "STATE"; state: string | null;
  category: string; description: string;
  eligibility: { summary: string; parameters: EligibilityParam[]; familyCriteria: string[]; exclusions?: string[]; };
  documents: string[]; validationRules: string[]; approvalRules: { approve: string[]; reject: string[] };
  benefits: string; status: "Active" | "Closed";
}

const PAGE_SIZE = 10;

/* ═══════════ CRUD API Helpers ════════════ */
async function apiCreateScheme(data: Partial<Scheme>): Promise<Scheme> {
  const res = await fetch("/api/schemes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create");
  return json as Scheme;
}
async function apiUpdateScheme(id: string, data: Partial<Scheme>): Promise<Scheme> {
  const res = await fetch(`/api/schemes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to update");
  return json as Scheme;
}
async function apiDeleteScheme(id: string): Promise<void> {
  const res = await fetch(`/api/schemes/${id}`, { method: "DELETE" });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error((j as {error?:string}).error || "Failed to delete"); }
}

/* ═══════════ Scheme Form Modal ════════════ */
function SchemeFormModal({ scheme, onClose, onSaved }: { scheme?: Scheme | null; onClose: () => void; onSaved: (s: Scheme) => void }) {
  const isEdit = !!scheme;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(scheme?.name ?? "");
  const [type, setType] = useState<"CENTRAL" | "STATE">(scheme?.type ?? "CENTRAL");
  const [category, setCategory] = useState(scheme?.category ?? "");
  const [description, setDescription] = useState(scheme?.description ?? "");
  const [benefits, setBenefits] = useState(scheme?.benefits ?? "");
  const [status, setStatus] = useState<"Active" | "Closed">(scheme?.status ?? "Active");
  const [eligSummary, setEligSummary] = useState(typeof scheme?.eligibility === "object" ? (scheme?.eligibility?.summary ?? "") : (scheme?.eligibility ?? ""));
  const [eligCriteria, setEligCriteria] = useState(typeof scheme?.eligibility === "object" ? (scheme?.eligibility?.familyCriteria ?? []).join("\n") : "");
  const [documents, setDocuments] = useState((scheme?.documents ?? []).join("\n"));
  const [approveRules, setApproveRules] = useState((scheme?.approvalRules?.approve ?? []).join("\n"));
  const [rejectRules, setRejectRules] = useState((scheme?.approvalRules?.reject ?? []).join("\n"));

  const splitLines = (s: string) => s.split("\n").map(l => l.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!name.trim()) { setErr("Scheme name is required"); return; }
    setSaving(true); setErr(null);
    try {
      const payload = {
        name: name.trim(), type, category, description, benefits, status,
        eligibility: { summary: eligSummary, familyCriteria: splitLines(eligCriteria), parameters: typeof scheme?.eligibility === "object" ? (scheme?.eligibility?.parameters ?? []) : [] },
        documents: splitLines(documents),
        approvalRules: { approve: splitLines(approveRules), reject: splitLines(rejectRules) },
      };
      const saved = isEdit ? await apiUpdateScheme(scheme!.id, payload) : await apiCreateScheme(payload);
      onSaved(saved);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-heading text-base font-semibold">{isEdit ? `Edit: ${scheme!.name}` : "Add New Scheme"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>Scheme Name *</label>
              <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PM-KISAN"/>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={selectCls} value={type} onChange={e => setType(e.target.value as "CENTRAL"|"STATE")}>
                <option value="CENTRAL">🏛 Central Government</option>
                <option value="STATE">🏠 Maharashtra State</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={selectCls} value={status} onChange={e => setStatus(e.target.value as "Active"|"Closed")}>
                <option value="Active">✅ Active</option>
                <option value="Closed">⛔ Closed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input className={inputCls} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Income Support, Loan / Credit"/>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the scheme"/>
          </div>
          <div>
            <label className={labelCls}>Benefits</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={benefits} onChange={e => setBenefits(e.target.value)} placeholder="e.g. ₹6,000/year in 3 instalments..."/>
          </div>
          <div>
            <label className={labelCls}>Eligibility Summary</label>
            <textarea className={`${inputCls} resize-none`} rows={2} value={eligSummary} onChange={e => setEligSummary(e.target.value)} placeholder="Who is eligible for this scheme?"/>
          </div>
          <div>
            <label className={labelCls}>Eligibility Criteria <span className="normal-case font-normal">(one per line)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={eligCriteria} onChange={e => setEligCriteria(e.target.value)} placeholder="Must be a registered farmer&#10;Land holding > 0&#10;Valid Aadhaar"/>
          </div>
          <div>
            <label className={labelCls}>Required Documents <span className="normal-case font-normal">(one per line)</span></label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={documents} onChange={e => setDocuments(e.target.value)} placeholder="Aadhaar Card&#10;Bank Passbook&#10;Land Records (7/12)"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Approve When <span className="normal-case font-normal">(one per line)</span></label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={approveRules} onChange={e => setApproveRules(e.target.value)} placeholder="Valid land ownership&#10;Bank account linked"/>
            </div>
            <div>
              <label className={labelCls}>Reject When <span className="normal-case font-normal">(one per line)</span></label>
              <textarea className={`${inputCls} resize-none`} rows={3} value={rejectRules} onChange={e => setRejectRules(e.target.value)} placeholder="Duplicate application&#10;Ineligible crop"/>
            </div>
          </div>
          {err && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 font-semibold">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Scheme"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Delete Confirm Modal ════════════ */
function DeleteConfirm({ name, onCancel, onConfirm, loading }: { name: string; onCancel: () => void; onConfirm: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-border space-y-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🗑️</div>
          <h3 className="font-heading text-base font-semibold">Delete Scheme?</h3>
          <p className="text-sm text-muted-foreground mt-1">This will permanently remove <span className="font-semibold text-foreground">"{name}"</span> from the database.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 py-2 text-sm rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-60 font-semibold">
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Eligibility Engine ════════════ */
function getLandHectares(land: number | string | undefined): number {
  if (!land) return 0;
  const s = String(land);
  const parts = s.split(".");
  // format: H.A.SM => hectares + acres/100
  if (parts.length >= 2) return parseFloat(parts[0]) + parseFloat(parts[1] || "0") / 100;
  return parseFloat(s) || 0;
}

function getFarmerAge(dob?: string): number {
  if (!dob) return 35; // assume working age if unknown
  const d = new Date(dob);
  if (isNaN(d.getTime())) return 35;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

type EligibilityResult = { eligible: boolean; score: number; reasons: string[]; issues: string[] };

function checkEligibility(farmer: FarmerRecord, scheme: Scheme): EligibilityResult {
  const reasons: string[] = [];
  const issues: string[] = [];
  let score = 0;

  const landHa = getLandHectares(farmer.land);
  const age = getFarmerAge(farmer.dob);
  const cat = (farmer.category || "").toLowerCase();
  const name = scheme.name.toLowerCase();
  const schemeCat = scheme.category.toLowerCase();

  // Active/Verified status preferred
  if (farmer.status === "Verified" || farmer.status === "Active") {
    score += 20; reasons.push("Active registered farmer");
  } else if (farmer.status === "Pending") {
    score += 5; issues.push("Registration pending verification");
  } else {
    issues.push("Account inactive or cancelled");
  }

  // Bank account check
  if (farmer.bankAccount && farmer.bankAccount !== "—") {
    score += 15; reasons.push("Bank account linked");
  } else {
    issues.push("No bank account linked");
  }

  // Scheme-specific rules
  if (name.includes("pm-kisan") || name.includes("samman nidhi")) {
    if (landHa > 0) { score += 30; reasons.push(`Land holding: ${landHa.toFixed(2)} ha`); }
    else { issues.push("No land holding recorded"); }
    if (farmer.aadhaar) { score += 15; reasons.push("Aadhaar available"); }
    if (farmer.bankAccount) { score += 10; reasons.push("DBT-ready bank account"); }
  } else if (name.includes("pmfby") || name.includes("fasal bima")) {
    if (landHa > 0) { score += 30; reasons.push(`Cultivable land: ${landHa.toFixed(2)} ha`); }
    if (farmer.crop) { score += 20; reasons.push(`Notified crop: ${farmer.crop}`); }
    if (farmer.status === "Verified") { score += 10; reasons.push("Land verified"); }
    else issues.push("Land verification pending");
  } else if (name.includes("kcc") || name.includes("kisan credit")) {
    if (age >= 18 && age <= 75) { score += 25; reasons.push(`Age ${age} — within 18–75 range`); }
    else { issues.push(`Age ${age} outside 18–75 range`); }
    if (landHa > 0) { score += 30; reasons.push("Agricultural land owner"); }
  } else if (name.includes("kusum") || name.includes("solar")) {
    if (landHa >= 0.5) { score += 35; reasons.push(`${landHa.toFixed(2)} ha — suitable for solar`); }
    else { issues.push("Insufficient land for solar pump"); }
  } else if (name.includes("pkvy") || name.includes("organic")) {
    if (landHa >= 0.5) { score += 30; reasons.push("Land available for organic cluster"); }
    const organicCrops = ["wheat", "rice", "pulses", "dal", "soybean", "cotton"];
    if (organicCrops.some(c => (farmer.crop || "").toLowerCase().includes(c))) {
      score += 20; reasons.push(`Crop '${farmer.crop}' suitable for organic conversion`);
    }
  } else if (name.includes("maan-dhan") || name.includes("pension")) {
    if (age >= 18 && age <= 40) { score += 35; reasons.push(`Age ${age} — within 18–40 range`); }
    else { score -= 10; issues.push(`Age ${age} outside 18–40 range for pension scheme`); }
    if (cat.includes("marginal") || cat.includes("small") || landHa < 2) {
      score += 25; reasons.push("Small/marginal farmer");
    }
  } else if (schemeCat.includes("infrastructure") || name.includes("aif")) {
    if (landHa >= 1) { score += 30; reasons.push("Sufficient land for infrastructure"); }
    if (farmer.bankAccount) { score += 15; reasons.push("Bank account for loan processing"); }
  } else if (schemeCat.includes("irrigation") || name.includes("sinchai")) {
    if (landHa >= 0.5) { score += 30; reasons.push(`${landHa.toFixed(2)} ha irrigable land`); }
    const irrigatedCrops = ["sugarcane", "rice", "banana", "cotton", "onion"];
    if (irrigatedCrops.some(c => (farmer.crop || "").toLowerCase().includes(c))) {
      score += 15; reasons.push(`Water-intensive crop '${farmer.crop}' benefits`);
    }
  } else if (schemeCat.includes("loan") || schemeCat.includes("credit")) {
    if (landHa > 0) { score += 25; reasons.push("Land as collateral"); }
    if (farmer.bankAccount) { score += 20; reasons.push("Bank account available"); }
  } else {
    // Generic eligibility
    if (landHa > 0) { score += 25; reasons.push(`Land: ${landHa.toFixed(2)} ha`); }
    if (farmer.crop) { score += 15; reasons.push(`Crop: ${farmer.crop}`); }
  }

  // Category bonus
  if (cat.includes("sc") || cat.includes("st") || cat.includes("obc") || cat.includes("nt") || cat.includes("vjnt")) {
    score += 10; reasons.push(`Reserved category: ${farmer.category}`);
  }

  // Land size categories
  if (landHa > 0 && landHa < 1) reasons.push("Marginal farmer (< 1 ha)");
  else if (landHa >= 1 && landHa < 2) reasons.push("Small farmer (1–2 ha)");
  else if (landHa >= 2) reasons.push("Medium/large farmer");

  return { eligible: score >= 45, score: Math.min(100, Math.max(0, score)), reasons, issues };
}

/* ═══════════ Shared Badges ════════════ */
function TypeBadge({ type, compact }: { type: "CENTRAL" | "STATE"; compact?: boolean }) {
  if (compact) return (
    <div className="flex flex-col items-center gap-0.5 w-fit">
      <span className={`text-base leading-none ${type === "CENTRAL" ? "text-primary" : "text-secondary"}`}>
        {type === "CENTRAL" ? "🏛" : "🏠"}
      </span>
      <span className={`text-[11px] font-semibold leading-none ${type === "CENTRAL" ? "text-primary" : "text-secondary"}`}>
        {type === "CENTRAL" ? "Central" : "Maharashtra"}
      </span>
    </div>
  );
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${type === "CENTRAL" ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary"}`}>
      {type === "CENTRAL" ? "🏛 Central" : "🏠 Maharashtra"}
    </span>
  );
}

function SchemeSBadge({ status }: { status: "Active" | "Closed" }) {
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
      {status === "Active" ? "✅ Active" : "⛔ Closed"}
    </span>
  );
}

function FarmerStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Verified: "bg-emerald-100 text-emerald-700", Active: "bg-green-100 text-green-700",
    Pending: "bg-amber-100 text-amber-700", Inactive: "bg-slate-100 text-slate-500",
    Cancelled: "bg-red-100 text-red-600",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${map[status] ?? "bg-slate-100 text-slate-500"}`}>{status}</span>;
}

/* ═══════════ Status Toggle ════════════ */
function StatusToggle({ schemeId, status, onToggle }: { schemeId: string; status: "Active" | "Closed"; onToggle: (id: string, next: "Active" | "Closed") => void }) {
  const [loading, setLoading] = useState(false);
  const isActive = status === "Active";
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next: "Active" | "Closed" = isActive ? "Closed" : "Active";
    setLoading(true);
    try {
      const res = await fetch(`/api/schemes/${schemeId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (res.ok) onToggle(schemeId, next);
    } finally { setLoading(false); }
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={handleClick} disabled={loading} title={`Click to mark as ${isActive ? "Inactive" : "Active"}`}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${isActive ? "bg-success" : "bg-muted-foreground/40"}`}>
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${isActive ? "translate-x-4" : "translate-x-0.5"}`}/>
      </button>
      <span className={`text-[10px] font-semibold leading-none ${isActive ? "text-success" : "text-muted-foreground"}`}>{isActive ? "Active" : "Closed"}</span>
    </div>
  );
}

/* ═══════════ Farmer Row in Scheme Detail ════════════ */
function FarmerSchemeRow({ farmer, result, index }: { farmer: FarmerRecord; result: EligibilityResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const landHa = getLandHectares(farmer.land);
  return (
    <>
      <tr className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${index % 2 === 0 ? "" : "bg-slate-50/30"}`}>
        <td className="px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-800">{farmer.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{farmer.farmerId}</div>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-slate-600">
            <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400"/>
            <span>{farmer.village}, {farmer.district}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-slate-600 flex items-center gap-1">
            <Sprout className="h-3 w-3 text-emerald-500 flex-shrink-0"/>
            {farmer.crop || "—"}
          </div>
          <div className="text-[10px] text-slate-400">{landHa > 0 ? `${landHa.toFixed(2)} ha` : "—"}</div>
        </td>
        <td className="px-4 py-3"><FarmerStatusBadge status={farmer.status}/></td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${result.score >= 70 ? "bg-emerald-500" : result.score >= 45 ? "bg-teal-400" : "bg-slate-400"}`}
                style={{ width: `${result.score}%` }}/>
            </div>
            <span className="text-xs font-bold text-slate-700 w-8 text-right">{result.score}%</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <button onClick={() => setExpanded(v => !v)} className="p-1 rounded hover:bg-slate-100 transition-colors">
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-slate-400"/> : <ChevronDown className="h-3.5 w-3.5 text-slate-400"/>}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-emerald-50/40 border-b border-slate-100">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              {result.reasons.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-1.5">Eligibility Factors</div>
                  {result.reasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-800 mb-1">
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500"/>{r}
                    </div>
                  ))}
                </div>
              )}
              {result.issues.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">Gaps / Concerns</div>
                  {result.issues.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-amber-800 mb-1">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-500"/>{r}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ═══════════ Scheme Detail Page ════════════ */
function SchemeDetailPage({ scheme, onBack, onStatusChange }: {
  scheme: Scheme;
  onBack: () => void;
  onStatusChange: (id: string, status: "Active" | "Closed") => void;
}) {
  const [tab, setTab] = useState<"overview" | "applied" | "eligible" | "rules">("overview");
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState("");
  const [farmerPage, setFarmerPage] = useState(0);
  const FPAGE = 8;

  useEffect(() => {
    setLoadingFarmers(true);
    apiFetchFarmers().then(data => { setFarmers(data); setLoadingFarmers(false); }).catch(() => setLoadingFarmers(false));
  }, []);

  // Compute eligibility for all farmers
  const farmerResults = useMemo(() =>
    farmers.map(f => ({ farmer: f, result: checkEligibility(f, scheme) })),
    [farmers, scheme]
  );

  // "Applied" = Verified farmers with score >= 60 (simulate those who would have applied)
  const appliedFarmers = useMemo(() =>
    farmerResults.filter(({ farmer, result }) =>
      (farmer.status === "Verified" || farmer.status === "Active") && result.score >= 60
    ).sort((a, b) => b.result.score - a.result.score),
    [farmerResults]
  );

  // "Eligible" = all farmers with score >= 45 (not just applied)
  const eligibleFarmers = useMemo(() =>
    farmerResults.filter(({ result }) => result.eligible)
      .sort((a, b) => b.result.score - a.result.score),
    [farmerResults]
  );

  const ineligibleFarmers = useMemo(() =>
    farmerResults.filter(({ result }) => !result.eligible),
    [farmerResults]
  );

  // Search filter for farmer tabs
  const filterFarmers = (list: typeof appliedFarmers) => {
    if (!farmerSearch.trim()) return list;
    const q = farmerSearch.toLowerCase();
    return list.filter(({ farmer }) =>
      farmer.name.toLowerCase().includes(q) ||
      farmer.district.toLowerCase().includes(q) ||
      farmer.village.toLowerCase().includes(q) ||
      (farmer.crop || "").toLowerCase().includes(q)
    );
  };

  const getTabFarmers = () => {
    if (tab === "applied") return filterFarmers(appliedFarmers);
    if (tab === "eligible") return filterFarmers(eligibleFarmers);
    return [];
  };

  const currentFarmers = getTabFarmers();
  const totalFPages = Math.max(1, Math.ceil(currentFarmers.length / FPAGE));
  const safeFPage = Math.min(farmerPage, totalFPages - 1);
  const pageFarmers = currentFarmers.slice(safeFPage * FPAGE, (safeFPage + 1) * FPAGE);

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "applied", label: `Applied (${appliedFarmers.length})`, icon: BadgeCheck },
    { id: "eligible", label: `Can Apply (${eligibleFarmers.length})`, icon: Users },
    { id: "rules", label: "Documents & Rules", icon: FileText },
  ] as const;

  const FarmerTable = ({ list }: { list: typeof appliedFarmers }) => {
    const paged = list.slice(safeFPage * FPAGE, (safeFPage + 1) * FPAGE);
    const total = Math.max(1, Math.ceil(list.length / FPAGE));
    const safe = Math.min(farmerPage, total - 1);
    const p = list.slice(safe * FPAGE, (safe + 1) * FPAGE);
    if (loadingFarmers) return (
      <div className="space-y-3 py-4">
        {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-lg"/>)}
      </div>
    );
    if (list.length === 0) return (
      <div className="flex flex-col items-center py-12 gap-3">
        <Users className="h-10 w-10 text-slate-200"/>
        <div className="text-sm text-slate-400 font-medium">No farmers found</div>
        {farmerSearch && <div className="text-xs text-slate-400">Try clearing your search</div>}
      </div>
    );
    return (
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Farmer</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Location</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Crop / Land</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Match Score</th>
              <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide"></th>
            </tr>
          </thead>
          <tbody>
            {p.map(({ farmer, result }, i) => (
              <FarmerSchemeRow key={farmer.farmerId} farmer={farmer} result={result} index={i}/>
            ))}
          </tbody>
        </table>
        {total > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-400">Page {safe + 1} of {total} · {list.length} farmers</span>
            <div className="flex gap-1">
              <button disabled={safe === 0} onClick={() => setFarmerPage(p2 => p2 - 1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronLeft className="h-3.5 w-3.5"/></button>
              <button disabled={safe >= total - 1} onClick={() => setFarmerPage(p2 => p2 + 1)} className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronRight className="h-3.5 w-3.5"/></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"/>
          All Schemes
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500 truncate max-w-xs">{scheme.name}</span>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-5">
        <div className="px-6 py-5" style={{ background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <TypeBadge type={scheme.type}/>
                <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${scheme.status === "Active" ? "border-emerald-400 text-emerald-800 bg-emerald-100/60" : "border-slate-300 text-slate-500 bg-white/50"}`}>
                  {scheme.status === "Active" ? "● Active" : "● Closed"}
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-full border border-emerald-300 text-emerald-800 bg-white/50">{scheme.category}</span>
              </div>
              <h2 className="font-bold text-xl text-emerald-950 leading-snug mb-2">{scheme.name}</h2>
              <p className="text-sm text-emerald-800/70 leading-relaxed max-w-2xl">{scheme.description}</p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-3">
              <StatusToggle schemeId={scheme.id} status={scheme.status} onToggle={onStatusChange}/>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-4 gap-3 mt-5">
            {[
              { label: "Registered Farmers", val: farmers.length, icon: Users, color: "bg-white/70 text-emerald-900" },
              { label: "Applied / Enrolled", val: appliedFarmers.length, icon: BadgeCheck, color: "bg-emerald-600/20 text-emerald-900" },
              { label: "Can Apply", val: eligibleFarmers.length, icon: TrendingUp, color: "bg-teal-600/20 text-teal-900" },
              { label: "Not Eligible", val: ineligibleFarmers.length, icon: XCircle, color: "bg-white/40 text-slate-700" },
            ].map(stat => (
              <div key={stat.label} className={`${stat.color} backdrop-blur rounded-xl px-3 py-2.5 border border-white/60`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="h-3.5 w-3.5 opacity-60"/>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold">{loadingFarmers ? "—" : stat.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits strip */}
        <div className="bg-white border-t border-emerald-100 px-6 py-3 flex items-start gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5"/>
          <div>
            <span className="text-xs font-bold text-emerald-800 mr-2">Benefits:</span>
            <span className="text-xs text-emerald-700">{scheme.benefits}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100/60 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setFarmerPage(0); setFarmerSearch(""); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${tab === t.id ? "bg-white shadow-sm text-emerald-800" : "text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="h-3.5 w-3.5 flex-shrink-0"/><span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="grid grid-cols-2 gap-4">
          {/* Eligibility */}
          <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-emerald-600"/>
              <h3 className="font-bold text-slate-800">Eligibility Criteria</h3>
            </div>
            <p className="text-sm text-slate-500 italic mb-4">{scheme.eligibility.summary}</p>
            {scheme.eligibility.parameters.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 text-left">
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[25%]">Parameter</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide w-[45%]">Rule</th>
                      <th className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Validation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheme.eligibility.parameters.map((p, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 text-sm font-medium text-slate-700">{p.parameter}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-500">{p.rule}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-500">{p.validation}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Family criteria */}
          {scheme.eligibility.familyCriteria.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-600"/> Family Criteria
              </h3>
              <ul className="space-y-2">
                {scheme.eligibility.familyCriteria.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5"/>{c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Exclusions */}
          {scheme.eligibility.exclusions && scheme.eligibility.exclusions.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <h3 className="font-bold text-red-700 text-sm mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4"/> Exclusions
              </h3>
              <ul className="space-y-2">
                {scheme.eligibility.exclusions.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                    <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"/>{e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {(tab === "applied" || tab === "eligible") && (
        <div className="space-y-3">
          {/* Summary bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {tab === "applied" ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <BadgeCheck className="h-4 w-4 text-emerald-600"/>
                  <span className="text-sm font-semibold text-emerald-800">{appliedFarmers.length} enrolled / applied farmers</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg">
                  <Users className="h-4 w-4 text-teal-600"/>
                  <span className="text-sm font-semibold text-teal-800">{eligibleFarmers.length} farmers eligible to apply</span>
                </div>
              )}
              {tab === "eligible" && ineligibleFarmers.length > 0 && (
                <span className="text-xs text-slate-400">{ineligibleFarmers.length} farmers don't meet criteria</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              <input value={farmerSearch} onChange={e => { setFarmerSearch(e.target.value); setFarmerPage(0); }}
                placeholder="Search farmers…"
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-56"/>
            </div>
          </div>

          {tab === "applied" && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-amber-700">
              <Info className="h-3.5 w-3.5 flex-shrink-0"/>
              Showing verified/active farmers with a match score of 60%+ for this scheme. Actual application records are maintained in the Scheme Applications module.
            </div>
          )}

          <FarmerTable list={tab === "applied" ? filterFarmers(appliedFarmers) : filterFarmers(eligibleFarmers)}/>
        </div>
      )}

      {tab === "rules" && (
        <div className="grid grid-cols-3 gap-4">
          {/* Documents */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500"/> Required Documents
            </h3>
            <ul className="space-y-2.5">
              {scheme.documents.map((d, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="text-base flex-shrink-0">📄</span>{d}
                </li>
              ))}
            </ul>
          </div>

          {/* Approve when */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h3 className="font-bold text-emerald-800 text-sm mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4"/> Approve When
            </h3>
            <ul className="space-y-2.5">
              {scheme.approvalRules.approve.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-emerald-500"/>{r}
                </li>
              ))}
            </ul>
          </div>

          {/* Reject when */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-5">
            <h3 className="font-bold text-red-700 text-sm mb-4 flex items-center gap-2">
              <XCircle className="h-4 w-4"/> Reject When
            </h3>
            <ul className="space-y-2.5">
              {scheme.approvalRules.reject.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"/>{r}
                </li>
              ))}
            </ul>
          </div>

          {/* Validation rules */}
          {scheme.validationRules.length > 0 && (
            <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500"/> Validation Rules
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {scheme.validationRules.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600 px-3 py-2 bg-amber-50/60 border border-amber-100 rounded-lg">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500"/>{r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════ Table Row (list view) ════════════ */
function TableRow({ scheme, onView, onStatusChange, onEdit, onDelete }: { scheme: Scheme; onView: () => void; onStatusChange: (id: string, s: "Active" | "Closed") => void; onEdit: (s: Scheme) => void; onDelete: (s: Scheme) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-t border-border/50 hover:bg-success/5 transition-colors cursor-pointer">
        <td className="px-4 py-3 w-[28%]">
          <button onClick={onView} className="font-medium text-sm text-left hover:text-primary transition-colors leading-snug">{scheme.name}</button>
        </td>
        <td className="px-4 py-3 w-[9%] align-middle"><TypeBadge type={scheme.type} compact/></td>
        <td className="px-4 py-3 w-[13%] align-middle"><span className="text-xs text-muted-foreground font-medium">{scheme.category}</span></td>
        <td className="px-4 py-3 w-[24%]"><p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{typeof scheme.eligibility === "object" ? scheme.eligibility.summary : scheme.eligibility}</p></td>
        <td className="px-4 py-3 w-[9%] align-middle"><StatusToggle schemeId={scheme.id} status={scheme.status} onToggle={onStatusChange}/></td>
        <td className="px-4 py-3 w-[17%] align-middle">
          <div className="flex gap-1 items-center flex-wrap">
            <button onClick={onView} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-80 transition-opacity whitespace-nowrap">Details</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(scheme); }} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors whitespace-nowrap">Edit</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(scheme); }} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors whitespace-nowrap">Delete</button>
            <button onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }} className="p-1 rounded bg-muted hover:bg-muted/80 transition-colors flex-shrink-0" title="Toggle">
              {expanded ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border/30 bg-muted/10">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Documents</p>
                <ul className="space-y-1">{scheme.documents.map((d, i) => <li key={i} className="flex gap-1.5"><span className="text-secondary">•</span>{d}</li>)}</ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Approve When</p>
                <ul className="space-y-1">{scheme.approvalRules.approve.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-success">✓</span>{r}</li>)}</ul>
              </div>
              <div>
                <p className="font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Reject When</p>
                <ul className="space-y-1">{scheme.approvalRules.reject.map((r, i) => <li key={i} className="flex gap-1.5"><span className="text-destructive">✗</span>{r}</li>)}</ul>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ═══════════ Grid Card ════════════ */
function GridCard({ scheme, onView, onEdit, onDelete }: { scheme: Scheme; onView: () => void; onEdit: (s: Scheme) => void; onDelete: (s: Scheme) => void }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-sm leading-snug flex-1">{scheme.name}</h3>
        <SchemeSBadge status={scheme.status}/>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <TypeBadge type={scheme.type}/>
        <span className="text-xs text-muted-foreground font-medium">{scheme.category}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 flex-1">{scheme.description}</p>
      <div className="bg-secondary/10 rounded-lg p-2.5">
        <p className="text-xs font-medium leading-relaxed">{scheme.benefits}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button onClick={onView} className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold flex items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5"/> Details
        </button>
        <button onClick={() => onEdit(scheme)} className="text-sm px-3 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium">Edit</button>
        <button onClick={() => onDelete(scheme)} className="text-sm px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors font-medium">Del</button>
      </div>
    </div>
  );
}

/* ═══════════ Main AllSchemes ════════════ */
export default function AllSchemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "CENTRAL" | "STATE">("ALL");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Scheme | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editScheme, setEditScheme] = useState<Scheme | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Scheme | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleStatusChange = useCallback((id: string, status: "Active" | "Closed") => {
    setSchemes(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    setSelected(prev => prev?.id === id ? { ...prev, status } : prev);
  }, []);

  const handleSaved = useCallback((saved: Scheme) => {
    setSchemes(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setShowForm(false); setEditScheme(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDeleteScheme(deleteTarget.id);
      setSchemes(prev => prev.filter(s => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) { alert((e as Error).message); }
    finally { setDeleting(false); }
  }, [deleteTarget]);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch("/api/schemes")
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json() as Promise<Scheme[]>; })
      .then(data => { setSchemes(data); setLoading(false); })
      .catch((err: Error) => { setError(err.message); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let s = schemes;
    if (typeFilter !== "ALL") s = s.filter(x => x.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      s = s.filter(x => x.name.toLowerCase().includes(q) || x.category.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
    }
    return s;
  }, [schemes, typeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleFilter = (v: "ALL" | "CENTRAL" | "STATE") => { setTypeFilter(v); setPage(0); };

  // ── Scheme detail view ──
  if (selected) {
    return (
      <SchemeDetailPage
        scheme={selected}
        onBack={() => setSelected(null)}
        onStatusChange={handleStatusChange}
      />
    );
  }

  // ── List view ──
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
          <input type="text" placeholder="Search schemes…" value={search} onChange={e => handleSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["ALL", "CENTRAL", "STATE"] as const).map(t => (
            <button key={t} onClick={() => handleFilter(t)}
              className={`text-sm px-3.5 py-1.5 rounded-md transition-colors ${typeFilter === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "ALL" ? "All" : t === "CENTRAL" ? "🏛 Central" : "🏠 Maharashtra"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          <button onClick={() => setView("table")} className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Table view"><LayoutList className="h-4 w-4"/></button>
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Grid view"><LayoutGrid className="h-4 w-4"/></button>
        </div>
        <button onClick={() => { setEditScheme(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold whitespace-nowrap">
          + Add Scheme
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {[["Total Schemes", schemes.length], ["Central Govt", schemes.filter(s => s.type === "CENTRAL").length], ["Maharashtra", schemes.filter(s => s.type === "STATE").length], ["Showing", filtered.length]].map(([l, v]) => (
          <span key={l as string} className="text-xs bg-card border border-border rounded-full px-3 py-1.5 font-medium">
            {l}: <span className="text-primary font-semibold">{v}</span>
          </span>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse"/>)}</div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load schemes</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-muted/20 rounded-lg p-10 text-center"><p className="text-muted-foreground text-sm">No schemes match your search.</p></div>
      ) : view === "table" ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Scheme Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Eligibility Summary</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map(s => <TableRow key={s.id} scheme={s} onView={() => setSelected(s)} onStatusChange={handleStatusChange} onEdit={s => { setEditScheme(s); setShowForm(true); }} onDelete={s => setDeleteTarget(s)}/>)}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {safePage + 1} of {totalPages} · {filtered.length} schemes</span>
            <div className="flex gap-1">
              <button disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4"/></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`text-xs w-7 h-7 rounded transition-colors ${safePage === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
              ))}
              <button disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pageData.map(s => <GridCard key={s.id} scheme={s} onView={() => setSelected(s)} onEdit={s => { setEditScheme(s); setShowForm(true); }} onDelete={s => setDeleteTarget(s)}/>)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {safePage + 1} of {totalPages} · {filtered.length} schemes</span>
            <div className="flex gap-1">
              <button disabled={safePage === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4"/></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`text-xs w-7 h-7 rounded transition-colors ${safePage === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
              ))}
              <button disabled={safePage >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>
        </div>
      )}
      {showForm && <SchemeFormModal scheme={editScheme} onClose={() => { setShowForm(false); setEditScheme(null); }} onSaved={handleSaved}/>}
      {deleteTarget && <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} loading={deleting}/>}
    </div>
  );
}
