import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals, post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import { receiveStock } from "../common/stock-valuation";
import type { CreatePurchaseBillDto } from "./dto";

@Injectable()
export class PurchaseBillsService {
  list(companyId: string) { return prisma.purchaseBill.findMany({ where: { companyId }, orderBy: { billDate: "desc" } }); }

  async create(companyId: string, dto: CreatePurchaseBillDto, createdBy: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: dto.supplierId, companyId } });
    if (!supplier) throw new NotFoundException("Supplier not found in this company.");

    if (dto.supplierRef) {
      const existing = await prisma.purchaseBill.findFirst({
        where: { companyId, supplierId: dto.supplierId, supplierRef: dto.supplierRef },
      });
      if (existing) {
        throw new NotFoundException(`Supplier reference "${dto.supplierRef}" was already billed for this supplier (${existing.id}).`);
      }
    }

    const directLines = dto.lines.filter((l) => !l.purchaseReceiptLineId);
    if (directLines.length > 0 && !dto.warehouseId) {
      throw new BadRequestException("warehouseId is required when any line is a direct bill (not linked to a posted purchase receipt).");
    }

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitCost, taxRatePct: l.taxRatePct })),
    );

    const journalLines = post("CREDIT_PURCHASE_STOCK", { netAmount: totals.subtotal, taxAmount: totals.taxTotal });
    const accountMap = await resolveAccountRoles(companyId, journalLines.map((l) => l.accountRole));

    return prisma.$transaction(async (tx: any) => {
      const bill = await tx.purchaseBill.create({
        data: {
          companyId, supplierId: dto.supplierId, supplierRef: dto.supplierRef, status: "POSTED",
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          subtotal: totals.subtotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal, postedAt: new Date(),
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, taxRate: l.taxRatePct,
              lineTotal: l.quantity * l.unitCost * (1 + l.taxRatePct / 100),
              purchaseReceiptLineId: l.purchaseReceiptLineId,
            })),
          },
        },
        include: { lines: true },
      });

      for (const line of dto.lines) {
        if (line.purchaseReceiptLineId) {
          // Stock already arrived (and StockBalance.valuationRate already
          // moved) when the purchase receipt was posted — see
          // PurchaseReceiptsService. Billing it doesn't move stock again,
          // it only records the payable below.
          const rcptLine = await tx.purchaseReceiptLine.findUnique({ where: { id: line.purchaseReceiptLineId } });
          if (!rcptLine) throw new NotFoundException(`Purchase receipt line ${line.purchaseReceiptLineId} not found.`);
          const remaining = Number(rcptLine.quantity) - Number(rcptLine.billedQty);
          if (line.quantity > remaining) {
            throw new BadRequestException(`Purchase receipt line ${line.purchaseReceiptLineId} only has ${remaining} unit(s) left to bill.`);
          }
          await tx.purchaseReceiptLine.update({ where: { id: line.purchaseReceiptLineId }, data: { billedQty: { increment: line.quantity } } });
          continue;
        }
        const newRate = await receiveStock(tx, dto.warehouseId!, line.productId, line.quantity, line.unitCost);
        await tx.stockMovement.create({
          data: {
            warehouseId: dto.warehouseId, productId: line.productId, quantity: line.quantity,
            valuationRate: newRate, reason: "PURCHASE_RECEIPT", reference: bill.id, createdBy,
          },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId, sourceType: "purchase_bill", sourceId: bill.id, createdBy,
          lines: { create: journalLines.map((l) => ({ accountId: accountMap[l.accountRole], debit: l.debit, credit: l.credit })) },
        },
      });

      return bill;
    });
  }
}
