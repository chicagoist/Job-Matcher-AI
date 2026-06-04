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

async function showSetup(): Promise<void> {
  const key = await get<string>(STORAGE_KEYS.apiKey);
  document.getElementById("setup")!.hidden = !!key;
  document.getElementById("main")!.hidden = !key;
}

document.addEventListener("DOMContentLoaded", () => {
  void showSetup();
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
    el.textContent = `✓ Lebenslauf: ${name}`;
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

document.getElementById("analyzeBtn")!.addEventListener("click", async () => {
  const resultEl = document.getElementById("result")!;
  resultEl.innerHTML = "Analysiere…";
  try {
    const response = await chrome.runtime.sendMessage({ action: "ANALYZE_JOB" });
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
});

function esc(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}
