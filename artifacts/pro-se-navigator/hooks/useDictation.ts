import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Dictation: tap the mic, speak your problem, watch it become text live,
 * then stop and edit or send.
 *
 * Web (incl. the Replit preview): the browser's SpeechRecognition engine —
 * streaming interim results, fast and free.
 * Native (Expo Go): no in-app speech engine is available without a dev
 * build; `supported` is false and the UI directs users to the keyboard's
 * built-in dictation. (Upgrade path: expo-speech-recognition in a dev build.)
 */

export interface Dictation {
  supported: boolean;
  listening: boolean;
  /** Live transcript (final + interim) since start(). */
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

type AnyRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  start: () => void;
  stop: () => void;
};

function getRecognitionCtor(): (new () => AnyRecognition) | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null) as
    | (new () => AnyRecognition)
    | null;
}

export function useDictation(): Dictation {
  const Ctor = getRecognitionCtor();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<AnyRecognition | null>(null);
  const finalRef = useRef('');
  const wantListening = useRef(false);

  useEffect(() => () => {
    wantListening.current = false;
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!Ctor || listening) return;
    finalRef.current = '';
    setTranscript('');
    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: unknown) => {
      const ev = e as { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]!;
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + interim).trimStart());
    };
    rec.onend = () => {
      // Browsers stop recognition after silence; restart while the user
      // still has the mic on so long stories aren't cut off mid-thought.
      if (wantListening.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fall through to stopped state */
        }
      }
      setListening(false);
    };
    rec.onerror = () => {
      wantListening.current = false;
      setListening(false);
    };
    recRef.current = rec;
    wantListening.current = true;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [Ctor, listening]);

  const stop = useCallback(() => {
    wantListening.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    finalRef.current = '';
    setTranscript('');
  }, []);

  return { supported: Boolean(Ctor), listening, transcript, start, stop, reset };
}
