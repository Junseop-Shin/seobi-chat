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
  onNoResult?: () => void,  // 발화 없이 인식 종료 시 호출
): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  // MediaStream 트랙을 저장해 stopListening 시 명시적으로 종료 (마이크 인디케이터 버그 방지)
  const streamRef = useRef<MediaStream | null>(null);
  const hasResultRef = useRef(false);
  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Web Speech API 지원 여부 — SSR/hydration mismatch 방지를 위해 useEffect에서 감지
  const [isSupported, setIsSupported] = useState(false);
  useEffect(() => {
    setIsSupported('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  }, []);

  // 마이크 음량 측정 (구체 애니메이션 연동용)
  const startAudioAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // 스트림 참조 저장 — stopListening 시 트랙을 명시적으로 종료해야 마이크 인디케이터가 꺼짐
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
        setAudioLevel(avg / 255); // 0-1로 정규화
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // 마이크 권한 없을 시 음량 측정 없이 진행
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    hasResultRef.current = false;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || (window as Window & { webkitSpeechRecognition: typeof SpeechRecognition }).webkitSpeechRecognition;

    recognitionRef.current = new SpeechRecognitionAPI();
    recognitionRef.current.lang = 'ko-KR'; // 한국어 설정
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    // 5초 내 발화 없으면 자동 종료
    noSpeechTimerRef.current = setTimeout(() => {
      recognitionRef.current?.stop();
    }, 5000);

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      // 발화 감지 시 타이머 취소
      if (noSpeechTimerRef.current) {
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }

      const last = event.results[event.results.length - 1];
      const text = last[0].transcript;
      setTranscript(text);

      if (last.isFinal) {
        hasResultRef.current = true;
        onResult(text);
        setTranscript('');
      }
    };

    recognitionRef.current.onend = () => {
      if (noSpeechTimerRef.current) {
        clearTimeout(noSpeechTimerRef.current);
        noSpeechTimerRef.current = null;
      }
      setIsListening(false);
      setAudioLevel(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      // MediaStream 트랙 명시적 종료 — 미종료 시 브라우저 마이크 인디케이터가 계속 표시됨
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      // 발화 없이 종료 시 콜백 (구체 idle 복귀 등 처리)
      if (!hasResultRef.current) onNoResult?.();
    };

    recognitionRef.current.start();
    setIsListening(true);
    startAudioAnalysis();
  }, [isSupported, onResult, onNoResult, startAudioAnalysis]);

  const stopListening = useCallback(() => {
    if (noSpeechTimerRef.current) {
      clearTimeout(noSpeechTimerRef.current);
      noSpeechTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    setIsListening(false);
    setAudioLevel(0);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
    // MediaStream 트랙 명시적 종료 (onend가 호출되지 않는 경우 대비)
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  return { isListening, transcript, audioLevel, startListening, stopListening, isSupported };
}
