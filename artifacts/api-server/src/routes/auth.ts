import { Router } from "express";
import crypto from "node:crypto";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router = Router();

const JWT_SECRET = process.env["JWT_SECRET"] ?? "krushi-suvidha-secret-2026";
const JWT_EXPIRES_DAYS = 7;
const OTP_TTL_MS = 5 * 60 * 1000;

function b64url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function signJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRES_DAYS * 24 * 60 * 60,
  }));
  const sig = b64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${sig}`;
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

router.post("/auth/send-otp", async (req, res): Promise<void> => {
  try {
    const { mobile } = req.body as { mobile?: string };
    if (!mobile || !/^\d{10}$/.test(mobile)) {
      res.status(400).json({ error: "Valid 10-digit mobile number required" });
      return;
    }

    const db = getDb();
    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    await db.collection("otp_sessions").updateOne(
      { mobile },
      { $set: { mobile, otp, expiresAt, verified: false, createdAt: new Date().toISOString() } },
      { upsert: true }
    );

    logger.info({ mobile, otp }, "OTP generated");

    res.json({
      success: true,
      message: "OTP sent successfully",
      otp,
      expiresIn: 300,
    });
  } catch (err) {
    logger.error({ err }, "Failed to send OTP");
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

router.post("/auth/verify-otp", async (req, res): Promise<void> => {
  try {
    const { mobile, otp } = req.body as { mobile?: string; otp?: string };
    if (!mobile || !otp) {
      res.status(400).json({ error: "mobile and otp are required" });
      return;
    }

    const db = getDb();
    const session = await db.collection("otp_sessions").findOne({ mobile });

    if (!session) {
      res.status(400).json({ error: "OTP not requested for this number" });
      return;
    }
    if (new Date(session["expiresAt"] as string) < new Date()) {
      res.status(400).json({ error: "OTP expired. Please request a new one." });
      return;
    }
    if (session["otp"] !== otp) {
      res.status(400).json({ error: "Invalid OTP" });
      return;
    }

    await db.collection("otp_sessions").deleteOne({ mobile });

    const farmer = await db.collection("farmers").findOne(
      { $or: [{ mobile }, { aadhaarMobile: mobile }, { "farmerProfile.mobile": mobile }] },
      { projection: { _id: 0, farmerId: 1, name: 1, mobile: 1, aadhaarMobile: 1, status: 1, district: 1, docs: 1, source: 1 } }
    );

    // If farmer was found via aadhaarMobile (not their stored mobile), update their
    // mobile field so future lookups by phone work correctly.
    if (farmer && farmer["mobile"] !== mobile) {
      await db.collection("farmers").updateOne(
        { farmerId: farmer["farmerId"] },
        { $set: { mobile, updatedAt: new Date().toISOString() } }
      );
      farmer["mobile"] = mobile;
    }

    const payload = { mobile, farmerId: farmer?.["farmerId"] ?? null, role: "farmer" };
    const token = signJwt(payload);

    res.json({
      success: true,
      token,
      farmer: farmer ?? null,
      isRegistered: !!farmer,
    });
  } catch (err) {
    logger.error({ err }, "Failed to verify OTP");
    res.status(500).json({ error: "Failed to verify OTP" });
  }
});

router.post("/auth/register-push-token", async (req, res): Promise<void> => {
  try {
    const { mobile, pushToken } = req.body as { mobile?: string; pushToken?: string };
    if (!mobile || !pushToken) {
      res.status(400).json({ error: "mobile and pushToken are required" });
      return;
    }

    const db = getDb();
    await db.collection("push_tokens").updateOne(
      { mobile },
      { $set: { mobile, pushToken, updatedAt: new Date().toISOString() } },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to register push token");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

export default router;
