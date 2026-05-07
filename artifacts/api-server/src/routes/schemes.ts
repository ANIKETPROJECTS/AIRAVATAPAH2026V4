import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/schemes", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const type = typeof req.query["type"] === "string" ? req.query["type"] : undefined;
    const search = typeof req.query["search"] === "string" ? req.query["search"].trim() : undefined;

    const filter: Record<string, unknown> = {};
    if (type && (type === "CENTRAL" || type === "STATE")) {
      filter["type"] = type;
    }
    if (search) {
      filter["name"] = { $regex: search, $options: "i" };
    }

    const schemes = await db.collection("schemes").find(filter, { projection: { _id: 0 } }).sort({ type: 1, name: 1 }).toArray();
    res.json(schemes);
  } catch (err) {
    logger.error({ err }, "Failed to fetch schemes");
    res.status(500).json({ error: "Failed to fetch schemes" });
  }
});

router.get("/schemes/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const scheme = await db.collection("schemes").findOne({ id: req.params.id }, { projection: { _id: 0 } });
    if (!scheme) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json(scheme);
  } catch (err) {
    logger.error({ err }, "Failed to fetch scheme");
    res.status(500).json({ error: "Failed to fetch scheme" });
  }
});

router.patch("/schemes/:id/status", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { status } = req.body as { status?: string };
    if (status !== "Active" && status !== "Closed") {
      res.status(400).json({ error: "status must be 'Active' or 'Closed'" });
      return;
    }
    const result = await db.collection("schemes").findOneAndUpdate(
      { id: req.params.id },
      { $set: { status, updatedAt: new Date().toISOString() } },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!result) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to update scheme status");
    res.status(500).json({ error: "Failed to update scheme status" });
  }
});

router.post("/schemes", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { name, type, category, description, benefits, status, eligibility, documents, validationRules, approvalRules } = req.body as Record<string, unknown>;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (type !== "CENTRAL" && type !== "STATE") {
      res.status(400).json({ error: "type must be CENTRAL or STATE" });
      return;
    }

    const id = (name as string)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 60);

    const existing = await db.collection("schemes").findOne({ id });
    if (existing) {
      res.status(409).json({ error: "A scheme with this name already exists" });
      return;
    }

    const now = new Date().toISOString();
    const scheme = {
      id,
      name: (name as string).trim(),
      type,
      state: null,
      category: (category as string) || "",
      description: (description as string) || "",
      eligibility: eligibility || { summary: "", parameters: [], familyCriteria: [] },
      documents: (documents as string[]) || [],
      validationRules: (validationRules as string[]) || [],
      approvalRules: (approvalRules as object) || { approve: [], reject: [] },
      benefits: (benefits as string) || "",
      status: status === "Closed" ? "Closed" : "Active",
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("schemes").insertOne(scheme);
    const inserted = await db.collection("schemes").findOne({ id }, { projection: { _id: 0 } });
    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to create scheme");
    res.status(500).json({ error: "Failed to create scheme" });
  }
});

router.patch("/schemes/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const allowed = ["name", "type", "category", "description", "benefits", "status", "eligibility", "documents", "validationRules", "approvalRules"];
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const result = await db.collection("schemes").findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!result) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to update scheme");
    res.status(500).json({ error: "Failed to update scheme" });
  }
});

router.delete("/schemes/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const result = await db.collection("schemes").findOneAndDelete({ id: req.params.id });
    if (!result) {
      res.status(404).json({ error: "Scheme not found" });
      return;
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    logger.error({ err }, "Failed to delete scheme");
    res.status(500).json({ error: "Failed to delete scheme" });
  }
});

export default router;
