/**
 * recommendationEngine.ts
 * Rule-based scheme/insurance/subsidy recommendation engine.
 * Scores each catalog item against a farmer's profile using weighted rules.
 * No AI / external API required.
 */

export interface FarmerProfile {
  name?: string;
  district?: string;
  village?: string;
  taluka?: string;
  land?: string | number;
  crop?: string;
  aadhaar?: string;
  bankAccount?: string;
  status?: string;
  source?: string;
  annualIncome?: string | number;
  gender?: string;
  [key: string]: unknown;
}

export interface CatalogItem {
  id?: string;
  schemeId?: string;
  name?: string;
  type?: string;
  category?: string;
  description?: string;
  benefits?: string;
  eligibility?: string | { summary?: string; [k: string]: unknown };
  region?: string;
  features?: string;
  criteria?: string;
}

export interface Recommendation {
  id: string;
  name: string;
  type: "scheme" | "insurance" | "subsidy";
  priority: "High" | "Medium" | "Low";
  reason: string;
  benefit: string;
  applyFirst: boolean;
  score: number;
}

export interface RecommendationResult {
  summary: string;
  recommendations: Recommendation[];
  tips: string[];
}

/* ── Helpers ─────────────────────────────────────────────────────── */
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

function getText(...parts: (string | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ").toLowerCase();
}

function keywordMatch(text: string, keywords: string[]): boolean {
  return keywords.some(kw => text.includes(kw.toLowerCase()));
}

/* ── Scoring rules ────────────────────────────────────────────────── */
function scoreScheme(farmer: FarmerProfile, item: CatalogItem): { score: number; reason: string } {
  const landHa = parseLand(farmer.land);
  const income = parseIncome(farmer.annualIncome);
  const crop = (farmer.crop || "").toLowerCase();
  const district = (farmer.district || "").toLowerCase();

  const catalogText = getText(
    item.name, item.description, item.category,
    typeof item.eligibility === "string" ? item.eligibility : item.eligibility?.summary,
    item.benefits, item.features, item.criteria
  );

  let score = 0;
  const reasons: string[] = [];

  // Land size eligibility
  if (landHa > 0 && landHa < 2 && keywordMatch(catalogText, ["marginal", "small farmer", "2 hectare", "2ha", "small and marginal"])) {
    score += 30; reasons.push("land holding qualifies for small/marginal farmer programs");
  } else if (landHa > 0 && landHa < 4 && keywordMatch(catalogText, ["semi-medium", "medium farmer", "4 hectare"])) {
    score += 20; reasons.push("land size matches semi-medium farmer criteria");
  } else if (landHa > 0) {
    score += 10;
  }

  // DBT / income support — prefer Aadhaar-linked farmers
  if (farmer.aadhaar && farmer.bankAccount && keywordMatch(catalogText, ["dbt", "direct benefit", "income support", "6000", "kisan samman"])) {
    score += 25; reasons.push("Aadhaar and bank account available for DBT transfer");
  }

  // Crop-specific matching
  if (crop) {
    if ((crop.includes("onion") || crop.includes("tomato") || crop.includes("vegetable"))
      && keywordMatch(catalogText, ["horticultural", "horticulture", "vegetable", "onion"])) {
      score += 20; reasons.push(`cultivates ${crop} which matches horticulture schemes`);
    }
    if ((crop.includes("wheat") || crop.includes("rice") || crop.includes("paddy"))
      && keywordMatch(catalogText, ["cereal", "food grain", "kharif", "rabi", "wheat", "rice", "paddy"])) {
      score += 20; reasons.push(`grows ${crop}, eligible for cereal/staple crop programs`);
    }
    if ((crop.includes("cotton") || crop.includes("sugarcane"))
      && keywordMatch(catalogText, ["cotton", "sugarcane", "commercial crop"])) {
      score += 20; reasons.push(`commercial crop (${crop}) matches targeted schemes`);
    }
    if ((crop.includes("jowar") || crop.includes("bajra") || crop.includes("sorghum"))
      && keywordMatch(catalogText, ["millets", "jowar", "bajra", "sorghum", "dry land"])) {
      score += 20; reasons.push(`grows ${crop}, qualifying for dry-land/millet support`);
    }
  }

  // District/regional targeting
  if (district && keywordMatch(catalogText, [district, "maharashtra", "all districts"])) {
    score += 10; reasons.push("scheme available in farmer's district");
  } else if (keywordMatch(catalogText, ["central", "national", "all india"])) {
    score += 8; reasons.push("central scheme applicable across all states");
  }

  // Income support programs — everyone with land qualifies as base
  if (keywordMatch(catalogText, ["kisan", "farmer", "agriculturalist"]) && landHa > 0) {
    score += 5;
  }

  // Low income preference
  if (income > 0 && income < 200000 && keywordMatch(catalogText, ["low income", "bpl", "poverty", "subsidy"])) {
    score += 15; reasons.push("low annual income qualifies for priority subsidy programs");
  }

  // Insurance for crop loss
  if (keywordMatch(catalogText, ["insurance", "fasal bima", "crop insurance", "weather"])) {
    if (crop) { score += 15; reasons.push(`crop insurance available for ${crop || "cultivated crops"}`); }
    else { score += 8; }
  }

  const reason = reasons.length > 0
    ? reasons.join("; ") + "."
    : "general agricultural scheme available to registered farmers.";

  return { score, reason: reason.charAt(0).toUpperCase() + reason.slice(1) };
}

/* ── Priority mapping ────────────────────────────────────────────── */
function toPriority(score: number): "High" | "Medium" | "Low" {
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

function toItemType(item: CatalogItem): "scheme" | "insurance" | "subsidy" {
  const t = (item.type || "").toLowerCase();
  if (t.includes("insurance")) return "insurance";
  if (t.includes("subsidy")) return "subsidy";
  return "scheme";
}

/* ── Tips generator ──────────────────────────────────────────────── */
function generateTips(farmer: FarmerProfile, landHa: number): string[] {
  const tips: string[] = [];
  if (!farmer.aadhaar) tips.push("Ensure farmer's Aadhaar is collected and verified — mandatory for all DBT schemes.");
  if (!farmer.bankAccount) tips.push("Collect bank account details and confirm Aadhaar-bank seeding for payment disbursal.");
  if (!farmer.crop) tips.push("Record the primary crop grown — required for crop insurance and MSP applications.");
  if (landHa === 0) tips.push("Verify and record land area in hectares to enable accurate scheme eligibility matching.");
  if (landHa > 0 && landHa < 2) tips.push("Prioritize PM-KISAN enrollment — marginal farmers receive ₹6,000/year income support.");
  if (landHa > 0 && landHa < 4) tips.push("Apply for Kisan Credit Card (KCC) for seasonal agricultural credit at subsidized interest.");
  tips.push("Verify all 5 KYC documents are uploaded and verified before submitting any scheme application.");
  return tips.slice(0, 4);
}

/* ── Main engine ─────────────────────────────────────────────────── */
export function generateRecommendations(
  farmer: FarmerProfile,
  allSchemes: CatalogItem[],
  allInsuranceSubsidies: CatalogItem[],
  appliedIds: string[]
): RecommendationResult {
  const landHa = parseLand(farmer.land);
  const appliedSet = new Set(appliedIds || []);

  const catalog: CatalogItem[] = [
    ...allSchemes.map(s => ({ ...s, _itemType: "scheme" as const })),
    ...allInsuranceSubsidies.map(i => ({ ...i, _itemType: (i.type?.toLowerCase().includes("insurance") ? "insurance" : "subsidy") as const })),
  ];

  const scored = catalog
    .filter(item => {
      const id = (item.id ?? item.schemeId ?? "");
      return id && !appliedSet.has(id);
    })
    .map(item => {
      const { score, reason } = scoreScheme(farmer, item);
      return { item, score, reason };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  let applyFirstSet = false;
  const recommendations: Recommendation[] = scored.map(({ item, score, reason }) => {
    const priority = toPriority(score);
    const applyFirst = !applyFirstSet && priority === "High";
    if (applyFirst) applyFirstSet = true;

    return {
      id: item.id ?? item.schemeId ?? "",
      name: item.name ?? "Unknown Program",
      type: toItemType(item),
      priority,
      reason,
      benefit: item.benefits ?? item.features ?? "Government support benefit",
      applyFirst,
      score,
    };
  });

  // Guarantee at least one "applyFirst" if there are any recommendations
  if (recommendations.length > 0 && !recommendations.some(r => r.applyFirst)) {
    recommendations[0].applyFirst = true;
  }

  // Summary
  const farmerName = farmer.name || "This farmer";
  const district = farmer.district || "their district";
  const crop = farmer.crop || "crops";
  const landStr = landHa > 0 ? `${landHa} ha` : "unrecorded land";

  let summary = `${farmerName} from ${district} cultivates ${crop} on ${landStr}.`;
  if (recommendations.length > 0) {
    const highCount = recommendations.filter(r => r.priority === "High").length;
    summary += highCount > 0
      ? ` ${highCount} high-priority scheme(s) identified — apply immediately for maximum benefit.`
      : ` ${recommendations.length} relevant program(s) found based on land size and crop profile.`;
  } else {
    summary += " No matching schemes found in the current catalog — ensure farmer profile is complete.";
  }

  const tips = generateTips(farmer, landHa);

  return { summary, recommendations, tips };
}
