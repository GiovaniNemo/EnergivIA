import type { UserRole } from "./user.js";

export type OrgRole = "OWNER" | "ADMIN" | "ENGINEER" | "SALES" | "VIEWER";

export type PlatformRole = "PLATFORM";

export type AnyRole = OrgRole | PlatformRole;

export type InvitationStatus = "PENDING" | "ACCEPTED" | "EXPIRED";

export type Permission =
  | "project:create"
  | "project:edit"
  | "project:view"
  | "products:manage"
  | "distributors:manage"
  | "users:invite"
  | "users:manage"
  | "organization:manage";

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole | OrgRole | PlatformRole;
  permissions?: Permission[];
  iat?: number;
  exp?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    tenantId: string;
  };
}
