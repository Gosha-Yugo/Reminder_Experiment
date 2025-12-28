import { useCallback, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { getMsg } from '../lib/firebase';
import { getToken } from 'firebase/messaging';

export default function PushSubscribeButton() {
  const [busy, setBusy] = useState(false);
  const { uid } = useUser();

  const onClick = useCallback(async () => {
    try {
      setBusy(true);
      
      // FCMメッセージング取得
      const messaging = await getMsg();
      if (!messaging) {
        alert('このブラウザはCloud Messagingに未対応です');
        return;
      }

      // 通知許可を要求
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('通知が許可されていません');
        return;
      }

      // FCMトークン取得
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      if (!token) {
        alert('トークン取得に失敗しました');
        return;
      }

      // サーバーに送信
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ uid, fcmToken: token })
      });

      if (!res.ok) throw new Error(`${res.status}`);

      alert('この端末を通知先として登録しました');
    } catch (e) {
      console.error(e);
      alert('登録に失敗しました');
    } finally {
      setBusy(false);
    }
  }, [uid]);

  return <button onClick={onClick} disabled={busy}>この端末を通知先に登録</button>;
}
