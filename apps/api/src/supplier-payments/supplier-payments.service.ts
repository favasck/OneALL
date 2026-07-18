import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import type { CreateSupplierPaymentDto } from "./dto";

// Section 5.3 steps 6-7: "Authorized user records supplier payment and
// allocates it to bills" then "System updates supplier statement, bank/
// cash and payable ageing."
@Injectable()
export class SupplierPaymentsService {
  async create(companyId: string, dto: CreateSupplierPaymentDto, createdBy: string) {
    const allocatedTotal = dto.allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.round(allocatedTotal * 100) !== Math.round(dto.amount * 100)) {
      throw new BadRequestException(
        `Allocations (${allocatedTotal}) must add up to the payment amount (${dto.amount}).`,
      );
    }

    const journalLines = post("SUPPLIER_PAYMENT", { netAmount: dto.amount, taxAmount: 0 });
    const accountMap = await resolveAccountRoles(companyId, journalLines.map((l) => l.accountRole));

    return prisma.$transaction(async (tx: any) => {
      const payment = await tx.supplierPayment.create({
        data: {
          companyId,
          supplierId: dto.supplierId,
          amount: dto.amount,
          method: dto.method,
          allocations: { create: dto.allocations.map((a) => ({ purchaseBillId: a.purchaseBillId, amount: a.amount })) },
        },
        include: { allocations: true },
      });

      await tx.journalEntry.create({
        data: {
          companyId,
          sourceType: "supplier_payment",
          sourceId: payment.id,
          createdBy,
      