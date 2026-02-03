import { useState, useCallback, useRef, useEffect } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined' &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Hook for Web Speech API (voice-to-text). Returns { start, stop, listening, supported, error }.
 * @param {Object} options
 * @param {function(string): void} options.onResult - called with final transcript
 * @param {boolean} [options.continuous=false] - keep listening for multiple segments
 * @param {string} [options.lang='en-IN'] - speech recognition language
 */
export function useVoiceInput({ onResult, continuous = false, lang = 'en-IN' } = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    setError(null);
    if (recognitionRef.current) {
      stop();
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.continuous = continuous;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) onResultRef.current?.(text);
    };
    rec.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone access denied.');
      else if (e.error === 'no-speech') setError('No speech heard. Try again.');
      else setError(e.error || 'Voice input failed.');
      recognitionRef.current = null;
      setListening(false);
    };
    try {
      rec.start();
      recognitionRef.current = rec;
      setListening(true);
    } catch (err) {
      setError(err.message || 'Could not start voice input.');
    }
  }, [continuous, lang, stop]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  return {
    start,
    stop,
    listening,
    supported: !!SpeechRecognitionAPI,
    error,
  };
}
