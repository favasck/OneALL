export class PaymentAllocationDto {
  purchaseBillId!: string;
  amount!: number;
}

export class CreateSupplierPaymentDto {
  supplierId!: string;
  amount!: number;
  method?: string;
  allocations!: PaymentAllocationDto[];
}
