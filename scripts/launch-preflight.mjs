import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const errors = [];
const warnings = [];

function readText(relPath) {
  const abs = path.join(ROOT, relPath);
  return fs.readFileSync(abs, "utf8");
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

function addError(message) {
  errors.push(message);
}

function addWarning(message) {
  warnings.push(message);
}

function walkFiles(dirAbs) {
  const out = [];
  const stack = [dirAbs];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === ".git") continue;
        stack.push(abs);
      } else {
        out.push(abs);
      }
    }
  }
  return out;
}

function lineHits(text, regex) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i])) {
      hits.push({ line: i + 1, text: lines[i] });
    }
    regex.lastIndex = 0;
  }
  return hits;
}

function checkRequiredFiles() {
  const required = [
    "index.html",
    "manifest.json",
    "sw.js",
    "privacy-policy.html",
    "css/style.css",
    "js/app.js",
    "js/shared/launch-config.js",
    "js/shared/haptic.js",
    "js/shared/game-ads.js",
    "vendor/three-r128.min.js"
  ];
  for (const rel of required) {
    if (!fileExists(rel)) {
      addError(`Missing required file: ${rel}`);
    }
  }
}

function checkIndexRefs() {
  const html = readText("index.html");
  const refs = [];
  const srcMatches = html.matchAll(/<script[^>]+src="([^"]+)"/g);
  const hrefMatches = html.matchAll(/<link[^>]+href="([^"]+)"/g);

  for (const m of srcMatches) refs.push(m[1]);
  for (const m of hrefMatches) refs.push(m[1]);

  const localRefs = refs.filter((ref) => !/^https?:\/\//i.test(ref) && !ref.startsWith("data:") && !ref.startsWith("#"));
  for (const ref of localRefs) {
    if (!fileExists(ref)) {
      addError(`Broken local reference in index.html: ${ref}`);
    }
  }

  if (!html.includes('navigator.serviceWorker.register("./sw.js")') && !html.includes("navigator.serviceWorker.register('./sw.js')")) {
    addError("Service worker registration is missing or not using ./sw.js");
  }
  if (!html.includes('href="privacy-policy.html"')) {
    addError("privacy-policy.html link is missing from index.html");
  }
  if (!html.includes('src="vendor/three-r128.min.js"')) {
    addError("Local three.js reference is missing in index.html");
  }
}

function checkManifest() {
  const manifest = JSON.parse(readText("manifest.json"));
  if (manifest.start_url !== "./") {
    addError(`manifest.start_url must be "./" (current: ${manifest.start_url})`);
  }
  if (manifest.scope !== "./") {
    addError(`manifest.scope must be "./" (current: ${manifest.scope})`);
  }
  if (manifest.id !== "./") {
    addError(`manifest.id must be "./" (current: ${manifest.id})`);
  }
}

function checkServiceWorkerAssets() {
  const sw = readText("sw.js");
  const refs = [];
  const matches = sw.matchAll(/'(\.\/[^']+)'/g);
  for (const m of matches) refs.push(m[1]);
  const unique = [...new Set(refs)];
  for (const ref of unique) {
    const rel = ref.replace(/^\.\//, "");
    if (!fileExists(rel)) {
      addError(`sw.js cache asset not found: ${ref}`);
    }
  }
}

function checkLaunchConfigShape() {
  const cfg = readText("js/shared/launch-config.js");
  const requiredKeys = [
    "canonicalUrl",
    "ogImageUrl",
    "enableAds",
    "adsenseClient",
    "enableAnalytics",
    "gaMeasurementId",
    "enableCrossPromo",
    "crossPromoScriptUrl"
  ];
  for (const key of requiredKeys) {
    if (!new RegExp(`\\b${key}\\b`).test(cfg)) {
      addError(`launch-config.js is missing key: ${key}`);
    }
  }
}

function checkPlaceholderPolicyContact() {
  const policy = readText("privacy-policy.html");
  if (policy.includes("support@example.com")) {
    addError("privacy-policy.html still uses placeholder contact email (support@example.com)");
  }
}

function checkForbiddenRuntimeStrings() {
  const runtimeRoots = [
    "index.html",
    "manifest.json",
    "sw.js",
    "privacy-policy.html",
    "css/style.css",
    "js",
    "vendor"
  ];

  const forbidden = [
    { label: "legacy absolute path /portal/", regex: /["']\/portal\//g },
    { label: "legacy absolute path /road-shooter/", regex: /["']\/road-shooter\//g },
    { label: "hardcoded dopabrain.com", regex: /dopabrain\.com/gi },
    { label: "hardcoded DopaBrain brand", regex: /\bDopaBrain\b/g },
    { label: "hardcoded GA4 measurement id", regex: /\bG-[A-Z0-9]{6,}\b/g },
    { label: "hardcoded AdSense client", regex: /\bca-pub-\d+\b/g }
  ];

  const fileList = [];
  for (const rootRel of runtimeRoots) {
    const abs = path.join(ROOT, rootRel);
    if (!fs.existsSync(abs)) continue;
    const stat = fs.statSync(abs);
    if (stat.isDirectory()) {
      for (const fileAbs of walkFiles(abs)) fileList.push(fileAbs);
    } else {
      fileList.push(abs);
    }
  }

  for (const abs of fileList) {
    const ext = path.extname(abs).toLowerCase();
    if (![".html", ".js", ".json", ".css", ".svg", ".txt", ".md"].includes(ext)) continue;
    const rel = path.relative(ROOT, abs).replace(/\\/g, "/");
    const text = fs.readFileSync(abs, "utf8");
    for (const rule of forbidden) {
      if (
        rel === "js/shared/launch-config.js" &&
        (rule.label === "hardcoded GA4 measurement id" || rule.label === "hardcoded AdSense client")
      ) {
        continue;
      }
      const hits = lineHits(text, rule.regex);
      for (const hit of hits) {
        addError(`${rel}:${hit.line} contains ${rule.label}`);
      }
    }
  }
}

function checkOptionalWarnings() {
  const cfg = readText("js/shared/launch-config.js");
  if (/enableAds\s*:\s*false/.test(cfg)) {
    addWarning("Ads are disabled in launch-config.js");
  }
  if (/enableAnalytics\s*:\s*false/.test(cfg)) {
    addWarning("Analytics are disabled in launch-config.js");
  }
}

function run() {
  console.log("Road Shooter launch preflight");
  console.log(`Root: ${ROOT}`);

  checkRequiredFiles();
  checkIndexRefs();
  checkManifest();
  checkServiceWorkerAssets();
  checkLaunchConfigShape();
  checkPlaceholderPolicyContact();
  checkForbiddenRuntimeStrings();
  checkOptionalWarnings();

  if (warnings.length) {
    console.log("");
    console.log("Warnings:");
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (errors.length) {
    console.log("");
    console.log("Errors:");
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    console.log("");
    console.log(`Preflight failed (${errors.length} errors, ${warnings.length} warnings).`);
    process.exit(1);
  }

  console.log("");
  console.log(`Preflight passed (${warnings.length} warnings).`);
}

run();
