import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { resolveAccountRoles } from "../common/account-role-resolver";
import { round2 } from "../common/stock-valuation";
import type { CreateLandedCostVoucherDto } from "./dto";

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}

// Allocates freight/customs/other landed charges across a purchase
// receipt's lines, proportional to each line's received value (quantity x
// unitCost) — the standard "value basis" allocation. Capitalizes the
// charge into PurchaseReceiptLine.unitCost (the historical received cost,
// for reporting) and into the CURRENT on-hand StockBalance.valuationRate
// for that product/warehouse.
//
// Known simplification: if some of the receipt's stock was already sold
// before the voucher is applied, the added cost is spread only across
// whatever quantity is still on hand — it doesn't retroactively restate
// the COGS already posted for units sold before this voucher was applied.
// Applying landed cost promptly (freight/customs bills usually arrive
// within days of the goods) keeps this gap small in practice.
@Injectable()
export class LandedCostService {
  list(companyId: string) {
    return prisma.landedCostVoucher.findMany({
      where: { companyId }, orderBy: { createdAt: "desc" }, include: { chargeLines: true, purchaseReceipt: true },
    });
  }

  async create(companyId: string, dto: CreateLandedCostVoucherDto, createdBy: string) {
    const receipt = await prisma.purchaseReceipt.findFirst({ where: { id: dto.purchaseReceiptId, companyId } });
    if (!receipt) throw new NotFoundException("Purchase receipt not found in this company.");

    const totalAmount = round2(dto.chargeLines.reduce((s, c) => s + c.amount, 0));
    return prisma.landedCostVoucher.create({
      data: {
        companyId, purchaseReceiptId: dto.purchaseReceiptId, totalAmount, createdBy,
        chargeLines: { create: dto.chargeLines.map((c) => ({ description: c.description, amount: c.amount, accountId: c.accountId })) },
      },
      include: { chargeLines: true },
    });
  }

  async apply(companyId: string, id: string, createdBy: string) {
    const voucher = await prisma.landedCostVoucher.findFirst({
      where: { id, companyId },
      include: { chargeLines: true, purchaseReceipt: { include: { lines: true } } },
    });
    if (!voucher) throw new NotFoundException("Landed cost voucher not found in this company.");
    if (voucher.appliedAt) throw new BadRequestException("This landed cost voucher has already been applied.");
    if (voucher.purchaseReceipt.status !== "POSTED") {
      throw new BadRequestException("The purchase receipt must be posted before landed cost can be applied to it.");
    }

    const lines = voucher.purchaseReceipt.lines;
    const totalReceivedValue = lines.reduce((s, l) => s + Number(l.quantity) * Number(l.unitCost), 0);
    if (totalReceivedValue <= 0) {
      throw new BadRequestException("Cannot allocate landed cost: the receipt has no received value to allocate against.");
    }

    const accountMap = await resolveAccountRoles(companyId, ["INVENTORY", "EXPENSE"]);
    const warehouseId = voucher.purchaseReceipt.warehouseId;

    return prisma.$transaction(async (tx: any) => {
      for (const line of lines) {
        const lineValue = Number(line.quantity) * Number(line.unitCost);
        const share = lineValue / totalReceivedValue;
        const addedCost = round2(Number(voucher.totalAmount) * share);
        const addedCostPerUnit = Number(line.quantity) > 0 ? addedCost / Number(line.quantity) : 0;
        const newUnitCost = round4(Number(line.unitCost) + addedCostPerUnit);
        await tx.purchaseReceiptLine.update({ where: { id: line.id }, data: { unitCost: newUnitCost } });

        const balance = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId, productId: line.productId } } });
        const onHand = balance ? Number(balance.quantity) : 0;
        if (balance && onHand > 0) {
          const newValue = onHand * Number(balance.valuationRate) + addedCost;
          await tx.stockBalance.update({ where: { id: balance.id }, data: { valuationRate: newValue / onHand } });
        }

        await tx.stockMovement.create({
          data: {
            warehouseId, productId: line.productId, quantity: 0, valuationRate: addedCostPerUnit,
            reason: "LANDED_COST", reference: voucher.id, createdBy,
          },
        });
      }

      const journalLines = [
        { accountId: accountMap.INVENTORY, debit: Number(voucher.totalAmount), credit: 0 },
        ...voucher.chargeLines.map((c: any) => ({ accountId: c.accountId ?? accountMap.EXPENSE, debit: 0, credit: Number(c.amount) })),
      ];
      await tx.journalEntry.create({
        data: { companyId, sourceType: "landed_cost", sourceId: voucher.id, createdBy, lines: { create: journalLines } },
      });

      return tx.landedCostVoucher.update({ where: { id }, data: { appliedAt: new Date() }, include: { chargeLines: true } });
    });
  }
}
