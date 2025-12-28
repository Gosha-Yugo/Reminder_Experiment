import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs from 'dayjs';
import { useUser } from '../contexts/UserContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { pickSuggestion } from '../lib/suggestions';

export default function Home() {
  const router = useRouter();
  const { uid, profile, isHydrated } = useUser();

  const [suggestion, setSuggestion] = useState('');
  const qDate = typeof router.query.date === 'string' ? router.query.date : undefined;
  const dateKey = qDate ?? dayjs().format('YYYY-MM-DD');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSuggestion(pickSuggestion());
  }, []);

  // 未選択ならオンボードへ
  useEffect(() => {
    if (!isHydrated) return; // 復元待ち
    if (!uid) router.replace('/onboard');
  }, [uid, isHydrated, router]);

  const onCheck = async () => {
    if (!uid) return;
    try {
      setSaving(true);
      await setDoc(doc(db, 'checks', `${uid}_${dateKey}`), {
        uid,
        dateKey,
        itemsChecked: [],
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      }, { merge: true });
      router.push('/praise');
    } catch (e) {
      console.error(e);
      alert('完了の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (!uid) return null;

  return (
    <main className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700 }}>{profile?.displayName || 'ユーザー'}</div>
        <div>
          <button className="ghost" onClick={() => router.push('/settings')}>設定</button>
        </div>
      </header>

      <section style={{ marginTop: 18 }} className="card">
        <h1>出発前の確認</h1>
        <p className="helper">出発前に、必要な持ち物がそろっているか確認しましょう</p>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 18 }}>
          <button
            onClick={onCheck}
            disabled={saving}
            style={{ padding: '28px 40px', fontSize: '1.2rem', borderRadius: 12 }}
          >
            確認する
          </button>
        </div>

        <div style={{ marginTop: 12, textAlign: 'center', color: 'var(--muted)' }}>{suggestion}</div>
      </section>

      <footer style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <button onClick={() => router.push('/calendar')} style={{ flex: 1 }}>履歴</button>
      </footer>
    </main>
  );
}
