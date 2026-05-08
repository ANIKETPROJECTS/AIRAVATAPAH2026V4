/**
 * applicationAnalyzer.ts
 * Analyzes application completeness, document checklist,
 * eligibility confidence scoring, and missing requirement alerts.
 * No AI / external API required.
 */

export interface ApplicationProfile {
  name?: string;
  aadhaar?: string;
  bankAccount?: string;
  ifsc?: string;
  mobile?: string;
  land?: string | number;
  crop?: string;
  district?: string;
  village?: string;
  taluka?: string;
  surveyNumber?: string;
  khateNumber?: string;
  source?: string;
  status?: string;
  docs?: { name: string; status: string }[];
}

export interface DocumentCheck {
  document: string;
  required: boolean;
  status: "present" | "missing" | "unverified";
  note?: string;
}

export interface MissingAlert {
  field: string;
  severity: "high" | "medium" | "low";
  message: string;
}

export interface ApplicationAnalysis {
  completenessPercent: number;
  eligibilityConfidence: number;
  documentChecklist: DocumentCheck[];
  missingAlerts: MissingAlert[];
  autoFillSuggestions: Record<string, string>;
  readyToApply: boolean;
}

function parseLand(land?: string | number): number {
  if (!land) return 0;
  const n = parseFloat(String(land).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function analyzeApplication(profile: ApplicationProfile): ApplicationAnalysis {
  const landHa = parseLand(profile.land);

  // ── Document checklist ─────────────────────────────────────────────
  const uploadedDocNames = (profile.docs || [])
    .filter(d => d.status === "uploaded")
    .map(d => d.name.toLowerCase());

  const docCheck = (docName: string, required: boolean, keywords: string[]): DocumentCheck => {
    const found = keywords.some(kw => uploadedDocNames.some(d => d.includes(kw)));
    return {
      document: docName,
      required,
      status: found ? "present" : required ? "missing" : "unverified",
    };
  };

  const documentChecklist: DocumentCheck[] = [
    docCheck("Aadhaar Card",       true,  ["aadhaar", "aadhar", "uid"]),
    docCheck("Bank Passbook",      true,  ["passbook", "bank"]),
    docCheck("Form 7/12 (Satbara)",true,  ["form7", "7/12", "satbara", "form 7"]),
    docCheck("Form 12 (Crop Register)", true, ["form12", "form 12", "crop register"]),
    docCheck("Form 8A",            true,  ["form8a", "form 8a"]),
  ];

  // Override with profile field presence when docs array is empty
  if (!profile.docs?.length) {
    if (profile.aadhaar)    documentChecklist[0].status = "present";
    if (profile.bankAccount) documentChecklist[1].status = "present";
  }

  // ── Missing alerts ─────────────────────────────────────────────────
  const missingAlerts: MissingAlert[] = [];

  if (!profile.aadhaar) missingAlerts.push({ field: "Aadhaar Number", severity: "high", message: "Aadhaar is mandatory for identity verification and DBT payments." });
  if (!profile.bankAccount) missingAlerts.push({ field: "Bank Account Number", severity: "high", message: "Bank account required for all subsidy and insurance disbursements." });
  if (!profile.ifsc) missingAlerts.push({ field: "IFSC Code", severity: "high", message: "IFSC is needed to process bank transfers." });
  if (!profile.mobile) missingAlerts.push({ field: "Mobile Number", severity: "medium", message: "Mobile number required for OTP and SMS notifications." });
  if (!profile.land || landHa === 0) missingAlerts.push({ field: "Land Area (Hectares)", severity: "high", message: "Land holding is required to determine scheme eligibility." });
  if (!profile.crop) missingAlerts.push({ field: "Primary Crop", severity: "medium", message: "Crop type needed for insurance and MSP scheme matching." });
  if (!profile.surveyNumber) missingAlerts.push({ field: "Survey Number", severity: "medium", message: "Land survey number required for land-based scheme verification." });
  if (!profile.village) missingAlerts.push({ field: "Village", severity: "low", message: "Village name required for regional scheme targeting." });

  // ── Completeness percentage ────────────────────────────────────────
  const coreFields: (keyof ApplicationProfile)[] = [
    "name", "aadhaar", "bankAccount", "ifsc", "mobile",
    "land", "crop", "district", "village", "taluka"
  ];
  const filledCore = coreFields.filter(f => !!(profile as Record<string, unknown>)[f]).length;
  const docScore = documentChecklist.filter(d => d.status === "present").length;
  const completenessPercent = Math.round(
    ((filledCore / coreFields.length) * 60) + ((docScore / documentChecklist.length) * 40)
  );

  // ── Eligibility confidence ─────────────────────────────────────────
  let eligibilityConfidence = 0;
  if (profile.aadhaar)    eligibilityConfidence += 25;
  if (profile.bankAccount && profile.ifsc) eligibilityConfidence += 20;
  if (landHa > 0)         eligibilityConfidence += 20;
  if (profile.crop)       eligibilityConfidence += 10;
  if (profile.mobile)     eligibilityConfidence += 10;
  if (profile.surveyNumber) eligibilityConfidence += 10;
  if (docScore >= 4)      eligibilityConfidence += 5;
  eligibilityConfidence = Math.min(100, eligibilityConfidence);

  // ── Auto-fill suggestions ──────────────────────────────────────────
  const autoFillSuggestions: Record<string, string> = {};
  if (profile.name)     autoFillSuggestions["Applicant Name"] = profile.name;
  if (profile.district) autoFillSuggestions["District"] = profile.district;
  if (profile.village)  autoFillSuggestions["Village"] = profile.village;
  if (profile.taluka)   autoFillSuggestions["Taluka"] = profile.taluka;
  if (profile.aadhaar)  autoFillSuggestions["Aadhaar Number"] = profile.aadhaar;
  if (profile.mobile)   autoFillSuggestions["Mobile Number"] = profile.mobile;
  if (profile.land)     autoFillSuggestions["Land Area"] = String(profile.land);
  if (profile.crop)     autoFillSuggestions["Primary Crop"] = profile.crop;

  const readyToApply = missingAlerts.filter(a => a.severity === "high").length === 0
    && docScore >= 3;

  return {
    completenessPercent,
    eligibilityConfidence,
    documentChecklist,
    missingAlerts,
    autoFillSuggestions,
    readyToApply,
  };
}
