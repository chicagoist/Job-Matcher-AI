import { DEFAULTS } from "../shared/constants.js";
import { formatBytes } from "../shared/utils.js";
import {
  getApiKey, setApiKey, clearApiKey,
  getModel, setModel,
  getThreshold, setThreshold,
  getCv, setCv, clearCv as clearStoredCv,
  getHistory, clearHistory as clearStoredHistory,
} from "../shared/storage.js";

async function init() {
  const apiKeyInput = document.getElementById("apiKey");
  const saveKey = document.getElementById("saveKey");
  const clearKeyBtn = document.getElementById("clearKey");
  const keyStatus = document.getElementById("keyStatus");
  const model = document.getElementById("model");
  const threshold = document.getElementById("threshold");
  const thresholdLabel = document.getElementById("thresholdLabel");
  const cvInfo = document.getElementById("cvInfo");
  const clearCvBtn = document.getElementById("clearCv");
  const historyList = document.getElementById("history");
  const clearHistoryBtn = document.getElementById("clearHistory");
  const optionsFileInput = document.getElementById("optionsFileInput");

  const currentKey = await getApiKey();
  apiKeyInput.value = currentKey ?? "";
  keyStatus.textContent = currentKey ? "Schl\u00fcssel hinterlegt." : "Kein Schl\u00fcssel hinterlegt.";
  keyStatus.dataset.state = currentKey ? "ok" : "";

  const currentModel = await getModel();
  model.value = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"].includes(currentModel)
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
      keyStatus.textContent = "Bitte einen Schl\u00fcssel eingeben.";
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
    keyStatus.textContent = "Schl\u00fcssel entfernt.";
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

  optionsFileInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      cvInfo.textContent = "Nur PDF-Dateien werden unterst\u00fctzt.";
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await setCv(reader.result, file.name);
      const cv = await getCv();
      cvInfo.textContent = `Hochgeladen: ${cv.meta.fileName} (${formatBytes(cv.meta.sizeBytes)})`;
    };
    reader.onerror = () => {
      cvInfo.textContent = "Fehler beim Lesen der Datei.";
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

function renderHistory(target, entries) {
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
