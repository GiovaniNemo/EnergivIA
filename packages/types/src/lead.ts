import type { TenantId } from "./tenant";

export type LeadId = string;

export interface LeadBase {
  tenantId: TenantId;
  name: string;
  whatsapp: string;
  cpfCnpj?: string | null;
  email?: string | null;
  company?: string | null;
  source?: string | null;
}

export interface Lead extends LeadBase {
  id: LeadId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
