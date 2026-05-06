import { Router } from "express";
import { type Collection } from "mongodb";
import { getDb } from "../lib/mongo";

const router = Router();

const SEED_FARMERS = [
  { farmerId: "F-001", name: "Ramesh Patel", village: "Wardha", district: "Nagpur", land: 4.5, crop: "Cotton", aadhaar: "XXXX-XXXX-1234", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 16).toISOString() },
  { farmerId: "F-002", name: "Sunita Devi", village: "Pune Rural", district: "Pune", land: 2.0, crop: "Sugarcane", aadhaar: "XXXX-XXXX-5678", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { farmerId: "F-003", name: "Anil Sharma", village: "Amravati", district: "Amravati", land: 7.2, crop: "Soybean", aadhaar: "XXXX-XXXX-9012", status: "Inactive", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
  { farmerId: "F-004", name: "Kaveri Bai", village: "Nashik", district: "Nashik", land: 3.1, crop: "Grapes", aadhaar: "XXXX-XXXX-3456", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 13).toISOString() },
  { farmerId: "F-005", name: "Mahesh Yadav", village: "Latur", district: "Latur", land: 5.8, crop: "Tur Dal", aadhaar: "XXXX-XXXX-7890", status: "Pending", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 12).toISOString() },
  { farmerId: "F-006", name: "Deepak Lokhande", village: "Satara", district: "Satara", land: 3.4, crop: "Rice", aadhaar: "XXXX-XXXX-2345", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 11).toISOString() },
  { farmerId: "F-007", name: "Laxmi Waghmare", village: "Kolhapur", district: "Kolhapur", land: 1.8, crop: "Sugarcane", aadhaar: "XXXX-XXXX-6789", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 10).toISOString() },
  { farmerId: "F-008", name: "Vijay More", village: "Solapur", district: "Solapur", land: 6.1, crop: "Grapes", aadhaar: "XXXX-XXXX-0123", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 9).toISOString() },
  { farmerId: "F-009", name: "Rekha Patil", village: "Jalgaon", district: "Jalgaon", land: 4.0, crop: "Banana", aadhaar: "XXXX-XXXX-4567", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 8).toISOString() },
  { farmerId: "F-010", name: "Suresh Naik", village: "Ratnagiri", district: "Ratnagiri", land: 2.5, crop: "Cashew", aadhaar: "XXXX-XXXX-8901", status: "Inactive", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { farmerId: "F-011", name: "Deepa Kore", village: "Sangli", district: "Sangli", land: 3.7, crop: "Turmeric", aadhaar: "XXXX-XXXX-3210", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 6).toISOString() },
  { farmerId: "F-012", name: "Ganesh Bhosle", village: "Aurangabad", district: "Aurangabad", land: 8.0, crop: "Cotton", aadhaar: "XXXX-XXXX-6543", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
  { farmerId: "F-013", name: "Meena Gaikwad", village: "Beed", district: "Beed", land: 5.2, crop: "Soybean", aadhaar: "XXXX-XXXX-9876", status: "Pending", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 4).toISOString() },
  { farmerId: "F-014", name: "Prakash Jadhav", village: "Nanded", district: "Nanded", land: 4.8, crop: "Tur Dal", aadhaar: "XXXX-XXXX-1357", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 3).toISOString() },
  { farmerId: "F-015", name: "Shalini Raut", village: "Ahmednagar", district: "Ahmednagar", land: 2.9, crop: "Onion", aadhaar: "XXXX-XXXX-2468", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
  { farmerId: "F-016", name: "Balaji Shirke", village: "Osmanabad", district: "Osmanabad", land: 6.5, crop: "Jowar", aadhaar: "XXXX-XXXX-3579", status: "Active", source: "seed", surveyNumber: "", bankAccount: "", addedAt: new Date(Date.now() - 86400000 * 1).toISOString() },
];

async function getNextFarmerId(col: Collection): Promise<string> {
  const farmers = await col.find({}, { projection: { farmerId: 1 } }).toArray();
  let maxNum = 0;
  for (const f of farmers) {
    const match = String(f["farmerId"] ?? "").match(/F-(\d+)/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1], 10));
  }
  return `F-${String(maxNum + 1).padStart(3, "0")}`;
}

router.get("/farmers/by-phone/:phone", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const farmer = await col.findOne({ mobile: req.params["phone"] }, { projection: { _id: 0 } });
    if (!farmer) { res.status(404).json({ error: "Farmer not found" }); return; }
    res.json(farmer);
  } catch (err) {
    next(err);
  }
});

router.get("/farmers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const farmer = await col.findOne({ farmerId: req.params["id"] }, { projection: { _id: 0 } });
    if (!farmer) { res.status(404).json({ error: "Farmer not found" }); return; }
    res.json(farmer);
  } catch (err) {
    next(err);
  }
});

router.get("/farmers", async (_req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const farmers = await col
      .find({ status: { $ne: "Draft" } }, { projection: { _id: 0 } })
      .sort({ addedAt: -1 })
      .toArray();
    res.json(farmers);
  } catch (err) {
    next(err);
  }
});

router.post("/farmers", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const farmerId = await getNextFarmerId(col);
    const farmer = {
      farmerId,
      ...req.body,
      addedAt: new Date().toISOString(),
    };
    await col.insertOne(farmer);
    const { _id: _removed, ...clean } = farmer as typeof farmer & { _id?: unknown };
    res.status(201).json(clean);
  } catch (err) {
    next(err);
  }
});

router.patch("/farmers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const { _id, farmerId, addedAt, ...updates } = req.body;
    await col.updateOne({ farmerId: req.params["id"] }, { $set: updates });
    const updated = await col.findOne({ farmerId: req.params["id"] }, { projection: { _id: 0 } });
    if (!updated) { res.status(404).json({ error: "Farmer not found" }); return; }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post("/farmers/submit-registration", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const mobile = typeof req.body?.mobile === "string" ? req.body.mobile.trim() : "";
    if (!mobile) { res.status(400).json({ error: "mobile is required" }); return; }

    const now = new Date().toISOString();
    const existing = await col.findOne({ mobile }, { projection: { _id: 0 } });

    if (existing) {
      if (existing["status"] === "Pending" || existing["status"] === "Active" || existing["status"] === "Rejected") {
        res.json(existing);
        return;
      }
      await col.updateOne({ mobile }, { $set: { status: "Pending", submittedAt: now, updatedAt: now } });
      const updated = await col.findOne({ mobile }, { projection: { _id: 0 } });
      res.json(updated);
    } else {
      const farmerId = await getNextFarmerId(col);
      const farmer = {
        farmerId,
        mobile,
        status: "Pending",
        source: "mobile_ocr",
        name: "—",
        aadhaar: "—",
        village: "—",
        district: "—",
        surveyNumber: "—",
        bankAccount: "—",
        crop: "—",
        land: "—",
        addedAt: now,
        submittedAt: now,
        updatedAt: now,
        docs: [],
      };
      await col.insertOne(farmer);
      const { _id: _r, ...clean } = farmer as typeof farmer & { _id?: unknown };
      res.status(201).json(clean);
    }
  } catch (err) {
    next(err);
  }
});

router.get("/farmers/:farmerId/documents", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("document_images");
    const docs = await col
      .find(
        { farmerId: req.params["farmerId"] },
        { projection: { _id: 0, docType: 1, mimeType: 1, base64: 1, uploadedAt: 1 } },
      )
      .toArray();
    res.json({ documents: docs });
  } catch (err) {
    next(err);
  }
});

router.post("/farmers/:farmerId/documents", async (req, res, next) => {
  try {
    const db = getDb();
    const farmersCol = db.collection("farmers");
    const docImagesCol = db.collection("document_images");
    const farmerId = req.params["farmerId"];

    const farmer = await farmersCol.findOne({ farmerId }, { projection: { _id: 0, mobile: 1 } });
    if (!farmer) { res.status(404).json({ error: "Farmer not found" }); return; }
    const mobile = typeof farmer["mobile"] === "string" ? farmer["mobile"] : "";

    const docs = Array.isArray(req.body?.documents) ? req.body.documents : [];
    const now = new Date().toISOString();

    await Promise.all(
      docs
        .filter((d: { docType?: string; base64?: string; mimeType?: string }) =>
          typeof d.docType === "string" && typeof d.base64 === "string" && d.base64.length > 0
        )
        .map((d: { docType: string; base64: string; mimeType: string }) =>
          docImagesCol.updateOne(
            { farmerId, docType: d.docType },
            {
              $set: {
                farmerId,
                mobile,
                docType: d.docType,
                base64: d.base64,
                mimeType: d.mimeType || "application/octet-stream",
                uploadedAt: now,
              },
            },
            { upsert: true },
          )
        )
    );

    res.json({ saved: docs.length });
  } catch (err) {
    next(err);
  }
});

router.delete("/farmers", async (_req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const docImagesCol = db.collection("document_images");
    const [result] = await Promise.all([
      col.deleteMany({}),
      docImagesCol.deleteMany({}),
    ]);
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

router.delete("/farmers/:id", async (req, res, next) => {
  try {
    const db = getDb();
    const col = db.collection("farmers");
    const docImagesCol = db.collection("document_images");
    const farmerId = req.params["id"];
    const result = await col.deleteOne({ farmerId });
    if (result.deletedCount === 0) { res.status(404).json({ error: "Farmer not found" }); return; }
    await docImagesCol.deleteMany({ farmerId });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
