import { Button } from '@/app/components/atoms/Button';

interface PaginationProps {
  /** Zero-based index of the current page. */
  page: number;
  /** Total number of pages (always at least 1). */
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Page navigation for the in-memory-sliced admin lists. Always rendered when a
 * list has items — buttons disable at the bounds — so a single-page list still
 * reads as paginated. See docs/adr/0026.
 */
export function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  return (
    <div className="mb-4 flex items-center justify-center gap-3">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 0}
        className="disabled:opacity-40"
      >
        Zurück
      </Button>
      <span className="text-sm text-muted">
        Seite {page + 1} von {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages - 1}
        className="disabled:opacity-40"
      >
        Weiter
      </Button>
    </div>
  );
}
