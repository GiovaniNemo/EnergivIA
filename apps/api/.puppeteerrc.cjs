const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Salva o Chrome dentro da pasta node_modules/.cache do próprio projeto
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
};