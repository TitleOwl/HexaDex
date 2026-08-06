import { useState, useEffect, useRef } from "react";
import {
  List, BarChart3, Shield, Zap, Sprout, Swords, Smartphone, Images, Egg, MapPin,
} from "lucide-react";

// Icon per detail tab (order matches STRINGS.tabs)
const TAB_ICONS = [BarChart3, Shield, Zap, Sprout, Swords, Smartphone, Images, Egg, MapPin];

// Tab dropdown — replaces the cramped tab row (handles long TH labels)
export default function TabDropdown({ tabs, tab, setTab, lang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const heading = lang === "th" ? "รายละเอียด" : lang === "ja" ? "詳細" : "Detail";
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className={`tabdd${open ? " open" : ""}`} ref={ref}>
      <button className="tabdd-trigger" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="tabdd-current">
          {tab >= 0 && TAB_ICONS[tab]
            ? (() => { const I = TAB_ICONS[tab]; return <><I size={16} strokeWidth={2.2} />{tabs[tab]}</>; })()
            : <><List size={16} strokeWidth={2.2} />{heading}</>}
        </span>
        <span className="tabdd-chev">▾</span>
      </button>
      {open && (
        <div className="tabdd-menu">
          {tabs.map((label, i) => {
            const I = TAB_ICONS[i] ?? List;
            return (
              <button key={i} className={`tabdd-item${tab === i ? " active" : ""}`}
                onClick={() => { setTab(i); setOpen(false); }}>
                <span className="tabdd-item-label"><I size={15} strokeWidth={2.2} />{label}</span>
                {tab === i && <span className="tabdd-check">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
