# WBZ 공식 데이터 흡수 범위 (PUBG 기준)

## 현재 연결된 공식 데이터 축
- 전적/리더보드/시즌: PUBG Developer API (`api.pubg.com`)
- 패치/업데이트: PUBG 공식 뉴스 (`pubg.com/news`)
- 맵 로테이션: PUBG 공식 맵 서비스 리포트 (`pubg.com/news/{postId}`)
- 스팀 프로필 이미지: Steam 공식 CDN/API 범위

## 이번 반영에서 추가된 항목
- 최신 맵 서비스 리포트 자동 탐지
  - 뉴스 페이지를 순회하며 최신 `Map Service Report` postId를 자동 추적
- 맵 로테이션 구조화 파싱
  - AS(PC) 일반전 주차별 맵
  - 경쟁전 맵 확률
  - 현재 주차 자동 계산
- UI 출력
  - 메인 우측 패널에서 맵 로테이션 풀을 이미지 그리드로 출력
  - 이번 주 맵을 별도 강조
- 성능 최적화
  - 서버 메모리 캐시(10분 TTL)
  - API 응답 `stale-while-revalidate` 캐시 헤더 적용
  - 실패 시 이전 캐시 데이터 폴백

## 운영 권장
- 전적/리더보드도 동일 패턴으로 캐시 계층을 통일
  - `in-memory cache + stale-while-revalidate + fallback`
- 각 데이터 소스에 `최종 동기화 시간`을 화면에 표시
- 대량 요청 구간(검색 자동완성 등)에 레이트 리밋/디바운스 적용
