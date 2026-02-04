import { useEffect, useState, useRef, useCallback } from "react";
import { introKeywords, INTRO_DURATION_SEC, type IntroKeyword } from "../data/intro-keywords";
import "./KeywordPopups.css";

interface ActiveKeyword extends IntroKeyword {
  /** Unique key for React rendering */
  uid: number;
  /** Whether this keyword is fading out */
  fading: boolean;
}

/* ============================================
   ACRONYM REVEAL COMPONENT
   Single popup on the left with 4 rows:
   A, R, I, A — each letter expands one by one.
   ============================================ */
const ARIA_WORDS = [
  { letter: "A", word: "utonomous" },
  { letter: "R", word: "easoning" },
  { letter: "I", word: "ntelligence" },
  { letter: "A", word: "rchitecture" },
];

// Timing per row (seconds relative to intro start):
// t=0.0  → popup appears with all 4 letters visible
// t=0.8  → A expands to "Autonomous"
// t=1.6  → R expands to "Reasoning"
// t=2.4  → I expands to "Intelligence"
// t=3.2  → A expands to "Architecture"
// t=5.0  → popup starts fading
// t=5.8  → popup gone
const POPUP_START = 0;
const ROW_EXPAND_INTERVAL = 0.8;  // delay between each row expanding
const FIRST_EXPAND = 0.8;         // when first row expands
const POPUP_FADE = 5.0;           // when the whole popup fades
const POPUP_GONE = 5.8;           // when it's removed

function AcronymReveal({ elapsedSec }: { elapsedSec: number }) {
  if (elapsedSec < POPUP_START || elapsedSec > POPUP_GONE) return null;

  const isFading = elapsedSec >= POPUP_FADE;

  return (
    <div className={`keyword-popup keyword-center-left acronym-popup ${isFading ? "keyword-fading" : ""}`}>
      {ARIA_WORDS.map((item, i) => {
        const expandTime = FIRST_EXPAND + i * ROW_EXPAND_INTERVAL;
        const isExpanded = elapsedSec >= expandTime;

        return (
          <div key={i} className="acronym-row">
            <span className="acronym-letter-inline">{item.letter}</span>
            <span className={`acronym-expand ${isExpanded ? "acronym-expand--visible" : ""}`}>
              {item.word}
            </span>
          </div>
        );
      })}
      <span className="keyword-underline"></span>
    </div>
  );
}

/* ============================================
   3 PILLARS REVEAL COMPONENT
   Single popup on the left: "3 PILIERS" title,
   then ANALYSE / PRÉDICTION / ACTION one by one.
   ============================================ */
const PILLARS = ["ANALYSE", "PRÉDICTION", "ACTION"];
const PILLARS_START = 37;       // when the popup appears (speech timestamp)
const PILLAR_FIRST = 39;        // when first pillar shows
const PILLAR_INTERVAL = 1;      // seconds between each pillar
const PILLARS_FADE = 43;        // when the popup fades
const PILLARS_GONE = 43.8;      // when it's removed

function PillarsReveal({ elapsedSec }: { elapsedSec: number }) {
  if (elapsedSec < PILLARS_START || elapsedSec > PILLARS_GONE) return null;

  const isFading = elapsedSec >= PILLARS_FADE;

  return (
    <div className={`keyword-popup keyword-center-left pillars-popup ${isFading ? "keyword-fading" : ""}`}>
      <span className="pillars-title">3 PILIERS</span>
      {PILLARS.map((pillar, i) => {
        const showTime = PILLAR_FIRST + i * PILLAR_INTERVAL;
        const isVisible = elapsedSec >= showTime;

        return (
          <div key={i} className={`pillar-row ${isVisible ? "pillar-row--visible" : ""}`}>
            <span className="pillar-index">{i + 1}.</span>
            <span className="pillar-name">{pillar}</span>
          </div>
        );
      })}
      <span className="keyword-underline"></span>
    </div>
  );
}

/* ============================================
   KEYWORD POPUPS MAIN COMPONENT
   ============================================ */
interface KeywordPopupsProps {
  /** Whether the intro sequence is currently playing */
  isPlaying: boolean;
  /** Called when the intro sequence finishes */
  onComplete: () => void;
}

export function KeywordPopups({ isPlaying, onComplete }: KeywordPopupsProps) {
  const [activeKeywords, setActiveKeywords] = useState<ActiveKeyword[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  // Ref mirror of elapsedSec — updated synchronously, used by trigger logic
  // to avoid React batching race conditions on restart
  const elapsedRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uidCounter = useRef(0);
  const triggeredRef = useRef<Set<number>>(new Set());
  const sessionRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Single effect: handles start, tick, and cleanup
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }

    // --- New session starts ---
    sessionRef.current += 1;
    const currentSession = sessionRef.current;

    // Clear any pending timeouts from previous session
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    // Reset all state synchronously
    triggeredRef.current.clear();
    uidCounter.current = 0;
    elapsedRef.current = 0;
    setActiveKeywords([]);
    setElapsedSec(0);

    const startTime = Date.now();

    timerRef.current = setInterval(() => {
      if (sessionRef.current !== currentSession) return;

      const elapsed = (Date.now() - startTime) / 1000;
      elapsedRef.current = elapsed;
      setElapsedSec(elapsed);

      if (elapsed >= INTRO_DURATION_SEC) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        onComplete();
      }
    }, 200);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isPlaying, onComplete]);

  // Trigger keywords based on elapsed time
  useEffect(() => {
    if (!isPlaying) return;
    // Use ref value: on restart the state may still hold the old value
    // due to React batching, but the ref is already reset to 0.
    const currentElapsed = elapsedRef.current;
    const currentSession = sessionRef.current;

    introKeywords.forEach((kw, index) => {
      if (currentElapsed >= kw.time && !triggeredRef.current.has(index)) {
        triggeredRef.current.add(index);
        const uid = uidCounter.current++;
        const duration = kw.duration ?? 3000;

        setActiveKeywords(prev => [...prev, { ...kw, uid, fading: false }]);

        const t1 = setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setActiveKeywords(prev =>
            prev.map(k => (k.uid === uid ? { ...k, fading: true } : k))
          );
        }, duration - 500);

        const t2 = setTimeout(() => {
          if (sessionRef.current !== currentSession) return;
          setActiveKeywords(prev => prev.filter(k => k.uid !== uid));
        }, duration);

        timeoutsRef.current.push(t1, t2);
      }
    });
  }, [elapsedSec, isPlaying]);

  if (!isPlaying) return null;

  return (
    <div className="keyword-popups-layer">
      {/* ARIA acronym reveal (first ~6s) */}
      <AcronymReveal elapsedSec={elapsedSec} />

      {/* 3 Pillars reveal (~37–44s) */}
      <PillarsReveal elapsedSec={elapsedSec} />

      {/* Keyword popups */}
      {activeKeywords.map(kw => (
        <div
          key={kw.uid}
          className={`keyword-popup keyword-${kw.position} ${kw.fading ? "keyword-fading" : ""}`}
        >
          <span className="keyword-text">{kw.text}</span>
          <span className="keyword-underline"></span>
        </div>
      ))}

    </div>
  );
}

export default KeywordPopups;
