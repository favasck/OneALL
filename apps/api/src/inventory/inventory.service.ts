import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import type { AdjustStockDto } from "./dto";

/**
 * Inventory adjustment workflow, Section 5.4:
 *  1. storekeeper selects warehouse + item
 *  2. system shows book quantity and latest movements
 *  3. user enters counted/adjustment quantity + mandatory reason
 *  4. MVP uses role restriction rather than an approval step (approvedBy
 *     is left null here; the approval threshold is a later increment
 *     per the plan)
 *  5. posting creates a stock movement (and an accounting variance entry
 *     where applicable — not implemented in this scaffold, since it needs
 *     a configured "inventory variance" account first)
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

  async adjust(dto: AdjustStockDto, createdBy: string) {
    if (!dto.reason?.trim()) {
      throw new BadRequestException("Adjustment reason is mandatory (Section 5.4 step 3).");
    }

    const bookQuantity = await this.bookQuantity(dto.warehouseId, dto.productId);
    const delta = dto.countedQuantity - Number(bookQuantity);

    if (delta === 0) {
      throw new BadRequestException("Counted quantity matches book quantity — nothing to adjust.");
    }

    return prisma.$transaction(async (tx: any) => {
      const movement = await tx.stockMovement.create({
        data: {
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          quantity: delta,
          reason: "ADJUSTMENT",
          reference: dto.reason, // audit trail: before/after is bookQuantity vs. bookQuantity+delta, reason is free text
          createdBy,
        },
      });

      await tx.stockBalance.upsert({
        where: { warehouseId_productId: { warehouseId: dto.warehouseId, productId: dto.productId } },
        update: { quantity: dto.countedQuantity },
        create: { warehouseId: dto.warehouseId, productId: dto.productId, quantity: dto.countedQuantity },
      });

      return { movement, before: bookQuantity, after: dto.countedQuantity, delta };
    });
  }
}
