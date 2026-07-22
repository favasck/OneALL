import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { PurchaseOrdersService } from "./purchase-orders.service";
import { CreatePurchaseOrderDto } from "./dto";

@Controller("companies/:companyId/purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @RequirePermission("purchases", "view")
  list(@Param("companyId") companyId: string) { return this.purchaseOrdersService.list(companyId); }

  @Get(":id")
  @RequirePermission("purchases", "view")
  get(@Param("companyId") companyId: string, @Param("id") id: string) { return this.purchaseOrdersService.get(companyId, id); }

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreatePurchaseOrderDto, @Req() req: any) {
    return this.purchaseOrdersService.create(companyId, dto, req.user?.id ?? "system");
  }
}
