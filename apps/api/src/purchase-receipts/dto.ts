export class CreatePurchaseReceiptLineDto {
  productId!: string;
  quantity!: number;
  unitCost!: number;
  purchaseOrderLineId?: string;
}

export class CreatePurchaseReceiptDto {
  supplierId!: string;
  warehouseId!: string;
  purchaseOrderId?: string;
  lines!: CreatePurchaseReceiptLineDto[];
}
