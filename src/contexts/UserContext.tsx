// src/contexts/UserContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

type Profile = { id: string; displayName: string };

type Ctx = {
  uid: string | null;
  profile: Profile | null;
  setUid: (uid: string | null) => void;
  listProfiles: () => Promise<Profile[]>;
  isHydrated: boolean;               // ← 追加：localStorageからの復元が終わったか
};

const UserCtx = createContext<Ctx>({
  uid: null, profile: null, setUid: () => {}, listProfiles: async () => [], isHydrated: false
});

const LS_KEY = 'current_uid';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUidState] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isHydrated, setHydrated] = useState(false);

  const setUid = (u: string | null) => {
    setUidState(u);
    if (u) localStorage.setItem(LS_KEY, u);
    else localStorage.removeItem(LS_KEY);
  };

  const listProfiles = async (): Promise<Profile[]> => {
    const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'asc'), limit(100)));
    return snap.docs.map(d => ({ id: d.id, displayName: (d.data() as any).displayName || '(no name)' }));
  };

  // localStorage から uid を復元
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : null;
    if (saved) setUidState(saved);
    setHydrated(true);               // ← 復元完了
  }, []);

  // uid 変化でプロフィールを更新（任意）
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!uid) { setProfile(null); return; }
      const list = await listProfiles();
      if (canceled) return;
      const p = list.find(x => x.id === uid) || null;
      setProfile(p);
    })();
    return () => { canceled = true; };
  }, [uid]);

  return (
    <UserCtx.Provider value={{ uid, profile, setUid, listProfiles, isHydrated }}>
      {children}
    </UserCtx.Provider>
  );
}

export function useUser() {
  return useContext(UserCtx);
}
