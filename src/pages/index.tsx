import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useUser } from "../contexts/UserContext";

// ここはあなたの初期化ファイルに合わせて変更してください
// 例: src/lib/firebase.ts で export const db = getFirestore(app) しているならそれを使う
import { db } from "../lib/firebase";

import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const router = useRouter();
  const { uid } = useUser();

  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // uid が無いなら login に戻す
  useEffect(() => {
    if (!uid) {
      router.replace(`/login?next=${encodeURIComponent("/")}`);
      return;
    }
  }, [uid, router]);

  // Firestore からメッセージを取得
  useEffect(() => {
    if (!uid) return;

    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, "profiles", uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : null;

        setMessage((data?.message as string) ?? "");
      } catch (e) {
        console.error(e);
        setMessage("");
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  if (!uid) return null;

  return (
    <main className="container">
      <h1>メイン</h1>

      <section className="card" style={{ display: "grid", gap: 12 }}>
        <button
          onClick={() => router.push("/today")}
          style={{ padding: "14px", fontSize: "1rem" }}
        >
          確認画面へ
        </button>

        <button
          onClick={() => router.push("/calendar")}
          style={{ padding: "14px", fontSize: "1rem" }}
        >
          確認履歴へ
        </button>

       <div style={{ marginTop: 4 }}>
  <div style={{ fontWeight: 700, marginBottom: 6 }}>メッセージ</div>

  <div
    style={{
      width: "100%",
      padding: 12,
      borderRadius: 10,
      border: "1px solid var(--border)",
      background: "var(--bg-subtle)",
      lineHeight: 1.6,
      minHeight: 84,
      whiteSpace: "pre-wrap",
    }}
  >
    {loading ? "読込中…" : message || "（メッセージは未設定です）"}
  </div>

  {/* 余白をしっかり取る */}
  <div style={{ marginTop: 16 }}>
    <button
      onClick={() => router.push("/settings")}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "transparent",
        fontSize: "0.95rem",
      }}
    >
      メッセージを編集する
    </button>
  </div>
</div>

      </section>
    </main>
  );
}
