# Job Matcher AI - Developer Skills & Recipes

This document lists the commands, processes, and recipes for building, testing, linting, packaging, and installing the extension locally.

---

## 1. Development Scripts

The following NPM scripts are defined in `package.json`:

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `npm run build` | `node esbuild.config.mjs` | Builds the production bundle of the extension assets into `dist/`. |
| `npm run build:watch` | `node esbuild.config.mjs --watch` | Builds extension in watch mode, compiling files on change. |
| `npm run lint:ext` | `web-ext lint --source-dir=dist` | Runs the Mozilla addon linter on compiled assets to check for errors/warnings. |
| `npm test` | `vitest run` | Runs the test suites once. |
| `npm run test:watch` | `vitest` | Runs the test suites in watch mode. |
| `npm run package` | *custom sequence* | Compiles the production build and compresses it into a ZIP file in `web-ext-artifacts/`. |
| `npm run clean` | `rimraf dist web-ext-artifacts` | Deletes the build output and artifact directories. |

---

## 2. Testing & Quality Control

### Unit Tests
- Testing framework: **Vitest**
- Tests are located in the `tests/` folder.
- Execute unit tests using:
  ```bash
  npm test
  ```

### Static Analysis & Linting
- Always run the extension linter before packaging.
- Ensure the output reports **0 errors** and **0 warnings**:
  ```bash
  npm run lint:ext
  ```

---

## 3. Packaging & Sign-off

To build a fresh release artifact ready for Firefox Add-ons (AMO) upload:
```bash
npm run package
```
This script creates a ZIP file under `web-ext-artifacts/` named `job_matcher_ai-[version].zip`.

### Self-Signing (Optional)
If you wish to sign the addon locally using Mozilla's API key:
```bash
AMO_JWT_ISSUER="YOUR_ISSUER_KEY" \
AMO_JWT_SECRET="YOUR_SECRET_KEY" \
npx web-ext sign --source-dir=dist --artifacts-dir=web-ext-artifacts
```

---

## 4. Local Installation in Firefox (Unsigned)

For development and debugging:
1. Open Firefox and type `about:debugging#/runtime/this-firefox` in the URL bar.
2. Click **Load Temporary Add-on...** (Temporäres Add-on laden...).
3. Select the `dist/manifest.json` file.
4. Keep the DevTools open to view background console messages and network traffic.
