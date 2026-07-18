import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import type { CreateAccountDto } from "./dto";

// Section 4.8: chart of accounts, automated double-entry rules, trial
// balance. The JournalLine rows this reads from are written by
// invoices/purchase-bills/receipts/supplier-payments services using the
// @oneall/shared posting-rule engine.
@Injectable()
export class AccountingService {
  listAccounts(companyId: string) {
    return prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  createAccount(companyId: string, dto: CreateAccountDto) {
    return prisma.account.create({ data: { companyId, ...dto } });
  }

  async trialBalance(companyId: string) {
    const accounts = await prisma.account.findMany({ where: { companyId } });
    const lines = await prisma.journalLine.findMany({
      where: { account: { companyId } },
      select: { accountId: true, debit: true, credit: true },
    });

    const totals = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const current = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      totals.set(line.accountId, current);
    }

    return accounts.map((a: any) => {
      const t = totals.get(a.id) ?? { debit: 0, credit: 0 };
      return { accountId: a.id, code: a.code, name: a.name, type: a.type, debit: t.debit, credit: t.credit, balance: t.debit - t.credit };
    });
  }
}
