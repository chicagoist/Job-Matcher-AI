import { build, context } from "esbuild";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, "src");
const DIST = path.join(ROOT, "dist");
const WATCH = process.argv.includes("--watch");

async function clean() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });
}

async function copyStatic() {
  const entries = [
    ["src/manifest.json", "manifest.json"],
    ["src/options/options.html", "options.html"],
    ["src/options/options.css", "options.css"],
    ["src/popup/popup.html", "popup.html"],
    ["src/popup/popup.css", "popup.css"],

    ["icon.png", "icon.png"],
  ];
  for (const [from, to] of entries) {
    const srcPath = path.join(ROOT, from);
    const dstPath = path.join(DIST, to);
    if (!existsSync(srcPath)) continue;
    await mkdir(path.dirname(dstPath), { recursive: true });
    await copyFile(srcPath, dstPath);
  }

  const pdfjsWorkerSrc = path.join(ROOT, "node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const pdfjsWorkerDst = path.join(DIST, "pdf.worker.mjs");
  await copyFile(pdfjsWorkerSrc, pdfjsWorkerDst);
}

const common = {
  bundle: true,
  format: "iife",
  target: ["firefox128"],
  logLevel: "info",
  sourcemap: false,
  minify: !WATCH,
};

const targets = [
  {
    ...common,
    entryPoints: [path.join(SRC, "background/service-worker.js")],
    outfile: path.join(DIST, "background.js"),
  },
  {
    ...common,
    entryPoints: [path.join(SRC, "popup/popup.js")],
    outfile: path.join(DIST, "popup.js"),
  },
  {
    ...common,
    entryPoints: [path.join(SRC, "options/options.js")],
    outfile: path.join(DIST, "options.js"),
  },
];

await clean();
await copyStatic();

if (WATCH) {
  const ctxs = await Promise.all(targets.map((t) => context(t)));
  await Promise.all(ctxs.map((c) => c.watch()));
  console.log("[esbuild] watching\u2026");
} else {
  await Promise.all(targets.map((t) => build(t)));
  console.log("[esbuild] build complete \u2192", DIST);
}
