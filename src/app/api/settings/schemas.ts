import { z } from "zod";

const MAX_DATABASE_INT = 2_147_483_647;

const NonNegativeInteger = z
    .number()
    .int()
    .min(0)
    .max(MAX_DATABASE_INT);

export const UpdateSettings = z
    .object({
        reserveSen: NonNegativeInteger.optional(),
        approvalThresholdSen: NonNegativeInteger.optional(),
        customerDelayDays: NonNegativeInteger.optional(),
    })
    .strict()
    .refine(
        (settings) =>
        Object.values(settings).some((value) => value !== undefined),
        {message: "Provide at least one setting to update.",},
    );
// it accepts partial updates while reject empty requests, unknown fields, negative numbers, and fractions