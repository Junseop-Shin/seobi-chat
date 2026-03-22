# seobi-chat

신준섭(서비)을 소개하는 개인 AI 챗봇. Siri 스타일의 3D 은색 구체 UI와 음성 입출력을 제공합니다.

## 주요 기능

- **3D 구체 애니메이션** — React Three Fiber + GLSL 쉐이더로 구현한 Siri 스타일 은색 구체 (idle / listening / thinking / speaking 4가지 상태)
- **음성 입출력** — Web Speech API 기반 한국어 STT/TTS, 마이크 음량에 따라 구체 반응
- **Gemini AI** — Gemini 2.0 Flash 기반 응답, 서비 관련 질문에만 답변
- **미답변 질문 로깅** — 데이터 없어서 못 답한 질문은 자동으로 `logs/unanswered-questions.jsonl`에 기록

## 보안

| 레이어 | 내용 |
|--------|------|
| Rate Limit | IP당 30회/시간, 100회/일 (환경변수로 조정 가능) |
| Topic Guard | 코드 실행, 프롬프트 인젝션 패턴 블랙리스트 차단 |
| Token 제한 | 입력 최대 500자, 출력 최대 800 토큰 |
| Gemini Safety | 4가지 유해 콘텐츠 카테고리 필터 |
| API Key 보호 | 서버사이드 전용 처리, 클라이언트에 노출 없음 |

## 기술 스택

- **Framework** — Next.js 16 (App Router, standalone output)
- **3D** — Three.js + React Three Fiber
- **AI** — Google Gemini 2.0 Flash
- **Voice** — Web Speech API (STT/TTS)
- **Data** — YAML 파일 기반 개인 정보 관리
- **Deploy** — Windows 홈서버 + PM2 + Cloudflare Tunnel
- **CI/CD** — GitHub Actions (main 푸시 시 자동 배포)

## 시작하기

### 1. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 편집:

```
GEMINI_API_KEY=your_key_here        # Google AI Studio에서 발급
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2. 개발 서버 실행

```bash
npm install
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

### 3. 개인 정보 수정

`data/` 폴더의 YAML 파일을 직접 편집하면 챗봇 응답이 바뀝니다.

```
data/
├── profile.yaml      # 기본 정보, 연락처, 학력
├── experience.yaml   # 경력 사항
├── projects.yaml     # 포트폴리오 프로젝트
├── skills.yaml       # 기술 스택
└── personality.yaml  # 성격, 취미, 목표 등
```

> 서버 재시작 없이 즉시 반영하려면 `lib/dataLoader.ts`의 `clearContextCache()`를 호출하거나 서버를 재시작하세요.

## 미답변 질문 관리

챗봇이 "아직 그 부분은 잘 모르겠어요"라고 답하면 해당 질문이 자동 기록됩니다.

```bash
# 서버에서 로그 확인
cat logs/unanswered-questions.jsonl
```

```json
{"question":"서비 혈액형이 뭐예요?","timestamp":"2026-03-23T00:00:00.000Z","geminiResponse":"아직 그 부분은 잘 모르겠어요."}
```

확인 후 답변 가능한 내용은 `data/*.yaml`에 추가하면 됩니다.

## 테스트

```bash
npm test
```

```
Test Suites: 4 passed
Tests:       29 passed
```

| 테스트 파일 | 내용 |
|-------------|------|
| `topicGuard.test.ts` | 블랙리스트 패턴 차단 / 정상 요청 허용 |
| `rateLimit.test.ts` | IP별 요청 횟수 제한 동작 |
| `dataLoader.test.ts` | YAML 로딩, 캐싱, 파일 존재 검증 |
| `questionLogger.test.ts` | 미답변 질문 기록 및 조회 |

## 배포 (Windows 홈서버)

GitHub `main` 브랜치에 푸시하면 자동 배포됩니다.

### 필요한 GitHub Secrets

| Secret | 설명 | 기존 프로젝트 공유 |
|--------|------|------------------|
| `DEPLOY_SSH_KEY` | SSH 개인키 (base64) | ✅ 공유 |
| `DEPLOY_HOST` | 서버 호스트 | ✅ 공유 |
| `DEPLOY_PORT` | SSH 포트 (2222) | ✅ 공유 |
| `DEPLOY_USER` | SSH 유저 | ✅ 공유 |
| `SEOBI_DEPLOY_PATH` | Windows 배포 경로 | 🆕 추가 필요 |
| `GEMINI_API_KEY` | Gemini API 키 | 🆕 추가 필요 |
| `NEXT_PUBLIC_BASE_URL` | 배포 도메인 | 🆕 추가 필요 |

### Cloudflare Tunnel 설정

```
seobi.nuclearbomb6518.com → localhost:3002
```

Cloudflare Zero Trust → Tunnels → 기존 터널에 Public Hostname 추가.

### 수동 배포 (첫 배포 시)

```bash
# Windows 서버에서
mkdir C:\Users\ylswn\Projects\seobi-chat
cd C:\Users\ylswn\Projects\seobi-chat
echo GEMINI_API_KEY=your_key > .env.local
echo NEXT_PUBLIC_BASE_URL=https://seobi.nuclearbomb6518.com >> .env.local
```

이후 GitHub Actions가 자동으로 빌드·배포합니다.
