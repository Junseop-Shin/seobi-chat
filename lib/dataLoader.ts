import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// 모듈 레벨 캐시 — 최초 1회만 파일 읽고 이후 요청은 캐시된 값 반환
// (요청마다 YAML 5개 readFileSync 반복 방지)
let cachedContext: string | null = null;

const REQUIRED_FILES = [
  'profile.yaml',
  'experience.yaml',
  'projects.yaml',
  'skills.yaml',
  'personality.yaml',
] as const;

// YAML 파일을 읽어 JavaScript 객체로 변환하는 함수
// 파일 없을 시 명확한 에러 메시지로 500 크래시 방지
function loadYamlFile(filename: string): unknown {
  const filePath = path.join(process.cwd(), 'data', filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`데이터 파일을 찾을 수 없습니다: data/${filename}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content);
}

// 모든 개인 데이터를 로드하여 Gemini 시스템 프롬프트용 컨텍스트 문자열로 변환
// 캐싱 적용: 서버 재시작 전까지 파일을 다시 읽지 않음
export function buildPersonContext(): string {
  if (cachedContext !== null) return cachedContext;

  const profile = loadYamlFile('profile.yaml') as Record<string, unknown>;
  const experience = loadYamlFile('experience.yaml') as Record<string, unknown>;
  const projects = loadYamlFile('projects.yaml') as Record<string, unknown>;
  const skills = loadYamlFile('skills.yaml') as Record<string, unknown>;
  const personality = loadYamlFile('personality.yaml') as Record<string, unknown>;

  cachedContext = `
=== 서비에 대한 정보 ===

[기본 프로필]
${yaml.dump(profile)}

[경력 및 학력]
${yaml.dump(experience)}

[프로젝트]
${yaml.dump(projects)}

[기술 스택]
${yaml.dump(skills)}

[성격 및 관심사]
${yaml.dump(personality)}
`.trim();

  return cachedContext;
}

// 필수 데이터 파일 존재 여부 사전 검증 (앱 시작 시 호출)
export function validateDataFiles(): void {
  const dataDir = path.join(process.cwd(), 'data');
  const missing = REQUIRED_FILES.filter(
    (file) => !fs.existsSync(path.join(dataDir, file))
  );
  if (missing.length > 0) {
    throw new Error(`필수 데이터 파일 누락: ${missing.join(', ')}`);
  }
}

// 캐시 초기화 (테스트 또는 데이터 갱신 시 사용)
export function clearContextCache(): void {
  cachedContext = null;
}
