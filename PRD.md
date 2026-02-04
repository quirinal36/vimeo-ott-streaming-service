# PRD: 학생용 온라인 강의 비디오 스트리밍 기능

## 1. 개요

### 1.1 프로젝트 목적
회원 인증(Sign In)이 완료된 학생만 강의 영상에 접근하여 시청할 수 있는 온라인 교육 플랫폼 기능 개발

### 1.2 핵심 가치
- **접근 제어**: 인증된 학생만 강의 콘텐츠 시청 가능
- **보안**: Signed URL을 통한 영상 무단 공유 방지
- **확장성**: 기존 웹사이트에 통합 가능한 모듈형 설계

### 1.3 기술 스택
- **비디오 플랫폼**: Cloudflare Stream
- **데이터베이스**: Supabase (PostgreSQL)
- **백엔드**: Node.js / TypeScript
- **프론트엔드**: React / Next.js
- **인증**: Supabase Auth + JWT

---

## 2. Cloudflare Stream 통합 아키텍처

### 2.1 전체 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    학생     │────▶│  프론트엔드  │────▶│   백엔드    │────▶│ Cloudflare  │
│  (브라우저) │◀────│   (React)   │◀────│  (Node.js)  │◀────│   Stream    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       │                   │                   ▼
       │                   │           ┌─────────────┐
       │                   │           │  Supabase   │
       │                   │           │  (Auth/DB)  │
       │                   │           └─────────────┘
       │                   │
       ▼                   ▼
┌─────────────────────────────────────────────────────┐
│              Cloudflare Stream Player               │
│         (Signed URL Token으로 보호된 영상)            │
└─────────────────────────────────────────────────────┘
```

### 2.2 인증 및 영상 접근 흐름

```
1. 학생 로그인 (Supabase Auth)
        ↓
2. 강의 목록 요청 (인증 토큰 포함)
        ↓
3. 백엔드에서 학생 권한 확인
        ↓
4. Cloudflare Stream Signed URL 생성
        ↓
5. 학생에게 시간 제한된 영상 URL 제공
        ↓
6. Cloudflare Stream Player로 영상 재생
```

### 2.3 Cloudflare Stream API 핵심 개념

#### API 인증
```http
Authorization: Bearer {CLOUDFLARE_API_TOKEN}
```
또는
```http
X-Auth-Email: {email}
X-Auth-Key: {CLOUDFLARE_GLOBAL_API_KEY}
```

#### Signed URL 토큰 생성 방식

| 방식 | 사용 케이스 | 제한 |
|-----|-----------|-----|
| `/token` API | 테스트, 소규모 (일 1,000건 미만) | Rate Limit 있음 |
| Signing Key | 프로덕션 (권장) | 제한 없음, 자체 생성 |

#### 주요 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `GET /accounts/{account_id}/stream` | 비디오 목록 조회 |
| `GET /accounts/{account_id}/stream/{video_id}` | 비디오 상세 조회 |
| `POST /accounts/{account_id}/stream/{video_id}/token` | Signed URL 토큰 생성 |
| `POST /accounts/{account_id}/stream/keys` | Signing Key 생성 |

#### 접근 제어 옵션
```json
{
  "exp": 1234567890,           // 만료 시간 (최대 24시간)
  "nbf": 1234567800,           // 시작 시간
  "downloadable": false,       // 다운로드 허용 여부
  "accessRules": [
    { "type": "ip.geoip.country", "country": ["KR"], "action": "allow" },
    { "type": "any", "action": "block" }
  ]
}
```

---

## 3. 기능 요구사항

### 3.1 학생 인증 (P0 - 필수)

#### 3.1.1 회원가입/로그인
- [ ] Supabase Auth 연동
- [ ] 이메일/비밀번호 로그인
- [ ] 소셜 로그인 (Google - 선택)
- [ ] 세션 관리

#### 3.1.2 권한 관리
- [ ] 학생/관리자 역할 구분
- [ ] 강의별 접근 권한 확인
- [ ] 수강 등록 상태 확인

### 3.2 강의 비디오 관리 (P0 - 필수)

#### 3.2.1 비디오 목록
- [ ] 인증된 학생만 목록 조회
- [ ] 강의별/카테고리별 분류
- [ ] 썸네일 표시
- [ ] 시청 진도 표시

#### 3.2.2 비디오 재생
- [ ] Cloudflare Stream Signed URL 발급
- [ ] 시간 제한된 토큰 (2시간)
- [ ] Cloudflare Stream Player 임베드
- [ ] 재생 권한 검증

#### 3.2.3 시청 기록
- [ ] 시청 진도 저장
- [ ] 이어보기 기능
- [ ] 완료 상태 표시

### 3.3 관리자 기능 (P1 - 중요)

#### 3.3.1 강의 관리
- [ ] 비디오 업로드 (Cloudflare Dashboard 또는 API)
- [ ] 강의 정보 등록 (제목, 설명, 순서)
- [ ] 비디오-강의 매핑

#### 3.3.2 학생 관리
- [ ] 수강생 목록 조회
- [ ] 수강 권한 부여/해제
- [ ] 시청 통계 확인

---

## 4. 기술 상세 설계

### 4.1 데이터베이스 스키마 (Supabase)

```sql
-- 사용자 확장 테이블 (Supabase auth.users 연동)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',  -- student, admin
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 강의 테이블
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 비디오 테이블
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cloudflare_video_id VARCHAR(255) NOT NULL,
    cloudflare_thumbnail VARCHAR(500),
    duration_seconds INTEGER,
    order_index INTEGER,
    require_signed_url BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 수강 등록 테이블
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    course_id UUID REFERENCES courses(id),
    enrolled_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    UNIQUE(user_id, course_id)
);

-- 시청 기록 테이블
CREATE TABLE watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    video_id UUID REFERENCES videos(id),
    progress_seconds INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);
```

### 4.2 API 설계

#### 인증 API (Supabase Auth 활용)
```
POST /auth/signup          - 회원가입
POST /auth/signin          - 로그인
POST /auth/signout         - 로그아웃
GET  /auth/session         - 세션 확인
```

#### 강의 API
```
GET  /api/courses                    - 강의 목록
GET  /api/courses/:id                - 강의 상세
GET  /api/courses/:id/videos         - 강의 내 비디오 목록
```

#### 비디오 API
```
GET  /api/videos/:id                 - 비디오 상세
POST /api/videos/:id/signed-url      - Signed URL 발급 (인증 필수)
POST /api/videos/:id/progress        - 시청 진도 저장
```

#### 관리자 API
```
POST /api/admin/courses              - 강의 생성
PUT  /api/admin/courses/:id          - 강의 수정
POST /api/admin/videos               - 비디오 등록
POST /api/admin/enrollments          - 수강 등록
```

### 4.3 Cloudflare Stream 연동 코드 예시

```typescript
// Signed URL 생성 (Signing Key 방식)
import jwt from 'jsonwebtoken';

interface SignedUrlOptions {
  videoId: string;
  expiresInHours?: number;
  downloadable?: boolean;
}

export function generateSignedUrl(options: SignedUrlOptions): string {
  const { videoId, expiresInHours = 2, downloadable = false } = options;

  const token = jwt.sign(
    {
      sub: videoId,
      kid: process.env.CLOUDFLARE_SIGNING_KEY_ID,
      exp: Math.floor(Date.now() / 1000) + (expiresInHours * 3600),
      downloadable,
      accessRules: [
        { type: "ip.geoip.country", country: ["KR"], action: "allow" },
        { type: "any", action: "block" }
      ]
    },
    Buffer.from(process.env.CLOUDFLARE_SIGNING_KEY_PEM!, 'base64'),
    { algorithm: 'RS256' }
  );

  return `https://customer-${process.env.CLOUDFLARE_CUSTOMER_CODE}.cloudflarestream.com/${videoId}/manifest/video.m3u8?token=${token}`;
}
```

### 4.4 보안 고려사항

- Signing Key는 서버 사이드에서만 사용
- Signed URL 만료 시간: 2시간 (재발급 가능)
- 국가 제한: 한국(KR)만 허용 (선택적)
- 다운로드 비활성화
- Supabase RLS(Row Level Security) 적용

---

## 5. 마일스톤 및 일정

### M1: 기초 설정 및 인프라
- 프로젝트 초기 설정
- Supabase 프로젝트 구성
- Cloudflare Stream 계정 설정
- 환경 변수 구성

### M2: 사용자 인증 시스템
- Supabase Auth 연동
- 프로필 테이블 및 RLS 설정
- 로그인/회원가입 기능

### M3: 강의 및 비디오 관리
- 데이터베이스 스키마 생성
- 강의/비디오 CRUD API
- Cloudflare Stream 연동

### M4: 비디오 스트리밍 기능
- Signed URL 생성 기능
- 비디오 플레이어 통합
- 시청 기록 저장

### M5: UI/UX 및 최종 마무리
- 프론트엔드 완성
- 테스트 및 QA
- 기존 웹사이트 통합

---

## 6. 환경 변수

```env
# Supabase
SUPABASE_PROJECT_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Cloudflare Stream
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_SIGNING_KEY_ID=xxx
CLOUDFLARE_SIGNING_KEY_PEM=xxx  # base64 encoded
CLOUDFLARE_CUSTOMER_CODE=xxx    # for stream URL

# App
APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 7. 참고 자료

- [Cloudflare Stream - Secure your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [Cloudflare Stream API - Token](https://developers.cloudflare.com/api/resources/stream/subresources/token/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Database Documentation](https://supabase.com/docs/guides/database)

---

## 8. 용어 정의

| 용어 | 설명 |
|-----|------|
| **Cloudflare Stream** | Cloudflare의 비디오 스트리밍 서비스 |
| **Signed URL** | 시간 제한이 있는 인증된 비디오 접근 URL |
| **Signing Key** | Signed URL을 자체 생성하기 위한 RSA 키 |
| **Supabase** | PostgreSQL 기반 오픈소스 Firebase 대안 |
| **RLS** | Row Level Security, 행 수준 보안 정책 |
