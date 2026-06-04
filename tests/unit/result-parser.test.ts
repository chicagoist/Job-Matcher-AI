import { describe, expect, it } from "vitest";
import { parseAnalysis } from "../../src/background/lib/result-parser.js";

describe("parseAnalysis", () => {
  it("parses a valid JSON response", () => {
    const json = JSON.stringify({
      score: 8,
      reasoning: "Gute Übereinstimmung.",
      coverLetter: "Sehr geehrte Damen und Herren, ...",
      language: "de",
      matchedSkills: ["TypeScript", "React"],
      missingSkills: ["Kubernetes"],
    });
    const r = parseAnalysis(json);
    expect(r.score).toBe(8);
    expect(r.language).toBe("de");
    expect(r.coverLetter).toContain("Sehr geehrte");
    expect(r.matchedSkills).toEqual(["TypeScript", "React"]);
    expect(r.missingSkills).toEqual(["Kubernetes"]);
  });

  it("strips markdown code fences", () => {
    const fenced = "```json\n" + JSON.stringify({ score: 7, reasoning: "x", language: "en", matchedSkills: [], missingSkills: [] }) + "\n```";
    const r = parseAnalysis(fenced);
    expect(r.score).toBe(7);
    expect(r.language).toBe("en");
  });

  it("throws on missing score", () => {
    expect(() => parseAnalysis(JSON.stringify({ reasoning: "x", language: "de", matchedSkills: [], missingSkills: [] }))).toThrow();
  });

  it("throws on out-of-range score", () => {
    expect(() => parseAnalysis(JSON.stringify({ score: 11, reasoning: "x", language: "de", matchedSkills: [], missingSkills: [] }))).toThrow();
    expect(() => parseAnalysis(JSON.stringify({ score: 0, reasoning: "x", language: "de", matchedSkills: [], missingSkills: [] }))).toThrow();
  });

  it("throws on invalid JSON", () => {
    expect(() => parseAnalysis("nicht json")).toThrow();
  });

  it("returns undefined coverLetter when missing", () => {
    const r = parseAnalysis(
      JSON.stringify({ score: 4, reasoning: "x", language: "de", matchedSkills: [], missingSkills: ["a"] }),
    );
    expect(r.coverLetter).toBeUndefined();
  });

  it("defaults language to 'de' when missing", () => {
    const r = parseAnalysis(JSON.stringify({ score: 5, reasoning: "x", matchedSkills: [], missingSkills: [] }));
    expect(r.language).toBe("de");
  });
});
