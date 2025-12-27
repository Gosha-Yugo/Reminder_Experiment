// src/pages/api/push/subscribe.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { uid, subscription } = req.body;
  if (!uid || !subscription) return res.status(400).json({ error: 'bad request' });
  await setDoc(doc(db, 'pushSubs', uid), {
    uid, subscription, updatedAt: serverTimestamp(), createdAt: serverTimestamp()
  }, { merge: true });
  res.status(200).json({ ok: true });
}
