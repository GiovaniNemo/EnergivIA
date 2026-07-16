-- CreateEnum
CREATE TYPE "PercentageBase" AS ENUM ('SALE_PRICE', 'PROJECT_COST', 'PROFIT');

-- AlterTable
ALTER TABLE "company_cost_rules" ADD COLUMN "percentage_base" "PercentageBase";
