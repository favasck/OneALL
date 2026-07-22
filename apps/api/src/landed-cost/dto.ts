export class LandedCostChargeLineDto {
  description!: string;
  amount!: number;
  accountId?: string; // e.g. the Freight and Customs expense account (5300 in the seeded chart)
}

export class CreateLandedCostVoucherDto {
  purchaseReceiptId!: string;
  chargeLines!: LandedCostChargeLineDto[];
}
