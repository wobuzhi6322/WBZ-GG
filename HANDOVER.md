# WBZ.GG Handover (2026-02-13)

프로젝트 경로: `C:\Users\mkhh6\OneDrive\Desktop\wbb`

## 1) 프로젝트 요약

- 스택: `Next.js 14.1.0`, `React 18`, `TypeScript(strict)`, `TailwindCSS`, `NextAuth`
- 목적: PUBG 전적 조회, 리더보드, 대꼴러, 맵 인텔, 무기/스킨 정보, 가챠 시뮬레이터, 커뮤니티 기능 제공
- 현재 검증 결과:
  - `npm.cmd run lint` 통과 (에러/경고 없음)
  - `npm.cmd run build` 통과

## 2) 최근 반영 완료 사항

### A. 전적 상세(킬로그 + 맵 표시) 구현

- 추가 API: `src/app/api/match-detail/route.ts`
- 핵심 로직: `src/lib/pubg.ts`
  - `getMatchDetail(matchId, accountId?)`
  - 텔레메트리 URL 추출, 킬 이벤트 정규화, 좌표 퍼센트 변환, 5분 메모리 캐시
- UI: `src/components/features/MatchHistory.tsx`
  - 각 경기 행에 `게임 정보` 버튼 추가
  - 모달에서 `누가 누구를 죽였는지`, `시간`, `데미지 타입`, `가해 수단`, `좌표` 확인 가능
  - 맵 위 마커 표시 + 로그 선택 시 해당 마커 하이라이트
- 연결: `src/app/profile/[username]/page.tsx`
  - `MatchHistory`에 `accountId`, `playerName` 전달
  - 기본 매치 로드 수 40

### B. 맵 인텔 상호작용 개선

- 파일: `src/app/intel/page.tsx`
- 구현 내용:
  - 마우스 휠 줌(앵커 고정), `+ / -` 버튼 줌
  - 줌 상태에서 드래그 팬 이동
  - 휠 이벤트 시 페이지 스크롤 전파 차단(`preventDefault`, `stopPropagation`)
  - 1km/100m 격자 동시 표시
  - 낙하지점 체크 프리셋(100~1250m) + 원형 반경 오버레이
  - 비행경로/거리측정/레이어 토글(고정차량, 스폰차량, 보트, 비밀의 방, 글라이더)

### C. 리더보드 + 대꼴러 통합

- API: `src/app/api/leaderboard/route.ts`
  - 공식 리더보드 + 대꼴러 데이터 동시 반환
  - `PUBG_API_KEY` 미설정 시 안내 응답(503)
- 데이터: `src/lib/pubg.ts`, `src/lib/daekkoller.ts`
  - 리더보드 shard fallback (`pc-eu`, `pc-na` 등)
  - 대꼴러 규칙 기반 Top 20 선별
- UI: `src/components/features/LeaderboardTable.tsx`, `src/app/daekkoller/page.tsx`
  - 공식/대꼴러 탭 전환
  - 모드 전환 및 통계 카드

### D. 무기/스킨/가챠 업데이트

- 무기: `src/lib/pubgWeapons.ts`, `src/app/api/weapons/route.ts`, `src/app/arsenal/page.tsx`
  - 공식 무기 페이지 기반 카테고리/스탯
  - 바디 파츠별 데미지(Head/Body/Leg) 계산
- 스킨: `src/lib/pubgWeaponSkins.ts`, `src/app/api/weapon-skins/route.ts`
  - `pubgitems.info` 기반 스킨 목록/카테고리 수집
- 가챠:
  - `src/app/api/gacha-unbox/route.ts` (10회 뽑기, 등급별 박스 매핑)
  - `src/app/api/gacha-pricing/route.ts` (1회 1800 G-Coin, 환율 API 연동)
  - `src/components/features/SkinGachaSimulator.tsx`

### E. 공식 업데이트 피드

- `src/lib/pubgUpdates.ts`, `src/app/api/updates/route.ts`, `src/app/updates/page.tsx`
- PUBG 공식 뉴스(패치노트) 우선, 실패 시 Steam 뉴스 fallback

## 3) 현재 구조(핵심 파일)

```text
src/app/page.tsx
src/app/profile/[username]/page.tsx
src/app/intel/page.tsx
src/app/arsenal/page.tsx
src/app/updates/page.tsx
src/app/daekkoller/page.tsx
src/app/community/page.tsx

src/app/api/leaderboard/route.ts
src/app/api/daekkoller/route.ts
src/app/api/matches/route.ts
src/app/api/match-detail/route.ts
src/app/api/map-intel/route.ts
src/app/api/weapons/route.ts
src/app/api/weapon-skins/route.ts
src/app/api/gacha-unbox/route.ts
src/app/api/gacha-pricing/route.ts
src/app/api/updates/route.ts

src/lib/pubg.ts
src/lib/daekkoller.ts
src/lib/mapIntel.ts
src/lib/pubgWeapons.ts
src/lib/pubgWeaponSkins.ts
src/lib/pubgUpdates.ts

src/components/features/MatchHistory.tsx
src/components/features/LeaderboardTable.tsx
src/components/features/SkinGachaSimulator.tsx
```

## 4) 현재 미완료/리스크

1. 다량 전적 조회(100~200+) 미구현
- 현재 프로필 기본 40경기 로드
- `api/matches`는 limit 지원하나 UI 페이징/더보기 연결이 약함

2. 리더보드 실시간 안정성
- PUBG API `404/429` 시 shard fallback 후에도 비어 있을 수 있음
- 별도 배치 캐시(예: cron + 저장소) 없음

3. 커뮤니티 영속성
- `src/app/community/page.tsx`는 localStorage 기반
- 서버 DB/이미지 업로드/댓글 API 없음

4. 스크래핑 취약성
- `pubg.com`, `pubgitems.info`, `battlegrounds.party` DOM/구조 변경 시 파서 깨질 수 있음

5. 텍스트/로컬라이즈 품질
- 일부 컴포넌트 문자열 품질 정리가 필요함(카피 일관성, 번역 테이블 정리)

6. 보안
- PUBG API 키는 반드시 `.env.local`로만 관리
- 대화창에 키가 노출된 이력이 있으면 키 재발급 권장

## 5) 환경 변수

`.env.example` 기준:

- `PUBG_API_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 6) 실행 방법

```bash
npm.cmd install
npm.cmd run dev
npm.cmd run lint
npm.cmd run build
```

## 7) 다음 채팅에서 바로 이어갈 To-Do (우선순위)

### P0

1. 전적 100~200경기 페이징/더보기 완성
- 대상: `src/app/profile/[username]/page.tsx`, `src/app/api/matches/route.ts`, `src/components/features/MatchHistory.tsx`, `src/lib/pubg.ts`

2. 리더보드 실랭킹 안정화
- 대상: `src/lib/pubg.ts`, `src/app/api/leaderboard/route.ts`
- 목표: rate limit 대응 캐시 강화, shard 실패 UX 개선

3. 텍스트/번역 정리
- 대상: `src/data/locales.ts` 및 화면 내 하드코딩 문구
- 목표: 한국어 카피 품질 통일

### P1

4. 커뮤니티 백엔드화
- 대상: `src/app/community/page.tsx` + 신규 API/DB
- 목표: 게시글/좋아요/저장 영속 저장

5. 맵 인텔 고급 기능
- 목표: 마커 저장/공유 링크, 레이어 프리셋 저장

6. 가챠 시뮬레이터 고도화
- 목표: 연출 개선 + 확률/출처 UI 명시 강화

## 8) 다음 작업 시작 프롬프트 (복붙용)

```text
HANDOVER.md 기준으로 P0-1(전적 100~200경기 페이징/더보기)을 바로 구현해줘.
현재 profile 페이지의 MatchHistory는 40경기 고정이라 더보기 버튼 + API 연동으로 확장하고,
429/rate-limit 상황에서 사용자 메시지까지 포함해 안정적으로 동작하게 만들어줘.
수정 파일 목록, 핵심 변경점, 테스트 결과(lint/build)까지 보고해줘.
```
