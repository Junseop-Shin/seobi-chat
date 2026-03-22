import { checkRateLimit } from '@/lib/rateLimit';

// ===== Rate Limit 테스트 =====
// IP별 요청 횟수 제한 동작 확인

// 테스트용으로 내부 store 초기화를 위해 모듈 재임포트

describe('checkRateLimit', () => {
  // 각 테스트마다 고유한 IP 사용 (store 충돌 방지)

  test('첫 번째 요청은 항상 허용된다', () => {
    const result = checkRateLimit('192.168.1.1');
    expect(result.allowed).toBe(true);
  });

  test('허용된 요청에는 remaining 값이 포함된다', () => {
    const result = checkRateLimit('192.168.1.2');
    expect(result.allowed).toBe(true);
    expect(typeof result.remaining).toBe('number');
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  test('시간당 30회 한도를 초과하면 차단된다', () => {
    const testIp = '10.0.0.1';
    // 30회 요청 소진
    for (let i = 0; i < 30; i++) {
      checkRateLimit(testIp);
    }
    // 31번째 요청은 차단되어야 함
    const result = checkRateLimit(testIp);
    expect(result.allowed).toBe(false);
  });

  test('차단된 경우 resetIn 값이 포함된다', () => {
    const testIp = '10.0.0.2';
    for (let i = 0; i < 30; i++) {
      checkRateLimit(testIp);
    }
    const result = checkRateLimit(testIp);
    expect(result.allowed).toBe(false);
    expect(typeof result.resetIn).toBe('number');
    expect(result.resetIn).toBeGreaterThan(0);
  });

  test('다른 IP는 독립적으로 카운트된다', () => {
    const ip1 = '172.16.0.1';
    const ip2 = '172.16.0.2';
    // ip1만 소진
    for (let i = 0; i < 30; i++) {
      checkRateLimit(ip1);
    }
    // ip2는 영향 없음
    const result = checkRateLimit(ip2);
    expect(result.allowed).toBe(true);
  });
});
