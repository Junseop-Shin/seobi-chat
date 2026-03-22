import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// YAML 파일을 읽어 JavaScript 객체로 변환하는 함수
function loadYamlFile(filename: string): unknown {
  const filePath = path.join(process.cwd(), 'data', filename);
  const content = fs.readFileSync(filePath, 'utf-8');
  return yaml.load(content);
}

// 모든 개인 데이터를 로드하여 Gemini 시스템 프롬프트용 컨텍스트 문자열로 변환
export function buildPersonContext(): string {
  const profile = loadYamlFile('profile.yaml') as Record<string, unknown>;
  const experience = loadYamlFile('experience.yaml') as Record<string, unknown>;
  const projects = loadYamlFile('projects.yaml') as Record<string, unknown>;
  const skills = loadYamlFile('skills.yaml') as Record<string, unknown>;
  const personality = loadYamlFile('personality.yaml') as Record<string, unknown>;

  return `
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
}
