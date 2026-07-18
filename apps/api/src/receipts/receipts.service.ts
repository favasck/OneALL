import { BadRequestException, Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import { post } from "@oneall/shared";
import { resolveAccountRoles } from "../common/account-role-resolver";
import type { CreateReceiptDto } from "./dto";

/**
 * Section 5.2 steps 8-9: "Receipt is recorded against one or more
 * invoices; partial allocation is supported" then "Customer balance,
 * ageing, cash/bank and dashboard update immediately."
 */
@Injectable()
export class ReceiptsService {
  async create(companyId: string, dto: CreateReceiptDto, createdBy: string) {
    const allocatedTotal = dto.allocations.reduce((s, a) => s + a.amount, 0);
    if (Math.round(allocatedTotal * 100) !== Math.round(dto.amount * 100)) {
      throw new BadRequestException(
        `Allocations (${allocatedTotal}) must add up to the receipt amount (${dto.amount}).`,
      );
    }

    const journalLines = post("CUSTOMER_RECEIPT", { netAmount: dto.amount, taxAmount: 0 });
    const accountMap = await resolveAccountRoles(companyId, journalLines.map((l) => l.accountRole));

    return prisma.$transaction(async (tx: any) => {
      const receipt = await tx.receipt.create({
        data: {
          companyId,
          customerId: dto.customerId,
          amount: dto.amount,
          method: dto.method,
          allocations: { create: dto.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: a.amount })) },
        },
        include: { allocations: true },
      });

      await tx.journalEntry.create({
        data: {
          companyId,
          sourceType: "receipt",
          sourceId: receipt.id,
          createdBy,
      