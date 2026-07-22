import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals, post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import { issueStock, round2 } from "../common/stock-valuation";
import type { CreateInvoiceDto } from "./dto";

@Injectable()
export class InvoicesService {
  async list(companyId: string) {
    return prisma.invoice.findMany({ where: { companyId }, orderBy: { invoiceDate: "desc" } });
  }

  async create(companyId: string, dto: CreateInvoiceDto, createdBy: string) {
    const customer = await prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found in this company.");

    const directLines = dto.lines.filter((l) => !l.deliveryNoteLineId);
    if (directLines.length > 0 && !dto.warehouseId) {
      throw new BadRequestException("warehouseId is required when any line is a direct sale (not linked to a posted delivery note).");
    }

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct })),
    );

    if (dto.paymentMethod === "CREDIT" && Number(customer.creditLimit) > 0) {
      if (totals.grandTotal > Number(customer.creditLimit)) {
        throw new BadRequestException(
          `Invoice total ${totals.grandTotal} exceeds ${customer.name}'s credit limit ${customer.creditLimit}.`,
        );
      }
    }

    const journalLines = post(dto.paymentMethod === "CREDIT" ? "CREDIT_SALE" : "CASH_SALE", {
      netAmount: totals.subtotal, taxAmount: totals.taxTotal,
    });
    // INVENTORY and COST_OF_GOODS_SOLD aren't referenced by the CASH_SALE /
    // CREDIT_SALE rule itself, but the COGS entry posted alongside it below
    // needs both — resolved up front so a missing account fails before any
    // writes happen, not partway through the transaction.
    const accountMap = await resolveAccountRoles(companyId, [
      ...journalLines.map((l) => l.accountRole), "INVENTORY", "COST_OF_GOODS_SOLD",
    ]);

    return prisma.$transaction(async (tx: any) => {
      const number = await this.nextInvoiceNumber(tx, companyId);

      // For each line: if it's backed by a posted delivery note line, stock
      // already left the warehouse when that delivery was posted — reuse
      // its captured unit cost and don't touch StockBalance again. If it's
      // a direct/walk-in line, issue stock now.
      // Note: even for a delivery-backed line, no COGS journal entry was
      // posted when the delivery note itself was posted (see
      // DeliveryNotesService) — only the stock table (quantity + moving-
      // average cost) moved then. So every line's cost, delivery-backed or
      // not, still needs to flow into the COGS journal entry posted below.
      const unitCosts: number[] = [];
      const isDeliveryBacked: boolean[] = [];
      let costOfGoodsTotal = 0;

      for (const line of dto.lines) {
        if (line.deliveryNoteLineId) {
          const dnLine = await tx.deliveryNoteLine.findUnique({ where: { id: line.deliveryNoteLineId } });
          if (!dnLine) throw new NotFoundException(`Delivery note line ${line.deliveryNoteLineId} not found.`);
          const remaining = Number(dnLine.quantity) - Number(dnLine.invoicedQty);
          if (line.quantity > remaining) {
            throw new BadRequestException(`Delivery note line ${line.deliveryNoteLineId} only has ${remaining} unit(s) left to invoice.`);
          }
          await tx.deliveryNoteLine.update({ where: { id: line.deliveryNoteLineId }, data: { invoicedQty: { increment: line.quantity } } });
          const unitCost = Number(dnLine.unitCost);
          unitCosts.push(unitCost);
          isDeliveryBacked.push(true);
          costOfGoodsTotal += unitCost * line.quantity;
        } else {
          const unitCost = await issueStock(tx, dto.warehouseId!, line.productId, line.quantity);
          unitCosts.push(unitCost);
          isDeliveryBacked.push(false);
          costOfGoodsTotal += unitCost * line.quantity;
        }
      }
      costOfGoodsTotal = round2(costOfGoodsTotal);

      const invoice = await tx.invoice.create({
        data: {
          companyId, customerId: dto.customerId, number, status: "POSTED",
          subtotal: totals.subtotal, taxTotal: totals.taxTotal, grandTotal: totals.grandTotal,
          costOfGoodsTotal, postedAt: new Date(), createdBy,
          lines: {
            create: dto.lines.map((l, i) => ({
              productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRate: l.taxRatePct,
              lineTotal: l.quantity * l.unitPrice * (1 + l.taxRatePct / 100),
              unitCost: unitCosts[i],
              deliveryNoteLineId: l.deliveryNoteLineId,
            })),
          },
        },
        include: { lines: true },
      });

      for (let i = 0; i < dto.lines.length; i++) {
        if (isDeliveryBacked[i]) continue; // stock movement already recorded when the delivery note was posted
        const line = dto.lines[i];
        await tx.stockMovement.create({
          data: {
            warehouseId: dto.warehouseId, productId: line.productId, quantity: -line.quantity,
            valuationRate: unitCosts[i], reason: "SALE_ISSUE", reference: invoice.id, createdBy,
          },
        });
      }

      await tx.journalEntry.create({
        data: {
          companyId, sourceType: "invoice", sourceId: invoice.id, createdBy,
          lines: {
            create: journalLines.map((l) => ({
              accountId: accountMap[l.accountRole],
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
      });

      if (costOfGoodsTotal > 0) {
        const cogsLines = post("COST_OF_GOODS_SOLD", { netAmount: 0, taxAmount: 0, costOfGoodsAmount: costOfGoodsTotal });
        await tx.journalEntry.create({
          data: {
            companyId, sourceType: "invoice_cogs", sourceId: invoice.id, createdBy,
            lines: { create: cogsLines.map((l) => ({ accountId: accountMap[l.accountRole], debit: l.debit, credit: l.credit })) },
          },
        });
      }

      return invoice;
    });
  }

  private async nextInvoiceNumber(tx: any, companyId: string) {
    const count = await tx.invoice.count({ where: { companyId } });
    return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
