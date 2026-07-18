export class CreateInvoiceLineDto {
  productId!: string;
  quantity!: number;
  unitPrice!: number;
  taxRatePct!: number;
}

export class CreateInvoiceDto {
  customerId!: string;
  warehouseId!: string;
  paymentMethod!: "CASH" | "CREDIT";
  lines!: CreateInvoiceLineDto[];
}
