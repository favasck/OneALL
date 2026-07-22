import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals } from "@oneall/shared";
import type { CreatePurchaseOrderDto } from "./dto";

// Mirrors SalesOrdersService on the purchase side: commits to a price and
// quantity with a supplier, no stock or GL impact until a PurchaseReceipt
// against it is posted.
@Injectable()
export class PurchaseOrdersService {
  list(companyId: string) {
    return prisma.purchaseOrder.findMany({ where: { companyId }, orderBy: { orderDate: "desc" }, include: { lines: true } });
  }

  get(companyId: string, id: string) {
    return prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: { lines: { include: { product: true } }, purchaseReceipts: { include: { lines: true } } },
    });
  }

  async create(companyId: string, dto: CreatePurchaseOrderDto, createdBy: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id: dto.supplierId, companyId } });
    if (!supplier) throw new NotFoundException("Supplier not found in this company.");

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitCost, taxRatePct: l.taxRatePct })),
    );
    const number = await this.nextNumber(companyId);

    return prisma.purchaseOrder.create({
      data: {
        companyId, supplierId: dto.supplierId, number, status: "CONFIRMED",
        subtotal: totals.subtotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal, createdBy,
        lines: { create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitCost: l.unitCost, taxRate: l.taxRatePct })) },
      },
      include: { lines: true },
    });
  }

  private async nextNumber(companyId: string) {
    const count = await prisma.purchaseOrder.count({ where: { companyId } });
    return `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
