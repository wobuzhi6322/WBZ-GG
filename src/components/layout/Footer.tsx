"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import FooterInfoModal from "@/components/layout/FooterInfoModal";
import type { FooterModalType } from "@/constants/footerInfo";

export default function Footer() {
  const { t } = useLanguage();
  const [modalType, setModalType] = useState<FooterModalType | null>(null);

  return (
    <>
      <footer className="fixed bottom-0 z-40 w-full border-t border-white/5 bg-wbz-dark/80 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between px-6 md:flex-row">
          <div className="space-y-1 font-mono text-xs text-wbz-mute">
            <p>{t.footer.copyright}</p>
            <p>{t.footer.license}</p>
          </div>

          <div className="mt-2 flex gap-6 md:mt-0">
            <button
              type="button"
              onClick={() => setModalType("terms")}
              className="cursor-pointer text-xs text-wbz-mute transition-colors hover:text-white"
            >
              {t.footer.terms}
            </button>
            <button
              type="button"
              onClick={() => setModalType("privacy")}
              className="cursor-pointer text-xs text-wbz-mute transition-colors hover:text-white"
            >
              {t.footer.privacy}
            </button>
            <button
              type="button"
              onClick={() => setModalType("status")}
              className="cursor-pointer text-xs text-wbz-mute transition-colors hover:text-white"
            >
              {t.footer.status}
            </button>
          </div>
        </div>
      </footer>

      <FooterInfoModal
        isOpen={!!modalType}
        type={modalType}
        onClose={() => setModalType(null)}
      />
    </>
  );
}
