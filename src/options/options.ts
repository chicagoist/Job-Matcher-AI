import {
  getApiKey,
  setApiKey,
  clearApiKey,
  setModel,
  getModel,
  setThreshold,
  getThreshold,
  getCv,
  clearCv as clearStoredCv,
  getHistory,
  clearHistory as clearStoredHistory,
} from "../shared/storage.js";
import type { HistoryEntry } from "../shared/types.js";
import { DEFAULTS } from "../shared/constants.js";
import { formatBytes } from "../shared/utils.js";

async function init(): Promise<void> {
  const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  const saveKey = document.getElementById("saveKey") as HTMLButtonElement;
  const clearKeyBtn = document.getElementById("clearKey") as HTMLButtonElement;
  const keyStatus = document.getElementById("keyStatus") as HTMLElement;
  const model = document.getElementById("model") as HTMLSelectElement;
  const threshold = document.getElementById("threshold") as HTMLInputElement;
  const thresholdLabel = document.getElementById("thresholdLabel") as HTMLElement;
  const cvInfo = document.getElementById("cvInfo") as HTMLElement;
  const clearCvBtn = document.getElementById("clearCv") as HTMLButtonElement;
  const historyList = document.getElementById("history") as HTMLElement;
  const clearHistoryBtn = document.getElementById("clearHistory") as HTMLButtonElement;

  const currentKey = await getApiKey();
  apiKeyInput.value = currentKey ?? "";
  keyStatus.textContent = currentKey ? "Schlüssel hinterlegt." : "Kein Schlüssel hinterlegt.";
  keyStatus.dataset.state = currentKey ? "ok" : "";

  const currentModel = await getModel();
  model.value = [DEFAULTS.model, "gemini-2.5-pro", "gemini-2.0-flash"].includes(currentModel)
    ? currentModel
    : DEFAULTS.model;

  const currentThreshold = await getThreshold();
  threshold.value = String(currentThreshold);
  thresholdLabel.textContent = String(currentThreshold);

  const cv = await getCv();
  if (cv) {
    cvInfo.textContent = `Hochgeladen: ${cv.meta.fileName} (${formatBytes(cv.meta.sizeBytes)})`;
  }

  const entries = await getHistory();
  renderHistory(historyList, entries);

  saveKey.addEventListener("click", async () => {
    const v = apiKeyInput.value.trim();
    if (!v) {
      keyStatus.textContent = "Bitte einen Schlüssel eingeben.";
      keyStatus.dataset.state = "err";
      return;
    }
    await setApiKey(v);
    keyStatus.textContent = "Gespeichert.";
    keyStatus.dataset.state = "ok";
  });

  clearKeyBtn.addEventListener("click", async () => {
    await clearApiKey();
    apiKeyInput.value = "";
    keyStatus.textContent = "Schlüssel entfernt.";
    keyStatus.dataset.state = "";
  });

  model.addEventListener("change", async () => {
    await setModel(model.value);
  });

  threshold.addEventListener("input", () => {
    thresholdLabel.textContent = threshold.value;
  });
  threshold.addEventListener("change", async () => {
    await setThreshold(parseInt(threshold.value, 10));
  });

  clearCvBtn.addEventListener("click", async () => {
    await clearStoredCv();
    cvInfo.textContent = "Kein Lebenslauf hochgeladen.";
  });

  clearHistoryBtn.addEventListener("click", async () => {
    await clearStoredHistory();
    renderHistory(historyList, []);
  });
}

function renderHistory(target: HTMLElement, entries: HistoryEntry[]): void {
  target.replaceChildren();
  if (entries.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Kein Verlauf vorhanden.";
    target.append(li);
    return;
  }
  for (const e of entries) {
    const li = document.createElement("li");
    const left = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${e.score}/10 – ${e.jobTitle ?? "Stelle"}`;
    left.append(title);
    if (e.company) {
      const c = document.createElement("div");
      c.textContent = e.company;
      left.append(c);
    }
    const meta = document.createElement("small");
    meta.textContent = new Date(e.createdAt).toLocaleString("de-DE");
    li.append(left, meta);
    target.append(li);
  }
}

void init();
