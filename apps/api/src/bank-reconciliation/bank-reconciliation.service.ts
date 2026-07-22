import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import type { CreateBankStatementLineDto, MatchBankStatementLineDto } from "./dto";

// Lightweight reconciliation: statement lines are entered (or, in a later
// revision, imported) against a CASH_OR_BANK-role account, then matched
// one-for-one against a JournalLine already posted to that same account —
// no automatic fuzzy-matching, the user picks the candidate.
@Injectable()
export class BankReconciliationService {
  listStatementLines(companyId: string, accountId?: string) {
    return prisma.bankStatementLine.findMany({
      where: { companyId, ...(accountId ? { accountId } : {}) },
      orderBy: { lineDate: "desc" },
    });
  }

  createStatementLine(companyId: string, dto: CreateBankStatementLineDto) {
    return prisma.bankStatementLine.create({
      data: { companyId, accountId: dto.accountId, lineDate: new Date(dto.lineDate), description: dto.description, amount: dto.amount },
    });
  }

  // Candidate journal lines posted to the given account, most recent
  // first — the UI shows these next to an unreconciled statement line so
  // the user can pick which one it corresponds to.
  candidateJournalLines(companyId: string, accountId: string) {
    return prisma.journalLine.findMany({
      where: { accountId, journalEntry: { companyId } },
      orderBy: { id: "desc" },
      take: 50,
      include: { journalEntry: true },
    });
  }

  async match(companyId: string, id: string, dto: MatchBankStatementLineDto) {
    const line = await prisma.bankStatementLine.findFirst({ where: { id, companyId } });
    if (!line) throw new NotFoundException("Bank statement line not found in this company.");

    const journalLine = await prisma.journalLine.findUnique({ where: { id: dto.journalLineId }, include: { journalEntry: true } });
    if (!journalLine || journalLine.journalEntry.companyId !== companyId) {
      throw new NotFoundException("Journal line not found in this company.");
    }

    return prisma.bankStatementLine.update({ where: { id }, data: { reconciled: true, matchedJournalLineId: dto.journalLineId } });
  }

  async unmatch(companyId: string, id: string) {
    const line = await prisma.bankStatementLine.findFirst({ where: { id, companyId } });
    if (!line) throw new NotFoundException("Bank statement line not found in this company.");
    if (!line.reconciled) throw new BadRequestException("This line isn't reconciled — nothing to undo.");

    return prisma.bankStatementLine.update({ where: { id }, data: { reconciled: false, matchedJournalLineId: null } });
  }
}
