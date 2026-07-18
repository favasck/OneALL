export class CreatePurchaseBillLineDto {
  productId!: string;
  quantity!: number;
  unitCost!: number;
  taxRatePct!: number;
}

export class CreatePurchaseBillDto {
  supplierId!: string;
  warehouseId!: string;
  supplierRef?: string;
  dueDate?: string;
  lines!: CreatePurchaseBillLineDto[];
}
