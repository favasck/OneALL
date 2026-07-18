import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { SuppliersService } from "./suppliers.service";

@Controller("companies/:companyId/suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @RequirePermission("purchases", "view")
  list(@Param("companyId") companyId: string) {
    return this.suppliersService.list(companyId);
  }

  @Get(":supplierId")
  @RequirePermission("purchases", "view")
  get(@Param("companyId") companyId: string, @Param("supplierId") supplierId: string) {
    return this.suppliersService.get(companyId, supplierId);
  }

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() body: { name: string; taxNumber?: string; paymentTerms?: string }) {
    return this.suppliersService.create(companyId, body);
  }
}
