/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const express = require("express");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const webpush = require("web-push");

initializeApp();
const db = getFirestore();

// 環境変数から VAPID 情報を取得
// Cloud Functions では本番環境でも動作するようにハードコード
const vapidMailto = process.env.VAPID_MAILTO || "mailto:koshakosha1004@gmail.com";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "BMTapkoVpKXF4wUnhLfeLPoTErNu6pmHLt96gh2nogROVmMK2Cndsxq37ITxQIF3l6n-bDUYSAcLj79-9rr2Quw";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "yurCINdwBhf9-Jf-F3pNMuXwWBuHiCNxxn--t-r08EY";

// VAPID詳細を設定
if (vapidMailto && vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey);
  logger.info("VAPID details configured successfully");
} else {
  logger.warn("VAPID details not configured", { 
    hasMailto: !!vapidMailto, 
    hasPublicKey: !!vapidPublicKey, 
    hasPrivateKey: !!vapidPrivateKey 
  });
}

setGlobalOptions({ maxInstances: 10 });

const app = express();
app.use(express.json());

// POST /api/push/subscribe
app.post("/push/subscribe", async (req, res) => {
  try {
    const { uid, subscription } = req.body;
    if (!uid || !subscription) {
      return res.status(400).json({ error: "bad request" });
    }
    await db.collection("pushSubs").doc(uid).set({
      uid,
      subscription,
      updatedAt: new Date(),
      createdAt: new Date()
    }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    logger.error("subscribe error:", error);
    res.status(500).json({ error: "server error" });
  }
});

// GET /api/push/test
app.get("/push/test", async (req, res) => {
  try {
    const uid = req.query.uid || req.body?.uid;
    if (!uid) {
      return res.status(400).json({ error: "uid required" });
    }

    const snap = await db.collection("pushSubs").doc(uid).get();
    if (!snap.exists) {
      return res.status(404).json({ error: "no subscription" });
    }

    const data = snap.data();
    const subscription = data.subscription || data;

    logger.info("Sending notification", { uid, vapidConfigured: !!(vapidMailto && vapidPublicKey && vapidPrivateKey) });
    
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "テスト通知",
        body: "タップするとチェックリストへ移動します",
        url: "/today"
      })
    );
    res.status(200).json({ ok: true, sent: true });
  } catch (error) {
    logger.error("test error:", error);
    res.status(500).json({ error: error.message });
  }
});

exports.api = onRequest(app);
