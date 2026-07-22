import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { issueStock } from "../common/stock-valuation";
import type { CreateDeliveryNoteDto } from "./dto";

// Stock actually leaves the warehouse when a delivery note is POSTED, not
// when it's created — a DRAFT delivery note is just a picking instruction.
// This is what lets a partial delivery against a SalesOrder happen without
// needing to touch stock for the un-delivered remainder.
@Injectable()
export class DeliveryNotesService {
  list(companyId: string) {
    return prisma.deliveryNote.findMany({ where: { companyId }, orderBy: { deliveryDate: "desc" }, include: { lines: true } });
  }

  get(companyId: string, id: string) {
    return prisma.deliveryNote.findFirst({ where: { id, companyId }, include: { lines: { include: { product: true } } } });
  }

  async create(companyId: string, dto: CreateDeliveryNoteDto, createdBy: string) {
    const customer = await prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found in this company.");

    if (dto.salesOrderId) {
      const salesOrder = await prisma.salesOrder.findFirst({ where: { id: dto.salesOrderId, companyId } });
      if (!salesOrder) throw new NotFoundException("Sales order not found in this company.");
    }

    const number = await this.nextNumber(companyId);
    return prisma.deliveryNote.create({
      data: {
        companyId, customerId: dto.customerId, salesOrderId: dto.salesOrderId, warehouseId: dto.warehouseId,
        number, status: "DRAFT", createdBy,
        lines: { create: dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, salesOrderLineId: l.salesOrderLineId })) },
      },
      include: { lines: true },
    });
  }

  async post(companyId: string, id: string, createdBy: string) {
    const note = await prisma.deliveryNote.findFirst({ where: { id, companyId }, include: { lines: true } });
    if (!note) throw new NotFoundException("Delivery note not found in this company.");
    if (note.status !== "DRAFT") throw new BadRequestException("Only a draft delivery note can be posted.");

    return prisma.$transaction(async (tx: any) => {
      for (const line of note.lines) {
        const unitCost = await issueStock(tx, note.warehouseId, line.productId, Number(line.quantity));
        await tx.deliveryNoteLine.update({ where: { id: line.id }, data: { unitCost } });
        await tx.stockMovement.create({
          data: {
            warehouseId: note.warehouseId, productId: line.productId, quantity: -Number(line.quantity),
            valuationRate: unitCost, reason: "SALE_ISSUE", reference: note.id, createdBy,
          },
        });
        if (line.salesOrderLineId) {
          await tx.salesOrderLine.update({ where: { id: line.salesOrderLineId }, data: { deliveredQty: { increment: line.quantity } } });
        }
      }
      return tx.deliveryNote.update({ where: { id }, data: { status: "POSTED" }, include: { lines: true } });
    });
  }

  private async nextNumber(companyId: string) {
    const count = await prisma.deliveryNote.count({ where: { companyId } });
    return `DN-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
