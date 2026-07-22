export class CreateSalesOrderLineDto {
  productId!: string;
  quantity!: number;
  unitPrice!: number;
  taxRatePct!: number;
}

export class CreateSalesOrderDto {
  customerId!: string;
  lines!: CreateSalesOrderLineDto[];
}
