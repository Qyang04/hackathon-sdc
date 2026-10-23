import { z } from "zod";
import { completeJson } from "../src/lib/ai/client";

async function main() {
  const schema = z.object({
    message: z.literal("Connection successful"),
  });

  const result = await completeJson(
    schema,
    'Return only JSON: {"message":"Connection successful"}',
    "Test the connection.",
  );

  console.log(result.message);
}

main().catch((error) => {
  console.error(
    "AI test failed:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
});