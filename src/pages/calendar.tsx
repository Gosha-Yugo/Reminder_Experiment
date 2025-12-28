// src/pages/calendar.tsx
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dayjs, { Dayjs } from 'dayjs';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { SelfReportDoc, CheckDoc } from '../lib/types';
import { useUser } from '../contexts/UserContext';

type DayInfo = {
  dateKey: string;                 // YYYY-MM-DD
  hasSelf: boolean;
  hasCheck: boolean;
  badge: '金' | '銀' | '銅' | 'なし';
};

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function CalendarPage() {
  const { uid } = useUser();           // ← サインイン/ログインで選択したユーザー
  const router = useRouter();
  const [days, setDays] = useState<DayInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // 月移動（グリッドは常に 6 週 = 42 セル）
  const [monthBase, setMonthBase] = useState<Dayjs>(dayjs().startOf('month'));
  const monthStart = useMemo(() => monthBase.startOf('month'), [monthBase]);

  // 月の全セル（前月の余白、当月、次月の余白を含む）
  const cellKeys = useMemo(() => {
    const startWeekday = monthStart.day(); // 0=Sun
    const firstCell = monthStart.subtract(startWeekday, 'day');
    const arr: string[] = [];
    for (let i = 0; i < 42; i++) arr.push(firstCell.add(i, 'day').format('YYYY-MM-DD'));
    return arr;
  }, [monthStart]);

  // uid が決まったら読み込み
  useEffect(() => {
     if(!uid) return; // Guard側で遷移済み想定。null ならまだ描画しない
    (async () => {
      setLoading(true);
      try {
        // 件数は少ない想定：uid 全件を取得してクライアントで当月に整形
        const [selfSnap, checkSnap] = await Promise.all([
          getDocs(query(collection(db, 'selfReports'), where('uid', '==', uid))),
          getDocs(query(collection(db, 'checks'), where('uid', '==', uid))),
        ]);

        const selfByDate = new Map<string, SelfReportDoc>();
        selfSnap.forEach((d) => { const v = d.data() as SelfReportDoc; selfByDate.set(v.dateKey, v); });

        const checkByDate = new Map<string, CheckDoc>();
        checkSnap.forEach((d) => { const v = d.data() as CheckDoc; checkByDate.set(v.dateKey, v); });

        const list: DayInfo[] = cellKeys.map((k) => {
          const hasSelf = selfByDate.has(k);
          const hasCheck = Boolean(checkByDate.get(k)?.completedAt);
          let badge: DayInfo['badge'] = 'なし';
          if (hasSelf && hasCheck) badge = '金';
          else if (hasSelf || hasCheck) badge = '銀';
          return { dateKey: k, hasSelf, hasCheck, badge };
        });

        setDays(list);
        setSelectedKey((sk) => sk ?? dayjs().format('YYYY-MM-DD'));
      } finally {
        setLoading(false);
      }
    })();
  }, [uid, cellKeys]);

  const isInCurrentMonth = (key: string) => dayjs(key).isSame(monthStart, 'month');

  const selected = useMemo(
    () => days.find((d) => d.dateKey === selectedKey) || null,
    [days, selectedKey]
  );

  if (!uid) return null;

  return (
    <main className="container">
      <h1>カレンダー</h1>

      <div className="toolbar" style={{ marginBottom: 12 }}>
        <button className="ghost" onClick={() => setMonthBase((m) => m.add(-1, 'month'))}>前の月</button>
        <div className="badge">{monthStart.format('YYYY年 M月')}</div>
        <button className="ghost" onClick={() => setMonthBase((m) => m.add(1, 'month'))}>次の月</button>
      </div>

      <div className="calendar-legend">
        <span className="chip chip-self">自己申告</span>
        <span className="chip chip-check">チェック完了</span>
        <span className="chip chip-gold">金</span>
        <span className="chip chip-silver">銀</span>
      </div>

      <div className="calendar-grid">
        {WEEK_LABELS.map((w) => (
          <div key={w} className="cal-week">{w}</div>
        ))}
        {days.map((d) => {
          const dayNum = dayjs(d.dateKey).date();
          const isToday = d.dateKey === dayjs().format('YYYY-MM-DD');
          const isSelected = d.dateKey === selectedKey;
          const dim = !isInCurrentMonth(d.dateKey);
          return (
            <button
              key={d.dateKey}
              onClick={() => setSelectedKey(d.dateKey)}
              className={`cal-cell ${isSelected ? 'selected' : ''} ${dim ? 'dim' : ''}`}
              aria-pressed={isSelected}
              title={d.dateKey}
            >
              <div className="cal-head">
                <span className={`cal-day ${isToday ? 'today' : ''}`}>{dayNum}</span>
                {d.badge !== 'なし' && <span className={`badge badge-${d.badge}`}>{d.badge}</span>}
              </div>
              <div className="cal-body">
                <span className={`chip ${d.hasSelf ? 'chip-self on' : 'off'}`}>自己</span>
                <span className={`chip ${d.hasCheck ? 'chip-check on' : 'off'}`}>検</span>
              </div>
            </button>
          );
        })}
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>詳細</h2>
        {loading && <span className="badge">読込中</span>}
        {!loading && !selected && <div className="helper">日付を選択してください。</div>}
        {!loading && selected && (
          <div className="detail">
            <div className="detail-row"><div className="detail-key">日付</div><div className="detail-val">{selected.dateKey}</div></div>
            <div className="detail-row"><div className="detail-key">自己申告</div><div className="detail-val">{selected.hasSelf ? 'あり' : 'なし'}</div></div>
            <div className="detail-row"><div className="detail-key">チェック完了</div><div className="detail-val">{selected.hasCheck ? 'あり' : 'なし'}</div></div>
            <div className="detail-row"><div className="detail-key">バッジ</div><div className="detail-val">{selected.badge}</div></div>
            <div style={{ marginTop: 12 }}>
              <button onClick={() => router.push({ pathname: '/', query: { date: selected.dateKey } })}>この日の確認へ</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
