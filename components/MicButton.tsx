'use client';

interface MicButtonProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function MicButton({ isListening, onToggle, disabled }: MicButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      aria-label={isListening ? '마이크 끄기' : '마이크 켜기'}
      className={`
        w-12 h-12 rounded-full
        flex items-center justify-center
        transition-all duration-300
        ${isListening
          ? 'bg-red-500/80 shadow-lg shadow-red-500/30 scale-110'
          : 'bg-white/10 hover:bg-white/20'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        backdrop-blur-sm border border-white/20
      `}
    >
      {isListening ? (
        // 녹음 중 아이콘
        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        // 마이크 아이콘
        <svg className="w-6 h-6 text-white/80" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
        </svg>
      )}
    </button>
  );
}
