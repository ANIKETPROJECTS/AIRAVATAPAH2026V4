import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Dashboard from "@/components/modules/Dashboard";
import FarmerRegistry from "@/components/modules/FarmerRegistry";
import VerifiedFarmers from "@/components/modules/VerifiedFarmers";
import SchemeApplications from "@/components/modules/SchemeApplications";
import SubsidyManagement from "@/components/modules/SubsidyManagement";
import InsuranceClaims from "@/components/modules/InsuranceClaims";
import GrievanceManagement from "@/components/modules/GrievanceManagement";
import ReportsAnalytics from "@/components/modules/ReportsAnalytics";
import SettingsWorkflow from "@/components/modules/SettingsWorkflow";
import FarmerAppPreview from "@/components/modules/FarmerAppPreview";
import NewRegistration from "@/components/modules/NewRegistration";
import UserManagement from "@/components/modules/UserManagement";
import AllSchemes from "@/components/modules/AllSchemes";
import AllInsuranceSubsidies from "@/components/modules/AllInsuranceSubsidies";
import NotificationManagement from "@/components/modules/NotificationManagement";
import AIAssistant from "@/components/AIAssistant";
import { useLang } from "@/contexts/LanguageContext";
import { useAuth, type SectionKey } from "@/contexts/AuthContext";
import { t } from "@/i18n/translations";
import { Lock } from "lucide-react";

const pageTitleKeys: Record<string, string> = {
  dashboard:        "page_dashboard",
  newregistration:  "page_newregistration",
  farmers:          "page_farmers",
  verifiedfarmers:  "page_verifiedfarmers",
  applications:     "page_applications",
  allschemes:       "All Schemes",
  allinsurance:     "All Insurance",
  allsubsidies:     "All Subsidies",
  subsidies:        "page_subsidies",
  insurance:        "page_insurance",
  grievances:       "page_grievances",
  notifications:    "Notification Management",
  reports:          "page_reports",
  settings:         "page_settings",
  farmerapp:        "page_farmerapp",
  usermanagement:   "User Management",
};

function AccessDenied({ section }: { section: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
        <Lock className="h-8 w-8 text-slate-400"/>
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-700 mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You don't have permission to access <strong>{section}</strong>. Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}

export default function Index() {
  const [active, setActive] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const { lang } = useLang();
  const { can } = useAuth();

  useEffect(() => {
    const check = () => setCollapsed(window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const navigate = (key: string) => {
    if (key === active) return;
    setLoading(true);
    setTimeout(() => { setActive(key); setLoading(false); }, 200);
  };

  const pageTitle = pageTitleKeys[active]
    ? (["usermanagement", "allschemes", "allinsurance", "allsubsidies"].includes(active) ? pageTitleKeys[active] : t(pageTitleKeys[active], lang))
    : active;

  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse"/>)}
        </div>
      );
    }

    const section = active as SectionKey;
    if (!can(section)) return <AccessDenied section={pageTitleKeys[active] || active}/>;

    if (active === "farmers")         return <FarmerRegistry onNavigate={navigate}/>;
    if (active === "dashboard")       return <Dashboard/>;
    if (active === "newregistration") return <NewRegistration/>;
    if (active === "verifiedfarmers") return <VerifiedFarmers/>;
    if (active === "applications")    return <SchemeApplications/>;
    if (active === "allschemes")      return <AllSchemes/>;
    if (active === "allinsurance")    return <AllInsuranceSubsidies defaultTypeFilter="Insurance"/>;
    if (active === "allsubsidies")    return <AllInsuranceSubsidies defaultTypeFilter="Subsidy"/>;
    if (active === "subsidies")       return <SubsidyManagement/>;
    if (active === "insurance")       return <InsuranceClaims/>;
    if (active === "grievances")      return <GrievanceManagement/>;
    if (active === "notifications")   return <NotificationManagement onNavigate={navigate}/>;
    if (active === "reports")         return <ReportsAnalytics/>;
    if (active === "settings")        return <SettingsWorkflow/>;
    if (active === "farmerapp")       return <FarmerAppPreview/>;
    if (active === "usermanagement")  return <UserManagement/>;
    return <Dashboard/>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar active={active} onNavigate={navigate} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)}/>

      <div className={`transition-all duration-300 ${collapsed ? "ml-16" : "ml-60"}`}>
        <Header onAIOpen={() => setAiOpen(true)} onNavigate={navigate}/>

        <main className="p-6">
          <h1 className="font-heading text-2xl mb-6">{pageTitle}</h1>
          {renderContent()}
        </main>
      </div>

      <AIAssistant open={aiOpen} onClose={() => setAiOpen(false)}/>
    </div>
  );
}
