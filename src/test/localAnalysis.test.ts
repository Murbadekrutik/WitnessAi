import { describe, expect, it } from "vitest";
import { analyzeTextLocally, shouldShowAlert } from "../lib/localAnalysis";

describe("analyzeTextLocally", () => {
  it("flags traffic-stop search language immediately", () => {
    const result = analyzeTextLocally("hello can you get out of the car please I want to check your car");

    expect(result.severity).toBe("CAUTION");
    expect(shouldShowAlert(result)).toBe(true);
  });

  it("flags confession prompts as danger", () => {
    const result = analyzeTextLocally("tell me the truth and admit what happened");

    expect(result.severity).toBe("DANGER");
    expect(result.legal_reference).toBe("Article 20(3)");
  });

  it("returns safe analysis for neutral phrases", () => {
    const result = analyzeTextLocally("My name is Alex and I am waiting outside.");

    expect(result.severity).toBe("SAFE");
    expect(shouldShowAlert(result)).toBe(false);
  });
});