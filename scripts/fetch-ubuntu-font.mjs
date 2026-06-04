import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const OUT = resolve("src/assets/fonts");
mkdirSync(OUT, { recursive: true });

const cssUrl =
  "https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,400;0,500;0,700;1,400&display=swap";

async function main() {
  const cssRes = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) Firefox/130.0" },
  });
  if (!cssRes.ok) throw new Error(`CSS fetch failed: ${cssRes.status}`);
  const cssText = await cssRes.text();

  // Split into @font-face blocks; replace remote URLs with local file names.
  const blocks = [];
  const faceRegex = /@font-face\s*\{([^}]+)\}/g;
  let m;
  while ((m = faceRegex.exec(cssText)) !== null) {
    const body = m[1];
    const urlMatch = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    const file = urlMatch[1].split("/").pop();
    const local = resolve(OUT, file);
    if (!existsSync(local)) {
      const r = await fetch(urlMatch[1]);
      if (!r.ok) throw new Error(`font fetch ${urlMatch[1]} failed: ${r.status}`);
      writeFileSync(local, Buffer.from(await r.arrayBuffer()));
    }
    const rewritten = body.replace(urlMatch[1], `./${file}`);
    blocks.push(`@font-face {${rewritten}}`);
  }

  if (blocks.length === 0) throw new Error("No @font-face blocks parsed.");
  writeFileSync(resolve(OUT, "ubuntu.css"), blocks.join("\n\n") + "\n");
  console.log(`wrote ubuntu.css with ${blocks.length} faces`);

  // Cleanup: remove woff2 files no longer referenced in ubuntu.css.
  const finalCss = readFileSync(resolve(OUT, "ubuntu.css"), "utf8");
  const referenced = new Set([...finalCss.matchAll(/\.\/([^)]+\.woff2)/g)].map((m) => m[1]));
  const fs = await import("node:fs");
  for (const f of fs.readdirSync(OUT)) {
    if (f === "ubuntu.css") continue;
    if (!referenced.has(f)) {
      fs.unlinkSync(resolve(OUT, f));
      console.log(`removed stale ${f}`);
    }
  }
}

await main();
