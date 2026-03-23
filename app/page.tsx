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
      speak(data.response, () => setSphereState('speaking'), () => setSphereState('idle'));
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
    if (isListening) { stopListening(); setSphereState('idle'); }
    else { setSphereState('listening'); startListening(); }
  }, [isListening, startListening, stopListening]);

  const handleTextSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) { sendMessage(inputText.trim()); setInputText(''); }
  }, [inputText, sendMessage]);

  // 공통 입력 폼
  const InputForm = (
    <form onSubmit={handleTextSubmit} className="flex gap-2 w-full">
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
  );

  return (
    <main className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">

      {/* ── 초기 화면: 구체 + 타이틀 + 입력창이 모두 화면 중앙에 ── */}
      {!hasStarted && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4">
          <div className="w-32 h-32">
            <Sphere state={sphereState} audioLevel={audioLevel} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-light text-white/80 tracking-wide">서비</h1>
            <p className="text-sm text-white/40 mt-1">신준섭에 대해 무엇이든 물어보세요</p>
          </div>
          <div className="w-full max-w-2xl">
            {InputForm}
          </div>
        </div>
      )}

      {/* ── 채팅 화면: 구체 상단 고정 + 메시지 + 하단 입력창 ── */}
      {hasStarted && (
        <>
          {/* 헤더 */}
          <div className="shrink-0 flex flex-col items-center pt-5 pb-3 border-b border-white/5">
            <div className="w-14 h-14">
              <Sphere state={sphereState} audioLevel={audioLevel} />
            </div>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto py-6">
            <div className="max-w-2xl mx-auto px-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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

              {error && (
                <div className="flex justify-start">
                  <div className="text-red-400/80 text-sm px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    {error}
                  </div>
                </div>
              )}

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

          {/* 하단 입력창 */}
          <div className="shrink-0 border-t border-white/5 pt-4 pb-6 px-4">
            <div className="max-w-2xl mx-auto">
              {InputForm}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
