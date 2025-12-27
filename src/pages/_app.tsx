// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { UserProvider, useUser } from '../contexts/UserContext';
import dynamic from 'next/dynamic';

const SWRegister = dynamic(() => import('../components/SWRegister'), { ssr: false });

function Guard({ children }: { children: ReactNode }) {
  const { uid, isHydrated } = useUser();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  const isAuthRoute = router.pathname === '/login' || router.pathname === '/signin';

  useEffect(() => {
    // まずは復元完了を待つ
    if (!isHydrated) { setReady(false); return; }

    // 認証ページはそのまま表示
    if (isAuthRoute) { setReady(true); return; }

    // 未ログインなら next つきで /login へ
    if (!uid) {
      const next = encodeURIComponent(router.asPath || '/');
      router.replace(`/login?next=${next}`);
      setReady(true);
      return;
    }

    // ログイン済み
    setReady(true);
  }, [uid, isHydrated, isAuthRoute, router]);

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;
  return <>{children}</>;
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Guard>
        <>
          <Component {...pageProps} />
          <SWRegister />
        </>
      </Guard>
    </UserProvider>
  );
}
