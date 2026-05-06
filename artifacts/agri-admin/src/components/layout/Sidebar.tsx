import { useState, useRef, useCallback } from "react";
import {
  BarChart3, Users, ClipboardList, IndianRupee, Shield, Megaphone,
  TrendingUp, Settings, ChevronLeft, ChevronRight, Smartphone,
  UserPlus, UserCheck, UsersRound, BookOpen, ShieldCheck, Coins,
  FolderOpen, Database as DatabaseIcon, BellRing,
} from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth, type SectionKey } from "@/contexts/AuthContext";
import { t } from "@/i18n/translations";

/* ── Types ─────────────────────────────────────────────────── */
interface NavItem {
  key: SectionKey;
  labelKey: string;
  icon: React.ElementType;
}
interface NavGroup {
  groupKey: string;
  label: string;
  icon: React.ElementType;
  children: NavItem[];
}
type NavEntry = NavItem | NavGroup;
function isGroup(e: NavEntry): e is NavGroup { return "children" in e; }

/* ── Nav structure ──────────────────────────────────────────── */
const NAV_ENTRIES: NavEntry[] = [
  { key: "dashboard",       labelKey: "nav_dashboard",       icon: BarChart3 },
  { key: "newregistration", labelKey: "nav_newregistration", icon: UserPlus },
  { key: "farmers",         labelKey: "nav_farmers",         icon: Users },
  { key: "verifiedfarmers", labelKey: "nav_verifiedfarmers", icon: UserCheck },
  {
    groupKey: "applications",
    label: "Applications",
    icon: FolderOpen,
    children: [
      { key: "applications", labelKey: "nav_applications", icon: ClipboardList },
      { key: "subsidies",    labelKey: "nav_subsidies",    icon: IndianRupee },
      { key: "insurance",    labelKey: "nav_insurance",    icon: Shield },
    ],
  },
  {
    groupKey: "database",
    label: "Database",
    icon: DatabaseIcon,
    children: [
      { key: "allschemes",   labelKey: "nav_allschemes",   icon: BookOpen },
      { key: "allinsurance", labelKey: "nav_allinsurance", icon: ShieldCheck },
      { key: "allsubsidies", labelKey: "nav_allsubsidies", icon: Coins },
    ],
  },
  { key: "grievances",     labelKey: "nav_grievances",     icon: Megaphone },
  { key: "notifications",  labelKey: "nav_notifications",  icon: BellRing },
  { key: "reports",        labelKey: "nav_reports",        icon: TrendingUp },
  { key: "settings",   labelKey: "nav_settings",   icon: Settings },
  { key: "farmerapp",  labelKey: "nav_farmerapp",  icon: Smartphone },
];

const USER_MGMT: NavItem = { key: "usermanagement", labelKey: "nav_usermanagement", icon: UsersRound };

/* ── Sidebar props ──────────────────────────────────────────── */
interface SidebarProps {
  active: string;
  onNavigate: (key: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ active, onNavigate, collapsed, onToggle }: SidebarProps) {
  const { lang } = useLang();
  const { can } = useAuth();

  const [openGroup, setOpenGroup] = useState<{ key: string; top: number } | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarW = collapsed ? 64 : 240;

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpenGroup(null), 120);
  }, []);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const handleGroupEnter = useCallback((e: React.MouseEvent<HTMLButtonElement>, groupKey: string) => {
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    setOpenGroup({ key: groupKey, top: rect.top });
  }, [cancelClose]);

  const currentGroup = openGroup
    ? (NAV_ENTRIES.find(e => isGroup(e) && e.groupKey === openGroup.key) as NavGroup | undefined)
    : undefined;

  const activeInGroup = (group: NavGroup) => group.children.some(c => c.key === active);

  /* ── Render a flat nav item ── */
  const renderItem = (item: NavItem) => {
    if (!can(item.key)) return null;
    const isActive = active === item.key;
    const label = t(item.labelKey, lang as "en") || item.labelKey;
    return (
      <button
        key={item.key}
        onClick={() => onNavigate(item.key)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          isActive
            ? "bg-secondary/15 text-secondary border-r-2 border-secondary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? label : undefined}
      >
        <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
        {!collapsed && <span>{label}</span>}
      </button>
    );
  };

  /* ── Render a group trigger ── */
  const renderGroup = (group: NavGroup) => {
    const visibleChildren = group.children.filter(c => can(c.key));
    if (visibleChildren.length === 0) return null;
    const isCurrentGroup = openGroup?.key === group.groupKey;
    const groupActive = activeInGroup(group);

    return (
      <button
        key={group.groupKey}
        onMouseEnter={e => handleGroupEnter(e, group.groupKey)}
        onMouseLeave={scheduleClose}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
          groupActive || isCurrentGroup
            ? "bg-secondary/15 text-secondary border-r-2 border-secondary"
            : "text-sidebar-foreground hover:bg-sidebar-accent"
        } ${collapsed ? "justify-center" : ""}`}
        title={collapsed ? group.label : undefined}
      >
        <group.icon className="h-4.5 w-4.5 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{group.label}</span>
            <ChevronRight className={`h-3.5 w-3.5 opacity-60 transition-transform ${isCurrentGroup ? "rotate-90" : ""}`} />
          </>
        )}
      </button>
    );
  };

  return (
    <>
      <aside
        className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${collapsed ? "w-16" : "w-60"}`}
        style={{ backgroundColor: "#0D2B1E" }}
      >
        {/* Logo */}
        <div className="border-b border-sidebar-border overflow-hidden" style={{ padding: "0 10px" }}>
          <img
            src="/krishi-suvidha-logo.png"
            alt="Krishi Suvidha"
            className="w-full h-auto object-contain"
            style={{ marginTop: "-18%", marginBottom: "-18%" }}
          />
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ENTRIES.map(entry => isGroup(entry) ? renderGroup(entry) : renderItem(entry))}

          {can("usermanagement") && (
            <>
              <div className={`${collapsed ? "mx-2" : "mx-4"} my-2 border-t border-white/10`} />
              {renderItem(USER_MGMT)}
            </>
          )}
        </nav>

        <button
          onClick={onToggle}
          className="p-3 text-sidebar-foreground hover:text-secondary transition-colors border-t border-sidebar-border"
        >
          {collapsed ? <ChevronRight className="h-4 w-4 mx-auto" /> : <ChevronLeft className="h-4 w-4 mx-auto" />}
        </button>
      </aside>

      {/* Flyout — rendered in a portal-like fixed layer above everything */}
      {currentGroup && openGroup && (() => {
        const visibleChildren = currentGroup.children.filter(c => can(c.key));
        if (visibleChildren.length === 0) return null;
        return (
          <div
            className="fixed z-[9999]"
            style={{ left: sidebarW, top: openGroup.top }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {/* Invisible bridge strip so cursor can travel from sidebar button to panel */}
            <div className="absolute inset-y-0 -left-1 w-2" />

            <div
              className="min-w-[230px] rounded-r-xl shadow-2xl overflow-hidden"
              style={{
                background: "#112D1F",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "4px 4px 24px rgba(0,0,0,0.5)",
              }}
            >
              {/* Group header */}
              <div
                className="flex items-center gap-2.5 px-4 py-3 border-b"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}
              >
                <currentGroup.icon className="h-4 w-4 flex-shrink-0" style={{ color: "#D97706" }} />
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#D97706" }}>
                  {currentGroup.label}
                </span>
              </div>

              {/* Child items */}
              <div className="py-1.5">
                {visibleChildren.map(child => {
                  const label = t(child.labelKey, lang as "en") || child.labelKey;
                  const isActive = active === child.key;
                  return (
                    <button
                      key={child.key}
                      onClick={() => { onNavigate(child.key); setOpenGroup(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors"
                      style={
                        isActive
                          ? { background: "rgba(22,163,74,0.18)", color: "#86EFAC", borderRight: "2px solid #16A34A" }
                          : { color: "#CBD5E1" }
                      }
                      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "#CBD5E1"; }}}
                    >
                      <child.icon className="h-4 w-4 flex-shrink-0" style={{ opacity: 0.8 }} />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
