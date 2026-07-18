import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./auth/auth.module";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { PermissionGuard } from "./common/permission.guard";
import { TenantsModule } from "./tenants/tenants.module";
import { CustomersModule } from "./customers/customers.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { ProductsModule } from "./products/products.module";
import { InvoicesModule } from "./invoices/invoices.module";
import { PurchaseBillsModule } from "./purchase-bills/purchase-bills.module";
import { ReceiptsModule } from "./receipts/receipts.module";
import { SupplierPaymentsModule } from "./supplier-payments/supplier-payments.module";
import { InventoryModule } from "./inventory/inventory.module";
import { AccountingModule } from "./accounting/accounting.module";
import { ReportsModule } from "./reports/reports.module";

@Module({
  imports: [
    AuthModule,
    TenantsModule,
    CustomersModule,
    SuppliersModule,
    ProductsModule,
    InvoicesModule,
    PurchaseBillsModule,
    ReceiptsModule,
    SupplierPaymentsModule,
    InventoryModule,
    AccountingModule,
    ReportsModule,
  ],
  providers: [
    // Order matters: SessionAuthGuard resolves the caller and builds
    // request.permissionContext; PermissionGuard then checks it against
    // each route's @RequirePermission. Both respect @Public().
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
