import type { Prisma } from "@prisma/client";

/**
 * Lock the existing company-settings row until the transaction ends.
 * Call only inside a Prisma interactive transaction.
 */
export async function lockCompanySettings(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$queryRaw`
    SELECT "id"
    FROM "CompanySettings"
    WHERE "id" = 1
    FOR UPDATE
  `;
}


// - Locks the single company-settings row.
// - Does not change its values.
// - Releases the lock automatically when the transaction finishes.
// - Allows ordinary reads to continue, while conflicting writes wait.
