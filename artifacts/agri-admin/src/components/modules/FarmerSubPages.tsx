import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Filter, ArrowUpDown, AlertCircle, FileText,
  CheckCircle2, XCircle, Calendar, Info, Plus, X, Send,
  ChevronDown, IndianRupee, Loader2, RefreshCw, Shield,
  AlertTriangle, LifeBuoy,
} from "lucide-react";
import type { FarmerRecord, DocRecord, OcrDocSection } from "@/data/farmerApi";
import { Pill, GSTATUS, GPRIORITY } from "@/components/modules/VerifiedFarmerCard";

/* ─────────────── shared UI ─────────────── */
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/40" />
    </div>
  );
}
function FilterSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <select value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-card border border-border rounded-lg px-3 py-2">
        <option value="">{label}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function SortSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <select value={value} onChange={e => onChange(e.target.value)} className="text-sm bg-card border border-border rounded-lg px-3 py-2">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
function ResultCount({ shown, total, label }: { shown: number; total: number; label: string }) {
  return <span className="text-xs text-muted-foreground ml-auto">Showing {shown} of {total} {label}</span>;
}
function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground/40">{icon}</div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
function StatBadge({ label, val, color }: { label: string; val: number | string; color: string }) {
  return (
    <div className={`border rounded-xl px-4 py-2.5 text-center ${color}`}>
      <div className="text-xl font-bold">{val}</div>
      <div className="text-[9px] font-semibold uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  );
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-slate-50">
          <h3 className="font-bold text-base text-foreground">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
function SuccessBanner({ title, sub, onClose }: { title: string; sub: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-300 rounded-xl mb-4">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1"><div className="font-semibold text-emerald-800 text-sm">{title}</div><div className="text-xs text-emerald-600 mt-0.5">{sub}</div></div>
      <button onClick={onClose} className="p-0.5 hover:bg-emerald-100 rounded"><X className="h-3.5 w-3.5 text-emerald-500" /></button>
    </div>
  );
}
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}
const inputCls = "w-full px-3 py-2.5 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary/60";
const selectCls = inputCls + " appearance-none";
const textareaCls = inputCls + " resize-none";

/* ─────────────── app status pill ─────────────── */
const APP_STATUS: Record<string, string> = {
  "Pending": "bg-yellow-100 text-yellow-800",
  "Under Review": "bg-blue-100 text-blue-800",
  "Approved": "bg-emerald-100 text-emerald-800",
  "Rejected": "bg-red-100 text-red-600",
  "Settled": "bg-teal-100 text-teal-800",
};
function AppStatusPill({ status }: { status: string }) {
  return <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${APP_STATUS[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

/* ─────────────── interfaces ─────────────── */
interface Application {
  applicationId: string;
  type: string;
  farmerId: string;
  schemeName: string;
  schemeId: string;
  status: string;
  adminReply?: string | null;
  adminNotes?: string | null;
  appliedAt: string;
  updatedAt: string;
}
interface CatalogItem {
  id: string;
  name: string;
  category?: string;
  description?: string;
  benefits?: string;
  type?: string;
  status?: string;
  region?: string;
}

/* ─────────────── status update modal ─────────────── */
function StatusUpdateModal({ app, onClose, onUpdated }: {
  app: Application; onClose: () => void; onUpdated: (a: Application) => void;
}) {
  const [status, setStatus] = useState(app.status);
  const [adminReply, setAdminReply] = useState(app.adminReply ?? "");
  const [adminNotes, setAdminNotes] = useState(app.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    setSaving(true); setErr("");
    try {
      const res = await fetch(`/api/applications/${app.applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminReply: adminReply || null, adminNotes: adminNotes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update");
      onUpdated(await res.json());
      onClose();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Update Application Status" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-slate-50 border border-border rounded-xl p-3 space-y-1 text-xs">
          <div className="font-semibold text-slate-700">{app.schemeName}</div>
          <div className="text-muted-foreground font-mono">{app.applicationId}</div>
        </div>
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        <FormField label="Status" required>
          <div className="relative">
            <select value={status} onChange={e => setStatus(e.target.value)} className={selectCls}>
              {["Pending", "Under Review", "Approved", "Rejected", "Settled"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </FormField>
        <FormField label="Reply to Farmer">
          <input value={adminReply} onChange={e => setAdminReply(e.target.value)} className={inputCls} placeholder="Message visible to farmer…" />
        </FormField>
        <FormField label="Internal Notes">
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} className={textareaCls} rows={2} placeholder="Internal admin notes (not visible to farmer)…" />
        </FormField>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────────── apply confirm modal ─────────────── */
function ApplyModal({ item, type, farmer, onClose, onApplied }: {
  item: CatalogItem; type: "scheme" | "insurance" | "subsidy"; farmer: FarmerRecord;
  onClose: () => void; onApplied: (app: Application) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState<"confirm" | "success">("confirm");
  const [newApp, setNewApp] = useState<Application | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          farmerId: farmer.farmerId,
          farmerName: farmer.name,
          mobile: farmer.mobile,
          district: farmer.district,
          village: farmer.village,
          schemeId: item.id,
          schemeName: item.name,
          schemeType: item.category ?? item.type,
          crop: farmer.crop,
          land: farmer.land,
          source: "admin",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit");
      setNewApp(json);
      setStep("success");
      onApplied(json);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "success" && newApp) return (
    <Modal title="Application Submitted" onClose={onClose}>
      <div className="flex flex-col items-center text-center py-4 gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <div>
          <h4 className="font-bold text-lg mb-1">Application Submitted Successfully</h4>
          <p className="text-sm text-muted-foreground">Application for <strong>{item.name}</strong> has been submitted.</p>
        </div>
        <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-left space-y-2">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Application ID</span><span className="font-mono font-semibold">{newApp.applicationId}</span></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Status</span><AppStatusPill status="Pending" /></div>
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Submitted</span><span className="font-medium">{new Date(newApp.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        </div>
        <button onClick={onClose} className="w-full bg-secondary text-white font-semibold py-2.5 rounded-xl hover:bg-secondary/90">Done</button>
      </div>
    </Modal>
  );

  return (
    <Modal title={`Apply — ${item.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-1.5">
          <h4 className="font-bold text-sm text-emerald-800">{item.name}</h4>
          {item.category && <p className="text-xs text-muted-foreground">{item.category}</p>}
          {item.description && <p className="text-xs text-slate-600">{item.description}</p>}
          {item.benefits && <p className="text-xs text-emerald-700 font-medium">Benefit: {item.benefits}</p>}
        </div>
        <div className="border border-border rounded-xl p-4 space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Applicant</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{farmer.name}</span></div>
            <div><span className="text-muted-foreground">ID: </span><span className="font-mono">{farmer.farmerId}</span></div>
            <div><span className="text-muted-foreground">Aadhaar: </span><span className="font-mono">{farmer.aadhaar}</span></div>
            <div><span className="text-muted-foreground">District: </span><span className="font-medium">{farmer.district}</span></div>
          </div>
        </div>
        {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{err}</div>}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/90 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Submit Application
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════
   APPLICATIONS PAGE BASE — reused by all 3 types
══════════════════════════════════════════════════════ */
function ApplicationsPageBase({
  farmer, type, icon, fetchCatalog, emptyLabel,
}: {
  farmer: FarmerRecord;
  type: "scheme" | "insurance" | "subsidy";
  icon: React.ReactNode;
  fetchCatalog: () => Promise<CatalogItem[]>;
  emptyLabel: string;
}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyingItem, setApplyingItem] = useState<CatalogItem | null>(null);
  const [updatingApp, setUpdatingApp] = useState<Application | null>(null);
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState<"applied" | "available">("applied");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [apps, items] = await Promise.all([
        fetch(`/api/applications?type=${type}&farmerId=${encodeURIComponent(farmer.farmerId)}`).then(r => r.json()),
        fetchCatalog(),
      ]);
      setApplications(Array.isArray(apps) ? apps : []);
      setCatalog(Array.isArray(items) ? items : []);
    } catch {
      setError("Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [farmer.farmerId, type, fetchCatalog]);

  useEffect(() => { load(); }, [load]);

  const appliedSchemeIds = useMemo(() => new Set(
    applications.filter(a => a.status !== "Rejected").map(a => a.schemeId)
  ), [applications]);

  const filteredApps = useMemo(() => {
    let r = applications;
    const s = search.toLowerCase();
    if (s) r = r.filter(a => a.schemeName.toLowerCase().includes(s) || a.applicationId.toLowerCase().includes(s));
    if (statusFilter) r = r.filter(a => a.status === statusFilter);
    return [...r].sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
  }, [applications, search, statusFilter]);

  const filteredCatalog = useMemo(() => {
    let r = catalog.filter(c => !appliedSchemeIds.has(c.id));
    const s = search.toLowerCase();
    if (s) r = r.filter(c => c.name.toLowerCase().includes(s) || (c.description ?? "").toLowerCase().includes(s));
    return r;
  }, [catalog, search, appliedSchemeIds]);

  const counts = useMemo(() => ({
    total: applications.length,
    pending: applications.filter(a => a.status === "Pending").length,
    review: applications.filter(a => a.status === "Under Review").length,
    approved: applications.filter(a => a.status === "Approved").length,
    rejected: applications.filter(a => a.status === "Rejected").length,
    settled: applications.filter(a => a.status === "Settled").length,
  }), [applications]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading…</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      <button onClick={load} className="ml-auto flex items-center gap-1 text-xs underline"><RefreshCw className="h-3 w-3" />Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {applyingItem && (
        <ApplyModal
          item={applyingItem} type={type} farmer={farmer}
          onClose={() => setApplyingItem(null)}
          onApplied={app => {
            setApplications(prev => [app, ...prev]);
            setSuccessMsg(`Application for "${applyingItem.name}" submitted successfully. ID: ${app.applicationId}`);
            setApplyingItem(null);
          }}
        />
      )}
      {updatingApp && (
        <StatusUpdateModal
          app={updatingApp}
          onClose={() => setUpdatingApp(null)}
          onUpdated={updated => {
            setApplications(prev => prev.map(a => a.applicationId === updated.applicationId ? updated : a));
            setSuccessMsg(`Application ${updated.applicationId} status updated to ${updated.status}.`);
            setUpdatingApp(null);
          }}
        />
      )}
      {successMsg && <SuccessBanner title="Success" sub={successMsg} onClose={() => setSuccessMsg("")} />}

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <StatBadge label="Total" val={counts.total} color="text-teal-700 bg-teal-50 border-teal-200" />
        <StatBadge label="Pending" val={counts.pending} color="text-yellow-700 bg-yellow-50 border-yellow-200" />
        <StatBadge label="Under Review" val={counts.review} color="text-blue-700 bg-blue-50 border-blue-200" />
        <StatBadge label="Approved" val={counts.approved} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        <StatBadge label="Rejected" val={counts.rejected} color="text-red-600 bg-red-50 border-red-200" />
        {type === "insurance" && <StatBadge label="Settled" val={counts.settled} color="text-teal-800 bg-teal-50 border-teal-300" />}
        {type !== "insurance" && <StatBadge label="Available" val={filteredCatalog.length + catalog.filter(c => appliedSchemeIds.has(c.id)).length} color="text-slate-600 bg-slate-50 border-slate-200" />}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-1">
        {(["applied", "available"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors -mb-px border-b-2 ${tab === t ? "border-secondary text-secondary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "applied" ? `My Applications (${applications.length})` : `Available ${emptyLabel} (${filteredCatalog.length})`}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <SearchBar value={search} onChange={setSearch} placeholder={`Search ${emptyLabel.toLowerCase()}…`} />
        {tab === "applied" && (
          <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All Statuses"
            options={["Pending", "Under Review", "Approved", "Rejected", "Settled"].map(v => ({ value: v, label: v }))} />
        )}
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
        <ResultCount shown={tab === "applied" ? filteredApps.length : filteredCatalog.length} total={tab === "applied" ? applications.length : catalog.length} label={tab === "applied" ? "applications" : emptyLabel.toLowerCase()} />
      </div>

      {/* Applied tab */}
      {tab === "applied" && (
        filteredApps.length === 0
          ? <EmptyState icon={icon} message={applications.length === 0 ? `No ${emptyLabel.toLowerCase()} applications yet.` : "No applications match your filters."} />
          : (
            <div className="space-y-3">
              {filteredApps.map(app => (
                <div key={app.applicationId} className={`border rounded-xl overflow-hidden ${
                  app.status === "Approved" ? "border-emerald-200 bg-emerald-50/20" :
                  app.status === "Rejected" ? "border-red-200 bg-red-50/20" :
                  app.status === "Under Review" ? "border-blue-200 bg-blue-50/20" :
                  app.status === "Settled" ? "border-teal-200 bg-teal-50/20" :
                  "border-yellow-200 bg-yellow-50/10"
                }`}>
                  <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{app.schemeName}</span>
                        <AppStatusPill status={app.status} />
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono">{app.applicationId}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />Applied: {new Date(app.appliedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        {app.updatedAt !== app.appliedAt && <div className="text-[10px]">Updated: {new Date(app.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</div>}
                      </div>
                      <button onClick={() => setUpdatingApp(app)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 transition-colors">
                        Update Status
                      </button>
                    </div>
                  </div>
                  {(app.adminReply || app.adminNotes) && (
                    <div className="px-5 pb-4 space-y-2">
                      {app.adminReply && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs"><span className="font-semibold text-emerald-700">Reply to Farmer: </span><span className="text-emerald-700">{app.adminReply}</span></div>}
                      {app.adminNotes && <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs"><span className="font-semibold text-slate-600">Internal Notes: </span><span className="text-slate-600">{app.adminNotes}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      )}

      {/* Available tab */}
      {tab === "available" && (
        filteredCatalog.length === 0
          ? <EmptyState icon={icon} message={catalog.length === 0 ? `No ${emptyLabel.toLowerCase()} found.` : `All ${emptyLabel.toLowerCase()} have been applied to, or none match your search.`} />
          : (
            <div className="space-y-3">
              {filteredCatalog.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-xl bg-white overflow-hidden">
                  <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{item.name}</span>
                        {(item.type ?? item.region) && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-semibold">{item.type ?? item.region}</span>
                        )}
                        {item.status && item.status !== "Active" && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{item.status}</span>
                        )}
                      </div>
                      {item.category && <div className="text-[11px] text-muted-foreground">{item.category}</div>}
                    </div>
                    <button
                      onClick={() => setApplyingItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-white text-xs font-semibold rounded-lg hover:bg-secondary/90 transition-colors shadow-sm flex-shrink-0"
                    >
                      <Plus className="h-3 w-3" />Apply
                    </button>
                  </div>
                  {(item.description || item.benefits) && (
                    <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs border-t border-slate-100 pt-3">
                      {item.description && <div className="sm:col-span-2"><span className="text-muted-foreground">About: </span><span className="text-slate-700">{item.description}</span></div>}
                      {item.benefits && <div className="sm:col-span-2 flex items-start gap-1"><IndianRupee className="h-3 w-3 text-emerald-600 flex-shrink-0 mt-0.5" /><span className="text-emerald-700 font-medium">{item.benefits}</span></div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   1. SCHEME APPLICATIONS PAGE
══════════════════════════════════════════════════════ */
export function SchemeApplicationsPage({ farmer }: { farmer: FarmerRecord }) {
  const fetchCatalog = useCallback(async () => {
    const res = await fetch("/api/schemes");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, []);
  return (
    <ApplicationsPageBase
      farmer={farmer} type="scheme"
      icon={<Shield className="h-7 w-7" />}
      fetchCatalog={fetchCatalog}
      emptyLabel="Schemes"
    />
  );
}

/* ══════════════════════════════════════════════════════
   2. INSURANCE APPLICATIONS PAGE
══════════════════════════════════════════════════════ */
export function InsuranceApplicationsPage({ farmer }: { farmer: FarmerRecord }) {
  const fetchCatalog = useCallback(async () => {
    const res = await fetch("/api/insurance-subsidies?type=Insurance&limit=100");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }, []);
  return (
    <ApplicationsPageBase
      farmer={farmer} type="insurance"
      icon={<LifeBuoy className="h-7 w-7" />}
      fetchCatalog={fetchCatalog}
      emptyLabel="Insurance"
    />
  );
}

/* ══════════════════════════════════════════════════════
   3. SUBSIDY APPLICATIONS PAGE
══════════════════════════════════════════════════════ */
export function SubsidyApplicationsPage({ farmer }: { farmer: FarmerRecord }) {
  const fetchCatalog = useCallback(async () => {
    const res = await fetch("/api/insurance-subsidies?type=Subsidy&limit=100");
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  }, []);
  return (
    <ApplicationsPageBase
      farmer={farmer} type="subsidy"
      icon={<IndianRupee className="h-7 w-7" />}
      fetchCatalog={fetchCatalog}
      emptyLabel="Subsidies"
    />
  );
}

/* ══════════════════════════════════════════════════════
   4. GRIEVANCES PAGE (real API)
══════════════════════════════════════════════════════ */
interface ApiGrievance {
  grievanceId: string;
  mobile: string;
  farmerId: string;
  farmerName?: string;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  adminReply?: string | null;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  assignedTo?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

const GRV_CATEGORIES = ["Scheme / DBT", "Land Records", "Crop Insurance", "Bank / NPCI", "Subsidy Delay", "Document Issue", "Portal/App Issue", "Other"];

function RaiseGrievanceModal({ farmer, onClose, onSubmitted }: {
  farmer: FarmerRecord; onClose: () => void; onSubmitted: (g: ApiGrievance) => void;
}) {
  const [form, setForm] = useState({ category: "", subject: "", description: "", priority: "Medium" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: "" })); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.category) e.category = "Category is required";
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.description.trim().length < 20) e.description = "Please provide more detail (min 20 chars)";
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/grievances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: farmer.mobile,
          farmerId: farmer.farmerId,
          farmerName: farmer.name,
          category: form.category,
          subject: form.subject.trim(),
          description: form.description.trim(),
          priority: form.priority,
          source: "admin",
          raisedBy: "officer",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit");
      onSubmitted(await res.json());
      onClose();
    } catch (e) {
      setErrors({ submit: String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Raise New Grievance" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-lime-50 border border-lime-200 rounded-lg px-3 py-2 text-xs text-lime-800 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          Filing for: <span className="font-semibold">{farmer.name}</span> · {farmer.farmerId}
        </div>
        {errors.submit && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{errors.submit}</div>}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Category" required>
            <div className="relative">
              <select value={form.category} onChange={e => set("category", e.target.value)} className={selectCls}>
                <option value="">Select…</option>
                {GRV_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            {errors.category && <p className="text-[11px] text-red-600">{errors.category}</p>}
          </FormField>
          <FormField label="Priority">
            <div className="relative">
              <select value={form.priority} onChange={e => set("priority", e.target.value)} className={selectCls}>
                {["High", "Medium", "Low"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </FormField>
        </div>
        <FormField label="Subject" required>
          <input value={form.subject} onChange={e => set("subject", e.target.value)} className={inputCls} placeholder="Brief summary of the issue…" />
          {errors.subject && <p className="text-[11px] text-red-600">{errors.subject}</p>}
        </FormField>
        <FormField label="Description" required>
          <textarea value={form.description} onChange={e => set("description", e.target.value)} className={textareaCls} rows={4} placeholder="Describe in detail — include dates, amounts, reference numbers…" />
          <div className="flex justify-between">
            {errors.description ? <p className="text-[11px] text-red-600">{errors.description}</p> : <span />}
            <span className="text-[10px] text-muted-foreground ml-auto">{form.description.length} chars</span>
          </div>
        </FormField>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-secondary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary/90 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}File Grievance
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function GrievancesPage({ farmer }: { farmer: FarmerRecord }) {
  const [grievances, setGrievances] = useState<ApiGrievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sort, setSort] = useState("date-desc");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (farmer.farmerId) params.set("farmerId", farmer.farmerId);
      else if (farmer.mobile) params.set("mobile", farmer.mobile);
      const res = await fetch(`/api/grievances?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setGrievances(await res.json());
    } catch {
      setError("Failed to load grievances.");
    } finally {
      setLoading(false);
    }
  }, [farmer.farmerId, farmer.mobile]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let r = grievances;
    const s = search.toLowerCase();
    if (s) r = r.filter(g => g.subject.toLowerCase().includes(s) || g.description.toLowerCase().includes(s) || g.grievanceId.toLowerCase().includes(s) || g.category.toLowerCase().includes(s));
    if (statusFilter) r = r.filter(g => g.status === statusFilter);
    if (priorityFilter) r = r.filter(g => g.priority === priorityFilter);
    if (sort === "date-desc") r = [...r].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sort === "date-asc") r = [...r].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sort === "priority") r = [...r].sort((a, b) => { const o: Record<string, number> = { High: 0, Medium: 1, Low: 2 }; return (o[a.priority] ?? 1) - (o[b.priority] ?? 1); });
    return r;
  }, [grievances, search, statusFilter, priorityFilter, sort]);

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading grievances…</span>
    </div>
  );
  if (error) return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
      <button onClick={load} className="ml-auto flex items-center gap-1 text-xs underline"><RefreshCw className="h-3 w-3" />Retry</button>
    </div>
  );

  return (
    <div className="space-y-5">
      {showModal && (
        <RaiseGrievanceModal
          farmer={farmer}
          onClose={() => setShowModal(false)}
          onSubmitted={g => {
            setGrievances(prev => [g, ...prev]);
            setSuccessMsg(`Grievance "${g.subject}" filed successfully. ID: ${g.grievanceId}`);
          }}
        />
      )}
      {successMsg && <SuccessBanner title="Grievance Filed!" sub={successMsg} onClose={() => setSuccessMsg("")} />}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBadge label="Total" val={grievances.length} color="text-teal-700 bg-teal-50 border-teal-200" />
        <StatBadge label="Open" val={grievances.filter(g => g.status === "Open").length} color="text-lime-800 bg-lime-50 border-lime-300" />
        <StatBadge label="In Progress" val={grievances.filter(g => g.status === "In Progress").length} color="text-green-700 bg-green-50 border-green-200" />
        <StatBadge label="Resolved / Closed" val={grievances.filter(g => g.status === "Resolved" || g.status === "Closed").length} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 shadow-sm flex-shrink-0">
          <Plus className="h-4 w-4" />Raise Grievance
        </button>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by subject, category, ID…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All Statuses" options={["Open", "In Progress", "Resolved", "Closed", "Escalated", "Rejected"].map(v => ({ value: v, label: v }))} />
        <FilterSelect value={priorityFilter} onChange={setPriorityFilter} label="All Priorities" options={["High", "Medium", "Low"].map(v => ({ value: v, label: v }))} />
        <SortSelect value={sort} onChange={setSort} options={[
          { value: "date-desc", label: "Newest First" },
          { value: "date-asc", label: "Oldest First" },
          { value: "priority", label: "High Priority First" },
        ]} />
        <button onClick={load} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
        <ResultCount shown={filtered.length} total={grievances.length} label="grievances" />
      </div>

      {/* List */}
      {filtered.length === 0
        ? <EmptyState icon={<AlertCircle className="h-7 w-7" />} message={grievances.length === 0 ? "No grievances on record for this farmer." : "No grievances match your filters."} />
        : (
          <div className="space-y-4">
            {filtered.map(g => (
              <div key={g.grievanceId} className={`border rounded-xl overflow-hidden ${g.status === "Open" ? "border-lime-300" : g.status === "In Progress" ? "border-teal-200" : "border-slate-200"}`}>
                <div className={`px-5 py-4 ${g.status === "Open" ? "bg-lime-50/60" : g.status === "In Progress" ? "bg-teal-50/60" : "bg-slate-50"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-slate-800 mb-1.5">{g.subject}</h3>
                      <div className="flex flex-wrap gap-1.5">
                        <Pill label={g.status} map={GSTATUS} />
                        <Pill label={g.priority} map={GPRIORITY} />
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-medium">{g.category}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                      <div className="font-mono font-semibold text-[11px] text-slate-600">{g.grievanceId}</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5"><Calendar className="h-3 w-3" />{new Date(g.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-4 bg-white space-y-3">
                  <p className="text-sm text-slate-700 leading-relaxed">{g.description}</p>
                  {g.assignedTo && <div className="text-xs text-muted-foreground"><span className="font-medium">Assigned To: </span>{g.assignedTo}</div>}
                  {g.adminReply && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">Admin Reply</div>
                      <p className="text-xs text-emerald-700 leading-relaxed">{g.adminReply}</p>
                    </div>
                  )}
                  {g.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Rejection Reason</div>
                      <p className="text-xs text-red-600 leading-relaxed">{g.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   5. DOCUMENTS PAGE
══════════════════════════════════════════════════════ */
export function DocumentsPage({ farmer }: { farmer: FarmerRecord }) {
  const all = farmer.docs ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sort, setSort] = useState("name");

  const filtered = useMemo(() => {
    let r = all;
    const s = search.toLowerCase();
    if (s) r = r.filter((x: DocRecord) => x.name.toLowerCase().includes(s) || x.fileName.toLowerCase().includes(s));
    if (statusFilter) r = r.filter((x: DocRecord) => x.status === statusFilter);
    if (sort === "name") r = [...r].sort((a: DocRecord, b: DocRecord) => a.name.localeCompare(b.name));
    if (sort === "status") r = [...r].sort((a: DocRecord, b: DocRecord) => { const ord = ["uploaded", "failed", "none"]; return ord.indexOf(a.status) - ord.indexOf(b.status); });
    return r;
  }, [all, search, statusFilter, sort]);

  const uploaded = all.filter((d: DocRecord) => d.status === "uploaded").length;
  const failed = all.filter((d: DocRecord) => d.status === "failed").length;

  const DOC_LABEL: Record<string, string> = {
    aadhar: "Aadhaar Card", passbook: "Bank Passbook", form7: "7/12 Satbara", form12: "Form 12 (Crop Register)", form8a: "Form 8A",
  };
  const ocrKeys = farmer.ocr ? Object.keys(farmer.ocr) : [];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBadge label="Total Documents" val={all.length} color="text-teal-700 bg-teal-50 border-teal-200" />
        <StatBadge label="Verified / Uploaded" val={uploaded} color="text-emerald-700 bg-emerald-50 border-emerald-200" />
        <StatBadge label="Failed Upload" val={failed} color="text-slate-600 bg-slate-50 border-slate-200" />
      </div>

      {/* Document image previews from OCR extraction */}
      {ocrKeys.length > 0 && (
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border/40">Original Document Previews</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ocrKeys.map(key => {
              const section = farmer.ocr?.[key as keyof typeof farmer.ocr] as OcrDocSection | undefined;
              if (!section) return null;
              const photo = (section["photoBase64"] ?? section["aadharPhoto"]) as string | undefined;
              const mimeType = (section["photoMimeType"] ?? "image/jpeg") as string;
              return (
                <div key={key} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-800">{DOC_LABEL[key] ?? key}</span>
                    <span className="ml-auto text-[10px] text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">AI-OCR Extracted</span>
                  </div>
                  {photo ? (
                    <div className="p-3 flex justify-center">
                      <img src={`data:${mimeType};base64,${photo}`} alt={DOC_LABEL[key] ?? key} className="max-h-48 object-contain rounded-lg border border-slate-100" />
                    </div>
                  ) : (
                    <div className="p-4 flex items-center gap-3 text-muted-foreground">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><FileText className="h-5 w-5 text-slate-400" /></div>
                      <div><div className="text-sm font-medium text-slate-700">{DOC_LABEL[key] ?? key}</div><div className="text-xs text-muted-foreground">Data extracted — no image preview available</div></div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto flex-shrink-0" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* File metadata list */}
      {all.length > 0 && (
        <div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border/40">Document File Records</div>
          <div className="flex flex-wrap gap-2 items-center mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search document name or file name…" />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} label="All Statuses" options={[{ value: "uploaded", label: "Uploaded / Verified" }, { value: "failed", label: "Failed" }, { value: "none", label: "Not Submitted" }]} />
            <SortSelect value={sort} onChange={setSort} options={[{ value: "name", label: "Sort: Name A–Z" }, { value: "status", label: "Sort: Uploaded First" }]} />
            <ResultCount shown={filtered.length} total={all.length} label="documents" />
          </div>
          {filtered.length === 0
            ? <EmptyState icon={<FileText className="h-7 w-7" />} message="No documents match your filters." />
            : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filtered.map((doc: DocRecord, i: number) => (
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
            )
          }
        </div>
      )}

      {all.length === 0 && ocrKeys.length === 0 && (
        <EmptyState icon={<FileText className="h-7 w-7" />} message="No documents on record for this farmer." />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   AllApplicationsPage — tabbed view: Schemes / Insurance / Subsidies
   ───────────────────────────────────────────────────────────────── */
export function AllApplicationsPage({ farmer }: { farmer: FarmerRecord }) {
  type AppTab = "scheme" | "insurance" | "subsidy";
  const [activeTab, setActiveTab] = useState<AppTab>("scheme");

  const tabs: { key: AppTab; label: string; icon: React.ReactNode }[] = [
    { key: "scheme",    label: "Scheme Applications",   icon: <Shield className="h-3.5 w-3.5 flex-shrink-0" /> },
    { key: "insurance", label: "Insurance Applications", icon: <LifeBuoy className="h-3.5 w-3.5 flex-shrink-0" /> },
    { key: "subsidy",   label: "Subsidy Applications",   icon: <IndianRupee className="h-3.5 w-3.5 flex-shrink-0" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-1 border-b border-border pb-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all -mb-px ${
              activeTab === tab.key
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === "scheme"    && <SchemeApplicationsPage    farmer={farmer} />}
        {activeTab === "insurance" && <InsuranceApplicationsPage farmer={farmer} />}
        {activeTab === "subsidy"   && <SubsidyApplicationsPage   farmer={farmer} />}
      </div>
    </div>
  );
}
