/**
 * grievanceClassifier.ts
 * Keyword-based grievance classification, priority detection,
 * urgency scoring, auto-routing, and predefined response templates.
 * No AI / API dependencies.
 */

export interface GrievanceInput {
  grievanceId?: string;
  category?: string;
  subject?: string;
  description?: string;
  status?: string;
  priority?: string;
  createdAt?: string;
  adminReply?: string | null;
  rejectionReason?: string | null;
}

export interface GrievanceAdvice {
  grievanceId: string;
  category: string;
  subject: string;
  status: string;
  priority: "High" | "Medium" | "Low";
  resolution: string;
  steps: string[];
  estimatedTime: string;
  escalate: boolean;
  urgencyScore: number;
  suggestedTemplate: string;
  routeTo: string;
}

export interface GrievanceAdvisorResult {
  overview: string;
  urgentAction: string | null;
  advice: GrievanceAdvice[];
}

/* ── Category keyword rules ───────────────────────────────────────── */
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  {
    category: "Payment Delay",
    keywords: ["payment not received", "payment pending", "stipend pending", "money not credited", "amount not received",
      "disbursement not done", "subsidy not credited", "funds not transferred", "cheque not received",
      "bank credit", "not received payment", "installment pending", "pm kisan not received"],
  },
  {
    category: "Scheme Rejection",
    keywords: ["scheme rejected", "application rejected", "rejected without reason", "unfairly rejected",
      "rejection notice", "not approved", "disapproved", "denied application", "not eligible notice"],
  },
  {
    category: "Document Issue",
    keywords: ["document", "aadhaar", "passbook", "form 7", "form 12", "form 8a", "satbara", "land record",
      "certificate", "verification failed", "document mismatch", "wrong document", "incomplete document",
      "upload failed", "ocr error", "paper not accepted"],
  },
  {
    category: "Technical Problem",
    keywords: ["portal error", "website down", "app not working", "login failed", "otp not received",
      "system error", "technical issue", "cannot upload", "page not loading", "server error",
      "app crash", "not able to submit", "form not submitting"],
  },
  {
    category: "Application Status",
    keywords: ["application status", "no update", "pending for long", "no response", "not processed",
      "long delay", "waiting for approval", "under review too long", "status not updated",
      "application stuck", "months pending"],
  },
  {
    category: "Land Verification",
    keywords: ["land dispute", "survey number", "wrong survey", "land boundary", "encroachment",
      "land record incorrect", "wrong khasra", "land ownership", "title deed", "7/12 wrong",
      "mutation pending", "talathi", "patwari"],
  },
  {
    category: "Bank Account Issue",
    keywords: ["bank account", "account number wrong", "ifsc wrong", "bank not linked", "aadhaar bank",
      "bank seeding", "npci", "bank frozen", "account closed", "wrong bank details",
      "bank update required", "dbt link"],
  },
];

/* ── Priority / urgency keywords ─────────────────────────────────── */
const HIGH_PRIORITY_KEYWORDS = [
  "urgent", "immediately", "critical", "emergency", "severe", "dying crop",
  "loan", "debt", "harassment", "threat", "bribe", "corruption",
  "payment not received", "money not credited", "family suffering",
  "crop destroyed", "drought", "flood damage", "natural disaster",
];
const ESCALATION_KEYWORDS = [
  "bribe", "corruption", "harassment", "threat", "fraudulent", "cheating",
  "misappropriation", "illegal", "force", "blackmail",
];

/* ── Resolution templates ─────────────────────────────────────────── */
const RESOLUTION_TEMPLATES: Record<string, { resolution: string; steps: string[]; estimatedTime: string; routeTo: string; template: string }> = {
  "Payment Delay": {
    resolution: "Verify DBT linkage between Aadhaar and bank account, then check payment transaction logs in scheme portal.",
    steps: [
      "Check if Aadhaar is seeded with the farmer's active bank account via NPCI portal",
      "Verify payment transaction status in PM-KISAN / scheme portal using farmer ID",
      "If transaction shows 'failed', raise a correction request with PFMS or respective department",
      "Confirm farmer's bank account is operational and not frozen/dormant",
      "Issue acknowledgement to farmer with expected resolution timeline",
    ],
    estimatedTime: "5–10 working days",
    routeTo: "Finance & DBT Cell",
    template: "Dear [Farmer Name], your payment grievance has been registered (ID: [GID]). We are verifying your DBT linkage and payment status. Resolution expected within 10 working days. Contact helpline: 1800-180-1551.",
  },
  "Scheme Rejection": {
    resolution: "Review the rejection reason in the application portal and verify if the rejection was based on correct eligibility criteria.",
    steps: [
      "Open the farmer's application in the scheme management portal",
      "Check the automated rejection reason and validate against actual farmer eligibility criteria",
      "If rejection was erroneous, initiate a re-review with department supervisor",
      "Provide the farmer with the specific rejection reason in writing",
      "If farmer is eligible, guide them to re-apply with corrected documents",
    ],
    estimatedTime: "7–15 working days",
    routeTo: "Scheme Implementation Cell",
    template: "Dear [Farmer Name], your application rejection grievance (ID: [GID]) is under review. We will verify the rejection grounds and communicate within 15 working days. Helpline: 1800-180-1551.",
  },
  "Document Issue": {
    resolution: "Identify the specific document causing the issue, guide farmer to re-upload or visit taluka office for physical verification.",
    steps: [
      "Identify which document has the error or mismatch (Aadhaar, passbook, land record, etc.)",
      "Check if the issue is an OCR extraction error that can be manually corrected",
      "If document is genuinely incorrect, inform farmer to obtain a corrected copy from issuing authority",
      "Provide step-by-step guidance for re-uploading on the portal",
      "Schedule physical verification at taluka office if digital upload continues to fail",
    ],
    estimatedTime: "3–7 working days",
    routeTo: "Taluka Registration Officer",
    template: "Dear [Farmer Name], your document grievance (ID: [GID]) has been noted. Please visit the nearest taluka office with original documents for physical verification. Our officer will assist you.",
  },
  "Technical Problem": {
    resolution: "Log the technical issue with the portal helpdesk and provide farmer with alternative submission channel.",
    steps: [
      "Reproduce the technical issue and document the error message or screenshot",
      "Raise a support ticket with the portal technical team (NIC/IT Cell)",
      "Provide farmer with alternative submission method (offline form / taluka office)",
      "Follow up with technical team within 48 hours",
      "Confirm resolution and guide farmer to re-attempt the portal action",
    ],
    estimatedTime: "2–5 working days",
    routeTo: "IT / NIC Help Desk",
    template: "Dear [Farmer Name], we have logged your technical issue (ID: [GID]) with our technical team. You may alternatively submit your application at the nearest Common Service Centre (CSC). Expected resolution: 5 working days.",
  },
  "Application Status": {
    resolution: "Check application status in the backend system and provide updated status to farmer with reason for any delays.",
    steps: [
      "Look up the application in the scheme portal using farmer ID or application ID",
      "Identify the current processing stage and the officer responsible",
      "If application has been idle for more than 30 days, escalate to the concerned department head",
      "Update the farmer-facing status on the portal",
      "Send written status update to farmer via mobile/postal communication",
    ],
    estimatedTime: "2–5 working days",
    routeTo: "Application Processing Cell",
    template: "Dear [Farmer Name], your application status inquiry (ID: [GID]) has been reviewed. Your application is currently [STATUS]. Expected decision timeline: [DATE]. Contact us for further assistance.",
  },
  "Land Verification": {
    resolution: "Initiate fresh land record verification through taluka office and cross-check with State Land Records department.",
    steps: [
      "Pull the farmer's land records from the State Land Records portal",
      "Cross-verify survey number, owner name, and area with physical 7/12 extract",
      "If discrepancy found, schedule a talathi / revenue officer visit for physical verification",
      "Initiate mutation correction through revenue department if records are outdated",
      "Provide farmer with corrected land records once verified",
    ],
    estimatedTime: "15–30 working days",
    routeTo: "Revenue / Land Records Department",
    template: "Dear [Farmer Name], your land record grievance (ID: [GID]) requires physical verification. A talathi officer will contact you within 15 days to verify land boundaries and records.",
  },
  "Bank Account Issue": {
    resolution: "Guide farmer to update bank account details in the scheme portal and re-seed Aadhaar with the correct bank account.",
    steps: [
      "Verify the current bank account number and IFSC code on file",
      "Guide farmer to visit their bank branch to confirm Aadhaar-bank seeding status",
      "Initiate bank detail correction in the scheme portal with supporting documents",
      "Re-verify NPCI Aadhaar-bank linkage after update",
      "Confirm with a test payment (Re. 1 validation transfer) if possible",
    ],
    estimatedTime: "7–14 working days",
    routeTo: "Finance & DBT Cell",
    template: "Dear [Farmer Name], your bank account grievance (ID: [GID]) has been registered. Please visit your bank branch with Aadhaar to re-seed your account. Update the new details on the portal for DBT payments.",
  },
};

const DEFAULT_TEMPLATE = RESOLUTION_TEMPLATES["Application Status"];

/* ── Helpers ─────────────────────────────────────────────────────── */
function detectCategory(subject: string, description: string): string {
  const text = `${subject} ${description}`.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(kw => text.includes(kw))) {
      return rule.category;
    }
  }
  return "General Complaint";
}

function detectPriority(text: string, existingPriority?: string): "High" | "Medium" | "Low" {
  if (existingPriority === "High") return "High";
  const lower = text.toLowerCase();
  if (HIGH_PRIORITY_KEYWORDS.some(kw => lower.includes(kw))) return "High";
  if (existingPriority === "Medium") return "Medium";
  return "Low";
}

function computeUrgencyScore(g: GrievanceInput, priority: "High" | "Medium" | "Low"): number {
  let score = 0;
  if (priority === "High")   score += 40;
  if (priority === "Medium") score += 20;
  if (g.status === "Open")          score += 20;
  if (g.status === "In Progress")   score += 10;
  if (g.createdAt) {
    const daysSince = (Date.now() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) score += 30;
    else if (daysSince > 14) score += 15;
    else if (daysSince > 7) score += 5;
  }
  if (!g.adminReply) score += 10;
  return Math.min(100, score);
}

function shouldEscalate(text: string, urgencyScore: number): boolean {
  const lower = text.toLowerCase();
  return ESCALATION_KEYWORDS.some(kw => lower.includes(kw)) || urgencyScore >= 80;
}

/* ── Main classifier ─────────────────────────────────────────────── */
export function classifyAndAdviseGrievances(
  farmer: Record<string, unknown>,
  grievances: GrievanceInput[]
): GrievanceAdvisorResult {
  if (!grievances.length) {
    return { overview: "No grievances on record for this farmer.", urgentAction: null, advice: [] };
  }

  const farmerName = (farmer["name"] as string) || "this farmer";
  const district = (farmer["district"] as string) || "their district";

  const advice: GrievanceAdvice[] = grievances.slice(0, 10).map(g => {
    const subject = g.subject || "Unspecified Issue";
    const description = g.description || "";
    const text = `${subject} ${description}`;

    const detectedCategory = g.category && g.category !== "General Complaint"
      ? g.category
      : detectCategory(subject, description);

    const priority = detectPriority(text, g.priority);
    const urgencyScore = computeUrgencyScore(g, priority);
    const escalate = shouldEscalate(text, urgencyScore);

    const template = RESOLUTION_TEMPLATES[detectedCategory] ?? DEFAULT_TEMPLATE;

    return {
      grievanceId: g.grievanceId || "unknown",
      category: detectedCategory,
      subject,
      status: g.status || "Open",
      priority,
      resolution: template.resolution,
      steps: template.steps,
      estimatedTime: template.estimatedTime,
      escalate,
      urgencyScore,
      suggestedTemplate: template.template
        .replace("[Farmer Name]", farmerName)
        .replace("[GID]", g.grievanceId || ""),
      routeTo: template.routeTo,
    };
  });

  // Sort: Open/In-Progress first, then by urgency
  advice.sort((a, b) => {
    const activeA = a.status === "Open" || a.status === "In Progress" ? 0 : 1;
    const activeB = b.status === "Open" || b.status === "In Progress" ? 0 : 1;
    if (activeA !== activeB) return activeA - activeB;
    return b.urgencyScore - a.urgencyScore;
  });

  const openCount = grievances.filter(g => g.status === "Open" || g.status === "In Progress").length;
  const highPriorityCount = advice.filter(a => a.priority === "High").length;
  const escalateCount = advice.filter(a => a.escalate).length;

  let overview = `${farmerName} from ${district} has ${grievances.length} grievance(s) on record`;
  if (openCount > 0) overview += `, with ${openCount} currently open or in progress`;
  if (highPriorityCount > 0) overview += `. ${highPriorityCount} high-priority issue(s) require immediate attention`;
  overview += ".";

  const topUrgent = advice.find(a =>
    (a.status === "Open" || a.status === "In Progress") && a.priority === "High"
  );
  const urgentAction = topUrgent
    ? `Resolve "${topUrgent.subject}" (${topUrgent.grievanceId}) — ${topUrgent.resolution.split(".")[0]}.`
    : escalateCount > 0
    ? `${escalateCount} grievance(s) flagged for escalation — forward to department supervisor immediately.`
    : null;

  return { overview, urgentAction, advice };
}
