import { InternalServerErrorException } from "@nestjs/common";
import { prisma } from "@oneall/db";
import type { AccountRole } from "@oneall/shared";

/**
 * Resolves posting-rule AccountRole names (packages/shared/posting-rules.ts)
 * to real Account.id rows for a company's chart of accounts (Section 4.8).
 *
 * This replaces the earlier placeholder that wrote the role name itself as
 * `accountId`. It is a plain function, not a Nest provider, because it
 * needs no state beyond the `prisma` singleton (@oneall/db) — every posting
 * service calls it directly rather than injecting it.
 *
 * Fails loudly (throws) if the company's chart of accounts is missing a
 * role the posting rule needs, rather than writing a bad accountId —
 * Section 8.3: posted journal entries are immutable, so a wrong account
 * reference can't be corrected quietly after the fact.
 */
export async function resolveAccountRoles(
  companyId: string,
  roles: AccountRole[],
): Promise<Record<string, string>> {
  const unique = [...new Set(roles)];
  if (unique.length === 0) return {};

  // `role` isn't in @prisma/client's generated types here (see README —
  // `prisma generate` is blocked in this build sandbox), so the where
  // clause below is typed loosely on purpose; tighten once generate runs.
  const accounts = await (prisma.account.findMany as any)({
    where: { companyId, role: { in: unique } },
  });

  const map: Record<string, string> = {};
  for (const account of accounts as Array<{ id: string; role: string | null }>) {
    if (account.role) map[account.role] = account.id;
  }

  const missing = unique.filter((role) => !map[role]);
  if (missing.length > 0) {
    throw new InternalServerErrorException(
      `Chart of accounts for company ${companyId} is missing account(s) for role(s): ` +
        `${missing.join(", ")}. Add an Account row with that role before posting — see ` +
        `packages/db/prisma/seed.ts for the expected set.`,
    );
  }
  return map;
}
