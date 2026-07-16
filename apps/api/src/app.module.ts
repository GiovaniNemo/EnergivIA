import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { UnifiedAuthGuard } from "./common/guards/unified-auth.guard";
import { AuthModule } from "./modules/auth/auth.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { DealsModule } from "./modules/deals/deals.module";
import { EnergyBillsModule } from "./modules/energy-bills/energy-bills.module";
import { SizingEngineModule } from "./modules/sizing-engine/sizing-engine.module";
import { ProposalsModule } from "./modules/proposals/proposals.module";
import { FinancialSimulationModule } from "./modules/financial-simulation/financial-simulation.module";
import { FinancingModule } from "./modules/financing/financing.module";
import { KitModule } from "./modules/kit/kit.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { ProductsModule } from "./modules/products/products.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { SuppliersModule } from "./modules/suppliers/suppliers.module";
import { DistributorsModule } from "./modules/distributors/distributors.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { SolarModule } from "./modules/solar/solar.module";
import { GeoModule } from "./modules/geo/geo.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { ProposalTemplateBlueprintsModule } from "./modules/proposal-template-blueprints/proposal-template-blueprints.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health.controller";
import { CostRulesModule } from "./modules/cost-rules/cost-rules.module";
import { StockModule } from "./modules/stock/stock.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { ChatbaseModule } from "./modules/chatbase/chatbase.module";

@Module({
  controllers: [HealthController],
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", ".env.local"] }),
    ThrottlerModule.forRoot([
      { name: "short", ttl: 10_000, limit: 30 },
      { name: "medium", ttl: 60_000, limit: 120 },
      { name: "long", ttl: 3_600_000, limit: 1000 },
    ]),
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    TenantsModule,
    UsersModule,
    LeadsModule,
    DealsModule,
    EnergyBillsModule,
    SizingEngineModule,
    ProposalsModule,
    FinancialSimulationModule,
    FinancingModule,
    KitModule,
    BrandsModule,
    ProductsModule,
    CategoriesModule,
    SuppliersModule,
    DistributorsModule,
    UploadsModule,
    SolarModule,
    ProposalTemplateBlueprintsModule,
    AssetsModule,
    GeoModule,
    CostRulesModule,
    StockModule,
    NotificationsModule,
    ChatbaseModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: UnifiedAuthGuard },
  ],
})
export class AppModule {}
