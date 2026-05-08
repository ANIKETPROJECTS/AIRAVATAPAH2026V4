import { Router } from "express";
import OpenAI from "openai";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router = Router();

const openai = new OpenAI({
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
});

/* ─── POST /ai/recommendations ─────────────────────────────────────
   Analyses farmer profile + available schemes/insurance/subsidies
   and returns ranked AI recommendations.
──────────────────────────────────────────────────────────────────── */
router.post("/ai/recommendations", async (req, res): Promise<void> => {
  try {
    const { farmer, schemes, insurances, subsidies, appliedIds } = req.body as {
      farmer: Record<string, unknown>;
      schemes: Record<string, unknown>[];
      insurances: Record<string, unknown>[];
      subsidies: Record<string, unknown>[];
      appliedIds: string[];
    };

    if (!farmer) {
      res.status(400).json({ error: "farmer data is required" });
      return;
    }

    const db = getDb();

    // Fetch full catalogs from DB if not provided
    const [allSchemes, allInsuranceSubsidies] = await Promise.all([
      schemes?.length ? Promise.resolve(schemes) : db.collection("schemes").find({}, { projection: { _id: 0 } }).toArray(),
      (insurances?.length || subsidies?.length) ? Promise.resolve([...( insurances ?? []), ...(subsidies ?? [])]) :
        db.collection("insurance_subsidies").find({}, { projection: { _id: 0 } }).toArray(),
    ]);

    const farmerStr = JSON.stringify({
      name: farmer["name"],
      district: farmer["district"],
      village: farmer["village"],
      taluka: farmer["taluka"],
      land: farmer["land"],
      crop: farmer["crop"],
      aadhaar: farmer["aadhaar"] ? "provided" : "missing",
      status: farmer["status"],
      source: farmer["source"],
    });

    const catalogStr = JSON.stringify({
      schemes: allSchemes.slice(0, 30).map((s) => ({
        id: s["id"] ?? s["schemeId"],
        name: s["name"],
        type: s["type"],
        category: s["category"],
        description: s["description"],
        benefits: s["benefits"],
        eligibility: s["eligibility"],
        region: s["region"],
      })),
      insurance_subsidies: allInsuranceSubsidies.slice(0, 30).map((i) => ({
        id: i["id"] ?? i["schemeId"],
        name: i["name"],
        type: i["type"],
        category: i["category"],
        description: i["description"],
        benefits: i["benefits"],
        eligibility: i["eligibility"],
      })),
    });

    const appliedStr = (appliedIds ?? []).join(", ") || "none";

    const prompt = `You are an expert agricultural welfare officer in Maharashtra, India. 
Analyse this farmer's profile and the available government schemes/insurance/subsidies database.
Provide clear, actionable recommendations for which programs this farmer should apply for.

FARMER PROFILE:
${farmerStr}

ALREADY APPLIED TO (IDs): ${appliedStr}

AVAILABLE CATALOG:
${catalogStr}

Respond in JSON with this exact structure:
{
  "summary": "2-sentence farmer suitability overview",
  "recommendations": [
    {
      "id": "scheme/insurance/subsidy ID from catalog",
      "name": "program name",
      "type": "scheme|insurance|subsidy",
      "priority": "High|Medium|Low",
      "reason": "1-2 sentence explanation why this farmer qualifies and should apply",
      "benefit": "key benefit in simple terms",
      "applyFirst": true/false (true for the single most important one)
    }
  ],
  "tips": ["actionable tip 1", "actionable tip 2"]
}

Include at most 6 recommendations, ordered by priority (High first). Skip any already-applied IDs.
Respond ONLY with the JSON object, no markdown fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1200,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { summary: "Unable to parse recommendations.", recommendations: [], tips: [] };
    }

    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "AI recommendations failed");
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
});

/* ─── POST /ai/grievance-advice ─────────────────────────────────────
   Analyses all grievances for a farmer and gives the admin
   step-by-step resolution guidance for each.
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

    const farmerStr = JSON.stringify({
      name: farmer["name"],
      farmerId: farmer["farmerId"],
      district: farmer["district"],
      village: farmer["village"],
      land: farmer["land"],
      status: farmer["status"],
    });

    const grievancesStr = JSON.stringify(
      grievances.slice(0, 10).map((g) => ({
        id: g["grievanceId"],
        category: g["category"],
        subject: g["subject"],
        description: g["description"],
        status: g["status"],
        priority: g["priority"],
        createdAt: g["createdAt"],
        adminReply: g["adminReply"] ?? null,
        rejectionReason: g["rejectionReason"] ?? null,
      }))
    );

    const prompt = `You are a senior Maharashtra government agricultural grievance resolution officer.
Analyse the following farmer grievances and provide specific, practical admin guidance.

FARMER:
${farmerStr}

GRIEVANCES:
${grievancesStr}

Respond in JSON with this exact structure:
{
  "overview": "1-2 sentence overall assessment of this farmer's grievance situation",
  "urgentAction": "single most urgent action the admin should take right now, or null if none",
  "advice": [
    {
      "grievanceId": "grievance ID",
      "category": "grievance category",
      "subject": "grievance subject",
      "status": "current status",
      "priority": "High|Medium|Low",
      "resolution": "clear 1-2 sentence recommended resolution action",
      "steps": ["step 1", "step 2", "step 3"],
      "estimatedTime": "e.g. 3-5 working days",
      "escalate": true/false
    }
  ]
}

Focus on Open and In Progress grievances first. Be specific and practical.
Respond ONLY with the JSON object, no markdown fences.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 1500,
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { overview: "Unable to parse advice.", urgentAction: null, advice: [] };
    }

    res.json(parsed);
  } catch (err) {
    logger.error({ err }, "AI grievance advice failed");
    res.status(500).json({ error: "Failed to generate grievance advice" });
  }
});

export default router;
