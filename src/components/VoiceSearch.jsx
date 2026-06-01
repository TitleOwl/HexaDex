import { useState, useRef, useCallback } from "react";
import { getLocalName } from "../utils.js";

const SPEECH_LANG = { en: "en-US", th: "th-TH", ja: "ja-JP" };

export default function VoiceSearch({ allList, thaiArr, jpArr, lang, onOpen, onSetSearch }) {
  const [listening, setListening] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);

  const hasSpeechRecognition = typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const findPokemon = useCallback((spokenText) => {
    if (!allList?.length) return null;
    const query = spokenText.toLowerCase().trim();
    for (let i = 0; i < allList.length; i++) {
      const entry = allList[i];
      const id = parseInt(entry.url.split("/").filter(Boolean).pop(), 10);
      if (!id || id > 1025) continue;
      const enName = entry.name.toLowerCase();
      const thName = (getLocalName(id, "th", thaiArr, jpArr) ?? "").toLowerCase();
      const jaName = (getLocalName(id, "ja", thaiArr, jpArr) ?? "").toLowerCase();
      if (enName === query || thName === query || jaName === query)
        return { id, url: entry.url, name: entry.name };
      if (enName.includes(query) || (thName && thName.includes(query)) || (jaName && jaName.includes(query)))
        return { id, url: entry.url, name: entry.name };
    }
    const numMatch = query.match(/\d+/);
    if (numMatch) {
      const id = parseInt(numMatch[0], 10);
      if (id >= 1 && id <= 1025) {
        const entry = allList[id - 1];
        if (entry) return { id, url: entry.url, name: entry.name };
      }
    }
    return null;
  }, [allList, thaiArr, jpArr]);

  const start = () => {
    if (!hasSpeechRecognition) {
      setError(lang==="th"?"เบราว์เซอร์ไม่รองรับ":"Not supported");
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
      return;
    }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = SPEECH_LANG[lang] ?? "en-US";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.onstart = () => { setListening(true); setError(null); setTranscript(""); setShowBanner(true); };
    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      if (event.results[0].isFinal) {
        const alts = Array.from(event.results[0]).map(r => r.transcript);
        let found = null;
        for (const alt of alts) { found = findPokemon(alt); if (found) break; }
        if (found) {
          if (onSetSearch) onSetSearch(found.name);
          fetch(found.url).then(r => r.json()).then(p => onOpen(p)).catch(() => {});
          setTimeout(() => setShowBanner(false), 1500);
        } else {
          if (onSetSearch) onSetSearch(text);
          setError(lang==="th"?`ไม่พบ "${text}"`:lang==="ja"?`「${text}」未検出`:`Not found: "${text}"`);
          setTimeout(() => setShowBanner(false), 2500);
        }
      }
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "not-allowed") setError(lang==="th"?"กรุณาอนุญาตไมค์":"Allow microphone");
      else if (e.error === "no-speech") setError(lang==="th"?"ไม่ได้ยินเสียง":"No speech");
      else setError(`Error: ${e.error}`);
      setTimeout(() => setShowBanner(false), 2500);
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <>
      <button
        className={`search-icon-btn voice-icon${listening ? " listening" : ""}`}
        onClick={start}
        title={lang==="th"?"ค้นหาด้วยเสียง":lang==="ja"?"音声検索":"Voice search"}
      >
        {listening ? "🔴" : "🎙️"}
      </button>
      {showBanner && (
        <div className="search-feedback">
          {listening && !transcript && (<span>🎙️ {lang==="th"?"กำลังฟัง...":lang==="ja"?"聞いています...":"Listening..."}</span>)}
          {transcript && <span>💬 "{transcript}"</span>}
          {error && <span>⚠️ {error}</span>}
        </div>
      )}
    </>
  );
}