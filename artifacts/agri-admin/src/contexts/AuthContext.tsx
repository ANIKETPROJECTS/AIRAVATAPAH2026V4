import { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ─── Types ─── */
export type UserRole = "admin" | "district_officer" | "taluka_officer" | "viewer";

export const SECTIONS = [
  "dashboard", "newregistration", "farmers", "verifiedfarmers",
  "applications", "allschemes", "allinsurance", "allsubsidies", "subsidies", "insurance", "grievances",
  "notifications", "reports", "settings", "farmerapp", "usermanagement",
] as const;
export type SectionKey = typeof SECTIONS[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  dashboard:        "Dashboard",
  newregistration:  "New Registration",
  farmers:          "Farmer Registry",
  verifiedfarmers:  "Verified Farmers",
  applications:     "Scheme Applications",
  allschemes:       "All Schemes",
  allinsurance:     "All Insurance",
  allsubsidies:     "All Subsidies",
  subsidies:        "Subsidy Applications",
  insurance:        "Insurance Claim Applications",
  grievances:       "Grievance Management",
  notifications:    "Notification Management",
  reports:          "Reports & Analytics",
  settings:         "Settings & Workflow",
  farmerapp:        "Farmer App Preview",
  usermanagement:   "User Management",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin:             "Administrator",
  district_officer:  "District Officer",
  taluka_officer:    "Taluka Officer",
  viewer:            "Viewer",
};

export const ROLE_PRESETS: Record<UserRole, Partial<Record<SectionKey, boolean>>> = {
  admin: Object.fromEntries(SECTIONS.map(s => [s, true])) as Record<SectionKey, boolean>,
  district_officer: {
    dashboard: true, newregistration: true, farmers: true, verifiedfarmers: true,
    applications: true, allschemes: true, allinsurance: true, allsubsidies: true, subsidies: true, insurance: true, grievances: true, notifications: true, reports: true,
  },
  taluka_officer: {
    dashboard: true, newregistration: true, farmers: true, verifiedfarmers: true, grievances: true, notifications: true,
  },
  viewer: { dashboard: true, reports: true, allschemes: true, allinsurance: true, allsubsidies: true },
};

export const AVATAR_COLORS = [
  "from-emerald-500 to-teal-600", "from-green-500 to-emerald-700",
  "from-teal-500 to-green-600",   "from-lime-500 to-green-700",
  "from-emerald-600 to-teal-800", "from-teal-400 to-emerald-600",
  "from-green-600 to-teal-700",   "from-lime-600 to-emerald-700",
];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  designation: string;
  district: string;
  phone: string;
  avatarColor: string;
  avatarUrl?: string;
  permissions: Record<SectionKey, boolean>;
  createdAt: number;
  lastLogin?: number;
  active: boolean;
}

/* ─── Simple hash (not cryptographic — demo only) ─── */
function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `sh_${Math.abs(h).toString(16)}`;
}
export function hashPassword(p: string) { return simpleHash(p); }
export function checkPassword(plain: string, hash: string) { return simpleHash(plain) === hash; }

/* ─── Default seed users ─── */
function makePermissions(role: UserRole): Record<SectionKey, boolean> {
  const preset = ROLE_PRESETS[role];
  return Object.fromEntries(SECTIONS.map(s => [s, preset[s] ?? false])) as Record<SectionKey, boolean>;
}

const SEED_USERS: AppUser[] = [
  {
    id: "usr-001",
    name: "Rajesh Kumar",
    email: "admin@agri.mh.gov.in",
    passwordHash: hashPassword("Admin@123"),
    role: "admin",
    designation: "District Agricultural Officer (Admin)",
    district: "Pune",
    phone: "+91 98765 43210",
    avatarColor: AVATAR_COLORS[0],
    permissions: makePermissions("admin"),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    active: true,
  },
  {
    id: "usr-002",
    name: "Priya Deshmukh",
    email: "officer@agri.mh.gov.in",
    passwordHash: hashPassword("Officer@123"),
    role: "district_officer",
    designation: "District Agricultural Officer",
    district: "Nashik",
    phone: "+91 87654 32109",
    avatarColor: AVATAR_COLORS[1],
    permissions: makePermissions("district_officer"),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    active: true,
  },
  {
    id: "usr-003",
    name: "Suresh Patil",
    email: "taluka@agri.mh.gov.in",
    passwordHash: hashPassword("Taluka@123"),
    role: "taluka_officer",
    designation: "Taluka Agricultural Officer",
    district: "Aurangabad",
    phone: "+91 76543 21098",
    avatarColor: AVATAR_COLORS[2],
    permissions: makePermissions("taluka_officer"),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    active: true,
  },
];

/* ─── Storage ─── */
const USERS_KEY  = "agri_users_v1";
const SESSION_KEY = "agri_session_v1";

function loadUsers(): AppUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw) as AppUser[];
  } catch {}
  return SEED_USERS;
}
function saveUsers(users: AppUser[]) {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); } catch {}
}
function loadSession(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
function saveSession(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id);
    else localStorage.removeItem(SESSION_KEY);
  } catch {}
}

/* ─── Context ─── */
interface AuthContextValue {
  currentUser: AppUser | null;
  users: AppUser[];
  login: (email: string, password: string) => string | null; // returns error or null
  logout: () => void;
  addUser: (u: Omit<AppUser, "id" | "createdAt" | "passwordHash"> & { password: string }) => void;
  updateUser: (id: string, patch: Partial<AppUser> & { password?: string }) => void;
  deleteUser: (id: string) => void;
  can: (section: SectionKey) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  currentUser: null, users: [], login: () => "Not initialised",
  logout: () => {}, addUser: () => {}, updateUser: () => {}, deleteUser: () => {}, can: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(loadUsers);
  const [sessionId, setSessionId] = useState<string | null>(loadSession);

  /* Ensure seed users exist and all users have permissions for every section */
  useEffect(() => {
    setUsers(prev => {
      let changed = false;
      const emails = new Set(prev.map(u => u.email));
      const missing = SEED_USERS.filter(s => !emails.has(s.email));
      let merged = missing.length > 0 ? [...prev, ...missing] : prev;
      if (missing.length > 0) changed = true;

      merged = merged.map(u => {
        const missingPerms = SECTIONS.filter(s => !(s in u.permissions));
        if (missingPerms.length === 0) return u;
        changed = true;
        const rolePreset = ROLE_PRESETS[u.role] ?? {};
        const patch = Object.fromEntries(missingPerms.map(s => [s, rolePreset[s] ?? false]));
        return { ...u, permissions: { ...u.permissions, ...patch } };
      });

      if (!changed) return prev;
      saveUsers(merged);
      return merged;
    });
  }, []);

  useEffect(() => { saveUsers(users); }, [users]);

  const currentUser = users.find(u => u.id === sessionId) ?? null;

  const login = useCallback((email: string, password: string): string | null => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return "No account found with this email address.";
    if (!user.active) return "This account has been deactivated. Contact your administrator.";
    if (!checkPassword(password, user.passwordHash)) return "Incorrect password. Please try again.";
    const updated = { ...user, lastLogin: Date.now() };
    setUsers(prev => prev.map(u => u.id === user.id ? updated : u));
    setSessionId(user.id);
    saveSession(user.id);
    return null;
  }, [users]);

  const logout = useCallback(() => {
    setSessionId(null);
    saveSession(null);
  }, []);

  const addUser = useCallback((data: Omit<AppUser, "id" | "createdAt" | "passwordHash"> & { password: string }) => {
    const { password, ...rest } = data;
    const newUser: AppUser = {
      ...rest,
      id: `usr-${Date.now()}`,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const updateUser = useCallback((id: string, patch: Partial<AppUser> & { password?: string }) => {
    setUsers(prev => prev.map(u => {
      if (u.id !== id) return u;
      const { password, ...rest } = patch;
      const updated = { ...u, ...rest };
      if (password) updated.passwordHash = hashPassword(password);
      return updated;
    }));
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const can = useCallback((section: SectionKey): boolean => {
    if (!currentUser) return false;
    return currentUser.permissions[section] ?? false;
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, addUser, updateUser, deleteUser, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
