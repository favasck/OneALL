export class CreatePurchaseOrderLineDto {
  productId!: string;
  quantity!: number;
  unitCost!: number;
  taxRatePct!: number;
}

export class CreatePurchaseOrderDto {
  supplierId!: string;
  lines!: CreatePurchaseOrderLineDto[];
}
