import { Router } from "express";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router = Router();

type AppType = "scheme" | "subsidy" | "insurance";

function generateId(type: AppType): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  const prefix = type === "scheme" ? "APP" : type === "subsidy" ? "SUB" : "INS";
  return `${prefix}-${ts.toString(36).toUpperCase()}-${rand}`;
}

router.get("/applications", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { type, status, farmerId, mobile, search } = req.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};
    if (type) filter["type"] = type;
    if (status) filter["status"] = status;
    if (farmerId) filter["farmerId"] = farmerId;
    if (mobile) filter["mobile"] = mobile;
    if (search) {
      filter["$or"] = [
        { farmerName: { $regex: search, $options: "i" } },
        { applicationId: { $regex: search, $options: "i" } },
        { schemeName: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
        { farmerId: { $regex: search, $options: "i" } },
      ];
    }
    const applications = await db
      .collection("applications")
      .find(filter, { projection: { _id: 0 } })
      .sort({ appliedAt: -1 })
      .toArray();
    res.json(applications);
  } catch (err) {
    logger.error({ err }, "Failed to fetch applications");
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

router.post("/applications", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const {
      type, farmerId, farmerName, mobile, district, village,
      schemeId, schemeName, schemeType,
      crop, land, lossDescription, source, documentRefs,
    } = req.body as {
      type?: AppType; farmerId?: string; farmerName?: string; mobile?: string;
      district?: string; village?: string;
      schemeId?: string; schemeName?: string; schemeType?: string;
      crop?: string; land?: number; lossDescription?: string; source?: string;
      documentRefs?: string[];
    };

    if (!type || !farmerId || !mobile || !schemeName) {
      res.status(400).json({ error: "type, farmerId, mobile, and schemeName are required" });
      return;
    }
    if (!["scheme", "subsidy", "insurance"].includes(type)) {
      res.status(400).json({ error: "type must be scheme, subsidy, or insurance" });
      return;
    }

    const existing = await db.collection("applications").findOne({
      farmerId, type,
      schemeId: schemeId ?? schemeName,
      status: { $nin: ["Rejected"] },
    });
    if (existing) {
      res.status(409).json({ error: "Already applied for this scheme", applicationId: existing["applicationId"] });
      return;
    }

    const applicationId = generateId(type);
    const now = new Date().toISOString();
    const application = {
      applicationId, type,
      farmerId, farmerName: farmerName ?? null, mobile,
      district: district ?? null, village: village ?? null,
      schemeId: schemeId ?? schemeName, schemeName, schemeType: schemeType ?? null,
      crop: crop ?? null, land: land ?? null, lossDescription: lossDescription ?? null,
      status: "Pending",
      adminReply: null, adminNotes: null,
      source: source ?? "farmer",
      documentRefs: Array.isArray(documentRefs) ? documentRefs : [],
      appliedAt: now, updatedAt: now,
    };
    await db.collection("applications").insertOne(application);
    const { _id: _, ...clean } = application as typeof application & { _id?: unknown };
    res.status(201).json(clean);
  } catch (err) {
    logger.error({ err }, "Failed to create application");
    res.status(500).json({ error: "Failed to create application" });
  }
});

router.patch("/applications/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { status, adminReply, adminNotes } = req.body as {
      status?: string; adminReply?: string; adminNotes?: string;
    };
    const valid = ["Pending", "Under Review", "Approved", "Rejected", "Settled"];
    if (status && !valid.includes(status)) {
      res.status(400).json({ error: `status must be one of: ${valid.join(", ")}` });
      return;
    }
    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (status) updates["status"] = status;
    if (adminReply !== undefined) updates["adminReply"] = adminReply;
    if (adminNotes !== undefined) updates["adminNotes"] = adminNotes;

    const result = await db.collection("applications").findOneAndUpdate(
      { applicationId: req.params["id"] },
      { $set: updates },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!result) { res.status(404).json({ error: "Application not found" }); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to update application");
    res.status(500).json({ error: "Failed to update application" });
  }
});

router.delete("/applications/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const result = await db.collection("applications").deleteOne({ applicationId: req.params["id"] });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Application not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete application");
    res.status(500).json({ error: "Failed to delete application" });
  }
});

export default router;
