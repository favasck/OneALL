import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { ReceiptsService } from "./receipts.service";
import { CreateReceiptDto } from "./dto";

@Controller("companies/:companyId/receipts")
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post()
  @RequirePermission("sales", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateReceiptDto, @Req() req: any) {
    return this.receiptsService.create(companyId, dto, req.user?.id ?? "system");
  }
}
