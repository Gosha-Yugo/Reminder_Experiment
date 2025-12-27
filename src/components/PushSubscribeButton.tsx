import { useCallback, useState } from 'react';

function base64UrlToUint8Array(base64Url: string) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = typeof window !== 'undefined' ? window.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export default function PushSubscribeButton() {
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    try {
      setBusy(true);
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('このブラウザはWeb Pushに未対応です');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('通知が許可されていません');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub)
      });

      alert('この端末を通知先として登録しました');
    } catch (e) {
      console.error(e);
      alert('登録に失敗しました');
    } finally {
      setBusy(false);
    }
  }, []);

  return <button onClick={onClick} disabled={busy}>この端末を通知先に登録</button>;
}
