export type TenantId = string;

export interface TenantBase {
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  settings?: TenantSettings;
}

export interface TenantSettings {
  brandPrimaryColor?: string;
  proposalValidityDays?: number;
  currency?: string;
  timezone?: string;
}

export interface Tenant extends TenantBase {
  id: TenantId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
