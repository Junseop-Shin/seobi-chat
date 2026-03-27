'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  audioLevel: number;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(
  onResult: (text: string) => void,
  onNoResult?: () => void,
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasResultRef = useRef(false);
  // 마지막 interim transcript — onend 시 final이 없으면 이 값으로 fallback
  const lastInterimRef = useRef('');
  // 단일 타이머: 발화 전 3초 / 발화 후 침묵 1.5초 → recognition.stop()
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // 마이크 권한 없을 시 음량 측정 없이 진행
    }
  }, []);

  const resetIdleTimer = useCallback((ms: number) => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => { recognitionRef.current?.stop(); }, ms);
  }, []);

  const cleanup = useCallback(() => {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    hasResultRef.current = false;
    lastInterimRef.current = '';

    const SpeechRecognitionAPI =
      window.SpeechRecognition || (window as Window & { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.lang = 'ko-KR';
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    // 발화 없으면 3초 후 자동 종료
    resetIdleTimer(3000);

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);
      lastInterimRef.current = text;

      if (last.isFinal) {
        hasResultRef.current = true;
        if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
        onResult(text);
        setTranscript('');
        return;
      }

      // interim — 침묵 1.5초 후 자동 종료 (onend에서 제출)
      resetIdleTimer(1500);
    };

    recognitionRef.current.onend = () => {
      // final/silence timer 없이 그냥 종료된 경우 — interim 결과라도 제출
      if (!hasResultRef.current && lastInterimRef.current.trim()) {
        onResult(lastInterimRef.current.trim());
        setTranscript('');
      } else if (!hasResultRef.current) {
        onNoResult?.();
      }

      setIsListening(false);
      setAudioLevel(0);
      cleanup();
    };

    recognitionRef.current.onerror = (event) => {
      // no-speech 에러는 정상 흐름 — onend가 뒤따라옴
      if (event.error === 'no-speech') return;
      setIsListening(false);
      setAudioLevel(0);
      cleanup();
    };

    recognitionRef.current.start();
    setIsListening(true);
    startAudioAnalysis();
  }, [isSupported, onResult, onNoResult, startAudioAnalysis, cleanup, resetIdleTimer]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setAudioLevel(0);
    cleanup();
  }, [cleanup]);

  return { isListening, transcript, audioLevel, startListening, stopListening, isSupported };
}
