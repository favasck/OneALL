import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { LandedCostService } from "./landed-cost.service";
import { CreateLandedCostVoucherDto } from "./dto";

@Controller("companies/:companyId/landed-costs")
export class LandedCostController {
  constructor(private readonly landedCostService: LandedCostService) {}

  @Get()
  @RequirePermission("purchases", "view")
  list(@Param("companyId") companyId: string) { return this.landedCostService.list(companyId); }

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateLandedCostVoucherDto, @Req() req: any) {
    return this.landedCostService.create(companyId, dto, req.user?.id ?? "system");
  }

  @Post(":id/apply")
  @RequirePermission("purchases", "approve")
  apply(@Param("companyId") companyId: string, @Param("id") id: string, @Req() req: any) {
    return this.landedCostService.apply(companyId, id, req.user?.id ?? "system");
  }
}
