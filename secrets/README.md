# Secret Vault (Local Only)

민감 키는 로컬 파일로만 관리하세요.

- 권장 파일: `secrets/private.keys.env`
- 실제 키 파일은 커밋 금지
- 템플릿: `secrets/private.keys.template.env`

## 사용 순서

1. 템플릿 복사  
   `copy secrets\\private.keys.template.env secrets\\private.keys.env`
2. `secrets/private.keys.env`에 키 입력
3. 필요한 키가 비어있지 않은지 확인 후 서버 실행

## 필수 체크

- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (구글 로그인 사용 시)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase 저장 사용 시)

## 주의

- `PUBG_API_KEY`, `PUBG_API_KEY_KAKAO`, `STEAM_API_KEY`, `NEXTAUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`는 외부 공유 금지
- 키가 포함된 파일/스크린샷/채팅 로그를 공개하지 마세요
