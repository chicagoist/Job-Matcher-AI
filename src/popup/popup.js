

async function showSetup() {
  const r = await chrome.storage.local.get("geminiKey");
  const key = r.geminiKey;
  const hasKey = typeof key === "string" && key.length > 0;
  document.getElementById("setup").hidden = hasKey;
  document.getElementById("main").hidden = !hasKey;
  if (hasKey) updateCvStatus();
}

async function updateCvStatus() {
  const r = await chrome.storage.local.get(["cvFileName", "cvUploadedAt"]);
  const el = document.getElementById("cvStatus");
  if (r.cvFileName) {
    const date = r.cvUploadedAt ? new Date(r.cvUploadedAt).toLocaleDateString("de-DE") : "";
    el.textContent = "\u2713 " + r.cvFileName + (date ? " (" + date + ")" : "");
    el.style.color = "var(--purple)";
  } else {
    el.textContent = "Kein Lebenslauf hinterlegt.";
    el.style.color = "var(--muted)";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  showSetup();
  startWindowConstrainer();
});

document.getElementById("saveKey").addEventListener("click", async () => {
  const input = document.getElementById("apiKey");
  const val = input.value.trim();
  if (!val) return;
  await chrome.storage.local.set({ geminiKey: val });
  document.getElementById("setup").hidden = true;
  document.getElementById("main").hidden = false;
  updateCvStatus();
});

document.getElementById("changeKey").addEventListener("click", () => {
  document.getElementById("setup").hidden = false;
  document.getElementById("main").hidden = true;
});

document.getElementById("openOptions").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("options.html") });
});

document.getElementById("uploadBtn").addEventListener("click", () => {
  document.getElementById("fileInput").click();
});

document.getElementById("fileInput").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    document.getElementById("result").innerHTML =
      '<span class="err">Nur PDF-Dateien werden unterst\u00fctzt.</span>';
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    await chrome.storage.local.set({
      cvData: reader.result,
      cvFileName: file.name,
      cvUploadedAt: Date.now(),
    });
    updateCvStatus();
  };
  reader.onerror = () => {
    document.getElementById("result").innerHTML =
      '<span class="err">Fehler beim Lesen der Datei.</span>';
  };
  reader.readAsDataURL(file);
});

document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const resultEl = document.getElementById("result");
  resultEl.innerHTML = "Analysiere\u2026";

  try {
    // Background script finds the active web tab itself.
    const response = await chrome.runtime.sendMessage({
      action: "ANALYZE_JOB",
    });
    if (!response || response.error) {
      resultEl.innerHTML = '<span style="color:#c62828">' + esc(response?.error ?? "Fehler") + "</span>";
      return;
    }
    const r = response.result;
    const scoreColor = r.score >= 7 ? "#2e7d32" : r.score >= 4 ? "#c66900" : "#c62828";
    let html = '<div class="score" style="color:' + scoreColor + '">' + r.score + "/10</div>";
    html += '<div class="reasoning">' + esc(r.reasoning) + "</div>";
    if (r.matchedSkills?.length) {
      html +=
        '<div class="list"><strong>Passend:</strong> ' +
        r.matchedSkills.map(esc).join(", ") +
        "</div>";
    }
    if (r.missingSkills?.length) {
      html +=
        '<div class="list"><strong>Fehlend:</strong> ' +
        r.missingSkills.map(esc).join(", ") +
        "</div>";
    }
    if (r.coverLetter) {
      html +=
        '<hr><textarea readonly style="width:100%;border:1px solid #d8d4d0;border-radius:4px;padding:8px;font:inherit;font-size:12px;resize:vertical;min-height:120px;box-sizing:border-box">' +
        esc(r.coverLetter) +
        "</textarea>";
    }
    resultEl.innerHTML = html;
  } catch (e) {
    resultEl.innerHTML =
      '<span style="color:#c62828">' + esc(e instanceof Error ? e.message : "Unbekannter Fehler") + "</span>";
  }
});

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

async function startWindowConstrainer() {
  setInterval(async () => {
    try {
      const currWin = await chrome.windows.getCurrent();
      const allWindows = await chrome.windows.getAll({ populate: false });
      const normalWindows = allWindows.filter((w) => w.type === "normal");
      if (normalWindows.length === 0) return;

      const mainWin = normalWindows.find((w) => w.focused) || normalWindows[normalWindows.length - 1];

      if (
        typeof mainWin.left !== "number" ||
        typeof mainWin.width !== "number" ||
        typeof mainWin.top !== "number" ||
        typeof mainWin.height !== "number" ||
        typeof currWin.left !== "number" ||
        typeof currWin.width !== "number" ||
        typeof currWin.top !== "number" ||
        typeof currWin.height !== "number"
      ) {
        return;
      }

      let nextLeft = currWin.left;
      let nextTop = currWin.top;
      let changed = false;

      const minLeft = mainWin.left;
      const maxLeft = mainWin.left + mainWin.width - currWin.width;
      const minTop = mainWin.top;
      const maxTop = mainWin.top + mainWin.height - currWin.height;

      if (currWin.left < minLeft) {
        nextLeft = minLeft;
        changed = true;
      } else if (currWin.left > maxLeft) {
        nextLeft = maxLeft;
        changed = true;
      }

      if (currWin.top < minTop) {
        nextTop = minTop;
        changed = true;
      } else if (currWin.top > maxTop) {
        nextTop = maxTop;
        changed = true;
      }

      if (changed) {
        await chrome.windows.update(currWin.id, {
          left: Math.round(nextLeft),
          top: Math.round(nextTop)
        });
      }
    } catch {
      // Ignore
    }
  }, 150);
}
