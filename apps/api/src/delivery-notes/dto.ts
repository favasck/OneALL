export class CreateDeliveryNoteLineDto {
  productId!: string;
  quantity!: number;
  salesOrderLineId?: string;
}

export class CreateDeliveryNoteDto {
  customerId!: string;
  warehouseId!: string;
  salesOrderId?: string;
  lines!: CreateDeliveryNoteLineDto[];
}
