import {
  getApiKey,
  setApiKey,
  clearApiKey,
  getOllamaHost,
  setOllamaHost,
  getProvider,
  setProvider,
  getOllamaModel,
  setOllamaModel,
  getGeminiModel,
  setGeminiModel,
  setThreshold,
  getThreshold,
  getCv,
  setCv as storeCv,
  clearCv as clearStoredCv,
  getHistory,
  clearHistory as clearStoredHistory,
  getAllowCloudFallback,
  setAllowCloudFallback,
} from "../shared/storage.js";
import type { HistoryEntry } from "../shared/types.js";
import { DEFAULTS } from "../shared/constants.js";
import { formatBytes } from "../shared/utils.js";

async function init(): Promise<void> {
  const apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
  const saveKey = document.getElementById("saveKey") as HTMLButtonElement;
  const clearKeyBtn = document.getElementById("clearKey") as HTMLButtonElement;
  const keyStatus = document.getElementById("keyStatus") as HTMLElement;
  const providerSelect = document.getElementById("provider") as HTMLSelectElement;
  const ollamaSection = document.getElementById("ollamaSection") as HTMLElement;
  const geminiSection = document.getElementById("geminiSection") as HTMLElement;
  const ollamaHostInput = document.getElementById("ollamaHost") as HTMLInputElement;
  const saveOllamaHostBtn = document.getElementById("saveOllamaHost") as HTMLButtonElement;
  const ollamaHostStatus = document.getElementById("ollamaHostStatus") as HTMLElement;
  const ollamaModelSelect = document.getElementById("ollamaModel") as HTMLSelectElement;
  const refreshModelsBtn = document.getElementById("refreshModels") as HTMLButtonElement;
  const allowCloudFallbackCheckbox = document.getElementById("allowCloudFallback") as HTMLInputElement;
  const threshold = document.getElementById("threshold") as HTMLInputElement;
  const thresholdLabel = document.getElementById("thresholdLabel") as HTMLElement;
  const cvInfo = document.getElementById("cvInfo") as HTMLElement;
  const clearCvBtn = document.getElementById("clearCv") as HTMLButtonElement;
  const historyList = document.getElementById("history") as HTMLElement;
  const clearHistoryBtn = document.getElementById("clearHistory") as HTMLButtonElement;

  const provider = await getProvider();
  providerSelect.value = provider;
  toggleProviderSections(provider, ollamaSection, geminiSection);

  const currentKey = await getApiKey();
  apiKeyInput.value = currentKey ?? "";
  keyStatus.textContent = currentKey ? "Schlüssel hinterlegt." : "Kein Schlüssel hinterlegt.";
  keyStatus.dataset.state = currentKey ? "ok" : "";

  const host = await getOllamaHost();
  ollamaHostInput.value = host;

  const [ollamaModel, geminiModel] = await Promise.all([getOllamaModel(), getGeminiModel()]);
  await populateOllamaModels(ollamaModelSelect, host, ollamaModel);
  const geminiModelSelect = document.getElementById("geminiModel") as HTMLSelectElement;
  geminiModelSelect.value = geminiModel;

  const allowFallback = await getAllowCloudFallback();
  allowCloudFallbackCheckbox.checked = allowFallback;

  const currentThreshold = await getThreshold();
  threshold.value = String(currentThreshold);
  thresholdLabel.textContent = String(currentThreshold);

  const cv = await getCv();
  if (cv) {
    cvInfo.textContent = `Hochgeladen: ${cv.meta.fileName} (${formatBytes(cv.meta.sizeBytes)})`;
  }

  const entries = await getHistory();
  renderHistory(historyList, entries);

  providerSelect.addEventListener("change", async () => {
    await setProvider(providerSelect.value);
    toggleProviderSections(providerSelect.value, ollamaSection, geminiSection);
    if (providerSelect.value === "gemini") {
      await setGeminiModel(DEFAULTS.geminiModel);
      geminiModelSelect.value = DEFAULTS.geminiModel;
    } else {
      await setOllamaModel(DEFAULTS.ollamaModel);
      ollamaModelSelect.value = DEFAULTS.ollamaModel;
    }
  });

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

  saveOllamaHostBtn.addEventListener("click", async () => {
    const v = ollamaHostInput.value.trim();
    if (!v) {
      ollamaHostStatus.textContent = "Bitte eine gültige Adresse eingeben.";
      ollamaHostStatus.dataset.state = "err";
      return;
    }
    await setOllamaHost(v);
    ollamaHostStatus.textContent = "Gespeichert.";
    ollamaHostStatus.dataset.state = "ok";
    await populateOllamaModels(ollamaModelSelect, v, ollamaModelSelect.value);
  });

  ollamaModelSelect.addEventListener("change", async () => {
    await setOllamaModel(ollamaModelSelect.value);
  });

  geminiModelSelect.addEventListener("change", async () => {
    await setGeminiModel(geminiModelSelect.value);
  });

  allowCloudFallbackCheckbox.addEventListener("change", async () => {
    await setAllowCloudFallback(allowCloudFallbackCheckbox.checked);
  });

  refreshModelsBtn.addEventListener("click", async () => {
    const host = await getOllamaHost();
    await populateOllamaModels(ollamaModelSelect, host, ollamaModelSelect.value);
  });

  threshold.addEventListener("input", () => {
    thresholdLabel.textContent = threshold.value;
  });
  threshold.addEventListener("change", async () => {
    await setThreshold(parseInt(threshold.value, 10));
  });

  const optionsFileInput = document.getElementById("optionsFileInput") as HTMLInputElement;
  optionsFileInput.addEventListener("change", async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await storeCv(String(reader.result), file.name);
      const cv = await getCv();
      if (cv) {
        cvInfo.textContent = `Hochgeladen: ${cv.meta.fileName} (${formatBytes(cv.meta.sizeBytes)})`;
      }
    };
    reader.readAsDataURL(file);
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

function toggleProviderSections(
  provider: string,
  ollamaSection: HTMLElement,
  geminiSection: HTMLElement,
): void {
  ollamaSection.style.display = provider === "ollama" ? "" : "none";
  geminiSection.style.display = provider === "gemini" ? "" : "none";
}

async function populateOllamaModels(
  select: HTMLSelectElement,
  host: string,
  currentModel: string,
): Promise<void> {
  select.innerHTML = '<option value="">Lade Modelle…</option>';
  select.disabled = true;
  try {
    const res = await fetch(`${host.replace(/\/+$/, "")}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { models?: { name: string }[] };
    const models = json.models ?? [];
    select.innerHTML = "";
    if (models.length === 0) {
      select.innerHTML = '<option value="">Keine Modelle gefunden</option>';
    } else {
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m.name;
        opt.textContent = m.name;
        if (m.name === currentModel) opt.selected = true;
        select.append(opt);
      }
      if (!select.value && models.length > 0) {
        select.options[0].selected = true;
        await setOllamaModel(select.value);
      }
    }
  } catch {
    select.innerHTML = '<option value="">Ollama nicht erreichbar</option>';
  } finally {
    select.disabled = false;
  }
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
    title.textContent = `${e.score}/10 \u2013 ${e.jobTitle ?? "Stelle"}`;
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
