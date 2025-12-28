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
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();
const messaging = getMessaging();

setGlobalOptions({ maxInstances: 10 });

const app = express();
app.use(express.json());

// POST /api/push/subscribe
app.post("/push/subscribe", async (req, res) => {
  try {
    const { uid, fcmToken } = req.body;
    if (!uid || !fcmToken) {
      return res.status(400).json({ error: "uid and fcmToken required" });
    }
    await db.collection("pushSubs").doc(uid).set({
      uid,
      fcmToken,
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
    const fcmToken = data.fcmToken;

    if (!fcmToken) {
      return res.status(400).json({ error: "no fcmToken" });
    }

    logger.info("Sending notification", { uid });
    
    await messaging.send({
      notification: {
        title: "テスト通知",
        body: "タップするとチェックリストへ移動します"
      },
      webpush: {
        fcmOptions: { link: "/today" }
      },
      token: fcmToken
    });

    res.status(200).json({ ok: true, sent: true });
  } catch (error) {
    logger.error("test error:", error);
    res.status(500).json({ error: error.message });
  }
});

exports.api = onRequest(app);
