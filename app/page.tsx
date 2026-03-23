'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import MicButton from '@/components/MicButton';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import type { SphereState } from '@/components/Sphere';

const Sphere = dynamic(() => import('@/components/Sphere'), { ssr: false });

interface Message {
  role: 'user' | 'bot';
  content: string;
}

export default function Home() {
  const [sphereState, setSphereState] = useState<SphereState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { speak, stop: stopTTS } = useTTS();

  // 새 메시지 오면 스크롤 맨 아래로
  useEffect(() => {
    if (hasStarted) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, hasStarted]);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    stopTTS();
    setError(null);
    setIsLoading(true);
    setHasStarted(true);
    setSphereState('thinking');
    setMessages((prev) => [...prev, { role: 'user', content: message }]);

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

      setMessages((prev) => [...prev, { role: 'bot', content: data.response }]);
      setSphereState('speaking');

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

  const handleMicToggle = useCallback(() => {
    if (isListening) {
      stopListening();
      setSphereState('idle');
    } else {
      setSphereState('listening');
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText.trim());
      setInputText('');
    }
  }, [inputText, sendMessage]);

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white">

      {/* ── 헤더 (구체 + 타이틀) ── */}
      <div className={`
        flex flex-col items-center shrink-0 transition-all duration-500 ease-in-out
        ${hasStarted ? 'pt-6 pb-2' : 'pt-0 pb-0 flex-1 justify-center'}
      `}>
        {/* 구체 캔버스 컨테이너 */}
        <div className={`
          transition-all duration-500 ease-in-out
          ${hasStarted ? 'w-16 h-16' : 'w-36 h-36'}
        `}>
          <Sphere state={sphereState} audioLevel={audioLevel} />
        </div>

        {/* 타이틀 — 대화 전에만 표시 */}
        <div className={`
          transition-all duration-300 overflow-hidden text-center
          ${hasStarted ? 'max-h-0 opacity-0 mt-0' : 'max-h-32 opacity-100 mt-4'}
        `}>
          <h1 className="text-2xl font-light text-white/80 tracking-wide">서비</h1>
          <p className="text-sm text-white/40 mt-1">신준섭에 대해 무엇이든 물어보세요</p>
        </div>
      </div>

      {/* ── 구분선 (대화 시작 후) ── */}
      {hasStarted && (
        <div className="shrink-0 border-t border-white/5 mx-auto w-full max-w-2xl" />
      )}

      {/* ── 메시지 영역 ── */}
      {hasStarted && (
        <div className="flex-1 overflow-y-auto py-6">
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-white/10 text-white/90'
                    : 'bg-white/5 border border-white/10 text-white/85'
                  }
                `}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* 로딩 */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
                  <div className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* 에러 */}
            {error && (
              <div className="flex justify-start">
                <div className="text-red-400/80 text-sm px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  {error}
                </div>
              </div>
            )}

            {/* 음성 인식 중 임시 자막 */}
            {transcript && (
              <div className="flex justify-end">
                <div className="max-w-[75%] px-4 py-3 rounded-2xl text-sm bg-white/5 text-white/50 italic">
                  {transcript}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ── 입력창 ── */}
      <div className={`
        shrink-0 pb-6 px-4
        ${hasStarted ? 'border-t border-white/5 pt-4' : 'pt-4'}
      `}>
        <form
          onSubmit={handleTextSubmit}
          className="max-w-2xl mx-auto flex gap-2"
        >
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
              focus:border-white/30 focus:bg-white/8
              transition-all duration-200 disabled:opacity-50
            "
          />
          {isSupported && (
            <MicButton isListening={isListening} onToggle={handleMicToggle} disabled={isLoading} />
          )}
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="
              bg-white/10 hover:bg-white/20 border border-white/10
              text-white px-5 py-3 rounded-full text-sm
              transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            전송
          </button>
        </form>
      </div>
    </main>
  );
}
