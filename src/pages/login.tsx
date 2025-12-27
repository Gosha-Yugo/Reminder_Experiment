import { useEffect, useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useRouter } from 'next/router';

export default function Login() {
  const { listProfiles, setUid } = useUser();
  const [list, setList] = useState<{ id: string; displayName: string }[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const nextPath = (typeof router.query.next === 'string' && decodeURIComponent(router.query.next)) || '/';

  useEffect(() => {
    (async () => {
      const l = await listProfiles();
      setList(l);
      setLoading(false);
    })();
  }, [listProfiles]);

  const proceed = () => {
    if (!selected) return;
    setUid(selected);              // localStorage に保存
    router.replace(nextPath);      // 想定ページへ戻す（/calendar など）
  };

  return (
    <main className="container">
      <h1>ログイン</h1>
      <section className="card">
        {loading && <span className="badge">読込中</span>}
        {!loading && list.length === 0 && (
          <p className="helper">
            ユーザーが見つかりません。<a href={`/signin?next=${encodeURIComponent(nextPath)}`}>サインイン</a>してください。
          </p>
        )}
        {!loading && list.length > 0 && (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              {list.map(u => (
                <label key={u.id} className="row-inline" style={{ justifyContent: 'space-between' }}>
                  <span>{u.displayName}</span>
                  <input type="radio" name="pick" checked={selected === u.id} onChange={() => setSelected(u.id)} />
                </label>
              ))}
            </div>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button onClick={proceed} disabled={!selected}>続行</button>
              <a className="ghost" href={`/signin?next=${encodeURIComponent(nextPath)}`}
                 style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                新規作成
              </a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
