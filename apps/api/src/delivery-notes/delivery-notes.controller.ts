import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { DeliveryNotesService } from "./delivery-notes.service";
import { CreateDeliveryNoteDto } from "./dto";

@Controller("companies/:companyId/delivery-notes")
export class DeliveryNotesController {
  constructor(private readonly deliveryNotesService: DeliveryNotesService) {}

  @Get()
  @RequirePermission("sales", "view")
  list(@Param("companyId") companyId: string) { return this.deliveryNotesService.list(companyId); }

  @Get(":id")
  @RequirePermission("sales", "view")
  get(@Param("companyId") companyId: string, @Param("id") id: string) { return this.deliveryNotesService.get(companyId, id); }

  @Post()
  @RequirePermission("sales", "create")
  create(@Param("companyId") companyId: string, @Body() dto: CreateDeliveryNoteDto, @Req() req: any) {
    return this.deliveryNotesService.create(companyId, dto, req.user?.id ?? "system");
  }

  @Post(":id/post")
  @RequirePermission("sales", "approve")
  post(@Param("companyId") companyId: string, @Param("id") id: string, @Req() req: any) {
    return this.deliveryNotesService.post(companyId, id, req.user?.id ?? "system");
  }
}
