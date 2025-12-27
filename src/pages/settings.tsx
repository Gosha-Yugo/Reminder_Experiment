// src/pages/settings.tsx（抜粋）
import { useUser } from '../contexts/UserContext';

export default function Settings() {
  const { uid } = useUser();
  const regPush = async () => {
    if (!uid) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
    });

    // API 経由で Firestore に保存
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ uid, subscription: sub })
    });
    alert('通知登録しました');
  };

  return (
    <main className="container">
      <h1>設定</h1>
      <button onClick={regPush}>通知を許可＆登録</button>
    </main>
  );
}

// ヘルパ
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}
