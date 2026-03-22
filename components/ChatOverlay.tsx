'use client';

interface ChatOverlayProps {
  userMessage: string;
  botResponse: string;
  isLoading: boolean;
  error: string | null;
}

export default function ChatOverlay({
  userMessage,
  botResponse,
  isLoading,
  error,
}: ChatOverlayProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-8 pointer-events-none">
      {/* 사용자 메시지 표시 */}
      {userMessage && (
        <div className="mb-4 flex justify-end">
          <div className="bg-white/10 backdrop-blur-sm text-white/90 px-4 py-2 rounded-2xl max-w-md text-sm">
            {userMessage}
          </div>
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div className="flex justify-center mb-4">
          <div className="text-white/60 text-sm animate-pulse">생각하는 중...</div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 text-center">
          <div className="text-red-400/80 text-sm">{error}</div>
        </div>
      )}

      {/* 봇 응답 표시 */}
      {botResponse && !isLoading && (
        <div className="flex justify-start">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 text-white/90 px-4 py-3 rounded-2xl max-w-lg text-sm leading-relaxed">
            {botResponse}
          </div>
        </div>
      )}
    </div>
  );
}
