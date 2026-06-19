import type { PlatformInfo, JobFetchStrategy } from "../../shared/types.js";

const STEPSTONE_PATTERN = /stepstone\.(de|com)/i;
const LINKEDIN_PATTERN = /linkedin\.com/i;
const MONSTER_PATTERN = /monster\.(de|com)/i;
const XING_PATTERN = /xing\.com/i;
const INDEED_PATTERN = /indeed\.(com|de)/i;
const ARBEITSAGENTUR_PATTERN = /arbeitsagentur\.de/i;
const HEYJOBS_PATTERN = /heyjobs\.(co|de)/i;
const JOBVECTOR_PATTERN = /jobvector\.de/i;
const STELLENANZEIGEN_PATTERN = /stellenanzeigen\.de/i;
const KIMETA_PATTERN = /kimeta\.de/i;
const JOBWARE_PATTERN = /jobware\.de/i;

const STEPSTONE_JOBID_PATTERN = /--(\d+)-inline\.html$/;
const LINKEDIN_JOBID_PATTERN = /\/jobs\/view\/(\d+)\/?/;
const MONSTER_JOBID_PATTERN = /\/(\d+)(?:\?|$)/;

export interface PlatformConfig {
  strategy: JobFetchStrategy;
  jobId?: string;
}

function extractStepStoneJobId(url: string): string | undefined {
  const m = url.match(STEPSTONE_JOBID_PATTERN);
  return m?.[1];
}

function extractLinkedInJobId(url: string): string | undefined {
  const m = url.match(LINKEDIN_JOBID_PATTERN);
  return m?.[1];
}

function extractMonsterJobId(url: string): string | undefined {
  const m = url.match(MONSTER_JOBID_PATTERN);
  return m?.[1];
}

export function detectPlatform(url: string): PlatformInfo | null {
  const u = url.toLowerCase();

  if (STEPSTONE_PATTERN.test(u)) {
    return {
      platform: "stepstone",
      jobId: extractStepStoneJobId(url),
      strategy: "json-ld",
    };
  }

  if (LINKEDIN_PATTERN.test(u)) {
    const jobId = extractLinkedInJobId(url);
    return {
      platform: "linkedin",
      jobId,
      strategy: jobId ? "json-ld" : "guest-api",
    };
  }

  if (MONSTER_PATTERN.test(u)) {
    return {
      platform: "monster",
      jobId: extractMonsterJobId(url),
      strategy: "json-ld",
    };
  }

  if (ARBEITSAGENTUR_PATTERN.test(u)) {
    return {
      platform: "arbeitsagentur",
      strategy: "json-ld",
    };
  }

  if (HEYJOBS_PATTERN.test(u)) {
    return {
      platform: "heyjobs",
      strategy: "json-ld",
    };
  }

  if (JOBVECTOR_PATTERN.test(u)) {
    return {
      platform: "jobvector",
      strategy: "json-ld",
    };
  }

  if (STELLENANZEIGEN_PATTERN.test(u)) {
    return {
      platform: "stellenanzeigen",
      strategy: "json-ld",
    };
  }

  if (KIMETA_PATTERN.test(u)) {
    return {
      platform: "kimeta",
      strategy: "json-ld",
    };
  }

  if (JOBWARE_PATTERN.test(u)) {
    return {
      platform: "jobware",
      strategy: "json-ld",
    };
  }

  if (INDEED_PATTERN.test(u)) {
    return {
      platform: "indeed",
      strategy: "json-ld",
    };
  }

  if (XING_PATTERN.test(u)) {
    return {
      platform: "xing",
      strategy: "json-ld",
    };
  }

  return null;
}

export function getDisplayName(platform: string): string {
  const names: Record<string, string> = {
    stepstone: "StepStone",
    linkedin: "LinkedIn",
    monster: "Monster",
    indeed: "Indeed",
    xing: "XING",
    arbeitsagentur: "Bundesagentur für Arbeit",
    heyjobs: "HeyJobs",
    jobvector: "JobVector",
    stellenanzeigen: "Stellenanzeigen.de",
    kimeta: "Kimeta",
    jobware: "Jobware",
  };
  return names[platform] ?? platform;
}
