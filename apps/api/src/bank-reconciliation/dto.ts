export class CreateBankStatementLineDto {
  accountId!: string;
  lineDate!: string;
  description!: string;
  amount!: number; // signed: +deposit, -withdrawal
}

export class MatchBankStatementLineDto {
  journalLineId!: string;
}
