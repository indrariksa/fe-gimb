import { useState } from "react";
import { Icon } from "../atoms/Icon";
import type { PaginationMeta } from "../../services/api/types";
import { paginationPages } from "../../utils/pagination";

const paginationSizeOptions = [5, 10, 20, 50];

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  meta: PaginationMeta;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function PaginationControls({ page, pageSize, meta, isLoading, onPageChange, onPageSizeChange }: PaginationControlsProps) {
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const start = meta.count === 0 ? 0 : meta.offset + 1;
  const end = meta.offset + meta.count;
  const canGoNext = meta.has_next;
  const displayPage = page + 1;
  const totalPages = meta.total_pages || displayPage;
  const pages = paginationPages(displayPage, totalPages);

  return (
    <div className="admin-pagination">
      <div className="admin-pagination__meta">
        <span>
          {isLoading
            ? "Memuat data..."
            : meta.total > 0
              ? `Showing ${start} to ${end} of ${meta.total} entries`
              : "Showing 0 entries"}
        </span>
        <label>
          Tampilkan
          <span className="admin-pagination__size">
            <button
              type="button"
              className={isSizeMenuOpen ? "is-open" : ""}
              aria-haspopup="listbox"
              aria-expanded={isSizeMenuOpen}
              disabled={isLoading}
              onClick={() => setIsSizeMenuOpen((current) => !current)}
            >
              {pageSize}
              <Icon name="chevron" size={16} />
            </button>
            {isSizeMenuOpen && (
              <span className="admin-pagination__size-menu" role="listbox" aria-label="Jumlah data yang ditampilkan">
                {paginationSizeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === pageSize}
                    className={option === pageSize ? "is-selected" : ""}
                    disabled={isLoading}
                    onClick={() => {
                      setIsSizeMenuOpen(false);
                      onPageSizeChange(option);
                    }}
                  >
                    {option === pageSize && <Icon name="check" size={16} />}
                    <span>{option}</span>
                  </button>
                ))}
              </span>
            )}
          </span>
          data
          <select
            className="admin-pagination__native-size"
            value={pageSize}
            disabled={isLoading}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-hidden="true"
            tabIndex={-1}
          >
            {paginationSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="admin-pagination__controls">
        <button type="button" disabled={!meta.has_prev || isLoading} onClick={() => onPageChange(Math.max(0, page - 1))}>Previous</button>
        <div className="admin-pagination__pages" aria-label="Pilihan halaman">
          {pages.map((pageItem) => (
            typeof pageItem === "number" ? (
              <button
                key={pageItem}
                type="button"
                className={pageItem === displayPage ? "is-active" : ""}
                disabled={isLoading}
                onClick={() => onPageChange(pageItem - 1)}
              >
                {pageItem}
              </button>
            ) : (
              <span key={pageItem}>...</span>
            )
          ))}
        </div>
        <button type="button" disabled={!canGoNext || isLoading} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </div>
  );
}
