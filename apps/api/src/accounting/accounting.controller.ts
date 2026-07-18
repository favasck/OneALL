import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { AccountingService } from "./accounting.service";
import { CreateAccountDto } from "./dto";

@Controller("companies/:companyId/accounting")
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get("accounts")
  @RequirePermission("accounting", "view")
  listAccounts(@Param("companyId") companyId: string) {
    return this.accountingService.listAccounts(companyId);
  }

  @Post("accounts")
  @RequirePermission("accounting", "create")
  createAccount(@Param("companyId") companyId: string, @Body() dto: CreateAccountDto) {
    return this.accountingService.createAccount(companyId, dto);
  }

  @Get("trial-balance")
  @RequirePermission("accounting", "view")
  trialBalance(@Param("companyId") companyId: string) {
    return this.accountingService.trialBalance(companyId);
  }
}
