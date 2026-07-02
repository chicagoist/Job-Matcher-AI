import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchJobData, fetchViaJsonLd, fetchViaLinkedInGuestApi } from "../../src/background/lib/job-fetcher.js";
import { PlatformNotSupportedError, JobFetchError } from "../../src/background/lib/errors.js";

const mockStepStoneHtml = `<!doctype html>
<html>
<head><title>Software Engineer Berlin</title></head>
<body>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "title": "Software Engineer (m/w/d)",
  "description": "<p>Wir suchen einen erfahrenen Software Engineer.</p><p>Anforderungen: TypeScript, React, Node.js</p>",
  "datePosted": "2026-06-01",
  "employmentType": "FULL_TIME",
  "hiringOrganization": { "@type": "Organization", "name": "TechCorp GmbH" },
  "jobLocation": {
    "@type": "Place",
    "address": { "@type": "PostalAddress", "addressLocality": "Berlin", "addressRegion": "Berlin", "addressCountry": "DE" }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "value": { "@type": "QuantitativeValue", "value": 85000, "unitText": "YEAR" },
    "currency": "EUR"
  },
  "identifier": "ST-12345",
  "url": "https://www.stepstone.de/stellenangebote--12345-inline.html"
}
</script>
</body>
</html>`;

const mockLinkedInGuestApiHtml = `<!doctype html>
<html>
<head><title>Frontend Developer | LinkedIn</title></head>
<body>
<section class="top-card-layout container-lined">
  <div class="top-card-layout__card">
    <a class="topcard__link" href="/jobs/view/frontend-developer-4012345678">
      <h2 class="top-card-layout__title">Frontend Developer</h2>
    </a>
    <div class="topcard__flavor-row">
      <a class="topcard__org-name-link" href="/company/webstar">WebStar GmbH</a>
      <span class="topcard__flavor topcard__flavor--bullet">München</span>
    </div>
    <div class="description__text description__text--rich">
      We are looking for a Frontend Developer with React experience.
    </div>
  </div>
</section>
</body>
</html>`;

const mockNoJsonLdHtml = `<!doctype html>
<html><head><title>Some page</title></head><body><p>No job here.</p></body></html>`;

const mockMultipleJsonLdHtml = `<!doctype html>
<html><head><title>Job Page</title></head>
<body>
<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>
<script type="application/ld+json">{"@type":"JobPosting","title":"DevOps Engineer","description":"Build pipelines.","hiringOrganization":"CloudOps Inc.","datePosted":"2026-04-01"}</script>
</body>
</html>`;

const mockStepStoneHtmlStringOrg = `<!doctype html>
<html><head><title>Job</title></head>
<body>
<script type="application/ld+json">
{"@type":"JobPosting","title":"Manager","description":"Lead team.","hiringOrganization":"Big Corp","datePosted":"2026-03-01"}
</script>
</body>
</html>`;

function mockFetchOnce(status: number, body: string): void {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    text: () => Promise.resolve(body),
  } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("fetchJobData", () => {
  it("throws PlatformNotSupportedError for unknown URL", async () => {
    await expect(fetchJobData("https://example.com")).rejects.toThrow(PlatformNotSupportedError);
  });

  it("fetches StepStone job via JSON-LD", async () => {
    mockFetchOnce(200, mockStepStoneHtml);
    const data = await fetchJobData("https://www.stepstone.de/stellenangebote--Software-Engineer-Berlin--12345-inline.html");
    expect(data.title).toBe("Software Engineer (m/w/d)");
    expect(data.company).toBe("TechCorp GmbH");
    expect(data.location).toBe("Berlin, Berlin, DE");
    expect(data.description).toContain("erfahrenen Software Engineer");
    expect(data.description).not.toContain("<p>");
    expect(data.salary).toContain("85,000");
    expect(data.employmentType).toBe("FULL_TIME");
    expect(data.datePosted).toBe("2026-06-01");
    expect(data.platform).toBe("stepstone");
    expect(data.jobId).toBe("12345");
  });

  it("fetches LinkedIn job via Guest API", async () => {
    mockFetchOnce(200, mockLinkedInGuestApiHtml);
    const data = await fetchJobData("https://www.linkedin.com/jobs/view/frontend-developer-4012345678");
    expect(data.title).toBe("Frontend Developer");
    expect(data.company).toBe("WebStar GmbH");
    expect(data.location).toBe("München");
    expect(data.platform).toBe("linkedin");
  });

  it("throws JobFetchError on HTTP error", async () => {
    mockFetchOnce(404, "Not Found");
    await expect(
      fetchJobData("https://www.stepstone.de/stellenangebote--x--99999-inline.html"),
    ).rejects.toThrow(JobFetchError);
  });

  it("throws JobFetchError when no JSON-LD found", async () => {
    mockFetchOnce(200, mockNoJsonLdHtml);
    await expect(
      fetchJobData("https://www.stepstone.de/some-page"),
    ).rejects.toThrow(JobFetchError);
  });

  it("selects JobPosting among multiple JSON-LD blocks", async () => {
    mockFetchOnce(200, mockMultipleJsonLdHtml);
    const data = await fetchJobData("https://www.stepstone.de/job/123");
    expect(data.title).toBe("DevOps Engineer");
    expect(data.company).toBe("CloudOps Inc.");
  });
});

describe("fetchViaJsonLd", () => {
  it("handles company as plain string", async () => {
    mockFetchOnce(200, mockStepStoneHtmlStringOrg);
    const data = await fetchViaJsonLd("https://www.stepstone.de/job/1", "stepstone");
    expect(data.company).toBe("Big Corp");
  });

  it("handles missing optional fields gracefully", async () => {
    const minimalHtml = `<!doctype html><html><body>
<script type="application/ld+json">{"@type":"JobPosting","title":"Minimal Job","description":"Just a job."}</script>
</body></html>`;
    mockFetchOnce(200, minimalHtml);
    const data = await fetchViaJsonLd("https://www.stepstone.de/job/2", "stepstone");
    expect(data.title).toBe("Minimal Job");
    expect(data.company).toBe("Unbekanntes Unternehmen");
    expect(data.salary).toBeUndefined();
  });
});

describe("fetchViaLinkedInGuestApi", () => {
  it("extracts job data from LinkedIn Guest API response", async () => {
    const guestApiHtml = `<!doctype html>
<html>
<body>
<h2 class="top-card-layout__title">Senior Data Scientist</h2>
<a class="topcard__org-name-link" href="/company/acme">Acme Analytics</a>
<div class="description__text">
  <p>We need a data scientist with Python and ML experience.</p>
</div>
<span class="topcard__flavor--bullet">Berlin, Deutschland</span>
</body>
</html>`;
    mockFetchOnce(200, guestApiHtml);
    const data = await fetchViaLinkedInGuestApi(
      "https://www.linkedin.com/jobs/view/12345/",
      "linkedin",
      "12345",
    );
    expect(data.title).toBe("Senior Data Scientist");
    expect(data.company).toBe("Acme Analytics");
    expect(data.description).toContain("Python and ML");
    expect(data.location).toBe("Berlin, Deutschland");
    expect(data.platform).toBe("linkedin");
    expect(data.jobId).toBe("12345");
  });
});
