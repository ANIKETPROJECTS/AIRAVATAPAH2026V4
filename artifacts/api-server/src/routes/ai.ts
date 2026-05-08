import { Router } from "express";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";
import { generateRecommendations } from "../services/recommendationEngine";
import { classifyAndAdviseGrievances } from "../services/grievanceClassifier";
import { generateFarmerSummary } from "../services/summaryGenerator";
import { analyzeApplication } from "../services/applicationAnalyzer";

const router = Router();

/* ─── POST /ai/recommendations ─────────────────────────────────────
   Rule-based scheme/insurance/subsidy recommendations for a farmer.
   Replaces OpenAI call with local scoring engine.
──────────────────────────────────────────────────────────────────── */
router.post("/ai/recommendations", async (req, res): Promise<void> => {
  try {
    const { farmer, schemes, insurances, subsidies, appliedIds } = req.body as {
      farmer: Record<string, unknown>;
      schemes?: Record<string, unknown>[];
      insurances?: Record<string, unknown>[];
      subsidies?: Record<string, unknown>[];
      appliedIds?: string[];
    };

    if (!farmer) {
      res.status(400).json({ error: "farmer data is required" });
      return;
    }

    const db = getDb();

    const [allSchemes, allInsuranceSubsidies] = await Promise.all([
      schemes?.length
        ? Promise.resolve(schemes)
        : db.collection("schemes").find({}, { projection: { _id: 0 } }).toArray(),
      (insurances?.length || subsidies?.length)
        ? Promise.resolve([...(insurances ?? []), ...(subsidies ?? [])])
        : db.collection("insurance_subsidies").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const result = generateRecommendations(
      farmer as Record<string, unknown>,
      allSchemes as Record<string, unknown>[],
      allInsuranceSubsidies as Record<string, unknown>[],
      appliedIds ?? []
    );

    res.json(result);
  } catch (err) {
    logger.error({ err }, "Recommendations engine failed");
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

/* ─── POST /ai/grievance-advice ─────────────────────────────────────
   Rule-based grievance classification and resolution guidance.
   Replaces OpenAI call with local keyword classifier.
──────────────────────────────────────────────────────────────────── */
router.post("/ai/grievance-advice", async (req, res): Promise<void> => {
  try {
    const { farmer, grievances } = req.body as {
      farmer: Record<string, unknown>;
      grievances: Record<string, unknown>[];
    };

    if (!farmer || !grievances?.length) {
      res.status(400).json({ error: "farmer and grievances are required" });
      return;
    }

    const result = classifyAndAdviseGrievances(farmer, grievances);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Grievance advisor failed");
    res.status(500).json({ error: "Failed to generate grievance advice" });
  }
});

/* ─── POST /ai/farmer-summary ────────────────────────────────────────
   Template-based farmer profile summary with risk indicators,
   eligibility highlights, and profile classifications.
──────────────────────────────────────────────────────────────────── */
router.post("/ai/farmer-summary", async (req, res): Promise<void> => {
  try {
    const { farmer } = req.body as { farmer: Record<string, unknown> };
    if (!farmer) {
      res.status(400).json({ error: "farmer data is required" });
      return;
    }
    const result = generateFarmerSummary(farmer as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Farmer summary generation failed");
    res.status(500).json({ error: "Failed to generate farmer summary" });
  }
});

/* ─── POST /ai/application-analysis ─────────────────────────────────
   Rule-based application completeness, document checklist,
   eligibility confidence score, and missing requirement alerts.
──────────────────────────────────────────────────────────────────── */
router.post("/ai/application-analysis", async (req, res): Promise<void> => {
  try {
    const { profile } = req.body as { profile: Record<string, unknown> };
    if (!profile) {
      res.status(400).json({ error: "profile data is required" });
      return;
    }
    const result = analyzeApplication(profile as Record<string, unknown>);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Application analysis failed");
    res.status(500).json({ error: "Failed to analyze application" });
  }
});

export default router;
