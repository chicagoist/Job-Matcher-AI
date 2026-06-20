const STORAGE_KEYS = {
  apiKey: "geminiKey",
  cvData: "cvData",
  cvFileName: "cvFileName",
};

async function get<T>(key: string): Promise<T | undefined> {
  const r = await chrome.storage.local.get(key);
  return r[key] as T | undefined;
}

async function set(key: string, value: unknown): Promise<void> {
  await chrome.storage.local.set({ [key]: value });
}

async function getProvider(): Promise<string> {
  const r = await chrome.storage.local.get("provider");
  return (r.provider as string) || "ollama";
}

async function showSetup(): Promise<void> {
  const provider = await getProvider();
  const key = await get<string>(STORAGE_KEYS.apiKey);

  const setupEl = document.getElementById("setup")!;
  const mainEl = document.getElementById("main")!;
  const hintEl = document.getElementById("setupHint")!;
  const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  const saveKeyBtn = document.getElementById("saveKey") as HTMLButtonElement;

  if (provider === "ollama") {
    setupEl.hidden = true;
    mainEl.hidden = false;
    return;
  }

  if (key) {
    setupEl.hidden = true;
    mainEl.hidden = false;
  } else {
    setupEl.hidden = false;
    mainEl.hidden = true;
    hintEl.textContent = "Gemini-API-Schl\u00fcssel hinterlegen:";
    apiKeyInput.style.display = "";
    saveKeyBtn.style.display = "";
  }
}

async function updateProviderBadge(): Promise<void> {
  const provider = await getProvider();
  const el = document.getElementById("providerBadge")!;
  if (provider === "ollama") {
    el.textContent = "\ud83e\udd16 Ollama (lokal)";
    el.style.color = "var(--orange)";
  } else {
    el.textContent = "\u2601\ufe0f Gemini (Cloud)";
    el.style.color = "var(--purple)";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void showSetup();
  void updateProviderBadge();
  void updateCvStatus();
});

document.getElementById("saveKey")!.addEventListener("click", async () => {
  const input = document.getElementById("apiKey") as HTMLInputElement;
  const val = input.value.trim();
  if (!val) return;
  await set(STORAGE_KEYS.apiKey, val);
  document.getElementById("setup")!.hidden = true;
  document.getElementById("main")!.hidden = false;
});

document.getElementById("changeKey")!.addEventListener("click", () => {
  document.getElementById("setup")!.hidden = false;
  document.getElementById("main")!.hidden = true;
});

document.getElementById("openOptions")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function updateCvStatus(): Promise<void> {
  const name = await get<string>(STORAGE_KEYS.cvFileName);
  const el = document.getElementById("cvStatus")!;
  if (name) {
    el.textContent = `\u2713 Lebenslauf: ${name}`;
    el.style.color = "var(--purple)";
  } else {
    el.textContent = "Es wurde kein Lebenslauf hinterlegt.";
    el.style.color = "var(--muted)";
  }
}

document.getElementById("uploadBtn")!.addEventListener("click", () => {
  document.getElementById("fileInput")!.click();
});

document.getElementById("fileInput")!.addEventListener("change", async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
  const reader = new FileReader();
  reader.onload = async () => {
    await set(STORAGE_KEYS.cvData, String(reader.result));
    await set(STORAGE_KEYS.cvFileName, file.name);
    await set("cvUploadedAt", Date.now());
    await updateCvStatus();
  };
  reader.readAsDataURL(file);
});

async function sendAnalysisRequest(jobText?: string, jobSource?: string): Promise<void> {
  const resultEl = document.getElementById("result")!;
  resultEl.innerHTML = "Analysiere\u2026";
  try {
    const response = await chrome.runtime.sendMessage({
      action: "ANALYZE_JOB",
      payload: { jobText: jobText ?? "", jobSource: jobSource ?? "" },
    });
    if (!response || response.error) {
      resultEl.innerHTML = `<span style="color:#c62828">${response?.error ?? "Fehler"}</span>`;
      return;
    }
    const r = response.result;
    const scoreClass = r.score >= 7 ? "high" : r.score >= 4 ? "mid" : "low";
    const scoreColor = scoreClass === "high" ? "#2e7d32" : scoreClass === "mid" ? "#c66900" : "#c62828";
    let html = `<div class="score" style="color:${scoreColor}">${r.score}/10</div>`;
    html += `<div class="reasoning">${esc(r.reasoning)}</div>`;
    if (r.matchedSkills?.length) {
      html += `<div class="list"><strong>Passend:</strong> ${r.matchedSkills.map(esc).join(", ")}</div>`;
    }
    if (r.missingSkills?.length) {
      html += `<div class="list"><strong>Fehlend:</strong> ${r.missingSkills.map(esc).join(", ")}</div>`;
    }
    if (r.coverLetter) {
      html += `<hr><textarea readonly style="width:100%;border:1px solid var(--border);border-radius:4px;padding:8px;font:inherit;font-size:12px;resize:vertical;min-height:120px;box-sizing:border-box">${esc(r.coverLetter)}</textarea>`;
    }
    resultEl.innerHTML = html;
  } catch (e) {
    resultEl.innerHTML = `<span style="color:#c62828">${e instanceof Error ? e.message : "Unbekannter Fehler"}</span>`;
  }
}

document.getElementById("analyzeBtn")!.addEventListener("click", () => {
  void sendAnalysisRequest();
});

document.getElementById("manualAnalyzeBtn")!.addEventListener("click", () => {
  const input = document.getElementById("manualJobInput") as HTMLTextAreaElement;
  const text = input.value.trim();
  if (!text) return;
  void sendAnalysisRequest(text, "Manuelle Eingabe");
});

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
