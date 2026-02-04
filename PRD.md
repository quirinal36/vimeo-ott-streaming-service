# PRD: 회원 인증 기반 비디오 스트리밍 서비스

## 1. 개요

### 1.1 프로젝트 목적
회원 인증(Sign In)이 완료된 사용자만 영상 콘텐츠에 접근하여 시청할 수 있는 프리미엄 비디오 스트리밍 서비스 개발

### 1.2 핵심 가치
- **보안**: 인증된 사용자만 콘텐츠 접근 가능
- **수익화**: 구독/결제 기반 비즈니스 모델 지원
- **사용성**: 원활한 회원가입 및 로그인 경험

### 1.3 기술 스택
- **비디오 플랫폼**: Vimeo OTT (VHX)
- **결제 시스템**: Stripe (권장)
- **백엔드**: Node.js / Python (선택)
- **프론트엔드**: React / Next.js (선택)
- **인증**: JWT + Session 기반

---

## 2. Vimeo OTT 통합 아키텍처

### 2.1 인증 흐름

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   사용자    │────▶│  프론트엔드  │────▶│   백엔드    │────▶│  Vimeo OTT  │
│  (브라우저) │◀────│   (React)   │◀────│  (Node.js)  │◀────│    API      │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │                                       ▼
       │                              ┌─────────────┐
       │                              │   Stripe    │
       │                              │  (결제처리)  │
       │                              └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│                    비디오 재생                        │
│  (Vimeo OTT Player + Authorization Token)           │
└─────────────────────────────────────────────────────┘
```

### 2.2 Vimeo OTT API 핵심 개념

#### API 인증
- **HTTP Basic Auth** 사용 (API Key가 username)
- API Key는 Vimeo OTT Admin Dashboard에서 생성
- 모든 요청은 HTTPS로 전송

#### 주요 헤더
```http
Authorization: Basic {base64(API_KEY:)}
VHX-Customer: {customer_href}
VHX-Client-IP: {end_user_ip}
```

#### 핵심 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `POST /customers` | 신규 고객 생성 |
| `GET /customers/{id}` | 고객 정보 조회 |
| `POST /authorizations` | 비디오 재생 권한 발급 |
| `GET /videos` | 비디오 목록 조회 |
| `GET /products` | 상품(구독) 목록 조회 |

### 2.3 접근 권한 레벨

| 플랜 | 설명 | 인증 필요 |
|-----|------|----------|
| `public` | 누구나 시청 가능 | ❌ |
| `free` | 이메일 등록 필요 | ⚠️ (등록만) |
| `standard` | 유료 구독 필요 | ✅ |

---

## 3. 기능 요구사항

### 3.1 사용자 인증 (P0 - 필수)

#### 3.1.1 회원가입
- [ ] 이메일/비밀번호 기반 회원가입
- [ ] 이메일 인증 (선택적)
- [ ] Vimeo OTT Customer 자동 생성
- [ ] 소셜 로그인 지원 (Google, Apple - 선택적)

#### 3.1.2 로그인
- [ ] 이메일/비밀번호 로그인
- [ ] JWT 토큰 발급
- [ ] 리프레시 토큰 관리
- [ ] 로그인 상태 유지 (Remember Me)

#### 3.1.3 로그아웃
- [ ] 토큰 무효화
- [ ] 세션 종료

### 3.2 구독/결제 시스템 (P1 - 중요)

#### 3.2.1 구독 관리
- [ ] 구독 플랜 목록 표시
- [ ] Stripe Checkout 연동
- [ ] 구독 상태 확인
- [ ] 구독 취소/변경

#### 3.2.2 결제 처리
- [ ] Stripe Webhook 처리
- [ ] 결제 성공/실패 알림
- [ ] 영수증 발급

### 3.3 비디오 스트리밍 (P0 - 필수)

#### 3.3.1 비디오 접근 제어
- [ ] 인증된 사용자만 비디오 목록 조회
- [ ] Vimeo OTT Authorization 토큰 발급
- [ ] 만료된 토큰 자동 갱신

#### 3.3.2 비디오 재생
- [ ] Vimeo OTT 임베드 플레이어 통합
- [ ] 시청 기록 저장
- [ ] 이어보기 기능

### 3.4 관리자 기능 (P2 - 선택)

- [ ] 사용자 관리
- [ ] 구독 현황 대시보드
- [ ] 콘텐츠 관리 (Vimeo OTT CMS 연동)

---

## 4. 기술 상세 설계

### 4.1 데이터베이스 스키마

```sql
-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    vimeo_customer_href VARCHAR(255),
    subscription_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 구독 테이블
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    stripe_subscription_id VARCHAR(255),
    vimeo_product_href VARCHAR(255),
    status VARCHAR(50),
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 시청 기록 테이블
CREATE TABLE watch_history (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    video_href VARCHAR(255),
    progress_seconds INTEGER,
    last_watched_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 API 설계

#### 인증 API
```
POST /api/auth/register     - 회원가입
POST /api/auth/login        - 로그인
POST /api/auth/logout       - 로그아웃
POST /api/auth/refresh      - 토큰 갱신
```

#### 비디오 API
```
GET  /api/videos            - 비디오 목록 (인증 필요)
GET  /api/videos/:id        - 비디오 상세
POST /api/videos/:id/auth   - 재생 권한 발급
POST /api/videos/:id/progress - 시청 진도 저장
```

#### 구독 API
```
GET  /api/subscriptions/plans    - 구독 플랜 목록
POST /api/subscriptions/checkout - Stripe 결제 세션 생성
POST /api/webhooks/stripe        - Stripe Webhook
```

### 4.3 보안 고려사항

- API Key는 서버 사이드에서만 사용 (절대 클라이언트 노출 금지)
- HTTPS 필수
- CORS 설정
- Rate Limiting 적용
- XSS/CSRF 방지

---

## 5. 마일스톤 및 일정

### M1: 기초 설정 및 인프라
- 프로젝트 초기 설정
- Vimeo OTT API Key 발급
- 개발 환경 구성
- CI/CD 파이프라인 설정

### M2: 사용자 인증 시스템
- 회원가입/로그인 API
- JWT 토큰 관리
- Vimeo OTT Customer 연동

### M3: 비디오 스트리밍 기능
- 비디오 목록 API
- Authorization 토큰 발급
- 플레이어 통합

### M4: 구독/결제 시스템
- Stripe 연동
- 구독 관리 기능
- Webhook 처리

### M5: UI/UX 및 최종 마무리
- 프론트엔드 완성
- 테스트 및 QA
- 배포

---

## 6. 참고 자료

- [Vimeo OTT API Overview](https://dev.vhx.tv/api/)
- [Vimeo OTT API Reference](https://dev.vhx.tv/docs/api/)
- [Vimeo OTT API Key 생성 가이드](https://vimeoott.zendesk.com/hc/en-us/articles/360022896454-Generate-an-API-key)
- [Stripe Documentation](https://stripe.com/docs)

---

## 7. 용어 정의

| 용어 | 설명 |
|-----|------|
| **Vimeo OTT** | Vimeo의 OTT(Over-The-Top) 비디오 플랫폼 (구 VHX) |
| **Customer** | Vimeo OTT에서 관리하는 최종 사용자 |
| **Authorization** | 비디오 재생을 위한 임시 인증 토큰 |
| **Product** | 구독 상품 단위 |
| **Collection** | 비디오 그룹/시리즈 |
