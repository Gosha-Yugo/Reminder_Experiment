import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../contexts/UserContext';

export default function Praise() {
  const router = useRouter();
  const { uid } = useUser();

  useEffect(() => {
    // simple event: could write to Firestore, keep minimal
    console.log('praise_viewed', { uid, timestamp: new Date().toISOString() });
  }, [uid]);

  return (
    <main className="container">
      <h1>出発前確認ができました</h1>
      <p className="helper">この調子で続けましょう</p>

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => router.push('/calendar')}>履歴を見る</button>
        <button className="ghost" onClick={() => router.push('/')}>戻る</button>
      </div>
    </main>
  );
}
