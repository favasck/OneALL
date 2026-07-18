import { Controller, Get, Param, Query } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { ReportsService } from "./reports.service";

@Controller("companies/:companyId/reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("sales-summary")
  @RequirePermission("reports", "view")
  salesSummary(@Param("companyId") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.reportsService.salesSummary(companyId, from, to);
  }

  @Get("receivable-ageing")
  @RequirePermission("reports", "view")
  receivableAgeing(@Param("companyId") companyId: string) {
    return this.reportsService.receivableAgeing(companyId);
  }

  @Get("stock-on-hand")
  @RequirePermission("reports", "view")
  stockOnHand(@Param("companyId") companyId: string) {
    return this.reportsService.stockOnHand(companyId);
  }
}
