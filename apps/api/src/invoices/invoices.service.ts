import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { calculateInvoiceTotals, post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import type { CreateInvoiceDto } from "./dto";

/**
 * Implements the native sales-to-cash workflow, Section 5.2, up to step 6
 * ("Confirmation creates invoice, accounting entry, customer receivable and
 * stock issue"). Step 7 onward (print/share, receipt allocation) are
 * separate endpoints, not built yet.
 *
 * MVP RULE (Table 9 in the plan): start with invoice -> receipt. Quotation,
 * sales order and delivery note come later — this service deliberately
 * does not model them.
 *
 * NOTE: `tx` below is typed `any` because @prisma/client's generated types
 * don't exist in this scaffold — `npm run db:generate` (packages/db) needs
 * network access to binaries.prisma.sh, which this sandbox blocks. Run
 * `npm run db:generate` locally once, and this can be tightened to
 * `Prisma.TransactionClient`.
 */
@Injectable()
export class InvoicesService {
  async list(companyId: string) {
    return prisma.invoice.findMany({ where: { companyId }, orderBy: { invoiceDate: "desc" } });
  }

  async create(companyId: string, dto: CreateInvoiceDto, createdBy: string) {
    const customer = await prisma.customer.findFirst({ where: { id: dto.customerId, companyId } });
    if (!customer) throw new NotFoundException("Customer not found in this company.");

    const totals = calculateInvoiceTotals(
      dto.lines.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, taxRatePct: l.taxRatePct })),
    );

    // Section 5.2 step 4: validate credit limit for credit sales before posting.
    if (dto.paymentMethod === "CREDIT" && Number(customer.creditLimit) > 0) {
      if (totals.grandTotal > Number(customer.creditLimit)) {
        throw new BadRequestException(
          `Invoice total ${totals.grandTotal} exceeds ${customer.name}'s credit limit ${customer.creditLimit}.`,
        );
      }
    }

    const journalLines = post(dto.paymentMethod === "CREDIT" ? "CREDIT_SALE" : "CASH_SALE", {
      netAmount: totals.subtotal,
      taxAmount: totals.taxTotal,
    });
    const accountMap = await resolveAccountRoles(companyId, journalLines.map((l) => l.accountRole));

    return prisma.$transaction(async (tx: any) => {
      const number = await this.nextInvoiceNumber(tx, companyId);

      const invoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: dto.customerId,
          number,
          status: "POSTED",
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          postedAt: new Date(),
          createdBy,
          lines: {
            create: dto.lines.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxRate: l.taxRatePct,
              lineTotal: l.quantity * l.unitPrice * (1 + l.taxRatePct / 100),
            })),
          },
        },
        include: { lines: true },
      });

      // Stock issue per line (Section 5.2 step 6) — negative-stock policy
      // (Section 4.7) is company-configurable and not enforced here yet.
      for (const line of dto.lines) {
        await tx.stockMovement.create({
          data: {
            warehouseId: dto.warehouseId,
            productId: line.productId,
            quantity: -line.quantity,
            reason: "SALE_ISSUE",
            reference: invoice.id,
            createdBy,
          },
        });
      }

      // Accounting entry from the table-driven posting rules (@oneall/shared),
      // resolved to real Account.id rows via the company's chart of accounts
      // (apps/api/src/common/account-role-resolver.ts).
      await tx.journalEntry.create({
        data: {
          companyId,
          sourceType: "invoice",
          sourceId: invoice.id,
          createdBy,
          lines: {
            create: journalLines.map((l) => ({
              accountId: accountMap[l.accountRole],
              debit: l.debit,
              credit: l.credit,
            })),
          },
        },
      });

      return invoice;
    });
  }

  private async nextInvoiceNumber(tx: any, companyId: string) {
    const count = await tx.invoice.count({ where: { companyId } });
    return `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
  }
}
