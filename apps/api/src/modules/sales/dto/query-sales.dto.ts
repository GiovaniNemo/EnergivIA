import { SaleStatus } from "@prisma/client";

export class QuerySalesDto {
  search?: string;
  status?: SaleStatus;
  page?: number;
  limit?: number;
}
