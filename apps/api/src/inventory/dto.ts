export class AdjustStockDto {
  warehouseId!: string;
  productId!: string;
  countedQuantity!: number; // the physically counted quantity — delta is computed server-side
  reason!: string; // mandatory, Section 5.4 step 3
}
