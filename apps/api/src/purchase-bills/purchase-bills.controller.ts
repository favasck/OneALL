import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { PurchaseBillsService } from "./purchase-bills.service";
import { CreatePurchaseBillDto } from "./dto";

@Controller("companies/:companyId/purchase-bills")
export class PurchaseBillsController {
  constructor(private readonly purchaseBillsService: PurchaseBillsService) {}

  @Get()
  @RequirePermission("purchases", "view")
  list(@Param("companyId") companyId: string) {
    return this.purchaseBillsService.list(companyId);
  }

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreatePurchaseBillDto, @Req() req: any) {
    return this.purchaseBillsService.create(companyId, dto, req.user?.id ?? "system");
  }
}
