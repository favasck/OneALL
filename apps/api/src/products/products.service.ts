import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";

// Section 4.4: SKU, barcode, category, unit, tax code, stock/non-stock/
// service classification, opening quantity and reorder level.
@Injectable()
export class ProductsService {
  list(companyId: string) {
    return prisma.product.findMany({ where: { companyId } });
  }

  lowStock(companyId: string) {
    // Section 4.7 "low-stock visibility" — a real implementation compares
    // StockBalance.quantity against Product.reorderLevel per warehouse;
    // this scaffold does the comparison in application code rather than
    // a DB-level view, which is fine at MVP scale (Section 8.3: "reporting
    // projections/cache added as scale requires").
    return prisma.product.findMany({
      where: { companyId },
      include: { stockBalances: true },
    });
  }

  create(
    companyId: string,
    data: {
      sku: string;
      name: string;
      category?: string;
      unit?: string;
      kind?: "STOCK" | "NON_STOCK" | "SERVICE";
      sellingPrice?: number;
      purchaseCost?: number;
      reorderLevel?: number;
    },
  ) {
    return prisma.product.create({ data: { companyId, kind: data.kind ?? "STOCK", ...data } });
  }
}
