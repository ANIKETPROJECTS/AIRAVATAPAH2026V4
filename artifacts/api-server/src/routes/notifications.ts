import { Router } from "express";
import { getDb } from "../lib/mongo";
import { logger } from "../lib/logger";

const router = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { mobile, farmerId, unreadOnly } = req.query as Record<string, string | undefined>;

    if (!mobile && !farmerId) {
      res.json([]);
      return;
    }

    const filter: Record<string, unknown> = {};
    if (mobile) filter["mobile"] = mobile;
    else if (farmerId) filter["farmerId"] = farmerId;

    const farmer = await db
      .collection("farmers")
      .findOne(filter, { projection: { _id: 0, notifications: 1 } });

    let notifications: Record<string, unknown>[] = Array.isArray(farmer?.["notifications"])
      ? (farmer["notifications"] as Record<string, unknown>[])
      : [];

    if (unreadOnly === "true") {
      notifications = notifications.filter((n) => !n["read"]);
    }

    notifications = notifications
      .sort((a, b) => new Date(b["createdAt"] as string).getTime() - new Date(a["createdAt"] as string).getTime())
      .slice(0, 50);

    res.json(notifications);
  } catch (err) {
    logger.error({ err }, "Failed to fetch notifications");
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { mobile, farmerId } = req.body as { mobile?: string; farmerId?: string };
    const now = new Date().toISOString();

    const filter: Record<string, unknown> = {};
    if (mobile) filter["mobile"] = mobile;
    else if (farmerId) filter["farmerId"] = farmerId;
    else { res.json({ success: true, updated: 0 }); return; }

    const result = await db.collection("farmers").updateOne(
      filter,
      { $set: { "notifications.$[elem].read": true, "notifications.$[elem].readAt": now } },
      { arrayFilters: [{ "elem.read": false }] }
    );

    res.json({ success: true, updated: result.modifiedCount });
  } catch (err) {
    logger.error({ err }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const notificationId = req.params["id"];

    const result = await db.collection("farmers").updateOne(
      { "notifications.notificationId": notificationId },
      { $set: { "notifications.$.read": true, "notifications.$.readAt": now } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    const farmer = await db
      .collection("farmers")
      .findOne(
        { "notifications.notificationId": notificationId },
        { projection: { _id: 0, "notifications.$": 1 } }
      );

    const notification = Array.isArray(farmer?.["notifications"]) ? farmer["notifications"][0] : null;
    if (!notification) { res.status(404).json({ error: "Notification not found" }); return; }
    res.json(notification);
  } catch (err) {
    logger.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

router.post("/notifications/send", async (req, res): Promise<void> => {
  try {
    const db = getDb();
    const { mobile, farmerId, type, title, body, data } = req.body as {
      mobile?: string;
      farmerId?: string;
      type?: string;
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    };

    if (!title || !body) {
      res.status(400).json({ error: "title and body are required" });
      return;
    }

    const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const notification = {
      notificationId,
      mobile: mobile ?? null,
      farmerId: farmerId ?? null,
      type: type ?? "general",
      title,
      body,
      data: data ?? {},
      read: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };

    const filter: Record<string, unknown> = {};
    if (mobile) filter["mobile"] = mobile;
    else if (farmerId) filter["farmerId"] = farmerId;

    if (mobile || farmerId) {
      await db.collection("farmers").updateOne(
        filter,
        { $push: { notifications: notification } } as Record<string, unknown>
      );
    }

    if (mobile) {
      const tokenDoc = await db.collection("push_tokens").findOne({ mobile });
      if (tokenDoc?.["pushToken"]) {
        try {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: tokenDoc["pushToken"],
              title,
              body,
              data: { type, ...data },
              sound: "default",
            }),
          });
        } catch (pushErr) {
          logger.warn({ pushErr }, "Push notification delivery failed (non-fatal)");
        }
      }
    }

    res.status(201).json(notification);
  } catch (err) {
    logger.error({ err }, "Failed to send notification");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
