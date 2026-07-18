import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { InventoryService } from "./inventory.service";
import { AdjustStockDto } from "./dto";

@Controller("companies/:companyId/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("movements")
  @RequirePermission("inventory", "view")
  movements(@Query("warehouseId") warehouseId: string, @Query("productId") productId: string) {
    return this.inventoryService.recentMovements(warehouseId, productId);
  }

  @Post("adjustments")
  @RequirePermission("inventory", "edit")
  adjust(@Param("companyId") _companyId: string, @Body() dto: AdjustStockDto, @Req() req: any) {
    return this.inventoryService.adjust(dto, req.user?.id ?? "system");
  }
}
