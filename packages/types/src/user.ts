import type { TenantId } from "./tenant";

export type UserId = string;

export type UserRole = "ADMIN" | "SALES" | "ENGINEER";

export interface UserBase {
  email: string;
  name: string;
  role: UserRole;
  tenantId: TenantId;
}

export interface User extends UserBase {
  id: UserId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
