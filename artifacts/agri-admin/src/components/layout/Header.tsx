import { useState, useEffect, useRef } from "react";
import {
  Bell, MessageSquare, Shield, AlertTriangle, Ticket,
  CheckCircle2, Info, X, BellOff, CheckCheck,
  LogOut, User, Settings, ChevronDown, Clock, Mail, Phone, MapPin, Edit2,
} from "lucide-react";
import { useNotifications, type AppNotification, type NotificationType } from "@/contexts/NotificationContext";
import { useAuth, ROLE_LABELS, SECTION_LABELS, type SectionKey } from "@/contexts/AuthContext";
import MyProfile from "@/components/modules/MyProfile";

/* ── time-ago helper ── */
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

/* ── Notif icon ── */
function NotifIcon({ type }: { type: NotificationType }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
  if (type === "scheme")    return <div className={`${base} bg-teal-100`}><Shield className="h-4 w-4 text-teal-600"/></div>;
  if (type === "grievance") return <div className={`${base} bg-lime-100`}><AlertTriangle className="h-4 w-4 text-lime-700"/></div>;
  if (type === "ticket")    return <div className={`${base} bg-green-100`}><Ticket className="h-4 w-4 text-green-700"/></div>;
  if (type === "farmer")    return <div className={`${base} bg-emerald-100`}><CheckCircle2 className="h-4 w-4 text-emerald-600"/></div>;
  return <div className={`${base} bg-slate-100`}><Info className="h-4 w-4 text-slate-500"/></div>;
}

/* ── Type → page mapping ── */
const TYPE_TO_PAGE: Record<NotificationType, string> = {
  farmer:    "farmers",
  grievance: "grievances",
  scheme:    "applications",
  ticket:    "applications",
  system:    "dashboard",
};

/* ── Notif row ── */
function NotifRow({ n, onRead, onNavigate, onClose }: {
  n: AppNotification;
  onRead: () => void;
  onNavigate?: (key: string) => void;
  onClose: () => void;
}) {
  function handleClick() {
    onRead();
    if (onNavigate) {
      onNavigate(TYPE_TO_PAGE[n.type] ?? "dashboard");
      onClose();
    }
  }
  return (
    <button onClick={handleClick}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-border/50 last:border-0 ${!n.read ? "bg-emerald-50/40" : ""}`}>
      <NotifIcon type={n.type}/>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs font-semibold leading-tight ${!n.read ? "text-slate-900" : "text-slate-600"}`}>{n.title}</span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">{timeAgo(n.timestamp)}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.body}</p>
        {n.farmerId && <span className="text-[10px] font-mono text-secondary mt-1 block">{n.farmerId}</span>}
      </div>
      {!n.read && <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5"/>}
    </button>
  );
}

/* ── Notification panel ── */
function NotifPanel({ onClose, onNavigate }: { onClose: () => void; onNavigate?: (key: string) => void }) {
  const { notifications, unreadCount, markRead, markAllRead, clearAll } = useNotifications();
  return (
    <div className="absolute right-0 top-full mt-2 w-[360px] bg-white border border-border rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-slate-50">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-secondary"/>
          <span className="font-bold text-sm text-foreground">Notifications</span>
          {unreadCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold">{unreadCount} new</span>}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-secondary hover:text-secondary/80 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors font-semibold">
              <CheckCheck className="h-3.5 w-3.5"/>Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={clearAll} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="h-3 w-3"/>Clear
            </button>
          )}
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 transition-colors ml-1"><X className="h-3.5 w-3.5 text-muted-foreground"/></button>
        </div>
      </div>
      <div className="max-h-[380px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center"><BellOff className="h-6 w-6 text-slate-400"/></div>
            <div>
              <div className="text-sm font-semibold text-slate-600 mb-1">All caught up!</div>
              <p className="text-xs text-muted-foreground">No notifications yet. Actions like scheme applications, grievances, and ticket submissions will appear here.</p>
            </div>
          </div>
        ) : notifications.map(n => (
          <NotifRow key={n.id} n={n} onRead={() => markRead(n.id)} onNavigate={onNavigate} onClose={onClose}/>
        ))}
      </div>
      {notifications.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{notifications.length} total · {unreadCount} unread</span>
          <button
            onClick={() => { onNavigate?.("notifications"); onClose(); }}
            className="text-[11px] text-secondary hover:text-secondary/80 font-semibold hover:underline"
          >
            Manage all →
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Avatar component ── */
function UserAvatar({ size = "md" }: { size?: "sm" | "md" }) {
  const { currentUser } = useAuth();
  if (!currentUser) return null;
  const sz = size === "sm" ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs";
  const initials = currentUser.name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  if (currentUser.avatarUrl) {
    return <img src={currentUser.avatarUrl} alt={currentUser.name} className={`${sz} rounded-full object-cover border-2 border-white/20`}/>;
  }
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center font-bold text-white`}>
      {initials}
    </div>
  );
}

/* ── Profile dropdown panel ── */
function ProfilePanel({ onClose, onNavigateSettings, onEditProfile }: { onClose: () => void; onNavigateSettings: () => void; onEditProfile: () => void }) {
  const { currentUser, logout, can } = useAuth();
  if (!currentUser) return null;

  const enabledSections = (Object.keys(currentUser.permissions) as SectionKey[]).filter(k => currentUser.permissions[k]);

  return (
    <div className="absolute right-0 top-full mt-2 w-[320px] bg-white border border-border rounded-2xl shadow-2xl shadow-black/10 z-50 overflow-hidden">
      {/* User info */}
      <div className="p-5 border-b border-slate-100" style={{ background: "linear-gradient(135deg, #0D2B1E, #1a4a30)" }}>
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow"/>
            ) : (
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${currentUser.avatarColor} flex items-center justify-center font-bold text-white text-lg shadow`}>
                {currentUser.name.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-white text-sm truncate">{currentUser.name}</div>
            <div className="text-[11px] text-white/60 truncate">{currentUser.designation}</div>
            <span className="mt-1 inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: "rgba(74,222,128,0.2)", color: "#4ade80" }}>
              {ROLE_LABELS[currentUser.role]}
            </span>
          </div>
          <button onClick={() => { onEditProfile(); onClose(); }}
            title="Edit profile"
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors mt-0.5">
            <Edit2 className="h-3.5 w-3.5 text-white/60"/>
          </button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Mail className="h-3 w-3 flex-shrink-0"/><span className="truncate">{currentUser.email}</span>
          </div>
          {currentUser.phone && <div className="flex items-center gap-2 text-[11px] text-white/50">
            <Phone className="h-3 w-3 flex-shrink-0"/><span>{currentUser.phone}</span>
          </div>}
          {currentUser.district && <div className="flex items-center gap-2 text-[11px] text-white/50">
            <MapPin className="h-3 w-3 flex-shrink-0"/><span>{currentUser.district} District</span>
          </div>}
        </div>
      </div>

      {/* Permissions summary */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Access ({enabledSections.length} sections)</div>
        <div className="flex flex-wrap gap-1">
          {enabledSections.map(s => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              {SECTION_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        <button onClick={() => { onEditProfile(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors">
          <Edit2 className="h-4 w-4 text-emerald-500"/><span className="font-semibold">Edit My Profile</span>
        </button>
        {can("settings") && (
          <button onClick={() => { onNavigateSettings(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
            <Settings className="h-4 w-4 text-slate-400"/><span>Settings & Workflow</span>
          </button>
        )}
        {can("usermanagement") && (
          <button onClick={() => { onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
            <User className="h-4 w-4 text-slate-400"/><span>User Management</span>
          </button>
        )}
        <button onClick={() => { logout(); onClose(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors mt-1">
          <LogOut className="h-4 w-4"/><span className="font-semibold">Sign Out</span>
        </button>
      </div>

      {currentUser.lastLogin && (
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <Clock className="h-3 w-3"/>Last login: {timeAgo(currentUser.lastLogin)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main header ── */
export default function Header({ onAIOpen, onNavigate }: { onAIOpen: () => void; onNavigate?: (key: string) => void }) {
  const [time, setTime] = useState(new Date());
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();
  const { currentUser } = useAuth();

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!notifOpen && !profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen, profileOpen]);

  return (
    <>
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card">
      <div className="text-sm text-muted-foreground">
        {time.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        {" · "}
        {time.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onAIOpen}
          className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors">
          <MessageSquare className="h-4 w-4"/>
          <span className="hidden sm:inline">AI Assistant</span>
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"/>
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(o => !o); setProfileOpen(false); }}
            className={`relative p-2 rounded-lg transition-colors ${notifOpen ? "bg-emerald-50 text-secondary" : "hover:bg-muted"}`}>
            <Bell className={`h-5 w-5 ${notifOpen ? "text-secondary" : "text-foreground"}`}/>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-emerald-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && <NotifPanel onClose={() => setNotifOpen(false)} onNavigate={onNavigate}/>}
        </div>

        {/* Profile button */}
        <div className="relative" ref={profileRef}>
          <button onClick={() => { setProfileOpen(o => !o); setNotifOpen(false); }}
            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-colors ${profileOpen ? "bg-slate-100" : "hover:bg-muted"}`}>
            <UserAvatar/>
            <div className="hidden md:block text-xs text-left">
              <div className="font-semibold text-foreground leading-tight">{currentUser?.name}</div>
              <div className="text-muted-foreground text-[10px] leading-tight">{currentUser?.designation}</div>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`}/>
          </button>
          {profileOpen && (
            <ProfilePanel
              onClose={() => setProfileOpen(false)}
              onNavigateSettings={() => onNavigate?.("settings")}
              onEditProfile={() => setProfileEditOpen(true)}
            />
          )}
        
        </div>
      </div>
    </header>
    {profileEditOpen && <MyProfile onClose={() => setProfileEditOpen(false)}/>}
  </>
  );
}
