import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals, post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import type { CreatePurchaseBillDto } from "./dto";

/**
 * Purchase-to-pay workflow, Section 5.3, steps 1-4: duplicate supplier-
 * invoice check, purchase bill + payable + stock receipt + accounting
 * entry created together. Steps 5-8 (payables view, payment allocation,
 * supplier statement, returns) are separate concerns — payment allocation
 * lives in supplier-payments.service.ts.
 */
@Injectable()
export class PurchaseBillsService {
  list(companyId: string) {
    return prisma.purchaseBill.findMany({ where: { companyId }, orderBy: { billDate: "desc" } });
  }

  async create(companyId: string, dto: CreatePurchaseBillDto, createdBy: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: dto.supplierId, companyId } });
    if (!supplier) throw new NotFoundException("Supplier not found in this company.");

    // Section 5.3 step 2: "duplicate supplier invoice is checked."
    if (dto.supplierRef) {
      const existing = await prisma.purchaseBill.findFirst({
        where: { companyId, supplierId: dto.supplierId, supplierRef: dto.supplierRef },
      });
      if (existing) {
        throw new NotFoundException(
          `Supplier reference "${dto.supplierRef}" was already billed for this supplier (${existing.id}).`,
        );
      }
    }

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitCost, taxRatePct: l.taxRatePct })),
    );

    const journalLines = post("CREDIT_PURCHASE_STOCK", { netAmount: totals.subtotal, taxAmount: totals.taxTotal });
    const accountMap = await resolveAccountRoles(companyId, journalLines.map((l) => l.accountRole));

    return prisma.$transaction(async (tx: any) => {
      const bill = await tx.purchaseBill.create({
        data: {
          companyId,
          supplierId: dto.supplierId,
          supplierRef: dto.supplierRef,
          status: "POSTED",
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          postedAt: new Date(),
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitCost: l.unitCost,
              taxRate: l.taxRatePct,
              lineTotal: l.quantity * l.unitCost * (1 + l.taxRatePct / 100),
            })),
          },
        },
        include: { lines: true },
      });

      // Stock receipt per line (Section 5.3 step 3).
      for (const line of dto.lines) {
        await tx.stockMovement.create({
          data: {
            warehouseId: dto.warehouseId,
            productId: line.productId,
            quantity: line.quantity,
            reason: "PURCHASE_RECEIPT",
            reference: bill.id,
            createdBy,
          },
        });
      }

      // Accounting entry, resolved to real Account.id rows (see
      // apps/api/src/common/account-role-resolver.ts).
      await tx.journalEntry.create({
        data: {
          companyId,
          sourceType: "purchase_bill",
          sourceId: bill.id,
          createdBy,
          lines: { create: jo