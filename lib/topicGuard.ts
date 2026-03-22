// 허용되지 않는 요청 패턴 블랙리스트
// 코드 실행, 프롬프트 인젝션, 시스템 명령 등을 차단
const BLOCKED_PATTERNS = [
  /```[\s\S]*```/,                    // 코드 블록 포함된 메시지
  /`[^`]{10,}`/,                      // 인라인 코드 (10자 이상)
  /execute|eval\s*\(/i,               // 코드 실행 관련 키워드
  /run\s+this|run\s+code/i,           // 코드 실행 요청
  /read\s+(file|code|source)/i,       // 파일/코드 읽기 요청
  /ignore\s+(previous|above|prior)/i, // 프롬프트 인젝션 시도
  /\bsystem\s*prompt\b/i,             // 시스템 프롬프트 노출 시도
  /jailbreak|DAN\s+mode/i,            // 탈옥 시도
  /forget\s+(everything|all|your)/i,  // 지시 무시 시도
  /you\s+are\s+(now|actually)\s+/i,   // 역할 변경 시도
];

export interface TopicGuardResult {
  blocked: boolean;
  reason?: string;
}

// 입력 메시지가 허용된 범위인지 검사
export function checkTopicGuard(message: string): TopicGuardResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return {
        blocked: true,
        reason: '허용되지 않는 요청 패턴이 감지되었습니다.',
      };
    }
  }
  return { blocked: false };
}
