/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import { ImageOff } from "lucide-react";
import { getWeaponImageCandidates } from "@/lib/weaponDetailImages";

interface WeaponDetailThumbnailProps {
  weaponName: string;
  weaponKey: string;
  className?: string;
}

export default function WeaponDetailThumbnail({ weaponName, weaponKey, className = "h-auto w-20" }: WeaponDetailThumbnailProps) {
  const candidates = useMemo(() => {
    const resolved = getWeaponImageCandidates(weaponName, weaponKey);
    return [resolved.detail, resolved.fallback].filter((value): value is string => Boolean(value));
  }, [weaponKey, weaponName]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeSrc = candidates[activeIndex] ?? null;

  if (!activeSrc) {
    return (
      <div className={`inline-flex items-center justify-center rounded-xl border border-white/10 bg-zinc-900/70 text-zinc-500 ${className}`}>
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={weaponName}
      className={`object-contain ${className}`}
      loading="lazy"
      onError={() => {
        setActiveIndex((current) => (current + 1 < candidates.length ? current + 1 : current));
      }}
    />
  );
}
