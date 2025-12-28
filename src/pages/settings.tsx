// src/pages/settings.tsx（抜粋）
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Settings() {
  const router = useRouter();
  const { uid, isHydrated, setUid } = useUser();

  const [weekdayTime, setWeekdayTime] = useState('08:00');
  const [holidayTime, setHolidayTime] = useState('09:00');
  const [offsetMinutes, setOffsetMinutes] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // 30分刻み options
  const times = useMemo(() => {
    const arr: string[] = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hh = String(h).padStart(2, '0');
        const mm = String(m).padStart(2, '0');
        arr.push(`${hh}:${mm}`);
      }
    }
    return arr;
  }, []);

  useEffect(() => {
    if (!uid || !isHydrated) return;
    (async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'settings', uid));
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.weekdayTime) setWeekdayTime(data.weekdayTime);
          if (data.holidayTime) setHolidayTime(data.holidayTime);
          if (typeof data.offsetMinutes === 'number') setOffsetMinutes(data.offsetMinutes);
        }
      } finally { setLoading(false); }
    })();
  }, [uid, isHydrated]);

  const onSave = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      // compute nextSendAt (client local time)
      const computeNextSendAt = () => {
        const now = new Date();
        // choose base time depending on whether today is weekend
        const isWeekend = now.getDay() === 0 || now.getDay() === 6; // 0=Sun,6=Sat
        const base = isWeekend ? holidayTime : weekdayTime; // 'HH:mm'
        const [hh, mm] = base.split(':').map((s) => parseInt(s, 10));
        const sendDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
        // subtract offset
        sendDate.setMinutes(sendDate.getMinutes() - offsetMinutes);
        if (sendDate.getTime() <= now.getTime()) {
          // schedule for next day
          sendDate.setDate(sendDate.getDate() + 1);
        }
        return sendDate;
      };

      const nextSendAt = computeNextSendAt();

      await setDoc(doc(db, 'settings', uid), {
        uid,
        weekdayTime,
        holidayTime,
        offsetMinutes,
        nextSendAt, // Firestore will store JS Date as Timestamp
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      // log event could be added here
      router.push('/');
    } catch (e) {
      console.error(e);
      alert('保存に失敗しました');
    } finally { setLoading(false); }
  };

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

  const [testStatus, setTestStatus] = useState<string | null>(null);

  const sendTestPush = async () => {
    if (!uid) return;
    setTestStatus('送信中...');
    try {
      const res = await fetch(`/api/push/test?uid=${encodeURIComponent(uid)}`, { method: 'GET' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setTestStatus(`失敗: ${err?.error || res.statusText}`);
        return;
      }
      const j = await res.json().catch(() => ({}));
      setTestStatus(`送信済み (${j.sent ?? 'ok'})`);
    } catch (e: any) {
      console.error(e);
      setTestStatus('送信に失敗しました');
    }
  };

  const showLocalNotification = async () => {
    if (!('Notification' in window)) { alert('この環境は通知に非対応です'); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { alert('通知が許可されていません'); return; }
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        await reg.showNotification('テスト通知', {
          body: 'ローカルでの通知表示テストです。',
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          data: { url: '/today' }
        });
        setTestStatus('ローカル通知を表示しました');
      } else {
        // フォールバック
        new Notification('テスト通知', { body: 'ローカルでの通知表示テストです。' });
        setTestStatus('ローカル通知を表示しました');
      }
    } catch (e) {
      console.error(e);
      setTestStatus('ローカル通知の表示に失敗しました');
    }
  };

  if (!isHydrated) return null;

  return (
    <main className="container">
      <h1>通知の設定</h1>
      <p className="helper">外出前に確認しやすい時刻を設定してください（30分刻み）</p>

      <section className="card">
        <div style={{ display: 'grid', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700 }}>通常日の通知時刻</div>
            <select value={weekdayTime} onChange={(e) => setWeekdayTime(e.target.value)}>
              {times.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>休日の通知時刻</div>
            <select value={holidayTime} onChange={(e) => setHolidayTime(e.target.value)}>
              {times.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 700 }}>通知を外出前の何分前にしますか</div>
            <select value={String(offsetMinutes)} onChange={(e) => setOffsetMinutes(Number(e.target.value))}>
              <option value="0">0分（デフォルト）</option>
              <option value="15">15分</option>
              <option value="30">30分</option>
            </select>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button onClick={onSave} disabled={loading}>保存して開始</button>
            <button className="ghost" onClick={() => router.push('/')}>戻る</button>
            <button className="ghost" onClick={() => { setUid(null); router.push('/onboard'); }}>ユーザー切替</button>
          </div>

          <div className="helper">※通知は「外出前確認の目安時刻」です。生活に合わせて調整できます。</div>
        </div>
      </section>

      <section style={{ marginTop: 12 }} className="card">
        <h2>プッシュ通知</h2>
        <p className="helper">通知を受け取りたい場合はブラウザの許可を与えてください。</p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={regPush}>通知を許可＆登録</button>
          <button onClick={sendTestPush}>サーバー経由でテスト通知を送る</button>
          <button onClick={showLocalNotification}>ローカルで通知を表示</button>
        </div>
        {testStatus && <div className="helper" style={{ marginTop: 8 }}>{testStatus}</div>}
      </section>
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
