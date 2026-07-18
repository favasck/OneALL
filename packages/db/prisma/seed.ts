import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

// Same fictional company used throughout the toolkit — the clickable
// prototype (OneAll_Clickable_Prototype.html) and this seed describe the
// same "Al Waha Trading Co." so a reviewer sees one consistent story
// across the prototype, the API and the database, not three unrelated
// demos.
const prisma = new PrismaClient();

// Every module/action combination the API's @RequirePermission decorators
// actually use (grep the controllers if this list needs to grow). Owner
// gets all of them — Section 3.2: "Owner ... Business Pulse, alerts,
// company switching, consolidated summaries."
const ALL_PERMISSIONS: Array<{ module: string; action: string }> = [
  "sales", "purchases", "inventory", "accounting", "reports", "settings", "admin",
].flatMap((module) => ["view", "create", "edit", "approve", "void", "export", "share"].map((action) => ({ module, action })));

async function main() {
  const tenant = await prisma.tenant.create({
    data: { name: "Al Waha Trading Co.", route: "NATIVE" },
  });

  const company = await prisma.company.create({
    data: {
      tenantId: tenant.id,
      name: "Al Waha Trading Co.",
      baseCurrency: "QAR",
      crNumber: "CR-000000",
    },
  });

  const branch = await prisma.branch.create({
    data: { companyId: company.id, name: "Doha", isDefault: true },
  });

  const warehouse = await prisma.warehouse.create({
    data: { branchId: branch.id, name: "Doha Main Warehouse" },
  });

  const customers = await Promise.all(
    [
      { name: "Doha Steel Traders", creditLimit: 30000, creditDays: 30 },
      { name: "Rayyan Auto Parts", creditLimit: 15000, creditDays: 30 },
      { name: "Corniche Pharmacy", creditLimit: 10000, creditDays: 15 },
      { name: "Al Sadd Restaurant Supplies", creditLimit: 8000, creditDays: 15 },
      { name: "West Bay Facilities Mgmt", creditLimit: 20000, creditDays: 30 },
    ].map((c) => prisma.customer.create({ data: { companyId: company.id, ...c } })),
  );

  const products = await Promise.all(
    [
      { sku: "CEM-50", name: "Cement 50kg", category: "Building materials", unit: "BAG", sellingPrice: 18, reorderLevel: 50 },
      { sku: "PVC-4", name: "PVC Pipe 4in", category: "Plumbing", unit: "EA", sellingPrice: 45, reorderLevel: 20 },
      { sku: "ROD-12", name: "Steel Rod 12mm", category: "Building materials", unit: "EA", sellingPrice: 45, reorderLevel: 40 },
      { sku: "PNT-W20", name: "Paint — White 20L", category: "Finishing", unit: "DRUM", sellingPrice: 220, reorderLevel: 30 },
      { sku: "GLV-PR", name: "Safety Gloves (pair)", category: "Consumables", unit: "PAIR", sellingPrice: 6, reorderLevel: 100 },
    ].map((p) => prisma.product.create({ data: { companyId: company.id, kind: "STOCK", ...p } })),
  );

  // Opening stock so the dashboard's "low stock" view has something to show.
  await Promise.all(
    products.map((p, i) =>
      prisma.stockBalance.create({
        data: { warehouseId: warehouse.id, productId: p.id, quantity: [18, 6, 32, 140, 310][i] },
      }),
    ),
  );

  // Chart of accounts — minimal set matching the AccountRole values the
  // posting-rule engine (@oneall/shared) emits. Each account's `role` field
  // is what apps/api/src/common/account-role-resolver.ts looks up at
  // posting time, so this isn't just illustrative — it's the real mapping
  // invoices/purchase-bills/receipts/supplier-payments post against.
  await Promise.all(
    [
      { code: "1100", name: "Accounts Receivable", type: "ASSET" as const, role: "ACCOUNTS_RECEIVABLE" },
      { code: "1200", name: "Inventory", type: "ASSET" as const, role: "INVENTORY" },
      { code: "1300", name: "Cash and Bank", type: "ASSET" as const, role: "CASH_OR_BANK" },
      { code: "2100", name: "Accounts Payable", type: "LIABILITY" as const, role: "ACCOUNTS_PAYABLE" },
      { code: "2200", name: "Output Tax Payable", type: "LIABILITY" as const, role: "OUTPUT_TAX" },
      { code: "1400", name: "Input Tax Receivable", type: "ASSET" as const, role: "INPUT_TAX" },
      { code: "4000", name: "Sales Revenue", type: "INCOME" as const, role: "SALES_REVENUE" },
      { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" as const, role: "COST_OF_GOODS_SOLD" },
      { code: "5100", name: "General Expenses", type: "EXPENSE" as const, role: "EXPENSE" },
    ].map((a) => prisma.account.create({ data: { companyId: company.id, ...a } })),
  );

  // Role + permissions + an Owner user who can actually log in — Section
  // 5.8 "System records acceptance and applies effective permissions."
  const ownerRole = await prisma.role.create({ data: { name: "Owner", description: "Full access, Section 3.2" } });
  await Promise.all(
    ALL_PERMISSIONS.map(async ({ module, action }) => {
      const permission = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action },
      });
      await prisma.rolePermission.create({ data: { roleId: ownerRole.id, permissionId: permission.id } });
    }),
  );

  const ownerPasswordHash = await bcrypt.hash("ChangeMe123!", 12);
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "owner@alwaha-trading.qa",
      fullName: "Ahmed Al-Kubaisi",
      passwordHash: ownerPasswordHash,
      status: "ACTIVE",
    },
  });
  await prisma.userRoleAssignment.create({
    data: { userId: owner.id, roleId: ownerRole.id, companyId: company.id },
  });

  console.log(`Seeded tenant "${tenant.nam