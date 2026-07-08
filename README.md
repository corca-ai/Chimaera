# Chimaera: SEO Loop Harness

Chimaera는 한국어 SEO 블로그 글을 기획, 작성, 검수, HTML 미리보기, 성과 측정, 편집 기록까지 한 흐름으로 다루기 위한 로컬 우선 콘텐츠 운영 도구입니다.

검색 의도와 키워드에서 출발해 목차를 먼저 승인하고, Claude로 본문을 생성한 뒤, 사람이 직접 편집하고, 프리뷰와 배포 패키지까지 확인하는 구조를 목표로 합니다. 생성된 원고와 성과 기록은 기본적으로 로컬 `outputs/` 폴더에 저장되며, API 키와 실제 산출물은 GitHub에 올리지 않습니다.

## 주요 기능

- 목차 승인 후 본문을 생성하는 outline-first 흐름
- H1/H2/H3 중심의 SEO 글 구조 설계
- 섹션별 이미지 삽입 위치, ALT, 파일명 계획
- Claude 기반 한국어 본문 생성
- 본문 안에서 직접 문장을 드래그해 Claude로 부분 rewrite
- 직접 편집한 본문과 rewrite 이력을 로컬 revision history로 저장
- Google Search Central 기준을 반영한 SEO 품질 게이트
- HTML 미리보기, JSON-LD, canonical, GTM dataLayer, CTA form 생성
- WordPress/Next.js/이미지/GTM용 배포 패키지 export
- GSC, GA4, GTM 성과 지표를 입력해 강화/약화 루프 기록
- `epoko77-ai/im-not-ai`에서 영감을 받은 한국어 AI 티 감지/윤문 게이트

## 실행

```bash
npm install
npm run dev
```

서버가 뜨면 출력되는 localhost 주소를 브라우저에서 엽니다.

기본 포트를 명시하려면 아래처럼 실행합니다.

```bash
PORT=5174 npm run dev
```

macOS에서는 포함된 `SEO Loop Harness.command` 파일을 더블클릭해 로컬 서버를 켜고 브라우저를 열 수 있습니다. `.app` 번들은 각 컴퓨터의 절대경로가 들어가는 로컬 산출물이므로 GitHub에는 포함하지 않습니다.

## 환경 변수

서버는 프로젝트 루트의 `.env` 파일과 셸 환경 변수를 읽습니다. `.env`는 Git에 커밋하지 않습니다. 필요한 키 이름은 `.env.example`을 참고합니다.

- `ANTHROPIC_API_KEY`: Claude 목차/본문/rewrite 생성
- `ANTHROPIC_MODEL`: UI 모델 입력값이 비었을 때 사용할 서버 기본 모델
- `OPENAI_API_KEY`: GPT 이미지 생성
- `OPENAI_IMAGE_MODEL`: 이미지 생성 모델
- `OPENAI_IMAGE_SIZE`: 이미지 크기
- `WORDPRESS_BASE_URL`, `WORDPRESS_USERNAME`, `WORDPRESS_APP_PASSWORD`: Headless WordPress draft 생성
- `GOOGLE_SERVICE_ACCOUNT_JSON`, `GSC_SITE_URL`, `GA4_PROPERTY_ID`: GSC/GA4 데이터 연동

키가 없으면 외부 adapter는 dry-run 또는 명확한 오류로 동작합니다. 조용히 가짜 결과를 만든 것처럼 넘어가지 않는 것을 원칙으로 합니다.

## 현재 UI 흐름

메인 UI는 현재 실제로 작동하는 단계만 노출합니다.

- `목차`: Claude API로 목차와 이미지 위치를 먼저 생성합니다.
- `HTML 구조`: 실제 export 기준이 될 HTML 구조를 확인합니다.
- `본문`: 목차 승인 후 Claude로 본문을 생성하고, 본문 안에서 직접 편집합니다.
- `이미지`: 섹션별 이미지 브리프와 ALT를 확인합니다.
- `HTML 미리보기`: publishable HTML preview를 생성합니다.
- `파일 내보내기`: WordPress/Next.js/GTM/이미지 브리프 등 배포 패키지를 만듭니다.
- `성과`: 실제 GSC/GA4/GTM 숫자를 입력해 콘텐츠 성과 루프를 저장합니다.
- `기록`: 현재 콘텐츠와 연결된 생성, 미리보기, 패키지, 성과, 편집 기록을 확인합니다.

왼쪽 입력 패널에는 `writingInstruction`, `referenceUrls`, `audience`, `brandName`, `productName`, `leadGoal`, Claude 모델 입력값이 있습니다. 참고 링크는 문맥으로만 쓰며, 실제 URL 내용을 읽었다고 단정하지 않습니다.

## 본문 편집과 기록

본문 탭의 원고는 `contenteditable` 기반 편집기입니다.

1. 본문 일부를 드래그합니다.
2. 오른쪽 패널에 수정 지시를 입력합니다.
3. `선택 문장 Claude rewrite`를 누르면 선택 범위만 교체됩니다.
4. 직접 손으로 수정한 뒤 `현재 편집본 저장`을 누르면 로컬 revision으로 저장됩니다.

편집 기록은 `outputs/revisions/{content_id}` 아래 JSON으로 저장됩니다. 기록에는 전/후 Markdown, 선택 원문, 변경 문장, 수정 지시, 한 줄 요약, 모델 정보가 포함됩니다.

## 로컬 저장소

`outputs/`는 운영자가 만든 실제 산출물이 쌓이는 로컬 폴더입니다. 기본적으로 Git에 올리지 않습니다.

- `outputs/runs`: 콘텐츠 생성 run
- `outputs/executions`: Claude/GPT/WordPress/GSC/GA4/GTM adapter 실행 기록
- `outputs/model-artifacts`: 모델 산출물 정규화 파일
- `outputs/previews`: HTML 미리보기
- `outputs/packages`: 배포 패키지
- `outputs/performance`: 성과 스냅샷
- `outputs/revisions`: 본문 편집 이력

시간은 저장 시 ISO UTC로 남기고, UI에서는 한국시간 `Asia/Seoul`, `UTC+09:00`, KST 기준으로 표시합니다.

## 주요 API

- `POST /api/outline`: 목차, 이미지 위치, HTML export 구조를 생성합니다. 본문은 만들지 않습니다.
- `POST /api/generate`: 하나의 콘텐츠 루프 run을 생성합니다.
- `GET /api/runs`: 최근 저장된 run을 조회합니다.
- `POST /api/input/enhance`: 왼쪽 입력 필드 하나를 전체 문맥 기준으로 개선합니다.
- `POST /api/editor/rewrite`: 본문에서 선택한 문장을 Claude로 rewrite합니다.
- `POST /api/editor/revision/save`: 현재 편집본 또는 rewrite 결과를 revision으로 저장합니다.
- `GET /api/editor/revision/list`: 현재 콘텐츠의 revision 목록을 조회합니다.
- `POST /api/editor/revision/read`: revision 상세를 읽습니다.
- `POST /api/preview/create`: publishable HTML preview를 저장합니다.
- `GET /previews/:filename`: 저장된 HTML preview를 제공합니다.
- `POST /api/package/create`: 배포 패키지를 생성합니다.
- `GET /packages/:content_id/:filename`: 패키지 산출물을 제공합니다.
- `POST /api/benchmark`: 벤치마크 URL의 title, meta, H tag, schema, ALT, TOC, FAQ, CTA 신호를 분석합니다.
- `POST /api/keywords/suggest`: 키워드 후보, 검색 의도, 템플릿 적합도, 우선순위를 추정합니다.
- `POST /api/performance/record`: 실제 성과 숫자를 저장하고 강화/약화 판단을 남깁니다.
- `GET /api/history/list`: run, model artifact, preview, package, performance, revision 기록을 조회합니다.
- `POST /api/integrations/run`: 현재 run에 대해 외부 adapter를 실행하고 결과를 저장합니다.

## 배포 패키지

`파일 내보내기`는 `outputs/packages/{content_id}` 아래에 배포용 handoff 폴더를 만듭니다.

- `owned-article.md`
- `owned-preview.html`
- `wordpress-payload.json`
- `nextjs-props.json`
- `json-ld.json`
- `gtm-events.json`
- `image-briefs.json`
- `model-artifacts.json`
- `naver-derivative.json`
- `review-checklist.md`

Naver 산출물은 원문 복사가 아니라 derivative brief입니다. 자사 블로그를 측정 가능한 원본으로 두고, Naver는 보조 채널로 다루기 위한 설계입니다.

## 운영 원칙

- 자사 블로그가 측정과 학습의 기준입니다.
- Naver Blog는 원문 복사 채널이 아니라, 별도 기획된 보조 채널입니다.
- 목차 승인 전에는 본문을 만들지 않습니다.
- mock 기능은 UI에 올리지 않습니다. 실제로 작동하는 단계만 보여줍니다.
- API 키, 생성 원고, 성과 데이터, 편집 이력은 기본적으로 로컬에만 둡니다.
- 한국어 문장은 번역투보다 사람이 직접 쓴 듯한 자연스러운 문체를 우선합니다.
