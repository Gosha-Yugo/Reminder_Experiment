import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';

export default function Onboard() {
  const router = useRouter();
  const { listProfiles, setUid, isHydrated } = useUser();
  const [profiles, setProfiles] = useState<{ id: string; displayName: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const p = await listProfiles();
      setProfiles(p);
      if (p.length === 1) setSelected(p[0].id);
    })();
  }, [listProfiles]);

  useEffect(() => {
    if (!isHydrated) return;
    // noop
  }, [isHydrated]);

  const onNext = () => {
    if (!selected) { alert('ユーザーを選んでください'); return; }
    setUid(selected);
    // log event (optional): here we could write to Firestore; keep simple and navigate
    router.push('/settings');
  };

  return (
    <main className="container">
      <h1>ユーザーを選択</h1>
      <p className="helper">使う人を選んでください</p>

      <section className="card">
        {profiles.length === 0 && <div className="helper">ユーザーが見つかりません</div>}
        {profiles.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {profiles.map((p) => (
              <label key={p.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="radio" name="user" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} />
                <span>{p.displayName}</span>
              </label>
            ))}
          </div>
        )}

        <div className="toolbar" style={{ marginTop: 12 }}>
          <button onClick={onNext}>次へ</button>
          <button className="ghost" onClick={() => router.push('/')}>あとで</button>
        </div>
      </section>
    </main>
  );
}
