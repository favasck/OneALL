export class CreatePurchaseBillLineDto {
  productId!: string;
  quantity!: number;
  unitCost!: number;
  taxRatePct!: number;
  // When set, this line is billing an already-posted PurchaseReceiptLine —
  // stock was already received (and moving-average cost updated) when that
  // receipt was posted, so bill creation must NOT receive stock again for
  // this line, only post the payable-side journal entry.
  purchaseReceiptLineId?: string;
}

export class CreatePurchaseBillDto {
  supplierId!: string;
  // Required only if at least one line is a direct bill (no
  // purchaseReceiptLineId) — a bill made up entirely of receipt-backed
  // lines doesn't need it, the warehouse was already fixed on the receipt.
  warehouseId?: string;
  supplierRef?: string;
  dueDate?: string;
  lines!: CreatePurchaseBillLineDto[];
}
