"use client";

import type { ReactNode } from "react";

export type FooterModalType = "terms" | "privacy" | "status";

interface FooterContentItem {
  title: string;
  content: ReactNode;
}

export const FOOTER_CONTENT: Record<FooterModalType, FooterContentItem> = {
  terms: {
    title: "이용약관 (Terms of Service)",
    content: (
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">
        <p>
          <strong className="text-white">제1조 (목적)</strong>
          <br />
          본 약관은 WBZ.GG(이하 &apos;서비스&apos;)가 제공하는 배틀그라운드 전적 검색 및 관련 제반
          서비스의 이용과 관련하여, 서비스와 사용자 간의 권리, 의무 및 책임 사항을 규정함을
          목적으로 합니다.
        </p>
        <p>
          <strong className="text-white">제2조 (저작권 및 소유권)</strong>
          <br />
          1. 본 서비스에서 제공하는 배틀그라운드(PUBG)와 관련된 모든 이미지, 로고, 게임 데이터 및
          상표권 등 지적재산권은 KRAFTON, INC.에 있습니다.
          <br />
          2. WBZ.GG는 KRAFTON의 공식 API를 활용하여 데이터를 제공하는 비공식 전적 검색
          웹사이트이며, KRAFTON과 직접적인 제휴 관계가 없습니다.
        </p>
        <p>
          <strong className="text-white">제3조 (서비스의 제공 및 변경)</strong>
          <br />
          1. 서비스는 PUBG 공식 API의 상태에 따라 데이터 업데이트가 지연되거나 일시적으로 조회가
          불가능할 수 있습니다.
          <br />
          2. 서비스 운영자는 무료로 제공되는 본 서비스의 전부 또는 일부를 회사의 정책 및 운영의
          필요상 수정, 중단, 변경할 수 있으며, 별도의 보상을 하지 않습니다.
        </p>
        <p>
          <strong className="text-white">제4조 (면책 조항)</strong>
          <br />
          서비스는 공식 API에서 제공받은 데이터를 가공하여 보여주는 역할을 하므로, 데이터의 100%
          정확성이나 신뢰성을 보증하지 않으며, 서비스를 이용함으로써 발생하는 어떠한 손해에
          대해서도 책임을 지지 않습니다.
        </p>
      </div>
    ),
  },
  privacy: {
    title: "개인정보처리방침 (Privacy Policy)",
    content: (
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">
        <p>
          WBZ.GG는 사용자의 개인정보 보호를 중요하게 생각하며, 다음과 같은 개인정보처리방침을
          준수합니다.
        </p>
        <p>
          <strong className="text-white">1. 수집하는 개인정보 항목 및 방법</strong>
          <br />
          WBZ.GG는 별도의 민감한 개인정보(이름, 연락처 등)를 수집하지 않습니다. 단, 서비스
          편의(최근 검색어, 테마 설정 등)를 위해 쿠키(Cookie) 및 로컬 스토리지가 사용될 수
          있습니다.
        </p>
        <p>
          <strong className="text-white">2. 제3자 데이터 제공 및 분석 툴 사용</strong>
          <br />
          전적 데이터를 불러오기 위해 닉네임 정보가 KRAFTON 공식 API 서버로 전송되며, 접속 통계를
          위해 Google Analytics 등 비식별 정보 기반의 분석 도구가 사용될 수 있습니다.
        </p>
        <p>
          <strong className="text-white">3. 개인정보의 파기</strong>
          <br />
          브라우저 로컬 스토리지에 저장된 설정값 및 검색어는 브라우저 설정에서 캐시/쿠키를
          삭제하여 언제든 파기할 수 있습니다.
        </p>
        <p>
          <strong className="text-white">4. 문의처</strong>
          <br />- 이메일:{" "}
          <a href="mailto:wobuzhi@gmail.com" className="text-emerald-400 hover:underline">
            wobuzhi@gmail.com
          </a>
          <br />- 디스코드:{" "}
          <a
            href="https://discord.gg/fJbFb3GC"
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline"
          >
            https://discord.gg/fJbFb3GC
          </a>
        </p>
      </div>
    ),
  },
  status: {
    title: "서비스 상태 (Service Status)",
    content: (
      <div className="flex flex-col gap-4 text-sm leading-relaxed text-zinc-300">
        <p>현재 WBZ.GG 시스템 및 PUBG API 서버 상태를 안내합니다.</p>

        <div className="flex flex-col gap-2 rounded-lg bg-zinc-800 p-4">
          <p className="font-bold text-emerald-400">✅ 웹사이트 서버 상태: 정상 (Operational)</p>
          <p className="text-zinc-400">WBZ.GG 프론트엔드 및 내부 시스템이 원활하게 작동 중입니다.</p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-zinc-800 p-4">
          <p className="font-bold text-emerald-400">✅ PUBG API 연동 상태: 정상 (Operational)</p>
          <p className="text-zinc-400">크래프톤 공식 전적 데이터 서버와 정상적으로 통신하고 있습니다.</p>
        </div>

        <div className="mt-2 border-t border-zinc-700 pt-4">
          <p className="mb-2 font-bold text-white">💡 전적 갱신이 안 되나요?</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-zinc-400">
            <li>게임 종료 후 공식 서버에 데이터가 반영되기까지 약 2~5분의 지연 시간이 발생할 수 있습니다.</li>
            <li>
              지속적인 오류 발생 시{" "}
              <a
                href="https://discord.gg/fJbFb3GC"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline"
              >
                디스코드
              </a>{" "}
              또는{" "}
              <a href="mailto:wobuzhi@gmail.com" className="text-emerald-400 hover:underline">
                이메일
              </a>
              로 제보해 주시면 감사하겠습니다.
            </li>
          </ul>
        </div>
      </div>
    ),
  },
};
