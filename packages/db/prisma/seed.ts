import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ALL_PERMISSIONS: Array<{ module: string; action: string }> = [
  "sales", "purchases", "inventory", "accounting", "reports", "settings", "admin",
].flatMap((module) => ["view", "create", "edit", "approve", "void", "export", "share"].map((action) => ({ module, action })));

// Every step in this script is a find-or-create / upsert, not a bare
// .create() — so it is safe to run this any number of times, from any
// partial prior state, without throwing on unique-constraint violations or
// duplicating rows. There is no longer a coarse "is the owner user already
// created" early-exit: every step below is cheap and idempotent on its own,
// so there is nothing gained by skipping the whole script, and doing so
// would have skipped the account-hierarchy repair (see ensureAccountTree)
// on every run after the very first one.
//
// Sequential (for-of + await), not Promise.all: against a pooled Postgres
// connection with a small connection limit, firing many concurrent queries
// exhausts the pool and times out (P2024).
async function main() {
  let tenant = await prisma.tenant.findFirst({ where: { name: "Al Waha Trading Co." } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: "Al Waha Trading Co.", route: "NATIVE" } });
  }

  let company = await prisma.company.findFirst({ where: { tenantId: tenant.id } });
  if (!company) {
    company = await prisma.company.create({
      data: { tenantId: tenant.id, name: "Al Waha Trading Co.", baseCurrency: "QAR", crNumber: "CR-000000" },
    });
  }

  let branch = await prisma.branch.findFirst({ where: { companyId: company.id } });
  if (!branch) {
    branch = await prisma.branch.create({ data: { companyId: company.id, name: "Doha", isDefault: true } });
  }

  let warehouse = await prisma.warehouse.findFirst({ where: { branchId: branch.id } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({ data: { branchId: branch.id, name: "Doha Main Warehouse" } });
  }

  const customerSeeds = [
    { name: "Doha Steel Traders", creditLimit: 30000, creditDays: 30 },
    { name: "Rayyan Auto Parts", creditLimit: 15000, creditDays: 30 },
    { name: "Corniche Pharmacy", creditLimit: 10000, creditDays: 15 },
    { name: "Al Sadd Restaurant Supplies", creditLimit: 8000, creditDays: 15 },
    { name: "West Bay Facilities Mgmt", creditLimit: 20000, creditDays: 30 },
  ];
  const customers = [];
  for (const c of customerSeeds) {
    let customer = await prisma.customer.findFirst({ where: { companyId: company.id, name: c.name } });
    if (!customer) customer = await prisma.customer.create({ data: { companyId: company.id, ...c } });
    customers.push(customer);
  }

  let supplier = await prisma.supplier.findFirst({ where: { companyId: company.id, name: "Gulf Building Supplies WLL" } });
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: { companyId: company.id, name: "Gulf Building Supplies WLL", paymentTerms: "Net 30" },
    });
  }

  // purchaseCost is now the seed for each product's opening moving-average
  // valuationRate — see StockBalance.valuationRate below.
  const productSeeds = [
    { sku: "CEM-50", name: "Cement 50kg", category: "Building materials", unit: "BAG", purchaseCost: 12, sellingPrice: 18, reorderLevel: 50, stock: 18 },
    { sku: "PVC-4", name: "PVC Pipe 4in", category: "Plumbing", unit: "EA", purchaseCost: 30, sellingPrice: 45, reorderLevel: 20, stock: 6 },
    { sku: "ROD-12", name: "Steel Rod 12mm", category: "Building materials", unit: "EA", purchaseCost: 32, sellingPrice: 45, reorderLevel: 40, stock: 32 },
    { sku: "PNT-W20", name: "Paint — White 20L", category: "Finishing", unit: "DRUM", purchaseCost: 150, sellingPrice: 220, reorderLevel: 30, stock: 140 },
    { sku: "GLV-PR", name: "Safety Gloves (pair)", category: "Consumables", unit: "PAIR", purchaseCost: 3, sellingPrice: 6, reorderLevel: 100, stock: 310 },
  ];
  const products = [];
  for (const { stock, ...p } of productSeeds) {
    const product = await prisma.product.upsert({
      where: { companyId_sku: { companyId: company.id, sku: p.sku } },
      update: {},
      create: { companyId: company.id, kind: "STOCK", ...p },
    });
    products.push(product);
    await prisma.stockBalance.upsert({
      where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
      update: {},
      create: { warehouseId: warehouse.id, productId: product.id, quantity: stock, valuationRate: p.purchaseCost },
    });
  }
  const productBySku = Object.fromEntries(products.map((p) => [p.sku, p]));

  // -------------------------------------------------------------------
  // Chart of accounts — a tree of group (rollup) and leaf (postable)
  // accounts. Leaf codes below (1100, 1200, 1300, 1400, 2100, 2200, 4000,
  // 5000, 5100) are UNCHANGED from the original flat chart of accounts
  // that shipped before this revision, specifically so any JournalLine
  // already posted against them in production stays valid — this step
  // only adds group parents above them and a few new leaf accounts
  // (3100, 3200, 5300), it never renumbers or deletes an existing account.
  // -------------------------------------------------------------------
  type AccountNode = {
    code: string;
    name: string;
    type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
    isGroup: boolean;
    parentCode: string | null;
    role?: string;
  };

  const accountTree: AccountNode[] = [
    { code: "1-ASSETS", name: "Assets", type: "ASSET", isGroup: true, parentCode: null },
    { code: "1-CURRENT", name: "Current Assets", type: "ASSET", isGroup: true, parentCode: "1-ASSETS" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", isGroup: false, parentCode: "1-CURRENT", role: "ACCOUNTS_RECEIVABLE" },
    { code: "1200", name: "Inventory", type: "ASSET", isGroup: false, parentCode: "1-CURRENT", role: "INVENTORY" },
    { code: "1300", name: "Cash and Bank", type: "ASSET", isGroup: false, parentCode: "1-CURRENT", role: "CASH_OR_BANK" },
    { code: "1400", name: "Input Tax Receivable", type: "ASSET", isGroup: false, parentCode: "1-CURRENT", role: "INPUT_TAX" },

    { code: "2-LIAB", name: "Liabilities", type: "LIABILITY", isGroup: true, parentCode: null },
    { code: "2-CURRENT", name: "Current Liabilities", type: "LIABILITY", isGroup: true, parentCode: "2-LIAB" },
    { code: "2100", name: "Accounts Payable", type: "LIABILITY", isGroup: false, parentCode: "2-CURRENT", role: "ACCOUNTS_PAYABLE" },
    { code: "2200", name: "Output Tax Payable", type: "LIABILITY", isGroup: false, parentCode: "2-CURRENT", role: "OUTPUT_TAX" },

    { code: "3-EQUITY", name: "Equity", type: "EQUITY", isGroup: true, parentCode: null },
    { code: "3100", name: "Owner's Capital", type: "EQUITY", isGroup: false, parentCode: "3-EQUITY" },
    { code: "3200", name: "Retained Earnings", type: "EQUITY", isGroup: false, parentCode: "3-EQUITY" },

    { code: "4-INCOME", name: "Income", type: "INCOME", isGroup: true, parentCode: null },
    { code: "4000", name: "Sales Revenue", type: "INCOME", isGroup: false, parentCode: "4-INCOME", role: "SALES_REVENUE" },

    { code: "5-EXPENSE", name: "Expenses", type: "EXPENSE", isGroup: true, parentCode: null },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", isGroup: false, parentCode: "5-EXPENSE", role: "COST_OF_GOODS_SOLD" },
    { code: "5-OPEX", name: "Operating Expenses", type: "EXPENSE", isGroup: true, parentCode: "5-EXPENSE" },
    { code: "5100", name: "General Expenses", type: "EXPENSE", isGroup: false, parentCode: "5-OPEX", role: "EXPENSE" },
    { code: "5300", name: "Freight and Customs", type: "EXPENSE", isGroup: false, parentCode: "5-OPEX" },
  ];

  const codeToAccountId: Record<string, string> = {};
  for (const node of accountTree) {
    const parentAccountId = node.parentCode ? codeToAccountId[node.parentCode] : null;
    const account = await prisma.account.upsert({
      where: { companyId_code: { companyId: company.id, code: node.code } },
      update: { name: node.name, type: node.type, isGroup: node.isGroup, parentAccountId, role: node.role ?? null },
      create: {
        companyId: company.id, code: node.code, name: node.name, type: node.type,
        isGroup: node.isGroup, parentAccountId, role: node.role ?? null,
      },
    });
    codeToAccountId[node.code] = account.id;
  }

  const ownerRole = await prisma.role.upsert({
    where: { name: "Owner" },
    update: {},
    create: { name: "Owner", description: "Full access, Section 3.2" },
  });

  for (const { module, action } of ALL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { module_action: { module, action } },
      update: {},
      create: { module, action },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: ownerRole.id, permissionId: permission.id },
    });
  }

  const ownerPasswordHash = await bcrypt.hash("ChangeMe123!", 12);
  const owner = await prisma.user.upsert({
    where: { email: "owner@alwaha-trading.qa" },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "owner@alwaha-trading.qa",
      fullName: "Ahmed Al-Kubaisi",
      passwordHash: ownerPasswordHash,
      status: "ACTIVE",
    },
  });

  const existingAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: owner.id, roleId: ownerRole.id, companyId: company.id },
  });
  if (!existingAssignment) {
    await prisma.userRoleAssignment.create({
      data: { userId: owner.id, roleId: ownerRole.id, companyId: company.id },
    });
  }

  // -------------------------------------------------------------------
  // Order-workflow demo data — deliberately left mid-flight (CONFIRMED /
  // DRAFT, not yet posted or invoiced) so the new Sales Order, Purchase
  // Order, Delivery, Goods Receipt, and Landed Cost pages have something
  // real to load and act on the first time someone opens them.
  // -------------------------------------------------------------------
  let salesOrder = await prisma.salesOrder.findFirst({ where: { companyId: company.id, number: "SO-2026-0001" } });
  if (!salesOrder) {
    const customer = customers[0];
    const product = productBySku["ROD-12"];
    salesOrder = await prisma.salesOrder.create({
      data: {
        companyId: company.id, customerId: customer.id, number: "SO-2026-0001", status: "CONFIRMED",
        subtotal: 900, taxTotal: 45, grandTotal: 945, createdBy: owner.id,
        lines: { create: [{ productId: product.id, quantity: 20, unitPrice: 45, taxRate: 5 }] },
      },
    });
  }

  let deliveryNote = await prisma.deliveryNote.findFirst({ where: { companyId: company.id, number: "DN-2026-0001" } });
  if (!deliveryNote) {
    const soLine = await prisma.salesOrderLine.findFirst({ where: { salesOrderId: salesOrder.id } });
    if (soLine) {
      deliveryNote = await prisma.deliveryNote.create({
        data: {
          companyId: company.id, customerId: salesOrder.customerId, salesOrderId: salesOrder.id,
          warehouseId: warehouse.id, number: "DN-2026-0001", status: "DRAFT", createdBy: owner.id,
          lines: { create: [{ productId: soLine.productId, quantity: 20, salesOrderLineId: soLine.id }] },
        },
      });
    }
  }

  let purchaseOrder = await prisma.purchaseOrder.findFirst({ where: { companyId: company.id, number: "PO-2026-0001" } });
  if (!purchaseOrder) {
    const product = productBySku["PVC-4"];
    purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        companyId: company.id, supplierId: supplier.id, number: "PO-2026-0001", status: "CONFIRMED",
        subtotal: 1500, taxTotal: 75, grandTotal: 1575, createdBy: owner.id,
        lines: { create: [{ productId: product.id, quantity: 50, unitCost: 30, taxRate: 5 }] },
      },
    });
  }

  let purchaseReceipt = await prisma.purchaseReceipt.findFirst({ where: { companyId: company.id, number: "GRN-2026-0001" } });
  if (!purchaseReceipt) {
    const poLine = await prisma.purchaseOrderLine.findFirst({ where: { purchaseOrderId: purchaseOrder.id } });
    if (poLine) {
      purchaseReceipt = await prisma.purchaseReceipt.create({
        data: {
          companyId: company.id, supplierId: purchaseOrder.supplierId, purchaseOrderId: purchaseOrder.id,
          warehouseId: warehouse.id, number: "GRN-2026-0001", status: "DRAFT", createdBy: owner.id,
          lines: { create: [{ productId: poLine.productId, quantity: 50, unitCost: 30, purchaseOrderLineId: poLine.id }] },
        },
      });
    }
  }

  let landedCostVoucher = await prisma.landedCostVoucher.findFirst({ where: { companyId: company.id, purchaseReceiptId: purchaseReceipt?.id } });
  if (!landedCostVoucher && purchaseReceipt) {
    landedCostVoucher = await prisma.landedCostVoucher.create({
      data: {
        companyId: company.id, purchaseReceiptId: purchaseReceipt.id, totalAmount: 100, createdBy: owner.id,
        chargeLines: { create: [{ description: "Inbound freight — Jebel Ali to Doha", amount: 100, accountId: codeToAccountId["5300"] }] },
      },
    });
  }

  const bankLineSeeds = [
    { description: "Bank charges — monthly account fee", amount: -25, daysAgo: 3 },
    { description: "Incoming transfer — unidentified customer", amount: 5000, daysAgo: 1 },
  ];
  for (const b of bankLineSeeds) {
    const existing = await prisma.bankStatementLine.findFirst({
      where: { companyId: company.id, accountId: codeToAccountId["1300"], description: b.description },
    });
    if (!existing) {
      await prisma.bankStatementLine.create({
        data: {
          companyId: company.id, accountId: codeToAccountId["1300"],
          lineDate: new Date(Date.now() - b.daysAgo * 86400000),
          description: b.description, amount: b.amount, reconciled: false,
        },
      });
    }
  }

  console.log(`Seeded tenant "${tenant.name}" — company ${company.id}, ${customers.length} customers, ${products.length} products, ${accountTree.length} accounts (tree).`);
  console.log(`Demo order-workflow records: SO-2026-0001 / DN-2026-0001 (sales), PO-2026-0001 / GRN-2026-0001 + landed cost voucher (purchases), 2 unreconciled bank lines.`);
  console.log(`Login: owner@alwaha-trading.qa / ChangeMe123! (change this before using anywhere but local dev).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
