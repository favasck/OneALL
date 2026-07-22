import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { resolveAccountRoles } from "../common/account-role-resolver";
import { round2 } from "../common/stock-valuation";
import type { AdjustStockDto } from "./dto";

/**
 * Inventory adjustment workflow, Section 5.4:
 *  1. storekeeper selects warehouse + item
 *  2. system shows book quantity and latest movements
 *  3. user enters counted/adjustment quantity + mandatory reason
 *  4. MVP uses role restriction rather than an approval step (approvedBy
 *     is left null here; the approval threshold is a later increment
 *     per the plan)
 *  5. posting creates a stock movement AND, when the product already has a
 *     known moving-average cost, an accounting entry for the value impact
 *     (Section 5.4 step 5's previously-deferred "accounting variance
 *     entry" — now possible because StockBalance carries a real
 *     valuationRate). A found surplus credits General Expenses (offsetting
 *     cost as a recovery); a shortfall debits it (write-off) — a company
 *     that wants a dedicated "Inventory Shrinkage" ledger can add one and
 *     repoint the EXPENSE role at it.
 *  6. audit log retains before/after quantity, user, time and reason —
 *     satisfied by the StockMovement row itself plus the recompute below
 */
@Injectable()
export class InventoryService {
  async bookQuantity(warehouseId: string, productId: string) {
    const balance = await prisma.stockBalance.findUnique({
      where: { warehouseId_productId: { warehouseId, productId } },
    });
    return balance?.quantity ?? 0;
  }

  async recentMovements(warehouseId: string, productId: string) {
    return prisma.stockMovement.findMany({
      where: { warehouseId, productId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async adjust(companyId: string, dto: AdjustStockDto, createdBy: string) {
    if (!dto.reason?.trim()) {
      throw new BadRequestException("Adjustment reason is mandatory (Section 5.4 step 3).");
    }

    const existing = await prisma.stockBalance.findUnique({
      where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
    });
    const bookQuantity = existing ? Number(existing.quantity) : 0;
    const rate = existing ? Number(existing.valuationRate) : 0;
    const delta = dto.countedQuantity - bookQuantity;

    if (delta === 0) {
      throw new BadRequestException("Counted quantity matches book quantity — nothing to adjust.");
    }

    const valueDelta = round2(delta * rate);
    // Resolved before the transaction (same pattern as invoices/purchase-bills
    // services) so a missing account fails fast rather than mid-transaction.
    const accountMap = valueDelta !== 0 ? await resolveAccountRoles(companyId, ["INVENTORY", "EXPENSE"]) : null;

    return prisma.$transaction(async (tx: any) => {
      const movement = await tx.stockMovement.create({
        data: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          quantity: delta,
          valuationRate: rate,
          reason: "ADJUSTMENT",
          reference: dto.reason, // audit trail: before/after is bookQuantity vs. bookQuantity+delta, reason is free text
          createdBy,
        },
      });

      await tx.stockBalance.upsert({
        where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
        update: { quantity: dto.countedQuantity },
        create: { warehouseId: dto.warehouseId, productId: dto.productId, quantity: dto.countedQuantity, valuationRate: 0 },
      });

      if (accountMap) {
        const amount = Math.abs(valueDelta);
        const lines = valueDelta > 0
          ? [{ accountId: accountMap.INVENTORY, debit: amount, credit: 0 }, { accountId: accountMap.EXPENSE, debit: 0, credit: amount }]
          : [{ accountId: accountMap.EXPENSE, debit: amount, credit: 0 }, { accountId: accountMap.INVENTORY, debit: 0, credit: amount }];
        await tx.journalEntry.create({
          data: { companyId, sourceType: "stock_adjustment", sourceId: movement.id, createdBy, lines: { create: lines } },
        });
      }

      return { movement, before: bookQuantity, after: dto.countedQuantity, delta, valueDelta };
    });
  }
}
