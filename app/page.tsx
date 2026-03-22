'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ChatOverlay from '@/components/ChatOverlay';
import MicButton from '@/components/MicButton';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import type { SphereState } from '@/components/Sphere';

// Three.js는 서버사이드 렌더링 비활성화 (브라우저 전용)
const Sphere = dynamic(() => import('@/components/Sphere'), { ssr: false });

export default function Home() {
  const [sphereState, setSphereState] = useState<SphereState>('idle');
  const [userMessage, setUserMessage] = useState('');
  const [botResponse, setBotResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  const { speak, stop: stopTTS } = useTTS();

  // 메시지 전송 및 AI 응답 처리
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    stopTTS();
    setUserMessage(message);
    setBotResponse('');
    setError(null);
    setIsLoading(true);
    setSphereState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? '오류가 발생했습니다.');
        setSphereState('idle');
        return;
      }

      setBotResponse(data.response);
      setSphereState('speaking');

      // TTS로 응답 읽어주기
      speak(
        data.response,
        () => setSphereState('speaking'),
        () => setSphereState('idle')
      );
    } catch {
      setError('네트워크 오류가 발생했습니다.');
      setSphereState('idle');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, speak, stopTTS]);

  const { isListening, transcript, audioLevel, startListening, stopListening, isSupported } =
    useSpeechRecognition(sendMessage);

  // 마이크 토글
  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      setSphereState('idle');
    } else {
      setSphereState('listening');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // 텍스트 입력 전송
  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  }, [inputText, sendMessage]);

  return (
    <main className="relative w-full h-screen bg-gray-950 overflow-hidden">
      {/* 배경 그라디언트 */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />

      {/* 3D 구체 */}
      <div className="absolute inset-0">
        <Sphere state={sphereState} audioLevel={audioLevel} />
      </div>

      {/* 상단 타이틀 */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <h1 className="text-white/40 text-sm tracking-widest uppercase">서비와 대화하기</h1>
      </div>

      {/* 음성 인식 중간 자막 */}
      {transcript && (
        <div className="absolute top-1/2 left-0 right-0 flex justify-center -translate-y-1/2 pointer-events-none">
          <div className="text-white/60 text-lg">{transcript}</div>
        </div>
      )}

      {/* 채팅 오버레이 (하단) */}
      <ChatOverlay
        userMessage={userMessage}
        botResponse={botResponse}
        isLoading={isLoading}
        error={error}
      />

      {/* 텍스트 입력 폼 */}
      <form
        onSubmit={handleTextSubmit}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md px-4"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="서비에게 질문해보세요..."
            maxLength={500}
            disabled={isLoading || isListening}
            className="
              flex-1 bg-white/5 border border-white/10 text-white placeholder-white/30
              px-4 py-3 rounded-full text-sm outline-none
              focus:border-white/30 focus:bg-white/10
              transition-all duration-200
              disabled:opacity-50
            "
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="
              bg-white/10 hover:bg-white/20 border border-white/10
              text-white px-4 py-3 rounded-full text-sm
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            전송
          </button>
        </div>
      </form>

      {/* 마이크 버튼 */}
      {isSupported && (
        <MicButton
          isListening={isListening}
          onToggle={handleMicToggle}
          disabled={isLoading}
        />
      )}
    </main>
  );
}
