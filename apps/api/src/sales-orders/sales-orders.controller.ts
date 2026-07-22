import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { SalesOrdersService } from "./sales-orders.service";
import { CreateSalesOrderDto } from "./dto";

@Controller("companies/:companyId/sales-orders")
export class SalesOrdersController {
  constructor(private readonly salesOrdersService: SalesOrdersService) {}

  @Get()
  @RequirePermission("sales", "view")
  list(@Param("companyId") companyId: string) { return this.salesOrdersService.list(companyId); }

  @Get(":id")
  @RequirePermission("sales", "view")
  get(@Param("companyId") companyId: string, @Param("id") id: string) { return this.salesOrdersService.get(companyId, id); }

  @Post()
  @RequirePermission("sales", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateSalesOrderDto, @Req() req: any) {
    return this.salesOrdersService.create(companyId, dto, req.user?.id ?? "system");
  }
}
