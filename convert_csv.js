const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'hsp_brasil_todos_municipios.csv');
const dataDir = path.join(__dirname, 'apps', 'web', 'src', 'data');
const jsonPath = path.join(dataDir, 'hsp-brasil.json');

// Ensure data dir exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const csv = fs.readFileSync(csvPath, 'utf8');
const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Remove header
const header = lines.shift();

const result = {};

const normalizeString = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
};

for (const line of lines) {
    // csv format: codigo_ibge,cidade,uf,latitude,longitude,hsp_medio_anual,temp_min_historica
    const parts = line.split(',');
    if (parts.length >= 6) {
        const cidade = parts[1];
        const uf = parts[2];
        const lat = parseFloat(parts[3]);
        const lon = parseFloat(parts[4]);
        const hsp = parseFloat(parts[5]);
        
        const key = `${normalizeString(cidade)}-${normalizeString(uf)}`;
        result[key] = {
            hsp,
            lat,
            lon
        };
    }
}

fs.writeFileSync(jsonPath, JSON.stringify(result, null, 0)); // minify JSON
console.log(`Converted ${Object.keys(result).length} cities to JSON at ${jsonPath}`);
