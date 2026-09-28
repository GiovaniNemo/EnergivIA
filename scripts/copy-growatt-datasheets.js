const fs = require("fs");
const path = require("path");

const srcDir = path.resolve(__dirname, "..", "temp-datasheets");
const destDir = path.resolve(__dirname, "..", "apps", "web", "public", "datasheets", "growatt");

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

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

const files = scanDir(srcDir);
console.log(`Encontrados ${files.length} arquivos PDF.`);

const copied = [];
for (const f of files) {
  const base = path.basename(f);
  const clean = cleanFileName(base);
  const target = path.join(destDir, clean);
  fs.copyFileSync(f, target);
  copied.push({ original: base, clean, path: `/datasheets/growatt/${clean}` });
  console.log(`✓ Copiado: "${base}" -> "/datasheets/growatt/${clean}"`);
}

fs.writeFileSync(path.join(destDir, "manifest.json"), JSON.stringify(copied, null, 2), "utf-8");
console.log("Manifest salvo com sucesso!");
