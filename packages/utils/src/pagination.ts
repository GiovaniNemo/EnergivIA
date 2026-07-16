import type { PaginatedResponse } from "@energivia/types";

export function getPaginationMeta(
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<unknown>["meta"] {
  const totalPages = Math.ceil(total / pageSize) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return {
    total,
    page: currentPage,
    pageSize,
    totalPages,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

export function getSkipTake(page: number, pageSize: number): { skip: number; take: number } {
  const p = Math.max(1, page);
  const size = Math.min(100, Math.max(1, pageSize));
  return {
    skip: (p - 1) * size,
    take: size,
  };
}
