const fs = require("fs");
const path = require("path");

const baseDir = path.resolve(__dirname, "..", "temp-datasheets");
const growattDir = path.join(baseDir, "DATASHEETS GROWATT");
const goodweDir = path.join(baseDir, "DATASHEETS GOODWE");
const solplanetDir = path.join(baseDir, "DATASHEETS SOLPLANET");

if (!fs.existsSync(growattDir)) fs.mkdirSync(growattDir, { recursive: true });
if (!fs.existsSync(goodweDir)) fs.mkdirSync(goodweDir, { recursive: true });
if (!fs.existsSync(solplanetDir)) fs.mkdirSync(solplanetDir, { recursive: true });

const items = fs.readdirSync(baseDir);
for (const item of items) {
  if (
    ["DATASHEETS GROWATT", "DATASHEETS GOODWE", "DATASHEETS SOLPLANET", "README.md"].includes(item)
  ) {
    continue;
  }
  const itemPath = path.join(baseDir, item);
  if (fs.statSync(itemPath).isDirectory()) {
    const destPath = path.join(growattDir, item);
    fs.renameSync(itemPath, destPath);
    console.log(`Movido: ${item} -> DATASHEETS GROWATT/${item}`);
  }
}

console.log("Organização concluída com sucesso!");
