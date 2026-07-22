import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
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

  @Get("accounts/tree")
  @RequirePermission("accounting", "view")
  accountTree(@Param("companyId") companyId: string) {
    return this.accountingService.accountTree(companyId);
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

  @Get("balance-sheet")
  @RequirePermission("accounting", "view")
  balanceSheet(@Param("companyId") companyId: string, @Query("asOf") asOf?: string) {
    return this.accountingService.balanceSheet(companyId, asOf);
  }

  @Get("profit-loss")
  @RequirePermission("accounting", "view")
  profitLoss(@Param("companyId") companyId: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.accountingService.profitAndLoss(companyId, from, to);
  }
}
