import { Filter } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { PageSizeOption, SortKey, StatusFilter } from "@/components/features/match-history/types";

interface MatchHistoryFiltersProps {
  mapFilter: string;
  onMapFilterChange: (value: string) => void;
  mapOptions: string[];
  modeFilter: string;
  onModeFilterChange: (value: string) => void;
  modeOptions: string[];
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  pageSize: PageSizeOption;
  onPageSizeChange: (value: PageSizeOption) => void;
  pageSizeOptions: PageSizeOption[];
  resultCount: number;
  currentPage: number;
  totalPages: number;
  pageSizeLabel: string;
}

export function MatchHistoryFilters({
  mapFilter,
  onMapFilterChange,
  mapOptions,
  modeFilter,
  onModeFilterChange,
  modeOptions,
  statusFilter,
  onStatusFilterChange,
  sortKey,
  onSortKeyChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions,
  resultCount,
  currentPage,
  totalPages,
  pageSizeLabel,
}: MatchHistoryFiltersProps) {
  const { t } = useLanguage();

  const translateFilterOption = (value: string) => {
    if (value === "all") return t.matchHistory.filter.all;
    if (value === "latest") return t.matchHistory.filter.latest;
    if (value === "kills") return t.matchHistory.filter.kills;
    if (value === "damage") return t.matchHistory.filter.damage;
    if (value === "placement") return t.matchHistory.filter.placement;
    if (value === "win") return t.matchHistory.status.win;
    if (value === "top10") return t.matchHistory.status.top10;
    if (value === "lose") return t.matchHistory.status.lose;
    return value;
  };

  return (
    <section className="rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.38)] dark:border-white/10 dark:bg-zinc-800/90 dark:shadow-[0_28px_90px_-52px_rgba(251,191,36,0.1)]">
      <div className="mb-3 flex items-center gap-2 text-wbz-mute">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-bold">{t.matchHistory.filter.title}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
        <FilterSelect
          label={t.matchHistory.filter.map}
          value={mapFilter}
          onChange={onMapFilterChange}
          options={["all", ...mapOptions]}
          getOptionLabel={translateFilterOption}
        />
        <FilterSelect
          label={t.matchHistory.filter.mode}
          value={modeFilter}
          onChange={onModeFilterChange}
          options={["all", ...modeOptions]}
          getOptionLabel={translateFilterOption}
        />
        <FilterSelect
          label={t.matchHistory.filter.result}
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as StatusFilter)}
          options={["all", "win", "top10", "lose"]}
          getOptionLabel={translateFilterOption}
        />
        <FilterSelect
          label={t.matchHistory.filter.sort}
          value={sortKey}
          onChange={(value) => onSortKeyChange(value as SortKey)}
          options={["latest", "kills", "damage", "placement"]}
          getOptionLabel={translateFilterOption}
        />
        <FilterSelect
          label={pageSizeLabel}
          value={String(pageSize)}
          onChange={(value) => onPageSizeChange((Number(value) === 20 ? 20 : 10) as PageSizeOption)}
          options={pageSizeOptions.map(String)}
          getOptionLabel={(value) => value}
        />
        <div className="flex flex-col justify-center rounded-2xl border border-gray-200 bg-gray-100/80 px-3 py-2.5 dark:border-white/15 dark:bg-white/5">
          <div className="text-[11px] text-wbz-mute">{t.matchHistory.filter.resultCount}</div>
          <div className="text-lg font-black text-gray-900 dark:text-white">{resultCount}</div>
          <div className="text-[10px] text-wbz-mute">
            {t.matchHistory.filter.page} {currentPage} / {totalPages}
          </div>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  getOptionLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  getOptionLabel: (value: string) => string;
}) {
  return (
    <label className="space-y-1 text-[11px] text-wbz-mute">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-gray-900 dark:border-white/15 dark:bg-black/40 dark:text-white"
      >
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>
            {getOptionLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
