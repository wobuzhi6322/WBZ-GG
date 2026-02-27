"use client";

import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { t, language } = useLanguage();

  const licenseText =
    language === "ko"
      ? "배틀그라운드 공식 자료의 라이선스는 KRAFTON, INC.에 있습니다."
      : language === "ja"
        ? "PUBG公式データのライセンスは KRAFTON, INC. にあります。"
        : language === "zh"
          ? "PUBG 官方资料授权归 KRAFTON, INC. 所有。"
          : "License for official PUBG materials belongs to KRAFTON, INC.";

  return (
    <footer className="fixed bottom-0 w-full py-4 border-t border-white/5 bg-wbz-dark/80 backdrop-blur-sm z-40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center">
        <div className="text-wbz-mute text-xs font-mono space-y-1">
          <p>{t.footer.copyright}</p>
          <p>{licenseText}</p>
        </div>
        <div className="flex gap-6 mt-2 md:mt-0">
          <a href="#" className="text-xs text-wbz-mute hover:text-wbz-gold transition-colors">
            {t.footer.terms}
          </a>
          <a href="#" className="text-xs text-wbz-mute hover:text-wbz-gold transition-colors">
            {t.footer.privacy}
          </a>
          <a href="#" className="text-xs text-wbz-mute hover:text-wbz-gold transition-colors">
            {t.footer.status}
          </a>
        </div>
      </div>
    </footer>
  );
}
