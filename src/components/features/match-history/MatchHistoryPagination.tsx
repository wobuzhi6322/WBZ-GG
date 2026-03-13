interface MatchHistoryPaginationProps {
  pageInfoText: string;
  currentPage: number;
  totalPages: number;
  pageNumbers: number[];
  prevLabel: string;
  nextLabel: string;
  onPageChange: (page: number) => void;
}

export function MatchHistoryPagination({
  pageInfoText,
  currentPage,
  totalPages,
  pageNumbers,
  prevLabel,
  nextLabel,
  onPageChange,
}: MatchHistoryPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-gray-200 px-3 py-2.5 dark:border-white/10">
      <p className="text-[11px] text-wbz-mute">{pageInfoText}</p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] text-wbz-mute hover:border-cyan-300/50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:text-white"
        >
          {prevLabel}
        </button>
        {pageNumbers.map((page) => (
          <button
            key={`page-${page}`}
            type="button"
            onClick={() => onPageChange(page)}
            className={`min-w-7 rounded border px-2 py-1 text-[11px] font-bold ${
              page === currentPage
                ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-700 dark:text-cyan-100"
                : "border-gray-300 text-wbz-mute hover:border-cyan-300/50 hover:text-gray-900 dark:border-white/15 dark:hover:text-white"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="rounded border border-gray-300 px-2 py-1 text-[11px] text-wbz-mute hover:border-cyan-300/50 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:hover:text-white"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
