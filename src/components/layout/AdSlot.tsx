interface AdSlotProps {
  type: "top" | "side";
  className?: string;
  align?: "left" | "right" | "center";
}

const ALIGN_LABEL: Record<NonNullable<AdSlotProps["align"]>, string> = {
  left: "LEFT",
  right: "RIGHT",
  center: "CENTER",
};

export default function AdSlot({ type, className = "", align = "center" }: AdSlotProps) {
  const isTop = type === "top";
  const containerClass = isTop ? "h-[90px] md:h-[96px] w-full" : "h-[300px] w-full";
  const sizeLabel = isTop ? "970 x 90 / 728 x 90" : "120 x 300 / 160 x 600";
  const titleLabel = isTop ? "Top Banner Ad Slot" : `${ALIGN_LABEL[align]} Side Ad Slot`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-900/90 via-zinc-950/90 to-black/90 ${containerClass} ${className}`}
      aria-label={titleLabel}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(56,189,248,0.12),transparent_38%),radial-gradient(circle_at_90%_80%,rgba(245,158,11,0.14),transparent_34%)]" />
      <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none" />

      <div className="relative h-full w-full flex flex-col items-center justify-center px-4 text-center">
        <span className="text-[10px] font-black tracking-[0.22em] text-cyan-200/85 uppercase">
          ADS PLACEHOLDER
        </span>
        <span className="mt-1 text-sm md:text-base font-black text-white">{titleLabel}</span>
        <span className="mt-1 text-[11px] text-wbz-mute font-mono">{sizeLabel}</span>
        <span className="mt-2 inline-flex rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-wbz-mute">
          Google AdSense Ready Area
        </span>
      </div>
    </div>
  );
}
