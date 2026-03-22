import path from 'path';
import { clearContextCache, validateDataFiles } from '@/lib/dataLoader';

// ===== DataLoader 테스트 =====
// YAML 파일 로딩, 캐싱, 파일 존재 검증 테스트
// 실제 파일 시스템에 의존하므로 data/ 디렉토리가 존재해야 함

// 각 테스트 전에 캐시를 초기화하여 독립적인 테스트 보장
beforeEach(() => {
  clearContextCache();
});

describe('buildPersonContext', () => {
  test('data 디렉토리에 필수 YAML 파일들이 존재한다', () => {
    // 필수 데이터 파일 목록
    const requiredFiles = [
      'profile.yaml',
      'experience.yaml',
      'projects.yaml',
      'skills.yaml',
      'personality.yaml',
    ];

    const fs = require('fs');
    const dataDir = path.join(process.cwd(), 'data');

    requiredFiles.forEach((file) => {
      const filePath = path.join(dataDir, file);
      // 각 파일이 실제로 존재하는지 확인
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  test('buildPersonContext가 문자열을 반환한다', () => {
    const { buildPersonContext } = require('@/lib/dataLoader');
    const context = buildPersonContext();
    // 컨텍스트가 비어있지 않은 문자열이어야 함
    expect(typeof context).toBe('string');
    expect(context.length).toBeGreaterThan(0);
  });

  test('컨텍스트에 "서비"가 포함된다', () => {
    const { buildPersonContext } = require('@/lib/dataLoader');
    const context = buildPersonContext();
    // 서비의 이름이 컨텍스트에 포함되어야 함
    expect(context).toContain('서비');
  });

  test('컨텍스트에 주요 섹션들이 포함된다', () => {
    const { buildPersonContext } = require('@/lib/dataLoader');
    const context = buildPersonContext();
    // 각 데이터 카테고리가 컨텍스트에 반영되어야 함
    expect(context).toContain('기본 프로필');
    expect(context).toContain('경력 및 학력');
    expect(context).toContain('프로젝트');
    expect(context).toContain('기술 스택');
    expect(context).toContain('성격 및 관심사');
  });

  test('두 번 호출해도 동일한 결과를 반환한다 (캐싱 검증)', () => {
    const { buildPersonContext } = require('@/lib/dataLoader');
    // 첫 번째 호출: 파일에서 읽음
    const first = buildPersonContext();
    // 두 번째 호출: 캐시에서 반환 (파일 I/O 없음)
    const second = buildPersonContext();
    expect(first).toBe(second);
  });

  test('clearContextCache 후 재로딩이 정상 동작한다', () => {
    const { buildPersonContext } = require('@/lib/dataLoader');
    const first = buildPersonContext();
    clearContextCache();
    // 캐시 초기화 후 다시 로드 → 같은 내용이어야 함
    const second = buildPersonContext();
    expect(first).toEqual(second);
  });
});

describe('validateDataFiles', () => {
  test('모든 필수 파일이 존재하면 에러 없이 통과한다', () => {
    // 정상 환경에서는 예외 없이 실행되어야 함
    expect(() => validateDataFiles()).not.toThrow();
  });
});
