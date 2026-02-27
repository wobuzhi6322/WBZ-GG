"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, Radar, Shield, Wrench, Newspaper, Sparkles, Flame, Target, Trophy } from "lucide-react";
import SystemCheckPanel from "@/components/features/SystemCheckPanel";

const CATEGORY_LINKS = [
  { href: "/ranking", title: "랭킹", desc: "스팀/카카오 통합 랭킹 대시보드", icon: Trophy },
  { href: "/agents", title: "플레이어", desc: "플레이어 전적과 상세 분석", icon: Shield },
  { href: "/arsenal", title: "무기", desc: "무기 정보, 메타, 스킨 데이터", icon: Wrench },
  { href: "/intel", title: "맵 정보", desc: "맵 오버레이와 전술 인텔", icon: Radar },
  { href: "/updates", title: "업데이트", desc: "배틀그라운드 공식 패치노트", icon: Newspaper },
  { href: "/daekkoller", title: "대꼴러", desc: "조건 기반 리더보드", icon: Flame },
  { href: "/killgame", title: "킬내기", desc: "핀볼 팀 뽑기 + 점수 검증 뼈대", icon: Target },
  { href: "/community", title: "커뮤니티", desc: "장비/세팅 공유 피드", icon: Sparkles },
];

export default function OperationsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <SystemCheckPanel />

      <div className="bg-wbz-card border border-white/5 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
            <Activity className="w-5 h-5 text-red-400" />
          </div>
          <h1 className="text-3xl font-black text-white">카테고리 허브</h1>
        </div>
        <p className="text-wbz-mute">필요한 기능으로 바로 이동할 수 있는 통합 진입 페이지입니다.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {CATEGORY_LINKS.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className="block bg-wbz-card border border-white/5 rounded-2xl p-6 hover:border-wbz-gold/40 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-black text-white">{item.title}</h2>
                  <Icon className="w-5 h-5 text-wbz-gold" />
                </div>
                <p className="text-sm text-wbz-mute">{item.desc}</p>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
