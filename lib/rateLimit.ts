// ⚠️ 설계 전제: 단일 프로세스 단일 인스턴스 (PM2 instances: 1)
// 이 구현은 Node.js 프로세스 메모리에 상태를 저장합니다.
// 서버리스 / 다중 인스턴스 환경에서는 Redis/Upstash로 교체 필요.
// seobi-chat은 Windows PC 단일 PM2 프로세스이므로 이 방식이 적합합니다.

interface RateLimitEntry {
  hourlyCount: number;
  dailyCount: number;
  hourlyResetAt: number;
  dailyResetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// 환경변수로 한도 조정 가능 (기본값: 시간당 30, 일일 100)
const HOURLY_LIMIT = Number(process.env.RATE_LIMIT_HOURLY ?? 30);
const DAILY_LIMIT = Number(process.env.RATE_LIMIT_DAILY ?? 100);

// IP 주소의 현재 요청 횟수를 확인하고 카운트 증가
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn?: number; // 초 단위
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = store.get(ip) ?? {
    hourlyCount: 0,
    dailyCount: 0,
    hourlyResetAt: now + 60 * 60 * 1000,    // 1시간 후 초기화
    dailyResetAt: now + 24 * 60 * 60 * 1000, // 24시간 후 초기화
  };

  // 시간/일 리셋 처리
  if (now > entry.hourlyResetAt) {
    entry.hourlyCount = 0;
    entry.hourlyResetAt = now + 60 * 60 * 1000;
  }
  if (now > entry.dailyResetAt) {
    entry.dailyCount = 0;
    entry.dailyResetAt = now + 24 * 60 * 60 * 1000;
  }

  // 한도 초과 확인
  if (entry.hourlyCount >= HOURLY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.hourlyResetAt - now) / 1000),
    };
  }
  if (entry.dailyCount >= DAILY_LIMIT) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.dailyResetAt - now) / 1000),
    };
  }

  // 카운트 증가 및 저장
  entry.hourlyCount++;
  entry.dailyCount++;
  store.set(ip, entry);

  return {
    allowed: true,
    remaining: Math.min(HOURLY_LIMIT - entry.hourlyCount, DAILY_LIMIT - entry.dailyCount),
  };
}
