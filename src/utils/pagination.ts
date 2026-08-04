import type { PaginationMeta } from "../services/api/types";

export function emptyPaginationMeta(limit: number): PaginationMeta {
  return {
    limit,
    offset: 0,
    count: 0,
    total: 0,
    page: 1,
    total_pages: 0,
    has_next: false,
    has_prev: false,
  };
}

export function normalizePaginationMeta(meta: Partial<PaginationMeta> | undefined, itemCount: number, limit: number, offset: number): PaginationMeta {
  const count = Number.isFinite(meta?.count) ? Number(meta?.count) : itemCount;
  const total = Number.isFinite(meta?.total) ? Number(meta?.total) : offset + count;
  const page = Number.isFinite(meta?.page) ? Number(meta?.page) : Math.floor(offset / limit) + 1;
  const totalPages = Number.isFinite(meta?.total_pages)
    ? Number(meta?.total_pages)
    : total > 0 ? Math.max(1, Math.ceil(total / limit)) : 0;

  return {
    limit: Number.isFinite(meta?.limit) ? Number(meta?.limit) : limit,
    offset: Number.isFinite(meta?.offset) ? Number(meta?.offset) : offset,
    count,
    total,
    page,
    total_pages: totalPages,
    has_next: typeof meta?.has_next === "boolean" ? meta.has_next : count === limit,
    has_prev: typeof meta?.has_prev === "boolean" ? meta.has_prev : offset > 0,
  };
}

export function paginationPages(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return [1];
  if (totalPages <= 6) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  return sorted.reduce<Array<number | string>>((acc, page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) acc.push(`ellipsis-${page}`);
    acc.push(page);
    return acc;
  }, []);
}
