import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, LayoutGrid, LayoutList, ChevronLeft, ChevronRight, ArrowLeft, Shield, CheckCircle2, FileText, Info, TrendingUp, Star } from "lucide-react";

interface InsuranceSubsidy {
  id: string;
  name: string;
  type: "Insurance" | "Subsidy";
  region: "Central" | "Maharashtra";
  eligibility: string;
  criteria?: string;
  parameters: string;
  features: string;
  status?: string;
  createdAt: string;
}

interface ApiResponse {
  items: InsuranceSubsidy[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

/* ═══════════ CRUD API Helpers ════════════ */
async function apiCreate(data: Partial<InsuranceSubsidy>): Promise<InsuranceSubsidy> {
  const res = await fetch("/api/insurance-subsidies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error((json as {error?:string}).error || "Failed to create");
  return json as InsuranceSubsidy;
}
async function apiUpdate(id: string, data: Partial<InsuranceSubsidy>): Promise<InsuranceSubsidy> {
  const res = await fetch(`/api/insurance-subsidies/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const json = await res.json();
  if (!res.ok) throw new Error((json as {error?:string}).error || "Failed to update");
  return json as InsuranceSubsidy;
}
async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`/api/insurance-subsidies/${id}`, { method: "DELETE" });
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error((j as {error?:string}).error || "Failed to delete"); }
}

/* ═══════════ Form Modal ════════════ */
function InsuranceSubsidyFormModal({ item, onClose, onSaved }: { item?: InsuranceSubsidy | null; onClose: () => void; onSaved: (saved: InsuranceSubsidy) => void }) {
  const isEdit = !!item;
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState(item?.name ?? "");
  const [type, setType] = useState<"Insurance" | "Subsidy">(item?.type ?? "Insurance");
  const [region, setRegion] = useState<"Central" | "Maharashtra">(item?.region ?? "Central");
  const [eligibility, setEligibility] = useState(item?.eligibility ?? "");
  const [parameters, setParameters] = useState(item?.parameters ?? "");
  const [features, setFeatures] = useState(item?.features ?? "");
  const [status, setStatus] = useState(item?.status ?? "Active");

  const handleSubmit = async () => {
    if (!name.trim()) { setErr("Name is required"); return; }
    setSaving(true); setErr(null);
    try {
      const payload = { name: name.trim(), type, region, eligibility, parameters, features, status };
      const saved = isEdit ? await apiUpdate(item!.id, payload) : await apiCreate(payload);
      onSaved(saved);
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-heading text-base font-semibold">{isEdit ? `Edit: ${item!.name}` : "Add Insurance / Subsidy"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground text-lg leading-none">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Name *</label>
            <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. PM Fasal Bima Yojana"/>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select className={selectCls} value={type} onChange={e => setType(e.target.value as "Insurance"|"Subsidy")}>
                <option value="Insurance">🛡️ Insurance</option>
                <option value="Subsidy">💰 Subsidy</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Region</label>
              <select className={selectCls} value={region} onChange={e => setRegion(e.target.value as "Central"|"Maharashtra")}>
                <option value="Central">🏛 Central Government</option>
                <option value="Maharashtra">🏠 Maharashtra State</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={selectCls} value={status} onChange={e => setStatus(e.target.value)}>
              <option value="Active">✅ Active</option>
              <option value="Closed">⛔ Closed</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Eligibility</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={eligibility} onChange={e => setEligibility(e.target.value)} placeholder="Who is eligible for this scheme?"/>
          </div>
          <div>
            <label className={labelCls}>Parameters / Benefit Details</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={parameters} onChange={e => setParameters(e.target.value)} placeholder="Coverage amount, premium details, benefit structure..."/>
          </div>
          <div>
            <label className={labelCls}>Key Features</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={features} onChange={e => setFeatures(e.target.value)} placeholder="Key features and highlights of the scheme..."/>
          </div>
          {err && <p className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60 font-semibold">
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Entry"}
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
          <h3 className="font-heading text-base font-semibold">Delete Entry?</h3>
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

/* ═══════════ Badges ════════════ */
function TypeBadge({ type }: { type: "Insurance" | "Subsidy" }) {
  const isInsurance = type === "Insurance";
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold ${isInsurance ? "bg-success/15 text-success" : "bg-secondary/15 text-secondary"}`}>
      {isInsurance ? "🛡️ Insurance" : "💰 Subsidy"}
    </span>
  );
}

function RegionBadge({ region }: { region: "Central" | "Maharashtra" }) {
  const isCentral = region === "Central";
  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${isCentral ? "bg-primary/10 text-primary" : "bg-orange-100 text-orange-700"}`}>
      {isCentral ? "🏛 Central" : "🏠 Maharashtra"}
    </span>
  );
}

/* ═══════════ Detail Page ════════════ */
function DetailPage({ item, onBack, onEdit }: { item: InsuranceSubsidy; onBack: () => void; onEdit: (i: InsuranceSubsidy) => void }) {
  const [tab, setTab] = useState<"overview" | "parameters" | "features">("overview");
  const isInsurance = item.type === "Insurance";
  const gradientStyle = isInsurance
    ? { background: "linear-gradient(135deg, #d1fae5 0%, #a7f3d0 50%, #6ee7b7 100%)" }
    : { background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%)" };

  const featureList = item.features.split(/\.\s+|\n/).map(f => f.replace(/\.$/, "").trim()).filter(Boolean);
  const criteriaList = item.criteria ? item.criteria.split(/\n|;\s*/).map(c => c.trim()).filter(Boolean) : [];
  const paramList = item.parameters.split(/\n|;\s*/).map(p => p.trim()).filter(Boolean);

  const tabs = [
    { id: "overview", label: "Overview", icon: Info },
    { id: "parameters", label: "Parameters & Benefits", icon: TrendingUp },
    { id: "features", label: "Key Features", icon: Star },
  ] as const;

  return (
    <div className="space-y-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors group ${isInsurance ? "text-emerald-700 hover:text-emerald-800" : "text-amber-700 hover:text-amber-800"}`}>
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform"/>
          {isInsurance ? "All Insurance" : "All Subsidies"}
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm text-slate-500 truncate max-w-xs">{item.name}</span>
      </div>

      {/* Hero header */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm mb-5">
        <div className="px-6 py-5" style={gradientStyle}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <TypeBadge type={item.type}/>
                <RegionBadge region={item.region}/>
                {item.status && (
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                    item.status === "Active"
                      ? isInsurance
                        ? "border-emerald-400 text-emerald-800 bg-emerald-100/60"
                        : "border-amber-400 text-amber-800 bg-amber-100/60"
                      : "border-slate-300 text-slate-500 bg-white/50"
                  }`}>
                    {item.status === "Active" ? "● Active" : "● Closed"}
                  </span>
                )}
              </div>
              <h2 className={`font-bold text-xl leading-snug mb-2 ${isInsurance ? "text-emerald-950" : "text-amber-950"}`}>{item.name}</h2>
              <p className={`text-sm leading-relaxed max-w-2xl ${isInsurance ? "text-emerald-800/70" : "text-amber-800/70"}`}>{item.eligibility}</p>
            </div>
            <div className="flex-shrink-0">
              <button onClick={() => onEdit(item)}
                className="text-sm px-4 py-2 rounded-lg bg-white/70 hover:bg-white transition-colors font-semibold shadow-sm border border-white/60">
                Edit
              </button>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: "Type", val: item.type, icon: Shield },
              { label: "Region", val: item.region, icon: FileText },
              { label: "Status", val: item.status || "Active", icon: CheckCircle2 },
            ].map(stat => (
              <div key={stat.label} className="bg-white/70 backdrop-blur rounded-xl px-3 py-2.5 border border-white/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <stat.icon className="h-3.5 w-3.5 opacity-60"/>
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{stat.label}</span>
                </div>
                <div className="text-sm font-bold">{stat.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Parameters strip */}
        <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-start gap-2">
          <TrendingUp className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isInsurance ? "text-emerald-600" : "text-amber-600"}`}/>
          <div>
            <span className={`text-xs font-bold mr-2 ${isInsurance ? "text-emerald-800" : "text-amber-800"}`}>
              {isInsurance ? "Coverage:" : "Benefit:"}
            </span>
            <span className={`text-xs ${isInsurance ? "text-emerald-700" : "text-amber-700"}`}>{item.parameters}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-100/60 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 justify-center ${
              tab === t.id
                ? isInsurance ? "bg-white shadow-sm text-emerald-800" : "bg-white shadow-sm text-amber-800"
                : "text-slate-500 hover:text-slate-700"
            }`}>
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
              <Shield className={`h-4 w-4 ${isInsurance ? "text-emerald-600" : "text-amber-600"}`}/>
              <h3 className="font-bold text-slate-800">Eligibility</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg px-4 py-3">{item.eligibility}</p>
          </div>

          {/* Criteria */}
          {criteriaList.length > 0 && (
            <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${isInsurance ? "text-emerald-600" : "text-amber-600"}`}/> Eligibility Criteria
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {criteriaList.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-600 px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg">
                    <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${isInsurance ? "text-emerald-500" : "text-amber-500"}`}/>{c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Added date */}
          <div className="col-span-2 text-xs text-slate-400 text-right">
            Added: {new Date(item.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
      )}

      {tab === "parameters" && (
        <div className="space-y-4">
          <div className={`rounded-xl p-5 border ${isInsurance ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <h3 className={`font-bold text-sm mb-4 flex items-center gap-2 ${isInsurance ? "text-emerald-800" : "text-amber-800"}`}>
              <TrendingUp className="h-4 w-4"/> {isInsurance ? "Coverage & Premium Details" : "Subsidy Amount & Structure"}
            </h3>
            {paramList.length > 1 ? (
              <ul className="space-y-3">
                {paramList.map((p, i) => (
                  <li key={i} className={`flex items-start gap-2.5 text-sm px-3 py-2.5 bg-white/60 rounded-lg border ${isInsurance ? "text-emerald-800 border-emerald-100" : "text-amber-800 border-amber-100"}`}>
                    <span className={`flex-shrink-0 font-bold text-base leading-none ${isInsurance ? "text-emerald-600" : "text-amber-600"}`}>{isInsurance ? "🛡" : "💰"}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`text-sm leading-relaxed ${isInsurance ? "text-emerald-800" : "text-amber-800"}`}>{item.parameters}</p>
            )}
          </div>
        </div>
      )}

      {tab === "features" && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Star className={`h-4 w-4 ${isInsurance ? "text-emerald-500" : "text-amber-500"}`}/> Key Features & Highlights
            </h3>
            {featureList.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {featureList.map((f, i) => (
                  <div key={i} className={`flex items-start gap-2.5 text-sm text-slate-700 px-4 py-3 rounded-lg border ${isInsurance ? "bg-emerald-50/60 border-emerald-100" : "bg-amber-50/60 border-amber-100"}`}>
                    <span className={`flex-shrink-0 text-base leading-none ${isInsurance ? "text-emerald-600" : "text-amber-600"}`}>{isInsurance ? "🛡" : "💰"}</span>
                    <span className="leading-relaxed">{f}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No features listed for this entry.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ Table Row ════════════ */
function TableRow({ item, onView, onEdit, onDelete }: { item: InsuranceSubsidy; onView: () => void; onEdit: (i: InsuranceSubsidy) => void; onDelete: (i: InsuranceSubsidy) => void }) {
  return (
    <tr className="border-t border-border/50 hover:bg-muted/30 transition-colors cursor-pointer">
      <td className="px-4 py-3 w-[26%]">
        <button onClick={onView} className="font-medium text-sm text-left hover:text-primary transition-colors leading-snug">{item.name}</button>
      </td>
      <td className="px-4 py-3 w-[10%] align-middle"><div className="flex justify-center"><TypeBadge type={item.type}/></div></td>
      <td className="px-4 py-3 w-[11%] align-middle"><div className="flex justify-center"><RegionBadge region={item.region}/></div></td>
      <td className="px-4 py-3 w-[20%]"><p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.eligibility}</p></td>
      <td className="px-4 py-3 w-[17%]"><p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.parameters}</p></td>
      <td className="px-4 py-3 w-[16%] align-middle">
        <div className="flex gap-1 items-center flex-wrap">
          <button onClick={onView} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-80 transition-opacity whitespace-nowrap">View</button>
          <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors whitespace-nowrap">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(item); }} className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200 transition-colors whitespace-nowrap">Delete</button>
        </div>
      </td>
    </tr>
  );
}

/* ═══════════ Grid Card ════════════ */
function GridCard({ item, onView, onEdit, onDelete }: { item: InsuranceSubsidy; onView: () => void; onEdit: (i: InsuranceSubsidy) => void; onDelete: (i: InsuranceSubsidy) => void }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-sm leading-snug flex-1">{item.name}</h3>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <TypeBadge type={item.type}/>
        <RegionBadge region={item.region}/>
        {item.status && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${item.status === "Active" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{item.status}</span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Eligibility</p>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{item.eligibility}</p>
      </div>
      <div className="bg-secondary/10 rounded p-2.5">
        <p className="text-[11px] font-semibold text-muted-foreground mb-0.5 uppercase tracking-wide">Parameters</p>
        <p className="text-xs font-medium leading-relaxed line-clamp-2">{item.parameters}</p>
      </div>
      <div className="flex gap-2 mt-auto">
        <button onClick={onView} className="flex-1 text-sm px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">View</button>
        <button onClick={() => onEdit(item)} className="text-sm px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">Edit</button>
        <button onClick={() => onDelete(item)} className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">Del</button>
      </div>
    </div>
  );
}

/* ═══════════ Main Component ════════════ */
interface AllInsuranceSubsidiesProps { defaultTypeFilter?: "Insurance" | "Subsidy"; }

export default function AllInsuranceSubsidies({ defaultTypeFilter }: AllInsuranceSubsidiesProps = {}) {
  const [items, setItems] = useState<InsuranceSubsidy[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Insurance" | "Subsidy">(defaultTypeFilter ?? "ALL");
  const [regionFilter, setRegionFilter] = useState<"ALL" | "Central" | "Maharashtra">("ALL");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<InsuranceSubsidy | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<InsuranceSubsidy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InsuranceSubsidy | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (regionFilter !== "ALL") params.set("region", regionFilter);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/insurance-subsidies?${params.toString()}`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: ApiResponse = await res.json();
      setItems(data.items); setTotal(data.total); setTotalPages(data.totalPages || 1);
    } catch (err) { setError((err as Error).message); }
    finally { setLoading(false); }
  }, [page, typeFilter, regionFilter, debouncedSearch]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaved = useCallback((saved: InsuranceSubsidy) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    setTotal(t => t + (items.findIndex(i => i.id === saved.id) < 0 ? 1 : 0));
    setShowForm(false); setEditItem(null);
  }, [items]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(deleteTarget.id);
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setTotal(t => Math.max(0, t - 1));
      setDeleteTarget(null);
    } catch (e) { alert((e as Error).message); }
    finally { setDeleting(false); }
  }, [deleteTarget]);

  const pageNumbers = useMemo(() => Array.from({ length: totalPages }, (_, i) => i), [totalPages]);

  if (selected) {
    return (
      <>
        <DetailPage
          item={selected}
          onBack={() => setSelected(null)}
          onEdit={i => { setSelected(null); setEditItem(i); setShowForm(true); }}
        />
        {showForm && <InsuranceSubsidyFormModal item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSaved={saved => { handleSaved(saved); setSelected(saved); }}/>}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"/>
          <input type="text" placeholder="Search by name..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        </div>

        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["ALL", "Central", "Maharashtra"] as const).map(r => (
            <button key={r} onClick={() => { setRegionFilter(r); setPage(0); }}
              className={`text-sm px-3.5 py-1.5 rounded-md transition-colors ${regionFilter === r ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {r === "ALL" ? "All Regions" : r === "Central" ? "🏛 Central" : "🏠 Maharashtra"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          {(["ALL", "Insurance", "Subsidy"] as const).map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`text-sm px-3.5 py-1.5 rounded-md transition-colors ${typeFilter === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "ALL" ? "All Types" : t === "Insurance" ? "🛡️ Insurance" : "💰 Subsidy"}
            </button>
          ))}
        </div>

        <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
          <button onClick={() => setView("table")} className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Table view"><LayoutList className="h-4 w-4"/></button>
          <button onClick={() => setView("grid")} className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`} title="Grid view"><LayoutGrid className="h-4 w-4"/></button>
        </div>

        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-semibold whitespace-nowrap">
          + Add Entry
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[["Total", total], ["Page", `${page + 1} / ${totalPages}`]].map(([l, v]) => (
          <span key={l as string} className="text-xs bg-card border border-border rounded-full px-3 py-1.5 font-medium">
            {l}: <span className="text-primary">{v}</span>
          </span>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted/40 rounded-lg animate-pulse"/>)}</div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-6 text-center">
          <p className="text-sm text-destructive font-medium">Failed to load data</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={fetchData} className="mt-3 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-80">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/20 rounded-lg p-10 text-center">
          <p className="text-muted-foreground text-sm">No entries found.</p>
          <button onClick={() => { setEditItem(null); setShowForm(true); }} className="mt-3 text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:opacity-80">+ Add First Entry</button>
        </div>
      ) : view === "table" ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Region</th>
                  <th className="px-4 py-3 font-medium">Eligibility</th>
                  <th className="px-4 py-3 font-medium">Parameters</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <TableRow key={item.id} item={item} onView={() => setSelected(item)} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={i => setDeleteTarget(i)}/>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} · {total} records</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4"/></button>
              {pageNumbers.map(i => (
                <button key={i} onClick={() => setPage(i)} className={`text-xs w-7 h-7 rounded transition-colors ${page === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
              ))}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => <GridCard key={item.id} item={item} onView={() => setSelected(item)} onEdit={i => { setEditItem(i); setShowForm(true); }} onDelete={i => setDeleteTarget(i)}/>)}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Page {page + 1} of {totalPages} · {total} records</span>
            <div className="flex gap-1">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronLeft className="h-4 w-4"/></button>
              {pageNumbers.map(i => (
                <button key={i} onClick={() => setPage(i)} className={`text-xs w-7 h-7 rounded transition-colors ${page === i ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{i + 1}</button>
              ))}
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30 transition-colors"><ChevronRight className="h-4 w-4"/></button>
            </div>
          </div>
        </>
      )}

      {showForm && <InsuranceSubsidyFormModal item={editItem} onClose={() => { setShowForm(false); setEditItem(null); }} onSaved={handleSaved}/>}
      {deleteTarget && <DeleteConfirm name={deleteTarget.name} onCancel={() => setDeleteTarget(null)} onConfirm={handleDeleteConfirm} loading={deleting}/>}
    </div>
  );
}
