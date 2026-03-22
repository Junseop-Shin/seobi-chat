import fs from 'fs';
import path from 'path';

// 답변하지 못한 질문을 JSONL 파일에 기록
// 서버 재시작해도 누적되며, 나중에 열어보고 YAML에 추가할 수 있음
const LOG_FILE = path.join(process.cwd(), 'logs', 'unanswered-questions.jsonl');

export interface UnansweredQuestion {
  question: string;
  timestamp: string;
  geminiResponse: string; // Gemini가 어떻게 답했는지 참고용
}

// logs/ 디렉토리가 없으면 생성
function ensureLogDir() {
  const logDir = path.dirname(LOG_FILE);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

// 답변 못한 질문 1건 추가 (JSONL: 한 줄에 JSON 1개)
export function logUnansweredQuestion(entry: UnansweredQuestion): void {
  try {
    ensureLogDir();
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_FILE, line, 'utf-8');
  } catch (err) {
    // 로그 실패는 서비스에 영향 주면 안 되므로 조용히 처리
    console.error('질문 로그 저장 실패:', err);
  }
}

// 기록된 미답변 질문 전체 조회 (관리용)
export function readUnansweredQuestions(): UnansweredQuestion[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as UnansweredQuestion);
  } catch {
    return [];
  }
}
