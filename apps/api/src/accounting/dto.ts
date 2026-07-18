export class CreateAccountDto {
  code!: string;
  name!: string;
  type!: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
}
