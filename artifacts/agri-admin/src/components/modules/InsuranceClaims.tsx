import { useState, useEffect, useMemo, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Search, RefreshCw, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { useNotifications } from "@/contexts/NotificationContext";

interface Application {
  applicationId: string; type: string; farmerId: string; farmerName: string | null;
  mobile: string; district: string | null; village: string | null;
  schemeId: string; schemeName: string; schemeType: string | null;
  crop: string | null; land: number | null; lossDescription: string | null;
  status: string; adminReply: string | null; adminNotes: string | null;
  source: string; appliedAt: string; updatedAt: string;
}

const TABS = [
  { key: "all",          label: "All" },
  { key: "Pending",      label: "Pending" },
  { key: "Under Review", label: "Under Review" },
  { key: "Approved",     label: "Approved" },
  { key: "Settled",      label: "Settled" },
  { key: "Rejected",     label: "Rejected" },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Pending:        "bg-yellow-100 text-yellow-800",
    "Under Review": "bg-blue-100 text-blue-700",
    Approved:       "bg-emerald-100 text-emerald-700",
    Settled:        "bg-teal-100 text-teal-700",
    Rejected:       "bg-red-100 text-red-700",
  };
  const icons: Record<string, string> = { Pending: "⏳", "Under Review": "🔍", Approved: "✅", Settled: "💰", Rejected: "❌" };
  return (
    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {icons[status] ?? ""} {status}
    </span>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d ago`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `${h}h ago`;
  return "just now";
}

export default function InsuranceClaims() {
  const [apps, setApps]       = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState("all");
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(0);
  const [review, setReview]   = useState<Application | null>(null);
  const [notes, setNotes]     = useState("");
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState("");
  const prevCount             = useRef(0);
  const { addNotification }   = useNotifications();
  const PAGE_SIZE = 10;

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/applications?type=insurance");
      if (!res.ok) throw new Error("Failed");
      const data: Application[] = await res.json();
      if (data.length > prevCount.current && prevCount.current > 0) {
        addNotification({ type: "scheme", title: "New Insurance Claim", body: `${data.length - prevCount.current} new insurance claim(s) received.` });
      }
      prevCount.current = data.length;
      setApps(data);
    } catch { showToast("⚠️ Failed to load claims"); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); const iv = setInterval(() => load(true), 30000); return () => clearInterval(iv); }, []);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(""), 3500); }

  const filtered = useMemo(() => {
    let list = tab === "all" ? apps : apps.filter(a => a.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.applicationId.toLowerCase().includes(q) ||
        (a.farmerName ?? "").toLowerCase().includes(q) ||
        a.schemeName.toLowerCase().includes(q) ||
        (a.crop ?? "").toLowerCase().includes(q) ||
        a.mobile.includes(q) ||
        a.farmerId.toLowerCase().includes(q)
      );
    }
    return list;
  }, [apps, tab, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const counts = useMemo(() => ({
    total:    apps.length,
    pending:  apps.filter(a => a.status === "Pending").length,
    review:   apps.filter(a => a.status === "Under Review").length,
    approved: apps.filter(a => a.status === "Approved").length,
    settled:  apps.filter(a => a.status === "Settled").length,
    rejected: apps.filter(a => a.status === "Rejected").length,
  }), [apps]);

  async function updateStatus(id: string, status: string, adminNotes?: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: Application = await res.json();
      setApps(prev => prev.map(a => a.applicationId === id ? updated : a));
      setReview(null);
      const msgs: Record<string, string> = { Approved: `✅ ${id} approved`, Settled: `💰 ${id} settled`, Rejected: `❌ ${id} rejected`, "Under Review": `🔍 ${id} under review` };
      showToast(msgs[status] ?? `Updated ${id}`);
      if (status === "Settled") addNotification({ type: "scheme", title: "Insurance Claim Settled", body: `Claim ${id} has been settled.`, farmerId: updated.farmerId, farmerName: updated.farmerName ?? undefined });
    } catch { showToast("⚠️ Update failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed top-4 right-4 z-50 bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm">{toast}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { label: "Total",        value: counts.total,    icon: Shield,       color: "text-slate-700",   bg: "bg-slate-50   border-slate-200" },
          { label: "Pending",      value: counts.pending,  icon: Clock,        color: "text-yellow-700",  bg: "bg-yellow-50  border-yellow-200" },
          { label: "Under Review", value: counts.review,   icon: Search,       color: "text-blue-700",    bg: "bg-blue-50    border-blue-200" },
          { label: "Approved",     value: counts.approved, icon: CheckCircle,  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Settled",      value: counts.settled,  icon: CheckCircle,  color: "text-teal-700",    bg: "bg-teal-50    border-teal-200" },
          { label: "Rejected",     value: counts.rejected, icon: XCircle,      color: "text-red-700",     bg: "bg-red-50     border-red-200" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.bg}`}>
            <div className="flex items-center justify-between mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`}/>
              <span className={`text-xl font-bold ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-1 flex-1 min-w-0 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(0); }}
              className={`text-sm px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${tab === t.key ? "bg-card shadow-sm text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"/>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search…" className="pl-8 pr-3 py-2 text-sm border border-border rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-secondary/30"/>
        </div>
        <button onClick={() => load()} title="Refresh" className="p-2 rounded-lg border border-border hover:bg-muted transition-colors">
          <RefreshCw className={`h-4 w-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}/>
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">{[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-muted/40 rounded animate-pulse"/>)}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Shield className="h-10 w-10 text-muted-foreground/40"/>
            <p className="text-sm text-muted-foreground">No insurance claims yet. Farmers can file claims from the mobile app.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/50 text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Claim ID</th>
                  <th className="px-4 py-3 font-medium">Farmer</th>
                  <th className="px-4 py-3 font-medium">Insurance</th>
                  <th className="px-4 py-3 font-medium">Crop</th>
                  <th className="px-4 py-3 font-medium">Land (Acres)</th>
                  <th className="px-4 py-3 font-medium">Filed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>{pageData.map(a => (
                  <tr key={a.applicationId} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-secondary">{a.applicationId}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-semibold">{a.farmerName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{a.farmerId}</div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[160px]">
                      <div className="truncate" title={a.schemeName}>{a.schemeName}</div>
                    </td>
                    <td className="px-4 py-2.5">{a.crop ?? "—"}</td>
                    <td className="px-4 py-2.5">{a.land ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(a.appliedAt)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={a.status}/></td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => { setReview(a); setNotes(a.adminNotes ?? ""); }}
                          className="text-xs px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90">Review</button>
                        {a.status === "Approved" && (
                          <button onClick={() => updateStatus(a.applicationId, "Settled")}
                            className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">Settle</button>
                        )}
                        {a.status === "Pending" && (
                          <button onClick={() => updateStatus(a.applicationId, "Approved")}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100">Approve</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">Showing {filtered.length} claims</span>
              <div className="flex gap-1">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-4 w-4"/></button>
                <span className="px-2 py-1 text-xs text-muted-foreground">{page + 1}/{Math.max(1, totalPages)}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronRight className="h-4 w-4"/></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Review Drawer */}
      {review && (
        <div className="fixed inset-0 bg-foreground/30 z-50 flex justify-end" onClick={() => setReview(null)}>
          <div className="bg-card border-l border-border w-full max-w-lg h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-heading text-xl">Claim Review</h2>
                <p className="text-xs font-mono text-secondary mt-0.5">{review.applicationId}</p>
              </div>
              <button onClick={() => setReview(null)} className="p-1 rounded hover:bg-muted"><X className="h-5 w-5"/></button>
            </div>
            <div className="space-y-5">
              <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground text-xs">Farmer</span><div className="font-semibold">{review.farmerName ?? "—"}</div></div>
                  <div><span className="text-muted-foreground text-xs">Farmer ID</span><div className="font-mono">{review.farmerId}</div></div>
                  <div><span className="text-muted-foreground text-xs">Mobile</span><div>{review.mobile}</div></div>
                  <div><span className="text-muted-foreground text-xs">District</span><div>{review.district ?? "—"}</div></div>
                </div>
              </div>
              <div className="bg-muted/30 rounded-xl p-4 text-sm space-y-2">
                <div><span className="text-muted-foreground text-xs">Insurance Scheme</span><div className="font-semibold">{review.schemeName}</div></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-muted-foreground text-xs">Crop</span><div>{review.crop ?? "—"}</div></div>
                  <div><span className="text-muted-foreground text-xs">Land (Acres)</span><div>{review.land ?? "—"}</div></div>
                  <div><span className="text-muted-foreground text-xs">Filed</span><div>{timeAgo(review.appliedAt)}</div></div>
                </div>
              </div>
              {review.lossDescription && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
                  <div className="text-xs font-semibold text-red-700 mb-1">Loss Description</div>
                  <p className="text-red-900">{review.lossDescription}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Current Status</span>
                <StatusBadge status={review.status}/>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block">Officer Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background border border-border rounded-xl h-24 resize-none focus:outline-none focus:ring-2 focus:ring-secondary/30"
                  placeholder="Add assessment notes…"/>
              </div>
              <div className="flex gap-2 flex-wrap">
                {review.status === "Pending" && (
                  <button disabled={saving} onClick={() => updateStatus(review.applicationId, "Under Review", notes)}
                    className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">🔍 Under Review</button>
                )}
                {(review.status === "Pending" || review.status === "Under Review") && (
                  <button disabled={saving} onClick={() => updateStatus(review.applicationId, "Approved", notes)}
                    className="text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60">✅ Approve</button>
                )}
                {review.status === "Approved" && (
                  <button disabled={saving} onClick={() => updateStatus(review.applicationId, "Settled", notes)}
                    className="text-sm px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60">💰 Settle Claim</button>
                )}
                {review.status !== "Rejected" && review.status !== "Settled" && (
                  <button disabled={saving} onClick={() => updateStatus(review.applicationId, "Rejected", notes)}
                    className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">❌ Reject</button>
                )}
                <button onClick={() => setReview(null)} className="text-sm px-4 py-2 rounded-lg bg-muted hover:bg-muted/80">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
