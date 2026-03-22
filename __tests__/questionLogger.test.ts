import fs from 'fs';
import path from 'path';

// ===== QuestionLogger 테스트 =====
// 미답변 질문 기록 및 조회 기능 검증

const LOG_FILE = path.join(process.cwd(), 'logs', 'unanswered-questions.jsonl');

// 테스트 전후 로그 파일 정리
beforeEach(() => {
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
});
afterAll(() => {
  if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);
});

describe('logUnansweredQuestion', () => {
  test('질문이 로그 파일에 기록된다', () => {
    const { logUnansweredQuestion } = require('@/lib/questionLogger');
    logUnansweredQuestion({
      question: '서비의 혈액형이 뭐예요?',
      timestamp: '2026-03-23T00:00:00.000Z',
      geminiResponse: '아직 그 부분은 잘 모르겠어요.',
    });
    // 파일이 생성되어야 함
    expect(fs.existsSync(LOG_FILE)).toBe(true);
  });

  test('기록된 내용이 올바른 JSON 형식이다', () => {
    const { logUnansweredQuestion } = require('@/lib/questionLogger');
    logUnansweredQuestion({
      question: '서비의 사주가 어떻게 돼요?',
      timestamp: '2026-03-23T00:00:00.000Z',
      geminiResponse: '아직 그 부분은 잘 모르겠어요.',
    });
    const line = fs.readFileSync(LOG_FILE, 'utf-8').trim();
    // 각 줄이 유효한 JSON이어야 함
    expect(() => JSON.parse(line)).not.toThrow();
    const entry = JSON.parse(line);
    expect(entry.question).toBe('서비의 사주가 어떻게 돼요?');
  });

  test('여러 질문이 누적 기록된다', () => {
    const { logUnansweredQuestion, readUnansweredQuestions } = require('@/lib/questionLogger');
    logUnansweredQuestion({ question: '질문1', timestamp: '', geminiResponse: '' });
    logUnansweredQuestion({ question: '질문2', timestamp: '', geminiResponse: '' });
    logUnansweredQuestion({ question: '질문3', timestamp: '', geminiResponse: '' });
    // 3건이 모두 기록되어야 함
    const entries = readUnansweredQuestions();
    expect(entries).toHaveLength(3);
  });
});

describe('readUnansweredQuestions', () => {
  test('로그 파일이 없으면 빈 배열을 반환한다', () => {
    const { readUnansweredQuestions } = require('@/lib/questionLogger');
    const result = readUnansweredQuestions();
    expect(result).toEqual([]);
  });

  test('기록된 질문을 올바르게 파싱해서 반환한다', () => {
    const { logUnansweredQuestion, readUnansweredQuestions } = require('@/lib/questionLogger');
    logUnansweredQuestion({
      question: '서비 키가 몇이에요?',
      timestamp: '2026-03-23T00:00:00.000Z',
      geminiResponse: '아직 그 부분은 잘 모르겠어요.',
    });
    const entries = readUnansweredQuestions();
    expect(entries[0].question).toBe('서비 키가 몇이에요?');
    expect(entries[0].timestamp).toBe('2026-03-23T00:00:00.000Z');
  });
});
