import { Router, type IRouter } from "express";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/insurance-subsidies", async (req, res): Promise<void> => {
  try {
    const db = getDb();

    const type   = typeof req.query["type"]   === "string" ? req.query["type"]   : undefined;
    const region = typeof req.query["region"] === "string" ? req.query["region"] : undefined;
    const search = typeof req.query["search"] === "string" ? req.query["search"].trim() : undefined;
    const pageRaw  = typeof req.query["page"]  === "string" ? parseInt(req.query["page"],  10) : 0;
    const limitRaw = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : 10;

    const page  = isNaN(pageRaw)  || pageRaw  < 0 ? 0  : pageRaw;
    const limit = isNaN(limitRaw) || limitRaw < 1 || limitRaw > 100 ? 10 : limitRaw;

    const filter: Record<string, unknown> = {};
    if (type   === "Insurance" || type   === "Subsidy")     filter["type"]   = type;
    if (region === "Central"   || region === "Maharashtra") filter["region"] = region;
    if (search) filter["name"] = { $regex: search, $options: "i" };

    const [items, total] = await Promise.all([
      db.collection("insurance_subsidies")
        .find(filter, { projection: { _id: 0 } })
        .sort({ region: 1, type: 1, name: 1 })
        .skip(page * limit)
        .limit(limit)
        .toArray(),
      db.collection("insurance_subsidies").countDocuments(filter),
    ]);

    res.json({ items, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch insurance subsidies");
    res.status(500).json({ error: "Failed to fetch insurance subsidies" });
  }
});

router.get("/insurance-subsidies/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const item = await db
      .collection("insurance_subsidies")
      .findOne({ id: req.params.id }, { projection: { _id: 0 } });

    if (!item) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    logger.error({ err }, "Failed to fetch insurance subsidy");
    res.status(500).json({ error: "Failed to fetch insurance subsidy" });
  }
});

router.post("/insurance-subsidies", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { name, type, region, eligibility, parameters, features, status } = req.body as Record<string, unknown>;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "name is required" });
      return;
    }
    if (type !== "Insurance" && type !== "Subsidy") {
      res.status(400).json({ error: "type must be Insurance or Subsidy" });
      return;
    }
    if (region !== "Central" && region !== "Maharashtra") {
      res.status(400).json({ error: "region must be Central or Maharashtra" });
      return;
    }

    const id = (name as string)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .substring(0, 60);

    const existing = await db.collection("insurance_subsidies").findOne({ id });
    if (existing) {
      res.status(409).json({ error: "An entry with this name already exists" });
      return;
    }

    const now = new Date().toISOString();
    const item = {
      id,
      name: (name as string).trim(),
      type,
      region,
      eligibility: (eligibility as string) || "",
      parameters: (parameters as string) || "",
      features: (features as string) || "",
      status: status === "Closed" ? "Closed" : "Active",
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("insurance_subsidies").insertOne(item);
    const inserted = await db.collection("insurance_subsidies").findOne({ id }, { projection: { _id: 0 } });
    res.status(201).json(inserted);
  } catch (err) {
    logger.error({ err }, "Failed to create insurance subsidy");
    res.status(500).json({ error: "Failed to create insurance subsidy" });
  }
});

router.patch("/insurance-subsidies/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const allowed = ["name", "type", "region", "eligibility", "parameters", "features", "status"];
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }

    const result = await db.collection("insurance_subsidies").findOneAndUpdate(
      { id: req.params.id },
      { $set: update },
      { returnDocument: "after", projection: { _id: 0 } }
    );
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "Failed to update insurance subsidy");
    res.status(500).json({ error: "Failed to update insurance subsidy" });
  }
});

router.delete("/insurance-subsidies/:id", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const result = await db.collection("insurance_subsidies").findOneAndDelete({ id: req.params.id });
    if (!result) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    logger.error({ err }, "Failed to delete insurance subsidy");
    res.status(500).json({ error: "Failed to delete insurance subsidy" });
  }
});

export default router;
