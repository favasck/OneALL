// Moving-average (weighted-average) perpetual inventory valuation.
//
// On every RECEIPT (purchase bill, purchase receipt, landed cost), the
// product's valuationRate in that warehouse is recomputed as
// (existing value + incoming value) / (existing qty + incoming qty).
//
// On every ISSUE (sale), the CURRENT valuationRate is read — not changed —
// and returned as the unit cost to post as COGS. Moving-average valuation
// only moves on inflow; an outflow always leaves at the current average
// cost, which is what keeps this method simple to compute incrementally
// without keeping FIFO cost layers.
//
// Both functions take a Prisma transaction client (`tx`), not the global
// `prisma` export, so they can be called from inside the same
// `prisma.$transaction(...)` block that creates the invoice/bill/movement
// rows — the stock balance update has to be atomic with those, or a
// concurrent sale and receipt could interleave and produce a wrong rate.

export async function receiveStock(
  tx: any, warehouseId: string, productId: string, quantity: number, unitCost: number,
): Promise<number> {
  const existing = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId, productId } } });
  const existingQty = existing ? Number(existing.quantity) : 0;
  const existingRate = existing ? Number(existing.valuationRate) : 0;
  const newQty = existingQty + quantity;
  const newRate = newQty > 0 ? (existingQty * existingRate + quantity * unitCost) / newQty : unitCost;

  await tx.stockBalance.upsert({
    where: { warehouseId_productId: { warehouseId, productId } },
    update: { quantity: newQty, valuationRate: newRate },
    create: { warehouseId, productId, quantity: newQty, valuationRate: newRate },
  });

  return round4(newRate);
}

export async function issueStock(tx: any, warehouseId: string, productId: string, quantity: number): Promise<number> {
  const existing = await tx.stockBalance.findUnique({ where: { warehouseId_productId: { warehouseId, productId } } });
  const rate = existing ? Number(existing.valuationRate) : 0;
  const newQty = (existing ? Number(existing.quantity) : 0) - quantity;

  await tx.stockBalance.upsert({
    where: { warehouseId_productId: { warehouseId, productId } },
    update: { quantity: newQty },
    create: { warehouseId, productId, quantity: newQty, valuationRate: 0 },
  });

  return rate;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000;
}
