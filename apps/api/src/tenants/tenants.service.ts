import { Injectable } from "@nestjs/common";
import { prisma } from "@oneall/db";

@Injectable()
export class TenantsService {
  listCompanies(tenantId: string) {
    return prisma.company.findMany({ where: { tenantId } });
  }

  createCompany(tenantId: string, name: string, baseCurrency = "QAR") {
    // Section 4.1: company identity, CR/tax details, branches/warehouses,
    // currency and numbering are configured after this — not modeled here yet.
    return prisma.company.create({ data: { tenantId, name, baseCurrency } });
  }
}
