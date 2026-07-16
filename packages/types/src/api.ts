import type { TenantId } from "./tenant";

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  details?: Record<string, unknown>;
}

export interface TenantContext {
  tenantId: TenantId;
}

export interface AuthenticatedRequest extends TenantContext {
  userId: string;
  role: string;
}
