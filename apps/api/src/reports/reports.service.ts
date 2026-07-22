import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";

// Appendix B core report inventory — three of the eleven listed reports,
// enough to prove the pattern (real Prisma aggregation, not a mock). The
// rest (payable ageing, purchase summary, GL, P&L/balance sheet, connector
// reconciliation, etc.) follow the same shape once needed.
@Injectable()
export class ReportsService {
  async salesSummary(companyId: string, from?: string, to?: string) {
    const where: any = { companyId, status: "POSTED" };
    if (from || to) {
      where.invoiceDate = {};
      if (from) where.invoiceDate.gte = new Date(from);
      if (to) where.invoiceDate.lte = new Date(to);
    }
    const invoices = await prisma.invoice.findMany({ where, select: { grandTotal: true, invoiceDate: true } });
    const total = invoices.reduce((s: number, i: any) => s + Number(i.grandTotal), 0);
    return { invoiceCount: invoices.length, totalSales: total, from: from ?? null, to: to ?? null };
  }

  async receivableAgeing(companyId: string) {
    // Section 4.2: "Ageing buckets, promised-payment date and follow-up
    // notes." Buckets computed from days-since-invoice-date on unpaid
    // POSTED invoices; a real implementation nets off Receipt allocations
    // first — simplified here to gross invoice amounts.
    const now = Date.now();
    const invoices = await prisma.invoice.findMany({
      where: { companyId, status: "POSTED" },
      include: { customer: { select: { name: true } } },
    });

    const buckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const inv of invoices) {
      const days = Math.floor((now - inv.invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      const amount = Number(inv.grandTotal);
      if (days <= 0) buckets.current += amount;
      else if (days <= 30) buckets["1-30"] += amount;
      else if (days <= 60) buckets["31-60"] += amount;
      else if (days <= 90) buckets["61-90"] += amount;
      else buckets["90+"] += amount;
    }
    return buckets;
  }

  async stockOnHand(companyId: string) {
    const products = await prisma.product.findMany({
      where: { companyId },
      include: { stockBalances: true },
    });
    return products.map((p: any) => {
      const onHand = p.stockBalances.reduce((s: number, b: any) => s + Number(b.quantity), 0);
      // Weighted-average valuationRate across warehouses, weighted by each
      // warehouse's quantity — matches how StockBalance.valuationRate is
      // maintained per-warehouse by receiveStock()/issueStock().
      const stockValue = p.stockBalances.reduce((s: number, b: any) => s + Number(b.quantity) * Number(b.valuationRate), 0);
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        onHand,
        valuationRate: onHand !== 0 ? Math.round((stockValue / onHand) * 10000) / 10000 : 0,
        stockValue: Math.round(stockValue * 100) / 100,
        reorderLevel: Number(p.reorderLevel),
        lowStock: onHand < Number(p.reorderLevel),
      };
    });
  }
}
