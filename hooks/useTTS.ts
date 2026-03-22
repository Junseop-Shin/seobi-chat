'use client';

import { useCallback, useRef } from 'react';

interface UseTTSReturn {
  speak: (text: string, onStart?: () => void, onEnd?: () => void) => void;
  stop: () => void;
  isSupported: boolean;
}

export function useTTS(): UseTTSReturn {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const speak = useCallback(
    (text: string, onStart?: () => void, onEnd?: () => void) => {
      if (!isSupported) return;

      // 기존 TTS 중단
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ko-KR'; // 한국어 TTS
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // 한국어 목소리 선택 (있으면 사용)
      const voices = window.speechSynthesis.getVoices();
      const koreanVoice = voices.find((v) => v.lang === 'ko-KR');
      if (koreanVoice) utterance.voice = koreanVoice;

      utterance.onstart = () => onStart?.();
      utterance.onend = () => onEnd?.();

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [isSupported]
  );

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
  }, [isSupported]);

  return { speak, stop, isSupported };
}
