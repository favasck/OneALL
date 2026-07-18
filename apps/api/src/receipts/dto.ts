export class ReceiptAllocationDto {
  invoiceId!: string;
  amount!: number;
}

export class CreateReceiptDto {
  customerId!: string;
  amount!: number;
  method?: string;
  allocations!: ReceiptAllocationDto[]; // Section 5.2 step 8: partial allocation across one or more invoices
}
