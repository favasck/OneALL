import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";
import type { CreateAccountDto } from "./dto";

function round(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Section 4.8: chart of accounts, automated double-entry rules, trial
// balance, and (this revision) real financial statements. Account is a
// tree — isGroup rollup nodes above postable leaf accounts — so a Balance
// Sheet / P&L can roll ledger balances up to their parent group instead of
// only ever showing a flat list of every ledger.
@Injectable()
export class AccountingService {
  listAccounts(companyId: string) {
    return prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }

  createAccount(companyId: string, dto: CreateAccountDto) {
    return prisma.account.create({ data: { companyId, ...dto } });
  }

  async trialBalance(companyId: string) {
    // Group (rollup) accounts never receive postings directly, so they're
    // excluded here — a trial balance only ever lists postable ledgers.
    const accounts = await prisma.account.findMany({ where: { companyId, isGroup: false } });
    const totals = await this.ledgerTotals(companyId);

    return accounts.map((a) => {
      const t = totals.get(a.id) ?? { debit: 0, credit: 0 };
      return { accountId: a.id, code: a.code, name: a.name, type: a.type, debit: round(t.debit), credit: round(t.credit), balance: round(t.debit - t.credit) };
    });
  }

  async accountTree(companyId: string) {
    const accounts = await prisma.account.findMany({ where: { companyId }, orderBy: { code: "asc" } });
    const totals = await this.ledgerTotals(companyId);
    return this.buildTree(accounts, totals);
  }

  async balanceSheet(companyId: string, asOf?: string) {
    const accounts = await prisma.account.findMany({
      where: { companyId, type: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
      orderBy: { code: "asc" },
    });
    const totals = await this.ledgerTotals(companyId, { to: asOf });
    const tree = this.buildTree(accounts, totals);
    const pnl = await this.profitAndLoss(companyId, undefined, asOf);

    const assets = tree.filter((n) => n.type === "ASSET");
    const liabilities = tree.filter((n) => n.type === "LIABILITY");
    const equity = tree.filter((n) => n.type === "EQUITY");
    const totalAssets = round(assets.reduce((s, n) => s + n.balance, 0));
    const totalLiabilities = round(liabilities.reduce((s, n) => s + n.balance, 0));
    const totalEquityAccounts = round(equity.reduce((s, n) => s + n.balance, 0));
    // Undistributed profit/loss for the period isn't posted to an equity
    // ledger until a period-close entry runs, so it's folded into the
    // statement here as "current year earnings" — the standard treatment
    // for an unclosed book, and what keeps Assets = Liabilities + Equity.
    const currentYearEarnings = pnl.netProfit;
    const totalEquity = round(totalEquityAccounts + currentYearEarnings);

    return {
      asOf: asOf ?? null,
      assets, liabilities, equity, currentYearEarnings,
      totalAssets, totalLiabilities, totalEquity,
      isBalanced: round(totalAssets - (totalLiabilities + totalEquity)) === 0,
    };
  }

  async profitAndLoss(companyId: string, from?: string, to?: string) {
    const accounts = await prisma.account.findMany({
      where: { companyId, type: { in: ["INCOME", "EXPENSE"] } },
      orderBy: { code: "asc" },
    });
    const totals = await this.ledgerTotals(companyId, { from, to });
    const tree = this.buildTree(accounts, totals);

    const income = tree.filter((n) => n.type === "INCOME");
    const expense = tree.filter((n) => n.type === "EXPENSE");
    const totalIncome = round(income.reduce((s, n) => s + n.balance, 0));
    const totalExpense = round(expense.reduce((s, n) => s + n.balance, 0));

    return { from: from ?? null, to: to ?? null, income, expense, totalIncome, totalExpense, netProfit: round(totalIncome - totalExpense) };
  }

  private async ledgerTotals(companyId: string, dateFilter?: { from?: string; to?: string }) {
    const where: any = { account: { companyId } };
    if (dateFilter?.from || dateFilter?.to) {
      where.journalEntry = {};
      if (dateFilter.from) where.journalEntry.entryDate = { gte: new Date(dateFilter.from) };
      if (dateFilter.to) where.journalEntry.entryDate = { ...(where.journalEntry.entryDate ?? {}), lte: new Date(dateFilter.to) };
    }
    const lines = await prisma.journalLine.findMany({ where, select: { accountId: true, debit: true, credit: true } });
    const totals = new Map<string, { debit: number; credit: number }>();
    for (const line of lines) {
      const t = totals.get(line.accountId) ?? { debit: 0, credit: 0 };
      t.debit += Number(line.debit);
      t.credit += Number(line.credit);
      totals.set(line.accountId, t);
    }
    return totals;
  }

  // ASSET/EXPENSE ledgers carry a natural debit balance; LIABILITY/EQUITY/
  // INCOME carry a natural credit balance. This is what makes a "balance"
  // number mean the same thing (a positive, expected-sign amount) across
  // every account type in a statement.
  private normalBalance(type: string, debit: number, credit: number): number {
    return type === "ASSET" || type === "EXPENSE" ? debit - credit : credit - debit;
  }

  private buildTree(
    accounts: Array<{ id: string; code: string; name: string; type: string; isGroup: boolean; parentAccountId: string | null }>,
    totals: Map<string, { debit: number; credit: number }>,
  ) {
    type Node = { id: string; code: string; name: string; type: string; isGroup: boolean; parentAccountId: string | null; balance: number; children: Node[] };
    const byId = new Map<string, Node>(
      accounts.map((a) => [a.id, { id: a.id, code: a.code, name: a.name, type: a.type, isGroup: a.isGroup, parentAccountId: a.parentAccountId, children: [], balance: 0 }]),
    );

    for (const a of accounts) {
      if (!a.isGroup) {
        const t = totals.get(a.id) ?? { debit: 0, credit: 0 };
        byId.get(a.id)!.balance = round(this.normalBalance(a.type, t.debit, t.credit));
      }
    }

    const roots: Node[] = [];
    for (const a of accounts) {
      const node = byId.get(a.id)!;
      if (a.parentAccountId && byId.has(a.parentAccountId)) byId.get(a.parentAccountId)!.children.push(node);
      else roots.push(node);
    }

    const rollup = (node: Node): number => {
      if (node.isGroup) node.balance = round(node.children.reduce((s, c) => s + rollup(c), 0));
      return node.balance;
    };
    roots.forEach(rollup);

    return roots;
  }
}
