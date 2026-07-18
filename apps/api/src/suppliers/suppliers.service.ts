import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";

// Section 4.3: supplier master, tax details and payment terms.
@Injectable()
export class SuppliersService {
  list(companyId: string) {
    return prisma.supplier.findMany({ where: { companyId } });
  }

  get(companyId: string, supplierId: string) {
    return prisma.supplier.findFirst({
      where: { id: supplierId, companyId },
      include: { purchaseBills: { orderBy: { billDate: "desc" }, take: 10 } },
    });
  }

  create(companyId: string, data: { name: string; taxNumber?: string; paymentTerms?: string }) {
    return prisma.supplier.create({ data: { companyId, ...data } });
  }
}
