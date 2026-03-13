"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { FOOTER_CONTENT, type FooterModalType } from "@/constants/footerInfo";

interface FooterInfoModalProps {
  isOpen: boolean;
  type: FooterModalType | null;
  onClose: () => void;
}

export default function FooterInfoModal({
  isOpen,
  type,
  onClose,
}: FooterInfoModalProps) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !type) {
    return null;
  }

  const modal = FOOTER_CONTENT[type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="footer-info-modal-title"
    >
      <div
        className="relative max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-zinc-900 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          aria-label="Close footer modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <h2 id="footer-info-modal-title" className="mb-5 text-xl font-black text-white">
            {modal.title}
          </h2>
          {modal.content}
        </div>
      </div>
    </div>
  );
}
