import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { PurchaseReceiptsService } from "./purchase-receipts.service";
import { CreatePurchaseReceiptDto } from "./dto";

@Controller("companies/:companyId/purchase-receipts")
export class PurchaseReceiptsController {
  constructor(private readonly purchaseReceiptsService: PurchaseReceiptsService) {}

  @Get()
  @RequirePermission("purchases", "view")
  list(@Param("companyId") companyId: string) { return this.purchaseReceiptsService.list(companyId); }

  @Get(":id")
  @RequirePermission("purchases", "view")
  get(@Param("companyId") companyId: string, @Param("id") id: string) { return this.purchaseReceiptsService.get(companyId, id); }

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreatePurchaseReceiptDto, @Req() req: any) {
    return this.purchaseReceiptsService.create(companyId, dto, req.user?.id ?? "system");
  }

  @Post(":id/post")
  @RequirePermission("purchases", "approve")
  post(@Param("companyId") companyId: string, @Param("id") id: string, @Req() req: any) {
    return this.purchaseReceiptsService.post(companyId, id, req.user?.id ?? "system");
  }
}
