// src/pages/api/push/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import webpush from 'web-push';
import { db } from '../../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

webpush.setVapidDetails(
  process.env.VAPID_MAILTO as string,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const uid = (req.query.uid as string) || req.body?.uid;
  if (!uid) return res.status(400).json({ error: 'uid required' });

  const snap = await getDoc(doc(db, 'pushSubs', uid));
  if (!snap.exists()) return res.status(404).json({ error: 'no subscription' });
  const data = snap.data() as any;
  const subscription = data.subscription || data; // support both { subscription } and legacy raw object
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'テスト通知',
        body: 'タップするとチェックリストへ移動します',
        url: '/today'
      })
    );
    res.status(200).json({ ok: true, sent: true });
  } catch (err: any) {
    console.error('webpush send error', err);
    // return useful debug info to client (but not secrets)
    const message = err && err.body ? err.body : err?.message || String(err);
    res.status(500).json({ error: 'send_failed', detail: message });
  }
}
