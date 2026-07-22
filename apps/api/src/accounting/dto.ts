export class CreateAccountDto {
  code!: string;
  name!: string;
  type!: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
  isGroup?: boolean;
  parentAccountId?: string;
}
