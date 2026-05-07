import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, Users, Loader2, AlertCircle, BadgeCheck,
  Filter, RefreshCw, MapPin,
  Shield, ChevronLeft, FileText, LifeBuoy, IndianRupee,
} from "lucide-react";
import { apiFetchFarmers, type FarmerRecord } from "@/data/farmerApi";
import VerifiedFarmerCard from "@/components/modules/VerifiedFarmerCard";
import {
  SchemeApplicationsPage,
  InsuranceApplicationsPage,
  SubsidyApplicationsPage,
  GrievancesPage,
  DocumentsPage,
} from "@/components/modules/FarmerSubPages";

/* ─── helpers ─── */
function formatLandHAR(val: number | string | undefined): string {
  if (val === undefined || val === null || val === "" || val === "0" || val === 0) return "—";
  const s = String(val).trim();
  const parts = s.split(".");
  if (parts.length === 3) return `${parts[0]} हे. ${parts[1]} आर. ${parts[2]} चौ.मी.`;
  if (parts.length === 2) return parts[1] === "0" || parts[1] === "00" ? `${parts[0]} हे.` : `${parts[0]} हे. ${parts[1]} आर.`;
  return `${s} हे.`;
}

const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-green-500 to-emerald-700",
  "from-teal-500 to-emerald-600",
  "from-lime-500 to-green-600",
  "from-emerald-400 to-green-700",
  "from-teal-400 to-teal-700",
  "from-green-600 to-emerald-800",
  "from-lime-400 to-teal-600",
];
function farmerGradient(id: string) {
  return AVATAR_GRADIENTS[parseInt(id.replace(/\D/g, "") || "0") % AVATAR_GRADIENTS.length];
}

/* ─── sub-page metadata ─── */
type SubPageKey = "scheme_apps" | "insurance_apps" | "subsidy_apps" | "grievances" | "documents";
const SUB_PAGE_META: Record<SubPageKey, { label: string; icon: React.ReactNode }> = {
  scheme_apps:    { label: "Scheme Applications",    icon: <Shield className="h-4 w-4" /> },
  insurance_apps: { label: "Insurance Applications", icon: <LifeBuoy className="h-4 w-4" /> },
  subsidy_apps:   { label: "Subsidy Applications",   icon: <IndianRupee className="h-4 w-4" /> },
  grievances:     { label: "Grievances",             icon: <AlertCircle className="h-4 w-4" /> },
  documents:      { label: "Documents",              icon: <FileText className="h-4 w-4" /> },
};

/* ─── Compact card (grid item) ─── */
function CompactFarmerCard({ farmer, onClick }: { farmer: FarmerRecord; onClick: () => void }) {
  const initials = farmer.name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const grad = farmerGradient(farmer.farmerId);
  const regDate = new Date(farmer.addedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <button
      onClick={onClick}
      className="group w-full text-left rounded-2xl border-2 border-border hover:border-secondary/60 hover:shadow-lg hover:shadow-secondary/10 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden bg-card cursor-pointer"
    >
      <div className={`h-1.5 w-full bg-gradient-to-r ${grad}`} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center font-bold text-white text-base shadow-sm flex-shrink-0`}>
            {initials}
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
              <BadgeCheck className="h-2.5 w-2.5" /> Verified
            </span>
            {farmer.source === "ocr" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold border border-teal-200">AI-OCR</span>
            )}
            {farmer.source === "mobile_ocr" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-semibold border border-teal-200">Mobile OCR</span>
            )}
            {farmer.source === "manual" && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold border border-green-200">Manual</span>
            )}
          </div>
        </div>

        <h3 className="font-bold text-sm text-foreground leading-tight truncate mb-0.5">{farmer.name}</h3>
        <p className="text-[11px] text-muted-foreground font-mono mb-1">{farmer.farmerId}</p>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{farmer.village}, {farmer.district}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
            <div className="text-[9px] text-emerald-600 uppercase tracking-wide mb-0.5 font-semibold">क्षेत्रफळ</div>
            <div className="text-[11px] font-semibold text-emerald-900 font-mono leading-tight">{formatLandHAR(farmer.land)}</div>
          </div>
          <div className="bg-lime-50 border border-lime-200 rounded-lg px-2.5 py-1.5">
            <div className="text-[9px] text-lime-700 uppercase tracking-wide mb-0.5 font-semibold">पीक</div>
            <div className="text-[11px] font-semibold text-lime-900 truncate leading-tight">{farmer.crop || "—"}</div>
          </div>
        </div>

        {farmer.aadhaar && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono font-semibold truncate max-w-full">
              Aadhaar: {farmer.aadhaar.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
            </span>
          </div>
        )}

        <div className="pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Reg: {regDate}</span>
          <span className="text-[10px] font-semibold text-secondary group-hover:underline">
            View Profile →
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─── Breadcrumb ─── */
function Breadcrumb({ farmer, subPage, onBack, onBackToProfile }: {
  farmer: FarmerRecord;
  subPage: SubPageKey | null;
  onBack: () => void;
  onBackToProfile: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-5 flex-wrap">
      <button
        onClick={subPage ? onBackToProfile : onBack}
        className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-secondary/80 bg-secondary/8 hover:bg-secondary/15 border border-secondary/20 px-4 py-2 rounded-xl transition-all flex-shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
        {subPage ? `Back to ${farmer.name.split(" ")[0]}'s Profile` : "Back to Farmers"}
      </button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <button onClick={onBack} className="hover:text-foreground transition-colors">Farmers</button>
        <span className="text-muted-foreground/40">›</span>
        <button onClick={onBackToProfile} className={`${subPage ? "hover:text-foreground" : "font-semibold text-foreground"} transition-colors`}>
          {farmer.name}
          <span className="font-mono text-xs text-muted-foreground ml-1">({farmer.farmerId})</span>
        </button>
        {subPage && <>
          <span className="text-muted-foreground/40">›</span>
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            {SUB_PAGE_META[subPage].icon}
            {SUB_PAGE_META[subPage].label}
          </span>
        </>}
      </div>
    </div>
  );
}

/* ─── Sub-page wrapper ─── */
function SubPageView({ farmer, subPage }: { farmer: FarmerRecord; subPage: SubPageKey }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [subPage]);
  const meta = SUB_PAGE_META[subPage];
  return (
    <div className="bg-white border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="border-b border-border px-6 py-4 flex items-center gap-3 bg-slate-50/70">
        <span className="text-secondary">{meta.icon}</span>
        <div>
          <h2 className="font-bold text-base text-foreground">{meta.label}</h2>
          <p className="text-xs text-muted-foreground">{farmer.name} · {farmer.farmerId}</p>
        </div>
      </div>
      <div className="p-5">
        {subPage === "scheme_apps"    && <SchemeApplicationsPage    farmer={farmer} />}
        {subPage === "insurance_apps" && <InsuranceApplicationsPage farmer={farmer} />}
        {subPage === "subsidy_apps"   && <SubsidyApplicationsPage   farmer={farmer} />}
        {subPage === "grievances"     && <GrievancesPage            farmer={farmer} />}
        {subPage === "documents"      && <DocumentsPage             farmer={farmer} />}
      </div>
    </div>
  );
}

/* ─── Profile page view ─── */
function ProfileView({ farmer, onBack, onNavigate }: {
  farmer: FarmerRecord;
  onBack: () => void;
  onNavigate: (key: string) => void;
}) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-secondary hover:text-secondary/80 bg-secondary/8 hover:bg-secondary/15 border border-secondary/20 px-4 py-2 rounded-xl transition-all flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Farmers
        </button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={onBack} className="hover:text-foreground transition-colors">Farmers</button>
          <span className="text-muted-foreground/40">›</span>
          <span className="font-semibold text-foreground">
            {farmer.name}
            <span className="font-mono text-xs text-muted-foreground ml-1">({farmer.farmerId})</span>
          </span>
        </div>
      </div>
      <VerifiedFarmerCard farmer={farmer} onNavigate={onNavigate} />
    </div>
  );
}

/* ─── Main page ─── */
export default function VerifiedFarmers() {
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [distFilter, setDistFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subPage, setSubPage] = useState<SubPageKey | null>(null);

  const loadFarmers = useCallback(async () => {
    try {
      setError("");
      const data = await apiFetchFarmers();
      setFarmers(data.filter(f => f.status === "Verified"));
    } catch {
      setError("Failed to load farmers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFarmers(); }, [loadFarmers]);
  useEffect(() => {
    const handler = () => loadFarmers();
    window.addEventListener("farmer-registry-changed", handler);
    return () => window.removeEventListener("farmer-registry-changed", handler);
  }, [loadFarmers]);

  const districts = useMemo(() => [...new Set(farmers.map(f => f.district))].sort(), [farmers]);

  const filtered = useMemo(() => farmers.filter(f => {
    const s = search.toLowerCase();
    const matchSearch = !s || f.name.toLowerCase().includes(s) || f.farmerId.toLowerCase().includes(s) || f.aadhaar.includes(s) || f.village.toLowerCase().includes(s);
    return matchSearch && (!distFilter || f.district === distFilter);
  }), [search, distFilter, farmers]);

  const selectedFarmer = farmers.find(f => f.farmerId === selectedId) ?? null;

  const handleNavigate = useCallback((key: string) => {
    setSubPage(key as SubPageKey);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  const handleBackToGrid = useCallback(() => { setSelectedId(null); setSubPage(null); }, []);
  const handleBackToProfile = useCallback(() => { setSubPage(null); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading verified farmers...</span>
      </div>
    );
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>{error}</span>
        <button onClick={loadFarmers} className="ml-auto flex items-center gap-1 text-xs underline">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      </div>
    );
  }

  /* ── Sub-page (level 3) ── */
  if (selectedFarmer && subPage) {
    return (
      <div>
        <Breadcrumb farmer={selectedFarmer} subPage={subPage} onBack={handleBackToGrid} onBackToProfile={handleBackToProfile} />
        <SubPageView farmer={selectedFarmer} subPage={subPage} />
      </div>
    );
  }

  /* ── Profile page (level 2) ── */
  if (selectedFarmer) {
    return (
      <ProfileView farmer={selectedFarmer} onBack={handleBackToGrid} onNavigate={handleNavigate} />
    );
  }

  /* ── Grid page (level 1) ── */
  return (
    <div className="space-y-5">

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <BadgeCheck className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-100", value: farmers.length, label: "Verified Farmers" },
          { icon: <MapPin className="h-5 w-5 text-teal-600" />, bg: "bg-teal-100", value: districts.length, label: "Districts Covered" },
          { icon: <Shield className="h-5 w-5 text-green-700" />, bg: "bg-green-100", value: farmers.filter(f => f.source === "ocr" || f.source === "mobile_ocr").length, label: "AI-OCR Registered" },
          { icon: <FileText className="h-5 w-5 text-lime-700" />, bg: "bg-lime-100", value: farmers.filter(f => f.docs && f.docs.length > 0).length, label: "With Documents" },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground leading-tight">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, ID, Aadhaar, village..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={distFilter}
            onChange={e => setDistFilter(e.target.value)}
            className="text-sm bg-card border border-border rounded-lg px-3 py-2"
          >
            <option value="">All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filtered.length} of {farmers.length} farmer{farmers.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Empty states */}
      {farmers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
            <Users className="h-10 w-10 text-muted-foreground/30" />
          </div>
          <div>
            <div className="text-base font-semibold text-foreground mb-1">No Verified Farmers Yet</div>
            <p className="text-sm text-muted-foreground max-w-xs">
              When a farmer is verified in the Farmer Registry, their full profile will appear here.
            </p>
          </div>
        </div>
      )}

      {farmers.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
          <Search className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No farmers match your search.</p>
          <button onClick={() => { setSearch(""); setDistFilter(""); }} className="text-xs text-secondary underline">
            Clear filters
          </button>
        </div>
      )}

      {/* 4-column grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(f => (
            <CompactFarmerCard
              key={f.farmerId}
              farmer={f}
              onClick={() => { setSelectedId(f.farmerId); setSubPage(null); }}
            />
          ))}
        </div>
      )}

    </div>
  );
}
