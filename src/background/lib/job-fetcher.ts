import type { StructuredJobData } from "../../shared/types.js";
import { DEFAULTS } from "../../shared/constants.js";
import { JobFetchError, PlatformNotSupportedError } from "./errors.js";
import { detectPlatform, getDisplayName } from "./platform-detector.js";

interface JsonLdJobPosting {
  "@type"?: string | string[];
  title?: string;
  name?: string;
  description?: string;
  datePosted?: string;
  validThrough?: string;
  employmentType?: string;
  url?: string;
  hiringOrganization?: string | { "@type"?: string; name?: string; sameAs?: string };
  jobLocation?: string | { "@type"?: string; address?: { "@type"?: string; addressLocality?: string; addressRegion?: string; postalCode?: string; addressCountry?: string } | string; name?: string };
  baseSalary?: string | { "@type"?: string; value?: { "@type"?: string; value?: number; unitText?: string } | number; currency?: string };
  identifier?: string | { "@type"?: string; value?: string };
  jobLocationType?: string;
  skills?: string | string[];
}

export async function fetchJobData(url: string): Promise<StructuredJobData> {
  const platform = detectPlatform(url);
  if (!platform) {
    throw new PlatformNotSupportedError(url);
  }

  switch (platform.strategy) {
    case "json-ld":
      return fetchViaJsonLd(url, platform.platform, platform.jobId);
    case "guest-api":
      return fetchViaLinkedInGuestApi(url, platform.platform, platform.jobId!);
    default:
      throw new PlatformNotSupportedError(url);
  }
}

export async function fetchViaJsonLd(
  url: string,
  platform: string,
  jobId?: string,
): Promise<StructuredJobData> {
  const response = await fetch(url, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
    },
    signal: timeoutSignal(DEFAULTS.fetchTimeoutMs),
  });

  if (!response.ok) {
    throw new JobFetchError(
      platform,
      `HTTP ${response.status}: ${response.statusText}`,
    );
  }

  const html = await response.text();
  const jobPostings = extractJsonLdJobPostings(html);

  if (jobPostings.length === 0) {
    throw new JobFetchError(platform, "Keine JobPosting-JSON-LD-Daten gefunden.");
  }

  const best = jobPostings[0];
  const description = stripHtml(best.description ?? "");

  return {
    platform,
    jobId,
    title: best.title ?? best.name ?? "Unbekannte Position",
    company: extractCompanyName(best.hiringOrganization),
    location: extractLocation(best.jobLocation),
    description: description.slice(0, DEFAULTS.maxJobTextChars),
    salary: extractSalary(best.baseSalary),
    employmentType: best.employmentType,
    datePosted: best.datePosted,
    url,
  };
}

export async function fetchViaLinkedInGuestApi(
  url: string,
  platform: string,
  jobId: string,
): Promise<StructuredJobData> {
  if (!jobId) {
    throw new JobFetchError(platform, "Keine Job-ID in der LinkedIn-URL gefunden. Bitte öffnen Sie eine konkrete Stellenanzeige.");
  }
  const apiUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

  const response = await fetch(apiUrl, {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
    },
    signal: timeoutSignal(DEFAULTS.fetchTimeoutMs),
  });

  if (!response.ok) {
    throw new JobFetchError(platform, `HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();

  const title = extractByRegex(html, /<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([^<]+)<\/h2>/i)
    ?? extractByRegex(html, /<title>([^<]+)<\/title>/i)
    ?? "Unbekannte Position";

  const company = extractByRegex(html, /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([^<]+)<\/a>/i)
    ?? extractByRegex(html, /class="[^"]*company-name[^"]*"[^>]*>([^<]+)</i)
    ?? "Unbekanntes Unternehmen";

  const descriptionMatch = html.match(/<div[^>]*class="[^"]*description__text[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const description = descriptionMatch
    ? stripHtml(descriptionMatch[1]).slice(0, DEFAULTS.maxJobTextChars)
    : "";

  const location = extractByRegex(html, /<span[^>]*class="[^"]*topcard__flavor--bullet[^"]*"[^>]*>([^<]+)<\/span>/i)
    ?? undefined;

  return {
    platform,
    jobId,
    title: title.trim(),
    company: company.trim(),
    location: location?.trim(),
    description: description || "Keine Beschreibung gefunden.",
    url,
  };
}

function extractJsonLdJobPostings(html: string): JsonLdJobPosting[] {
  const results: JsonLdJobPosting[] = [];
  const scriptRegex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptRegex.exec(html)) !== null) {
    try {
      const raw = match[1].trim();
      const parsed = JSON.parse(raw) as unknown;

      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (isJobPosting(item)) {
          results.push(item);
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}

function isJobPosting(data: unknown): data is JsonLdJobPosting {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
  return types.some((t: unknown) => String(t) === "JobPosting");
}

function extractCompanyName(org: string | { name?: string } | undefined): string {
  if (!org) return "Unbekanntes Unternehmen";
  if (typeof org === "string") return org;
  return org.name ?? "Unbekanntes Unternehmen";
}

function extractLocation(loc: string | { address?: { addressLocality?: string } } | undefined): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc;
  if (typeof loc.address === "object" && loc.address !== null) {
    const addr = loc.address as { addressLocality?: string; addressRegion?: string; addressCountry?: string };
    const parts = [addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean);
    return parts.join(", ") || undefined;
  }
  return undefined;
}

function extractSalary(salary: string | { value?: { value?: number; unitText?: string }; currency?: string } | undefined): string | undefined {
  if (!salary) return undefined;
  if (typeof salary === "string") return salary;
  if (typeof salary.value === "object" && salary.value !== null) {
    const val = salary.value.value;
    const unit = salary.value.unitText ?? "";
    const currency = salary.currency ?? "";
    if (val !== undefined) {
      return `${val.toLocaleString()} ${currency} ${unit}`.trim();
    }
  }
  if (typeof salary.value === "number") {
    return `${salary.value} ${salary.currency ?? ""}`.trim();
  }
  return undefined;
}

function extractByRegex(html: string, pattern: RegExp): string | undefined {
  const m = html.match(pattern);
  return m?.[1]?.trim();
}

function timeoutSignal(ms: number): AbortSignal {
  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), ms);
  return ctrl.signal;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
