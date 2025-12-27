import type { NextApiRequest, NextApiResponse } from 'next';
import webPush from 'web-push';
import { promises as fs } from 'fs';
import path from 'path';

const storePath = path.join(process.cwd(), 'subscriptions.json');

webPush.setVapidDetails(
  process.env.VAPID_MAILTO || 'mailto:example@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const message = {
    title: body.title || '出発前チェック',
    body: body.body || '今日の持ち物を確認しましょう',
    url: body.url || '/today'
  };

  let list: any[] = [];
  try { list = JSON.parse(await fs.readFile(storePath, 'utf-8')); } catch {}

  const results = await Promise.allSettled(
    list.map((sub) => webPush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(message)
    ))
  );

  const alive: any[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') alive.push(list[i]);
    else {
      const code = (r as any)?.reason?.statusCode;
      if (!(code === 404 || code === 410)) alive.push(list[i]);
    }
  });
  await fs.writeFile(storePath, JSON.stringify(alive, null, 2));

  res.json({
    ok: true,
    sent: results.filter(r => r.status === 'fulfilled').length,
    failed: results.filter(r => r.status === 'rejected').length
  });
}
