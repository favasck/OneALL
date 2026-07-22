export class CreateInvoiceLineDto {
  productId!: string;
  quantity!: number;
  unitPrice!: number;
  taxRatePct!: number;
  // When set, this line is fulfilling an already-posted DeliveryNoteLine —
  // stock was already issued (and its moving-average cost captured) when
  // that delivery note was posted, so invoice creation must NOT issue stock
  // again for this line, only post the revenue-side journal entry.
  deliveryNoteLineId?: string;
}

export class CreateInvoiceDto {
  customerId!: string;
  // Required only if at least one line is a direct/walk-in sale (no
  // deliveryNoteLineId) — an invoice made up entirely of delivery-backed
  // lines doesn't need it, the warehouse was already fixed on the delivery.
  warehouseId?: string;
  paymentMethod!: "CASH" | "CREDIT";
  lines!: CreateInvoiceLineDto[];
}
