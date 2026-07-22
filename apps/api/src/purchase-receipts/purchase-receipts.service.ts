import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { receiveStock } from "../common/stock-valuation";
import type { CreatePurchaseReceiptDto } from "./dto";

// Mirrors DeliveryNotesService on the purchase side: stock actually
// arrives (and the moving-average valuationRate updates) when a receipt is
// POSTED, not when it's created. The GL entry (debit Inventory, credit
// Accounts Payable) still happens when a PurchaseBill is created against
// this receipt — see PurchaseBillsService — so there's a deliberate window
// between "goods on the shelf" and "invoice recorded" where StockBalance
// already reflects the stock (so it can be sold / costed correctly) but
// the GL Inventory account doesn't yet. A GR/IR clearing account would
// close that window; not built here to keep the account chart from
// growing another rung — flagged as a known simplification.
@Injectable()
export class PurchaseReceiptsService {
  list(companyId: string) {
    return prisma.purchaseReceipt.findMany({ where: { companyId }, orderBy: { receiptDate: "desc" }, include: { lines: true } });
  }

  get(companyId: string, id: string) {
    return prisma.purchaseReceipt.findFirst({ where: { id, companyId }, include: { lines: { include: { product: true } } } });
  }

  async create(companyId: string, dto: CreatePurchaseReceiptDto, createdBy: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: dto.supplierId, companyId } });
    if (!supplier) throw new NotFoundException("Supplier not found in this company.");

    if (dto.purchaseOrderId) {
      const po = await prisma.purchaseOrder.findFirst({ where: { id: dto.purchaseOrderId, companyId } });
      if (!po) throw new NotFoundException("Purchase order not found in this company.");
    }

    const number = await this.nextNumber(companyId);
    return prisma.purchaseReceipt.create({
      data: {
        companyId, supplierId: dto.supplierId, purchaseOrderId: dto.purchaseOrderId, warehouseId: dto.warehouseId,
        number, status: "DRAFT", createdBy,
        lines: {
          create: dto.lines.map((l) => ({
            productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, purchaseOrderLineId: l.purchaseOrderLineId,
          })),
        },
      },
      include: { lines: true },
    });
  }

  async post(companyId: string, id: string, createdBy: string) {
    const receipt = await prisma.purchaseReceipt.findFirst({ where: { id, companyId }, include: { lines: true } });
    if (!receipt) throw new NotFoundException("Purchase receipt not found in this company.");
    if (receipt.status !== "DRAFT") throw new BadRequestException("Only a draft purchase receipt can be posted.");

    return prisma.$transaction(async (tx: any) => {
      for (const line of receipt.lines) {
        const newRate = await receiveStock(tx, receipt.warehouseId, line.productId, Number(line.quantity), Number(line.unitCost));
        await tx.stockMovement.create({
          data: {
            warehouseId: receipt.warehouseId, productId: line.productId, quantity: Number(line.quantity),
            valuationRate: newRate, reason: "PURCHASE_RECEIPT", reference: receipt.id, createdBy,
          },
        });
        if (line.purchaseOrderLineId) {
          await tx.purchaseOrderLine.update({ where: { id: line.purchaseOrderLineId }, data: { receivedQty: { increment: line.quantity } } });
        }
      }
      return tx.purchaseReceipt.update({ where: { id }, data: { status: "POSTED" }, include: { lines: true } });
    });
  }

  private async nextNumber(companyId: string) {
    const count = await prisma.purchaseReceipt.count({ where: { companyId } });
    return `GRN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
