import { useState } from 'react';
import { db } from '../lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';

export default function SignIn() {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { setUid } = useUser();
  const nextPath = (typeof router.query.next === 'string' && decodeURIComponent(router.query.next)) || '/';

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const ref = await addDoc(collection(db, 'users'), {
        displayName: name.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setUid(ref.id);
      router.replace(nextPath);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container">
      <h1>サインイン（新規登録）</h1>
      <section className="card">
        <label>名前</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例）山田太郎" />
        <div className="toolbar" style={{ marginTop: 12 }}>
          <button onClick={submit} disabled={!name.trim() || busy}>はじめる</button>
          <a className="ghost" href={`/login?next=${encodeURIComponent(nextPath)}`}
             style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
            既存ユーザーでログイン
          </a>
        </div>
      </section>
    </main>
  );
}
