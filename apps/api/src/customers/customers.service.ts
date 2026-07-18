import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";

@Injectable()
export class CustomersService {
  // Section 4.2: customer master, balances, ageing. Balance/ageing are
  // derived from Invoice + Receipt data, not stored directly — left as a
  // TODO for the real reporting layer (Section 8.3: "reporting projections
  // / cache added as scale requires").
  list(companyId: string) {
    return prisma.customer.findMany({ where: { companyId } });
  }

  get(companyId: string, customerId: string) {
    return prisma.customer.findFirst({
      where: { id: customerId, companyId },
      include: { invoices: { orderBy: { invoiceDate: "desc" }, take: 10 } },
    });
  }

  create(companyId: string, data: { name: string; creditLimit?: number; creditDays?: number }) {
    return prisma.customer.create({
      data: {
        companyId,
        name: data.name,
        creditLimit: data.creditLimit ?? 0,
        creditDays: data.creditDays ?? 0,
      },
    });
  }
}
