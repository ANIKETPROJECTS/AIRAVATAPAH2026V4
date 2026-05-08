/**
 * summaryGenerator.ts
 * Generates deterministic farmer profile summaries, risk indicators,
 * eligibility highlights, and profile classifications — no AI/API required.
 */

export interface FarmerSummaryInput {
  name?: string;
  district?: string;
  village?: string;
  taluka?: string;
  land?: string | number;
  crop?: string;
  aadhaar?: string;
  bankAccount?: string;
  ifsc?: string;
  mobile?: string;
  status?: string;
  source?: string;
  annualIncome?: string | number;
  irrigationType?: string;
  gender?: string;
  age?: string | number;
}

export interface FarmerSummaryResult {
  summary: string;
  profileClass: string;
  farmingType: string;
  riskIndicators: string[];
  eligibilityHighlights: string[];
  classifications: string[];
  docCompleteness: number;
}

function parseLand(land?: string | number): number {
  if (!land) return 0;
  const n = parseFloat(String(land).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function parseIncome(income?: string | number): number {
  if (!income) return 0;
  const n = parseFloat(String(income).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export function classifyFarmer(landHa: number): { profileClass: string; farmingType: string } {
  let profileClass: string;
  if (landHa === 0)       profileClass = "Landless / Unknown";
  else if (landHa < 1)    profileClass = "Marginal Farmer";
  else if (landHa < 2)    profileClass = "Small Farmer";
  else if (landHa < 4)    profileClass = "Semi-Medium Farmer";
  else if (landHa < 10)   profileClass = "Medium Farmer";
  else                    profileClass = "Large Farmer";

  const farmingType = "Rain-fed Farmer";
  return { profileClass, farmingType };
}

export function generateFarmerSummary(farmer: FarmerSummaryInput): FarmerSummaryResult {
  const landHa = parseLand(farmer.land);
  const incomeVal = parseIncome(farmer.annualIncome);
  const { profileClass, farmingType } = classifyFarmer(landHa);

  const district = farmer.district || "an unknown district";
  const crop = farmer.crop || "mixed crops";
  const name = farmer.name || "This farmer";

  // ── Summary sentence ────────────────────────────────────────────────
  const landStr = landHa > 0 ? `${landHa} ha` : "unspecified land area";
  const incomeStr = incomeVal > 0
    ? incomeVal < 200000 ? "annual income below ₹2 lakh"
    : incomeVal < 500000 ? "annual income between ₹2–5 lakh"
    : "annual income above ₹5 lakh"
    : "";

  const parts: string[] = [];
  parts.push(`${profileClass} from ${district}`);
  if (farmer.taluka) parts[0] += ` (${farmer.taluka} taluka)`;
  parts.push(`cultivating ${crop} on ${landStr}`);
  if (incomeStr) parts.push(`with ${incomeStr}`);

  const eligibilityNote = landHa < 2
    ? "Likely eligible for marginal/small farmer subsidies, PM-KISAN, and crop insurance."
    : landHa < 4
    ? "May be eligible for semi-medium farmer schemes and irrigation support."
    : "Eligible for medium-farmer programs; verify exclusion criteria for small-farmer schemes.";

  const summary = `${parts.join(", ")}. ${eligibilityNote}`;

  // ── Risk Indicators ─────────────────────────────────────────────────
  const riskIndicators: string[] = [];
  if (!farmer.aadhaar)     riskIndicators.push("Aadhaar not provided — DBT payments blocked");
  if (!farmer.bankAccount) riskIndicators.push("Bank account missing — subsidy disbursement not possible");
  if (!farmer.ifsc)        riskIndicators.push("IFSC code missing — bank transfer cannot be initiated");
  if (!farmer.mobile)      riskIndicators.push("Mobile number not registered — OTP/notification delivery will fail");
  if (landHa === 0)        riskIndicators.push("Land area not recorded — eligibility for land-based schemes unverifiable");
  if (!farmer.crop)        riskIndicators.push("Crop type not specified — crop insurance matching not possible");
  if (farmer.status === "Rejected") riskIndicators.push("Profile previously rejected — review rejection reason before re-submission");

  // ── Eligibility Highlights ──────────────────────────────────────────
  const eligibilityHighlights: string[] = [];
  if (landHa > 0 && landHa < 2) {
    eligibilityHighlights.push("Eligible for PM-KISAN (₹6,000/year direct income support)");
    eligibilityHighlights.push("Qualifies for Pradhan Mantri Fasal Bima Yojana (PMFBY) crop insurance");
  }
  if (landHa > 0 && landHa < 4) {
    eligibilityHighlights.push("Eligible for small-farmer irrigation subsidy programs");
    eligibilityHighlights.push("May qualify for Kisan Credit Card (KCC) scheme");
  }
  if (farmer.aadhaar && farmer.bankAccount) {
    eligibilityHighlights.push("DBT-ready profile — eligible for direct bank transfer schemes");
  }
  if (incomeVal > 0 && incomeVal < 200000) {
    eligibilityHighlights.push("Low-income bracket — qualifies for High Subsidy Priority programs");
  }
  const cropLower = (farmer.crop || "").toLowerCase();
  if (cropLower.includes("onion") || cropLower.includes("tomato") || cropLower.includes("vegetable")) {
    eligibilityHighlights.push("Vegetable crop detected — eligible for horticulture support schemes");
  }
  if (cropLower.includes("wheat") || cropLower.includes("rice") || cropLower.includes("paddy") || cropLower.includes("jowar") || cropLower.includes("bajra")) {
    eligibilityHighlights.push("Staple crop detected — eligible for MSP price support and procurement");
  }
  if (eligibilityHighlights.length === 0) {
    eligibilityHighlights.push("Complete profile to unlock precise eligibility analysis");
  }

  // ── Classifications ─────────────────────────────────────────────────
  const classifications: string[] = [profileClass, farmingType];
  if (landHa > 0 && landHa < 2) classifications.push("High Subsidy Priority");
  if (farmer.aadhaar && farmer.bankAccount) classifications.push("DBT Ready");
  if (!farmer.aadhaar || !farmer.bankAccount) classifications.push("Incomplete KYC");
  if (incomeVal > 0 && incomeVal < 200000) classifications.push("BPL Adjacent");

  // ── Document completeness ───────────────────────────────────────────
  const requiredFields = ["name", "aadhaar", "bankAccount", "ifsc", "mobile", "land", "crop", "district", "village"];
  const filled = requiredFields.filter(f => !!(farmer as Record<string, unknown>)[f]);
  const docCompleteness = Math.round((filled.length / requiredFields.length) * 100);

  return {
    summary,
    profileClass,
    farmingType,
    riskIndicators,
    eligibilityHighlights,
    classifications,
    docCompleteness,
  };
}
