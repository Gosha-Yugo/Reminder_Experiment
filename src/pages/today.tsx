import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { PlanDoc, CheckDoc } from '../lib/types';
import { useUser } from '../contexts/UserContext';

export default function Today() {
  const { uid } = useUser();
 

  const dateKey = dayjs().format('YYYY-MM-DD');

  const [items, setItems] = useState<string[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);
  const [actualDepartureAt, setActualDepartureAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  // 初期ロード：plans → checks
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const p = await getDoc(doc(db, 'plans', `${uid}_${dateKey}`));
        if (p.exists()) {
          const plan = p.data() as PlanDoc;
          setItems(plan.items ?? []);
        } else {
          setItems([]);
        }

        const c = await getDoc(doc(db, 'checks', `${uid}_${dateKey}`));
        if (c.exists()) {
          const d = c.data() as CheckDoc;
          setChecked(d.itemsChecked ?? []);
          setCompletedAt(d.completedAt ? new Date() : null);
          setActualDepartureAt(d.actualDepartureAt ?? null);
        } else {
          setChecked([]);
          setCompletedAt(null);
          setActualDepartureAt(null);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, dateKey]);

  // 操作系
  const toggle = (name: string) => {
    setChecked((prev) => (prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]));
  };
  const canComplete = useMemo(
    () => items.length > 0 && checked.length === items.length,
    [items, checked]
  );

  const savePartial = async () => {
    await setDoc(
      doc(db, 'checks', `${uid}_${dateKey}`),
      { uid, dateKey, itemsChecked: checked, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
    setMsg('途中保存しました');
  };

  const complete = async () => {
    if (!canComplete) return;
    await setDoc(
      doc(db, 'checks', `${uid}_${dateKey}`),
      { uid, dateKey, itemsChecked: checked, completedAt: serverTimestamp(), updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
    setCompletedAt(new Date());
    setMsg('チェックを完了しました');
  };

  const nowDeparture = async () => {
    const t = dayjs().format('HH:mm');
    await setDoc(
      doc(db, 'checks', `${uid}_${dateKey}`),
      { uid, dateKey, actualDepartureAt: t, updatedAt: serverTimestamp(), createdAt: serverTimestamp() },
      { merge: true }
    );
    setActualDepartureAt(t);
    setMsg('実出発を記録しました');
  };
 if (!uid) return null; // ガード側で遷移済み。未選択なら描画しない
  return (
    <main className="container">
      <h1>当日チェック</h1>

      {/* カレンダーへ行き来 */}
      <div className="pair-nav">
        <Link href="/calendar" className="pair-btn">カレンダーへ</Link>
      </div>

      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="badge">{dateKey}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {completedAt && <span className="badge">チェック完了済み</span>}
            {actualDepartureAt && <span className="badge">実出発 {actualDepartureAt}</span>}
          </div>
        </div>

        {loading ? (
          <div className="helper" style={{ marginTop: 8 }}>読込中…</div>
        ) : items.length === 0 ? (
          <div className="helper" style={{ marginTop: 8 }}>
            本日の持ち物が登録されていません。前日登録（日次まとめ）で持ち物を追加してください。
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, marginTop: 8 }}>
            {items.map((it) => (
              <li key={it} className="row-inline" style={{ marginTop: 6, justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={checked.includes(it)} onChange={() => toggle(it)} />
                  <span style={{ textDecoration: checked.includes(it) ? 'line-through' : 'none' }}>{it}</span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="toolbar" style={{ marginTop: 12 }}>
          <button onClick={savePartial} disabled={items.length === 0}>途中保存</button>
          <button onClick={complete} disabled={!canComplete || !!completedAt}>完了</button>
          <button onClick={nowDeparture}>今から出発</button>
        </div>

        {msg && <div className="helper" style={{ marginTop: 8 }}>{msg}</div>}
      </section>
    </main>
  );
}
