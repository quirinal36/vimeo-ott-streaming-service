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
- **백엔드**: Python / FastAPI
- **프론트엔드**: React / Next.js
- **인증**: Supabase Auth + JWT

---

## 2. Cloudflare Stream 통합 아키텍처

### 2.1 전체 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    학생     │────▶│  프론트엔드  │────▶│   백엔드    │────▶│ Cloudflare  │
│  (브라우저) │◀────│   (Next.js) │◀────│  (FastAPI)  │◀────│   Stream    │
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
3. FastAPI 백엔드에서 학생 권한 확인
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

### 4.2 FastAPI 프로젝트 구조

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 앱 진입점
│   ├── config.py               # 환경 변수 설정
│   ├── dependencies.py         # 의존성 주입 (인증 등)
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # 인증 관련 라우터
│   │   ├── courses.py          # 강의 API
│   │   ├── videos.py           # 비디오 API
│   │   └── admin.py            # 관리자 API
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # 사용자 모델
│   │   ├── course.py           # 강의 모델
│   │   ├── video.py            # 비디오 모델
│   │   └── enrollment.py       # 수강 등록 모델
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py             # 사용자 Pydantic 스키마
│   │   ├── course.py           # 강의 스키마
│   │   ├── video.py            # 비디오 스키마
│   │   └── common.py           # 공통 스키마
│   │
│   └── services/
│       ├── __init__.py
│       ├── supabase.py         # Supabase 클라이언트
│       ├── cloudflare.py       # Cloudflare Stream 서비스
│       └── auth.py             # 인증 서비스
│
├── requirements.txt
├── Dockerfile
└── .env
```

### 4.3 API 설계

#### 인증 API
```
POST /api/auth/signup          - 회원가입
POST /api/auth/signin          - 로그인
POST /api/auth/signout         - 로그아웃
GET  /api/auth/me              - 현재 사용자 정보
```

#### 강의 API
```
GET  /api/courses                    - 강의 목록
GET  /api/courses/{course_id}        - 강의 상세
GET  /api/courses/{course_id}/videos - 강의 내 비디오 목록
```

#### 비디오 API
```
GET  /api/videos/{video_id}          - 비디오 상세
POST /api/videos/{video_id}/signed-url - Signed URL 발급 (인증 필수)
POST /api/videos/{video_id}/progress   - 시청 진도 저장
```

#### 관리자 API
```
POST /api/admin/courses              - 강의 생성
PUT  /api/admin/courses/{course_id}  - 강의 수정
POST /api/admin/videos               - 비디오 등록
POST /api/admin/enrollments          - 수강 등록
```

### 4.4 FastAPI 코드 예시

#### main.py - 앱 진입점
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, courses, videos, admin

app = FastAPI(
    title="Video Streaming API",
    description="학생용 온라인 강의 비디오 스트리밍 서비스",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(courses.router, prefix="/api/courses", tags=["courses"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### config.py - 환경 설정
```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Cloudflare Stream
    CLOUDFLARE_ACCOUNT_ID: str
    CLOUDFLARE_API_TOKEN: str
    CLOUDFLARE_SIGNING_KEY_ID: str
    CLOUDFLARE_SIGNING_KEY_PEM: str  # base64 encoded
    CLOUDFLARE_CUSTOMER_CODE: str

    # App
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()
```

#### services/cloudflare.py - Cloudflare Stream 서비스
```python
import base64
import time
from typing import Optional, List

import jwt
import httpx

from app.config import settings


class CloudflareStreamService:
    def __init__(self):
        self.account_id = settings.CLOUDFLARE_ACCOUNT_ID
        self.api_token = settings.CLOUDFLARE_API_TOKEN
        self.signing_key_id = settings.CLOUDFLARE_SIGNING_KEY_ID
        self.signing_key_pem = base64.b64decode(settings.CLOUDFLARE_SIGNING_KEY_PEM)
        self.customer_code = settings.CLOUDFLARE_CUSTOMER_CODE
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/stream"

    def generate_signed_url(
        self,
        video_id: str,
        expires_in_hours: int = 2,
        downloadable: bool = False,
        allowed_countries: Optional[List[str]] = None
    ) -> str:
        """Signed URL 생성 (Signing Key 방식)"""

        exp = int(time.time()) + (expires_in_hours * 3600)

        payload = {
            "sub": video_id,
            "kid": self.signing_key_id,
            "exp": exp,
            "downloadable": downloadable,
        }

        # 국가 제한 설정
        if allowed_countries:
            payload["accessRules"] = [
                {"type": "ip.geoip.country", "country": allowed_countries, "action": "allow"},
                {"type": "any", "action": "block"}
            ]

        token = jwt.encode(
            payload,
            self.signing_key_pem,
            algorithm="RS256"
        )

        return f"https://customer-{self.customer_code}.cloudflarestream.com/{video_id}/manifest/video.m3u8?token={token}"

    async def get_video_details(self, video_id: str) -> dict:
        """Cloudflare Stream에서 비디오 상세 정보 조회"""

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{video_id}",
                headers={"Authorization": f"Bearer {self.api_token}"}
            )
            response.raise_for_status()
            return response.json()["result"]

    async def list_videos(self) -> List[dict]:
        """Cloudflare Stream의 모든 비디오 목록 조회"""

        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.base_url,
                headers={"Authorization": f"Bearer {self.api_token}"}
            )
            response.raise_for_status()
            return response.json()["result"]


cloudflare_service = CloudflareStreamService()
```

#### services/supabase.py - Supabase 클라이언트
```python
from supabase import create_client, Client

from app.config import settings


def get_supabase_client() -> Client:
    """일반 Supabase 클라이언트 (anon key)"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_ANON_KEY
    )


def get_supabase_admin_client() -> Client:
    """관리자 Supabase 클라이언트 (service role key)"""
    return create_client(
        settings.SUPABASE_URL,
        settings.SUPABASE_SERVICE_ROLE_KEY
    )
```

#### dependencies.py - 인증 의존성
```python
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.services.supabase import get_supabase_client

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """현재 인증된 사용자 정보 반환"""

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        # Supabase에서 토큰 검증
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )
        return user_response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )


async def get_current_admin_user(
    current_user: dict = Depends(get_current_user)
) -> dict:
    """관리자 권한 확인"""

    supabase = get_supabase_client()

    # profiles 테이블에서 role 확인
    result = supabase.table("profiles").select("role").eq("id", current_user.id).single().execute()

    if not result.data or result.data.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user
```

#### routers/videos.py - 비디오 API 라우터
```python
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.services.supabase import get_supabase_client
from app.services.cloudflare import cloudflare_service
from app.schemas.video import VideoResponse, SignedUrlResponse, ProgressUpdate

router = APIRouter()


@router.get("/{video_id}", response_model=VideoResponse)
async def get_video(
    video_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """비디오 상세 정보 조회"""

    supabase = get_supabase_client()

    # 비디오 정보 조회
    result = supabase.table("videos").select("*, courses(*)").eq("id", str(video_id)).single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )

    video = result.data

    # 수강 권한 확인
    enrollment = supabase.table("enrollments").select("*").eq(
        "user_id", current_user.id
    ).eq(
        "course_id", video["course_id"]
    ).single().execute()

    if not enrollment.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course"
        )

    return video


@router.post("/{video_id}/signed-url", response_model=SignedUrlResponse)
async def get_signed_url(
    video_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """Signed URL 발급"""

    supabase = get_supabase_client()

    # 비디오 정보 조회
    result = supabase.table("videos").select("cloudflare_video_id, course_id").eq("id", str(video_id)).single().execute()

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video not found"
        )

    video = result.data

    # 수강 권한 확인
    enrollment = supabase.table("enrollments").select("*").eq(
        "user_id", current_user.id
    ).eq(
        "course_id", video["course_id"]
    ).single().execute()

    if not enrollment.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enrolled in this course"
        )

    # Signed URL 생성
    signed_url = cloudflare_service.generate_signed_url(
        video_id=video["cloudflare_video_id"],
        expires_in_hours=2,
        downloadable=False,
        allowed_countries=["KR"]
    )

    return {"signed_url": signed_url, "expires_in": 7200}


@router.post("/{video_id}/progress")
async def update_progress(
    video_id: UUID,
    progress: ProgressUpdate,
    current_user: dict = Depends(get_current_user)
):
    """시청 진도 업데이트"""

    supabase = get_supabase_client()

    # upsert로 시청 기록 업데이트
    result = supabase.table("watch_history").upsert({
        "user_id": current_user.id,
        "video_id": str(video_id),
        "progress_seconds": progress.progress_seconds,
        "is_completed": progress.is_completed,
        "last_watched_at": "now()"
    }).execute()

    return {"status": "success"}
```

#### schemas/video.py - Pydantic 스키마
```python
from typing import Optional
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel


class VideoBase(BaseModel):
    title: str
    description: Optional[str] = None
    cloudflare_video_id: str
    duration_seconds: Optional[int] = None
    order_index: Optional[int] = None


class VideoResponse(VideoBase):
    id: UUID
    course_id: UUID
    cloudflare_thumbnail: Optional[str] = None
    require_signed_url: bool
    created_at: datetime

    class Config:
        from_attributes = True


class SignedUrlResponse(BaseModel):
    signed_url: str
    expires_in: int  # seconds


class ProgressUpdate(BaseModel):
    progress_seconds: int
    is_completed: bool = False
```

### 4.5 requirements.txt

```txt
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
pydantic>=2.5.0
pydantic-settings>=2.1.0
supabase>=2.3.0
httpx>=0.26.0
PyJWT>=2.8.0
cryptography>=42.0.0
python-multipart>=0.0.6
```

### 4.6 보안 고려사항

- Signing Key는 서버 사이드에서만 사용
- Signed URL 만료 시간: 2시간 (재발급 가능)
- 국가 제한: 한국(KR)만 허용 (선택적)
- 다운로드 비활성화
- Supabase RLS(Row Level Security) 적용
- FastAPI 의존성 주입을 통한 인증 검증

---

## 5. 마일스톤 및 일정

### M1: 기초 설정 및 인프라
- 프로젝트 초기 설정 (Next.js + FastAPI)
- Supabase 프로젝트 구성
- Cloudflare Stream 계정 설정
- 환경 변수 구성

### M2: 사용자 인증 시스템
- Supabase Auth 연동
- FastAPI 인증 미들웨어 구현
- 프로필 테이블 및 RLS 설정
- 로그인/회원가입 기능

### M3: 강의 및 비디오 관리
- 데이터베이스 스키마 생성
- FastAPI CRUD API 구현
- Cloudflare Stream 서비스 연동

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

### 백엔드 (.env)
```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Cloudflare Stream
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_SIGNING_KEY_ID=xxx
CLOUDFLARE_SIGNING_KEY_PEM=xxx  # base64 encoded
CLOUDFLARE_CUSTOMER_CODE=xxx    # for stream URL

# App
FRONTEND_URL=http://localhost:3000
```

### 프론트엔드 (.env.local)
```env
# Supabase (클라이언트용)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 7. 개발 환경 실행

### 백엔드 (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 프론트엔드 (Next.js)
```bash
cd frontend  # 또는 루트 디렉토리
npm install
npm run dev
```

---

## 8. 참고 자료

- [Cloudflare Stream - Secure your Stream](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [Cloudflare Stream API - Token](https://developers.cloudflare.com/api/resources/stream/subresources/token/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)

---

## 9. 용어 정의

| 용어 | 설명 |
|-----|------|
| **Cloudflare Stream** | Cloudflare의 비디오 스트리밍 서비스 |
| **Signed URL** | 시간 제한이 있는 인증된 비디오 접근 URL |
| **Signing Key** | Signed URL을 자체 생성하기 위한 RSA 키 |
| **Supabase** | PostgreSQL 기반 오픈소스 Firebase 대안 |
| **RLS** | Row Level Security, 행 수준 보안 정책 |
| **FastAPI** | Python 기반 고성능 비동기 웹 프레임워크 |
| **Pydantic** | Python 데이터 검증 및 설정 관리 라이브러리 |
