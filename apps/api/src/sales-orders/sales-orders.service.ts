import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals } from "@oneall/shared";
import type { CreateSalesOrderDto } from "./dto";

// First step of the order -> delivery -> invoice workflow (parallel to the
// existing direct-invoice path in InvoicesService). A SalesOrder carries no
// stock or GL impact by itself — it only commits to a price and quantity;
// stock moves when a DeliveryNote against it is posted, and the ledger
// only moves when an Invoice against that delivery is created.
@Injectable()
export class SalesOrdersService {
  list(companyId: string) {
    return prisma.salesOrder.findMany({ where: { companyId }, orderBy: { orderDate: "desc" }, include: { lines: true } });
  }

  get(companyId: string, id: string) {
    return prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: { lines: { include: { product: true } }, deliveryNotes: { include: { lines: true } } },
    });
  }

  async create(companyId: string, dto: CreateSalesOrderDto, createdBy: string) {
    const customer = await prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found in this company.");

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct })),
    );
    const number = await this.nextNumber(companyId);

    return prisma.salesOrder.create({
      data: {
        companyId, customerId: dto.customerId, number, status: "CONFIRMED",
        subtotal: totals.subtotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal, createdBy,
        lines: { create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRatePct })) },
      },
      include: { lines: true },
    });
  }

  private async nextNumber(companyId: string) {
    const count = await prisma.salesOrder.count({ where: { companyId } });
    return `SO-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
