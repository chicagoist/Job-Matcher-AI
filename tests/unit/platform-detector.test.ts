import { describe, expect, it } from "vitest";
import { detectPlatform, getDisplayName } from "../../src/background/lib/platform-detector.js";

describe("detectPlatform", () => {
  it("detects StepStone job page", () => {
    const r = detectPlatform("https://www.stepstone.de/stellenangebote--Software-Engineer-Berlin--12345-inline.html");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("stepstone");
    expect(r!.strategy).toBe("json-ld");
    expect(r!.jobId).toBe("12345");
  });

  it("detects StepStone without job ID", () => {
    const r = detectPlatform("https://www.stepstone.de/jobs");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("stepstone");
    expect(r!.jobId).toBeUndefined();
  });

  it("detects StepStone.com", () => {
    const r = detectPlatform("https://www.stepstone.com/jobs");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("stepstone");
  });

  it("detects LinkedIn job view page", () => {
    const r = detectPlatform("https://www.linkedin.com/jobs/view/4012345678/");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("linkedin");
    expect(r!.strategy).toBe("json-ld");
    expect(r!.jobId).toBe("4012345678");
  });

  it("detects LinkedIn search page", () => {
    const r = detectPlatform("https://www.linkedin.com/jobs/search/?keywords=engineer");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("linkedin");
    expect(r!.strategy).toBe("guest-api");
    expect(r!.jobId).toBeUndefined();
  });

  it("detects Monster.de job page", () => {
    const r = detectPlatform("https://www.monster.de/jobs/software-engineer-berlin-de-12345");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("monster");
    expect(r!.strategy).toBe("json-ld");
  });

  it("detects Monster.com", () => {
    const r = detectPlatform("https://www.monster.com/jobs/search");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("monster");
  });

  it("detects Indeed", () => {
    const r = detectPlatform("https://www.indeed.com/viewjob?jk=abc123");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("indeed");
  });

  it("detects Indeed.de", () => {
    const r = detectPlatform("https://de.indeed.de/jobs");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("indeed");
  });

  it("detects XING", () => {
    const r = detectPlatform("https://www.xing.com/jobs/berlin-senior-dev-12345");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("xing");
  });

  it("detects Arbeitsagentur", () => {
    const r = detectPlatform("https://www.arbeitsagentur.de/jobsuche/job/12345");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("arbeitsagentur");
  });

  it("detects HeyJobs", () => {
    const r = detectPlatform("https://www.heyjobs.co/jobs/12345");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("heyjobs");
  });

  it("detects JobVector", () => {
    const r = detectPlatform("https://www.jobvector.de/job/12345");
    expect(r).not.toBeNull();
    expect(r!.platform).toBe("jobvector");
  });

  it("returns null for unknown URL", () => {
    const r = detectPlatform("https://www.example.com/page");
    expect(r).toBeNull();
  });

  it("returns null for non-job URL", () => {
    const r = detectPlatform("https://www.google.com/search");
    expect(r).toBeNull();
  });
});

describe("getDisplayName", () => {
  it("returns display name for known platforms", () => {
    expect(getDisplayName("stepstone")).toBe("StepStone");
    expect(getDisplayName("linkedin")).toBe("LinkedIn");
    expect(getDisplayName("monster")).toBe("Monster");
    expect(getDisplayName("indeed")).toBe("Indeed");
    expect(getDisplayName("xing")).toBe("XING");
  });

  it("returns original string for unknown platforms", () => {
    expect(getDisplayName("unknown")).toBe("unknown");
  });
});
