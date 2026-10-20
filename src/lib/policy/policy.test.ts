import { describe, it } from "vitest";

describe("policy", () => {
  it.todo("validation ERROR gives BLOCKED and no forecast-based findings");
  it.todo("base reserve breach gives NEEDS_REVIEW with value and threshold filled");
  it.todo("downside-only breach gives NEEDS_REVIEW worded as a risk");
  it.todo("contract value above threshold gives NEEDS_REVIEW; equal to threshold does not");
  it.todo("overall outcome is the worst finding");
});
