import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { TenantsService } from "./tenants.service";

@Controller("tenants/:tenantId/companies")
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  @RequirePermission("settings", "view")
  list(@Param("tenantId") tenantId: string) {
    return this.tenantsService.listCompanies(tenantId);
  }

  @Post()
  @RequirePermission("settings", "create")
  create(@Param("tenantId") tenantId: string, @Body("name") name: string) {
    return this.tenantsService.createCompany(tenantId, name);
  }
}
