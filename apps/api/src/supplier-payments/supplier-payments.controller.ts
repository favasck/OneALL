import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { SupplierPaymentsService } from "./supplier-payments.service";
import { CreateSupplierPaymentDto } from "./dto";

@Controller("companies/:companyId/supplier-payments")
export class SupplierPaymentsController {
  constructor(private readonly supplierPaymentsService: SupplierPaymentsService) {}

  @Post()
  @RequirePermission("purchases", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateSupplierPaymentDto, @Req() req: any) {
    return this.supplierPaymentsService.create(companyId, dto, req.user?.id ?? "system");
  }
}
