# Supabase Auth/Profile Setup

이 프로젝트에서 구글 로그인 이벤트와 사용자 프로필을 Supabase에 저장하려면 아래만 적용하면 됩니다.

## 1) 필수 환경변수 (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_NEXTAUTH_SECRET
```

## 2) 테이블 생성

Supabase SQL Editor에서 아래 파일 실행:

- `supabase/migrations/20260215_0002_auth_profiles.sql`

생성 테이블:
- `public.user_profiles`
- `public.auth_events`

## 3) 동작 검증

개발 서버 실행 후:

- `GET /api/db-health`
  - `supabase.connected === true`
  - `supabase.tables.user_profiles.ok === true`
  - `supabase.tables.auth_events.ok === true`

로그인/로그아웃 테스트:
- 구글 로그인 1회 -> `auth_events`에 `login` row 생성
- 로그아웃 1회 -> `auth_events`에 `logout` row 생성
- `user_profiles.login_count`, `last_login_at`, `last_logout_at` 갱신 확인
