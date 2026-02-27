import { useLanguage } from "@/context/LanguageContext";

interface WeaponInfoProps {
  primaryWeapon?: string;
}

export function WeaponInfo({ primaryWeapon }: WeaponInfoProps) {
  const { t } = useLanguage();

  return (
    <div className="min-w-0 flex flex-col items-center justify-center text-center">
      <div className="text-[13px] text-gray-900 dark:text-gray-100 font-black whitespace-nowrap truncate max-w-full">
        {primaryWeapon?.trim() || "-"}
      </div>
      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t.matchHistory.headers.weapon}</div>
    </div>
  );
}
