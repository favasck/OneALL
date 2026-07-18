import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { InvoicesService } from "./invoices.service";
import { CreateInvoiceDto } from "./dto";

@Controller("companies/:companyId/invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermission("sales", "view")
  list(@Param("companyId") companyId: string) {
    return this.invoicesService.list(companyId);
  }

  @Post()
  @RequirePermission("sales", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateInvoiceDto, @Req() req: any) {
    const createdBy = req.user?.id ?? "system";
    return this.invoicesService.create(companyId, dto, createdBy);
  }
}
