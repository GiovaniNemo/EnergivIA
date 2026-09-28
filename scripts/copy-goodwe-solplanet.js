const fs = require("fs");
const path = require("path");

function cleanFileName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function scanDir(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(scanDir(fullPath));
    } else if (file.toLowerCase().endsWith(".pdf")) {
      results.push(fullPath);
    }
  }
  return results;
}

function processBrand(brandKey, sourceFolder) {
  const srcDir = path.resolve(__dirname, "..", "temp-datasheets", sourceFolder);
  const destDir = path.resolve(__dirname, "..", "apps", "web", "public", "datasheets", brandKey);

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const files = scanDir(srcDir);
  console.log(`[${brandKey.toUpperCase()}] Encontrados ${files.length} arquivos PDF.`);

  const copied = [];
  for (const f of files) {
    const base = path.basename(f);
    const clean = cleanFileName(base);
    const target = path.join(destDir, clean);
    fs.copyFileSync(f, target);
    const relativeUrl = `/datasheets/${brandKey}/${clean}`;
    copied.push({ original: base, clean, path: relativeUrl, originalFullPath: f });
    console.log(`✓ [${brandKey}] "${base}" -> "${relativeUrl}"`);
  }

  fs.writeFileSync(path.join(destDir, "manifest.json"), JSON.stringify(copied, null, 2), "utf-8");
  console.log(
    `[${brandKey.toUpperCase()}] Manifest salvo com sucesso (${copied.length} arquivos).`
  );
  return copied;
}

const goodweManifest = processBrand("goodwe", "DATASHEETS GOODWE");
const solplanetManifest = processBrand("solplanet", "DATASHEETS SOLPLANET");

console.log(
  `\nProcessamento concluído: ${goodweManifest.length} GoodWe e ${solplanetManifest.length} Solplanet.`
);
