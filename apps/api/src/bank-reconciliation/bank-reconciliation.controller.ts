import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { RequirePermission } from "../common/require-permission.decorator";
import { BankReconciliationService } from "./bank-reconciliation.service";
import { CreateBankStatementLineDto, MatchBankStatementLineDto } from "./dto";

@Controller("companies/:companyId/bank-reconciliation")
export class BankReconciliationController {
  constructor(private readonly bankReconciliationService: BankReconciliationService) {}

  @Get("statement-lines")
  @RequirePermission("accounting", "view")
  listStatementLines(@Param("companyId") companyId: string, @Query("accountId") accountId?: string) {
    return this.bankReconciliationService.listStatementLines(companyId, accountId);
  }

  @Post("statement-lines")
  @RequirePermission("accounting", "create")
  createStatementLine(@Param("companyId") companyId: string, @Body() dto: CreateBankStatementLineDto) {
    return this.bankReconciliationService.createStatementLine(companyId, dto);
  }

  @Get("candidates")
  @RequirePermission("accounting", "view")
  candidates(@Param("companyId") companyId: string, @Query("accountId") accountId: string) {
    return this.bankReconciliationService.candidateJournalLines(companyId, accountId);
  }

  @Post("statement-lines/:id/match")
  @RequirePermission("accounting", "edit")
  match(@Param("companyId") companyId: string, @Param("id") id: string, @Body() dto: MatchBankStatementLineDto) {
    return this.bankReconciliationService.match(companyId, id, dto);
  }

  @Post("statement-lines/:id/unmatch")
  @RequirePermission("accounting", "edit")
  unmatch(@Param("companyId") companyId: string, @Param("id") id: string) {
    return this.bankReconciliationService.unmatch(companyId, id);
  }
}
