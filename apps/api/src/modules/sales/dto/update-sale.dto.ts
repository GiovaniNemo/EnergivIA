import { CustomerType, SaleStatus } from "@prisma/client";

export class UpdateSaleDto {
  customerType?: CustomerType;
  documentNumber?: string;
  rgNumber?: string;
  rgIssuer?: string;
  birthDate?: string | Date;
  maritalStatus?: string;
  profession?: string;
  legalRepresentativeName?: string;
  legalRepresentativeCpf?: string;

  installationAddress?: string;
  installationCity?: string;
  installationState?: string;
  installationZip?: string;
  distributionCompany?: string;
  consumerUnitNumber?: string;

  paymentMethod?: string;
  notes?: string;
  status?: SaleStatus;
}
