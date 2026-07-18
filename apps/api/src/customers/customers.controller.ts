import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { CustomersService } from "./customers.service";

@Controller("companies/:companyId/customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @RequirePermission("sales", "view")
  list(@Param("companyId") companyId: string) {
    return this.customersService.list(companyId);
  }

  @Get(":customerId")
  @RequirePermission("sales", "view")
  get(@Param("companyId") companyId: string, @Param("customerId") customerId: string) {
    return this.customersService.get(companyId, customerId);
  }

  @Post()
  @RequirePermission("sales", "create")
  create(@Param("companyId") companyId: string, @Body() body: { name: string; creditLimit?: number; creditDays?: number }) {
    return this.customersService.create(companyId, body);
  }
}
