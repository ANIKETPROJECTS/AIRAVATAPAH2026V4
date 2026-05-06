import { useState, useMemo } from "react";
import {
  Bell, BellOff, CheckCheck, Trash2, Search, Filter,
  Shield, AlertTriangle, Ticket, CheckCircle2, Info,
  SortAsc, SortDesc, ChevronDown, X,
} from "lucide-react";
import { useNotifications, type AppNotification, type NotificationType } from "@/contexts/NotificationContext";

/* ── helpers ── */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_LABELS: Record<NotificationType | "all" | "unread", string> = {
  all: "All",
  unread: "Unread",
  farmer: "Farmer",
  grievance: "Grievance",
  scheme: "Scheme",
  ticket: "Ticket",
  system: "System",
};

const TYPE_COLORS: Record<NotificationType, string> = {
  farmer:    "bg-emerald-100 text-emerald-700 border-emerald-200",
  grievance: "bg-lime-100 text-lime-700 border-lime-200",
  scheme:    "bg-teal-100 text-teal-700 border-teal-200",
  ticket:    "bg-green-100 text-green-700 border-green-200",
  system:    "bg-slate-100 text-slate-600 border-slate-200",
};

function NotifIcon({ type }: { type: NotificationType }) {
  const base = "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0";
  if (type === "scheme")    return <div className={`${base} bg-teal-100`}><Shield className="h-4 w-4 text-teal-600"/></div>;
  if (type === "grievance") return <div className={`${base} bg-lime-100`}><AlertTriangle className="h-4 w-4 text-lime-700"/></div>;
  if (type === "ticket")    return <div className={`${base} bg-green-100`}><Ticket className="h-4 w-4 text-green-700"/></div>;
  if (type === "farmer")    return <div className={`${base} bg-emerald-100`}><CheckCircle2 className="h-4 w-4 text-emerald-600"/></div>;
  return <div className={`${base} bg-slate-100`}><Info className="h-4 w-4 text-slate-500"/></div>;
}

type FilterKey = NotificationType | "all" | "unread";
type SortKey = "newest" | "oldest" | "unread_first";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest",       label: "Newest first" },
  { key: "oldest",       label: "Oldest first" },
  { key: "unread_first", label: "Unread first" },
];

export default function NotificationManagement({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const { notifications, unreadCount, markRead, markAllRead, deleteNotification, clearAll } = useNotifications();

  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState<FilterKey>("all");
  const [sort,     setSort]     = useState<SortKey>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortOpen, setSortOpen] = useState(false);

  /* ── stats ── */
  const stats = useMemo(() => ({
    total:     notifications.length,
    unread:    unreadCount,
    farmer:    notifications.filter(n => n.type === "farmer").length,
    grievance: notifications.filter(n => n.type === "grievance").length,
    scheme:    notifications.filter(n => n.type === "scheme").length,
    ticket:    notifications.filter(n => n.type === "ticket").length,
    system:    notifications.filter(n => n.type === "system").length,
  }), [notifications, unreadCount]);

  /* ── filtered + sorted list ── */
  const filtered = useMemo(() => {
    let list = [...notifications];
    if (filter === "unread")  list = list.filter(n => !n.read);
    else if (filter !== "all") list = list.filter(n => n.type === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        (n.farmerId ?? "").toLowerCase().includes(q) ||
        (n.farmerName ?? "").toLowerCase().includes(q)
      );
    }

    if (sort === "newest")       list.sort((a, b) => b.timestamp - a.timestamp);
    else if (sort === "oldest")  list.sort((a, b) => a.timestamp - b.timestamp);
    else                         list.sort((a, b) => (Number(a.read) - Number(b.read)) || (b.timestamp - a.timestamp));

    return list;
  }, [notifications, filter, search, sort]);

  /* ── selection helpers ── */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(n => n.id)));
  };
  const deleteSelected = () => {
    selected.forEach(id => deleteNotification(id));
    setSelected(new Set());
  };

  const TYPE_TO_PAGE: Record<NotificationType, string> = {
    farmer: "farmers", grievance: "grievances",
    scheme: "applications", ticket: "applications", system: "dashboard",
  };

  return (
    <div className="space-y-5">
      {/* ── Stats bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {([
          { label: "Total",     value: stats.total,     color: "text-slate-700",   bg: "bg-slate-50   border-slate-200" },
          { label: "Unread",    value: stats.unread,    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Farmer",    value: stats.farmer,    color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          { label: "Grievance", value: stats.grievance, color: "text-lime-700",    bg: "bg-lime-50    border-lime-200" },
          { label: "Scheme",    value: stats.scheme,    color: "text-teal-700",    bg: "bg-teal-50    border-teal-200" },
          { label: "Ticket",    value: stats.ticket,    color: "text-green-700",   bg: "bg-green-50   border-green-200" },
          { label: "System",    value: stats.system,    color: "text-slate-500",   bg: "bg-slate-50   border-slate-200" },
        ] as const).map(s => (
          <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, message, farmer ID or name…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/30 bg-background"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5"/>
            </button>
          )}
        </div>

        {/* Filter chips + sort */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>
            {(["all", "unread", "farmer", "grievance", "scheme", "ticket", "system"] as FilterKey[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  filter === f
                    ? "bg-secondary text-white border-secondary"
                    : "bg-background border-border text-muted-foreground hover:border-secondary/50 hover:text-foreground"
                }`}
              >
                {TYPE_LABELS[f]}
                {f !== "all" && f !== "unread" && (
                  <span className="ml-1 opacity-60">
                    ({f === "farmer" ? stats.farmer : f === "grievance" ? stats.grievance : f === "scheme" ? stats.scheme : f === "ticket" ? stats.ticket : stats.system})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              {sort === "oldest" ? <SortAsc className="h-3.5 w-3.5"/> : <SortDesc className="h-3.5 w-3.5"/>}
              {SORT_OPTIONS.find(s => s.key === sort)?.label}
              <ChevronDown className={`h-3 w-3 transition-transform ${sortOpen ? "rotate-180" : ""}`}/>
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-border rounded-xl shadow-lg z-20 overflow-hidden">
                {SORT_OPTIONS.map(o => (
                  <button
                    key={o.key}
                    onClick={() => { setSort(o.key); setSortOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${sort === o.key ? "bg-secondary/10 text-secondary font-semibold" : "hover:bg-muted text-foreground"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bulk action bar ── */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded accent-secondary"
              />
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </label>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5"/>Delete selected ({selected.size})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                <CheckCheck className="h-3.5 w-3.5"/>Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={() => { clearAll(); setSelected(new Set()); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-100 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5"/>Delete all
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── List ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
              <BellOff className="h-7 w-7 text-slate-400"/>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-600 mb-1">
                {notifications.length === 0 ? "No notifications yet" : "No results found"}
              </div>
              <p className="text-xs text-muted-foreground max-w-xs">
                {notifications.length === 0
                  ? "System events like farmer verifications, grievances, and scheme applications will appear here."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
            {search && <button onClick={() => setSearch("")} className="text-xs text-secondary hover:underline">Clear search</button>}
          </div>
        ) : (
          <div>
            {filtered.map((n, idx) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-4 py-3.5 border-b border-border/50 last:border-0 transition-colors ${
                  !n.read ? "bg-emerald-50/30" : "bg-white"
                } ${selected.has(n.id) ? "bg-emerald-50/60" : ""}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selected.has(n.id)}
                  onChange={() => toggleSelect(n.id)}
                  className="mt-1 w-4 h-4 rounded accent-secondary flex-shrink-0"
                />

                {/* Icon */}
                <NotifIcon type={n.type}/>

                {/* Content — clickable to navigate */}
                <button
                  className="flex-1 min-w-0 text-left"
                  onClick={() => {
                    if (!n.read) markRead(n.id);
                    onNavigate?.(TYPE_TO_PAGE[n.type] ?? "dashboard");
                  }}
                >
                  <div className="flex items-start gap-2 justify-between">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className={`text-sm font-semibold truncate ${!n.read ? "text-slate-900" : "text-slate-600"}`}>
                        {n.title}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${TYPE_COLORS[n.type]}`}>
                        {TYPE_LABELS[n.type]}
                      </span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"/>}
                    </div>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0 mt-0.5">{timeAgo(n.timestamp)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                  {(n.farmerId || n.farmerName) && (
                    <div className="flex items-center gap-2 mt-1">
                      {n.farmerId   && <span className="text-[10px] font-mono text-secondary">{n.farmerId}</span>}
                      {n.farmerName && <span className="text-[10px] text-muted-foreground">{n.farmerName}</span>}
                    </div>
                  )}
                </button>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.read && (
                    <button
                      onClick={() => markRead(n.id)}
                      title="Mark as read"
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5"/>
                    </button>
                  )}
                  <button
                    onClick={() => { deleteNotification(n.id); setSelected(prev => { const s = new Set(prev); s.delete(n.id); return s; }); }}
                    title="Delete"
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5"/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-border bg-slate-50">
            <span className="text-[11px] text-muted-foreground">
              Showing {filtered.length} of {notifications.length} notifications
              {filter !== "all" && ` · filtered by "${TYPE_LABELS[filter]}"`}
              {search && ` · matching "${search}"`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
