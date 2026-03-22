// IP별 요청 횟수를 메모리에 저장 (서버 재시작 시 초기화)
interface RateLimitEntry {
  hourlyCount: number;
  dailyCount: number;
  hourlyResetAt: number;
  dailyResetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const HOURLY_LIMIT = 30;  // 시간당 최대 요청 수
const DAILY_LIMIT = 100;  // 일일 최대 요청 수

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
    hourlyResetAt: now + 60 * 60 * 1000,   // 1시간 후 초기화
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
