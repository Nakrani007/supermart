// VoiceSearch.jsx
// Implements Web Speech API with multi-language support (English, Hindi, Gujarati).
// Handles background noise, partial results, and browser compatibility gracefully.
//
// Architecture decision: this is a controlled component — parent owns the search query state.
// VoiceSearch only raises onResult(text) events; it never triggers navigation itself.

import { useState, useEffect, useRef, useCallback } from 'react';
import { phoneticToEnglish } from '../utils/phoneticMatch.js';

// Language configs for SpeechRecognition
// We cycle through languages on retry — if Hindi recognition fails, try Gujarati
const LANG_CYCLE = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'gu-IN', label: 'ગુજરાતી' },
];

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

/**
 * @param {function} onResult - Called with the final processed search string
 * @param {function} onPartial - Called during recognition with interim text (for live UI)
 * @param {string}   className - Additional Tailwind classes for the trigger button
 */
export default function VoiceSearch({ onResult, onPartial, className = '' }) {
  const [isListening, setIsListening] = useState(false);
  const [langIndex, setLangIndex] = useState(0);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [noSpeechRetries, setNoSpeechRetries] = useState(0);

  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const isSupportedRef = useRef(!!SpeechRecognition);

  const currentLang = LANG_CYCLE[langIndex];

  // ── Setup recognition instance ──────────────────────────────────────────────
  const createRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.lang = currentLang.code;
    rec.continuous = false;       // stop after first complete utterance
    rec.interimResults = true;    // fire events for partial results (live feedback)
    rec.maxAlternatives = 3;      // get multiple guesses, pick best match

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
      setTranscript('');
      // Auto-stop after 8s — prevents open mic on noisy Tier-2 environments
      timeoutRef.current = setTimeout(() => {
        rec.stop();
      }, 8000);
    };

    rec.onresult = (event) => {
      // Collect all interim + final results
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;

        if (result.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      const liveText = final || interim;
      setTranscript(liveText);
      if (onPartial && interim) onPartial(interim);

      if (final) {
        // Translate phonetic Hindi/Gujarati to English for API search
        const processed = phoneticToEnglish(final.trim().toLowerCase());
        setTranscript(processed);
        onResult(processed);
      }
    };

    rec.onerror = (event) => {
      clearTimeout(timeoutRef.current);

      if (event.error === 'no-speech') {
        // Common in noisy environments — retry with next language in cycle
        if (noSpeechRetries < LANG_CYCLE.length - 1) {
          setNoSpeechRetries((n) => n + 1);
          setLangIndex((i) => (i + 1) % LANG_CYCLE.length);
          setError(`No speech detected. Trying ${LANG_CYCLE[(langIndex + 1) % LANG_CYCLE.length].label}...`);
          // Auto-retry after brief pause
          setTimeout(() => startListening(), 1000);
          return;
        }
        setError('No speech detected. Tap to try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Enable it in browser settings.');
      } else if (event.error === 'network') {
        setError('Voice search needs internet. Type your search instead.');
      } else {
        setError('Voice search unavailable. Type to search.');
      }

      setIsListening(false);
    };

    rec.onend = () => {
      clearTimeout(timeoutRef.current);
      setIsListening(false);
      setNoSpeechRetries(0);
    };

    return rec;
  }, [currentLang.code, langIndex, noSpeechRetries, onResult, onPartial]);

  // ── Start listening ──────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!isSupportedRef.current) {
      setError('Voice search not supported in this browser. Use Chrome.');
      return;
    }

    // Stop any existing session before starting a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const rec = createRecognition();
    if (!rec) return;

    recognitionRef.current = rec;

    try {
      rec.start();
    } catch {
      // DOMException: recognition already started — abort and retry
      rec.abort();
      setTimeout(() => rec.start(), 200);
    }
  }, [createRecognition]);

  // ── Stop listening ───────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    clearTimeout(timeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  }, []);

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      setLangIndex(0); // reset to English on manual start
      startListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
    };
  }, []);

  if (!isSupportedRef.current) {
    return null; // Silently hide on unsupported browsers — text search still works
  }

  return (
    <div className="relative flex flex-col items-center">
      <button
        onClick={handleToggle}
        aria-label={isListening ? 'Stop voice search' : 'Start voice search'}
        className={`
          flex items-center justify-center rounded-full transition-all duration-200
          ${isListening
            ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-110 animate-pulse'
            : 'bg-gray-100 text-gray-600 hover:bg-brand-100 hover:text-brand-600'
          }
          ${className}
        `}
      >
        {isListening ? (
          // Waveform icon while listening
          <MicActiveIcon />
        ) : (
          <MicIcon />
        )}
      </button>

      {/* Live transcript bubble */}
      {isListening && transcript && (
        <div className="absolute top-full mt-2 z-10 bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-sm text-gray-700 whitespace-nowrap max-w-48 truncate">
          <span className="text-brand-600 mr-1">&#9679;</span>
          {transcript}
        </div>
      )}

      {/* Language indicator */}
      {isListening && (
        <div className="absolute -bottom-6 text-xs text-gray-400 whitespace-nowrap">
          {currentLang.label}
        </div>
      )}

      {/* Error toast */}
      {error && !isListening && (
        <div className="absolute top-full mt-2 z-10 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2 max-w-56 text-center">
          {error}
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicActiveIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path fillRule="evenodd"
        d="M5 10a1 1 0 012 0 5 5 0 0010 0 1 1 0 112 0 7 7 0 01-6 6.92V19h2a1 1 0 110 2H9a1 1 0 110-2h2v-2.08A7 7 0 015 10z"
        clipRule="evenodd" />
    </svg>
  );
}
