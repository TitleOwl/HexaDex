import { useEffect, useState } from "react";
import { isLiteActive, setPerfMode, PROMPTED_KEY } from "../perfMode.js";

// Watches frame rate for a few seconds after load. If the device is clearly
// stuttering (and economy mode isn't already on / hasn't been offered), it asks
// the user whether to switch to economy mode.
export default function PerfWatcher({ lang = "en" }) {
  const [show, setShow] = useState(false);
  const t = (en, th, ja) => (lang === "th" ? th : lang === "ja" ? ja : en);

  useEffect(() => {
    try {
      if (isLiteActive()) return;                              // already light
      if (localStorage.getItem(PROMPTED_KEY) === "1") return;  // already asked once
    } catch { return; }

    let done = false, raf = 0;
    let begin = 0, sampleStart = 0, last = 0, frames = 0, longFrames = 0;
    const WARMUP = 2500;   // ignore the load/mount jank
    const SAMPLE = 4000;   // measure across 4s of real use

    const loop = (now) => {
      if (done) return;
      if (document.hidden) { last = 0; raf = requestAnimationFrame(loop); return; }
      if (!begin) begin = now;
      if (last && now - begin > WARMUP) {
        if (!sampleStart) sampleStart = now;
        frames++;
        if (now - last > 34) longFrames++;          // a frame slower than ~30fps
        if (now - sampleStart >= SAMPLE) {
          const fps  = frames / ((now - sampleStart) / 1000);
          const jank = longFrames / Math.max(frames, 1);
          done = true;
          if (fps < 45 || jank > 0.28) setShow(true);
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { done = true; cancelAnimationFrame(raf); };
  }, []);

  if (!show) return null;

  const remember = () => { try { localStorage.setItem(PROMPTED_KEY, "1"); } catch {} };
  const accept  = () => { setPerfMode("lite"); remember(); setShow(false); };
  const dismiss = () => { remember(); setShow(false); };

  return (
    <div className="perf-alert-overlay" onClick={dismiss}>
      <div className="perf-alert" onClick={(e) => e.stopPropagation()}>
        <div className="perf-alert-icon">⚡</div>
        <h3 className="perf-alert-title">
          {t("Smoother performance?", "ตรวจพบการกระตุก", "カクつきを検出")}
        </h3>
        <p className="perf-alert-msg">
          {t(
            "This device seems to stutter. Turn on Economy mode to run smoother?",
            "เครื่องนี้ดูเหมือนจะกระตุก เปิดโหมดประหยัดเพื่อให้ลื่นขึ้นไหม?",
            "この端末で動作がカクついています。省電力モードをオンにしますか？"
          )}
        </p>
        <div className="perf-alert-actions">
          <button className="perf-alert-btn cancel" onClick={dismiss}>
            {t("Cancel", "ยกเลิก", "キャンセル")}
          </button>
          <button className="perf-alert-btn ok" onClick={accept}>
            {t("OK", "ตกลง", "OK")}
          </button>
        </div>
      </div>
    </div>
  );
}
