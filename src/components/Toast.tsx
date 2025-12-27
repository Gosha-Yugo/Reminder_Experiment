import { useEffect, useState } from 'react';

export default function Toast({ text, type = 'ok', onDone }: { text: string; type?: 'ok' | 'err'; onDone?: () => void; }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => { setOpen(false); onDone?.(); }, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  if (!open) return null;
  return <div className={`toast ${type}`}>{text}</div>;
}
