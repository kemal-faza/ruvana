interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function pageList(current: number, total: number): number[] {
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const navBtn =
    "inline-flex h-8 items-center gap-1 rounded-md border border-[#405E5C]/20 bg-[#FAFCFB] px-3 text-sm font-medium text-[#405E5C] transition-colors hover:bg-[#E5EFF0] hover:text-[#263B3A] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-[#FAFCFB] disabled:hover:text-[#405E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438]";

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-center gap-1.5" aria-label="Paginasi laporan">
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={prevDisabled}
        className={navBtn}
        aria-label="Halaman sebelumnya"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10 12.77 13.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02z" clipRule="evenodd" />
        </svg>
        Sebelumnya
      </button>

      {pageList(currentPage, totalPages).map((p, idx, arr) => {
        const isCurrent = p === currentPage;
        const hasGap = idx > 0 && arr[idx - 1] !== p - 1;
        return (
          <span key={p} className="inline-flex items-center gap-1.5">
            {hasGap && <span className="px-0.5 text-sm text-[#6D8080]">…</span>}
            <button
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={isCurrent ? "page" : undefined}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] ${
                isCurrent
                  ? "bg-[#405E5C] text-white"
                  : "border border-[#405E5C]/20 bg-[#FAFCFB] text-[#405E5C] hover:bg-[#E5EFF0] hover:text-[#263B3A]"
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={nextDisabled}
        className={navBtn}
        aria-label="Halaman berikutnya"
      >
        Berikutnya
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
        </svg>
      </button>
    </nav>
  );
}
