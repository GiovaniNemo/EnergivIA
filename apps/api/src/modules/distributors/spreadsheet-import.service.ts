import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as xlsx from 'xlsx';

@Injectable()
export class SpreadsheetImportService {
  private readonly logger = new Logger(SpreadsheetImportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importSpreadsheet(distributorId: string, fileBuffer: Buffer) {
    this.logger.log(`Iniciando importação de planilha para distribuidor: ${distributorId}`);

    // Ler o buffer usando xlsx
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    
    if (!sheetName) {
      throw new Error('Nenhuma aba encontrada na planilha.');
    }

    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      throw new Error('Aba não encontrada ou inválida na planilha.');
    }

    // Converter aba para JSON (array de arrays)
    const rows = xlsx.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
    
    if (rows.length < 2) {
      throw new Error('Planilha vazia ou sem dados válidos.');
    }

    // Procurar a linha de cabeçalho nas primeiras 20 linhas
    let headerRowIndex = -1;
    let codIndex = -1, produtoIndex = -1, marcaIndex = -1, precoIndex = -1;
    const normalizeStr = (str: unknown) => str ? String(str).trim().toLowerCase() : '';

    for (let r = 0; r < Math.min(rows.length, 20); r++) {
      const row = rows[r] as unknown[];
      if (!row) continue;
      
      let tempCod = -1, tempProd = -1, tempMarca = -1, tempPreco = -1;
      
      for (let i = 0; i < row.length; i++) {
        const h = normalizeStr(row[i]);
        if (h === 'cod' || h === 'código' || h === 'codigo') tempCod = i;
        if (h.includes('produto') || h.includes('descri')) tempProd = i;
        if (h.includes('marca')) tempMarca = i;
        if (h.includes('preço') || h.includes('preco') || h.includes('valor')) tempPreco = i;
      }
      
      // Se achou pelo menos PRODUTO, consideramos como a linha de cabeçalho
      if (tempProd !== -1) {
        headerRowIndex = r;
        codIndex = tempCod;
        produtoIndex = tempProd;
        marcaIndex = tempMarca;
        precoIndex = tempPreco;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Não foi possível encontrar a coluna de produtos (cabeçalho).');
    }

    // Fallbacks para colunas que não foram encontradas (baseado no formato Edeltec padrão)
    if (codIndex === -1) codIndex = 0; // Coluna A
    if (marcaIndex === -1) marcaIndex = 4; // Coluna E
    if (precoIndex === -1) precoIndex = 7; // Coluna H (geralmente não tem cabeçalho escrito)

    let itemsProcessed = 0;
    let itemsUpdated = 0;
    let itemsCreated = 0;
    let skippedReason = '';

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r] as unknown[];
      if (!row || !row[produtoIndex]) {
        if (!skippedReason) skippedReason = `Linha ${r+1}: Coluna PRODUTO vazia.`;
        continue;
      }

      const produtoStr = String(row[produtoIndex]).trim();
      if (!produtoStr) {
        if (!skippedReason) skippedReason = `Linha ${r+1}: PRODUTO vazio.`;
        continue;
      }

      const codStr = row[codIndex] ? String(row[codIndex]).trim() : '';
      let marcaStr = row[marcaIndex] ? String(row[marcaIndex]).trim() : '';
      let precoRaw = row[precoIndex];

      // Busca dinâmica pelo preço caso a coluna definida esteja vazia ou não seja numérica
      if (!precoRaw || (typeof precoRaw !== 'number' && !String(precoRaw).match(/[\d,.]+/))) {
        for (let i = row.length - 1; i >= 0; i--) {
          if (i === codIndex || i === produtoIndex || i === marcaIndex) continue;
          const val = row[i];
          if (typeof val === 'number') {
            precoRaw = val;
            break;
          }
          if (typeof val === 'string' && val.match(/^\s*[\d.]+,[\d]{2}\s*$/)) {
            precoRaw = val;
            break;
          }
        }
      }

      // 1. Tratamento da Marca (fallback se vazia)
      if (!marcaStr || marcaStr.toLowerCase() === 'undefined') {
        // Exemplo: "MODULO SOLAR OSDA 155W..." -> pegar a 3ª palavra
        const palavras = produtoStr.split(' ');
        if (palavras.length >= 3 && produtoStr.toUpperCase().includes('MODULO SOLAR')) {
          marcaStr = palavras[2] || 'Genérica';
        } else {
          marcaStr = 'Genérica';
        }
      }

      // 2. Tratamento do Preço
      let price = 0;
      if (typeof precoRaw === 'number') {
        price = precoRaw;
      } else if (typeof precoRaw === 'string') {
        price = parseFloat(precoRaw.replace(/\./g, '').replace(',', '.'));
      }
      
      if (isNaN(price) || price <= 0) {
         if (!skippedReason) skippedReason = `Linha ${r+1} (${produtoStr}): Preço inválido (${precoRaw}).`;
         continue; // Ignorar itens sem preço válido
      }

      // 3. Inferir Categoria
      let catName = 'Outros';
      const prodLower = produtoStr.toLowerCase();
      if (prodLower.includes('modulo') || prodLower.includes('painel') || prodLower.includes('placa')) catName = 'module';
      else if (prodLower.includes('microinversor') || prodLower.includes('micro')) catName = 'microinverter';
      else if (prodLower.includes('inversor')) catName = 'inverter';
      else if (prodLower.includes('cabo')) catName = 'dc_cable';
      else if (prodLower.includes('conector')) catName = 'connector';
      else if (prodLower.includes('estrutura')) catName = 'structure_kit';

      // --- Operações de Banco ---
      
      // Upsert Marca
      let brand = await this.prisma.brand.findFirst({
        where: { name: { equals: marcaStr, mode: 'insensitive' } },
      });
      if (!brand) {
        brand = await this.prisma.brand.create({ data: { name: marcaStr } });
      }

      // Upsert Categoria
      let category = await this.prisma.category.findFirst({
        where: { name: { equals: catName, mode: 'insensitive' } },
      });
      if (!category) {
        category = await this.prisma.category.create({ data: { name: catName } });
      }

      // Buscar Produto pelo Nome
      let product = await this.prisma.product.findFirst({
        where: { name: { equals: produtoStr, mode: 'insensitive' } },
      });

      if (!product) {
        product = await this.prisma.product.create({
          data: {
            name: produtoStr,
            brandId: brand.id,
            categoryId: category.id,
            specs: {}, // Specs vazias por enquanto
          },
        });
      }

      // Upsert DistributorProduct (usando unique index)
      const existingOffer = await this.prisma.distributorProduct.findUnique({
        where: {
          distributorId_productId: {
            distributorId,
            productId: product.id,
          },
        },
      });

      if (existingOffer) {
        await this.prisma.distributorProduct.update({
          where: { id: existingOffer.id },
          data: {
            price,
            stockQuantity: 999, // Conforme alinhado
            distributorSku: codStr || existingOffer.distributorSku,
            lastPriceUpdate: new Date(),
          },
        });
        itemsUpdated++;
      } else {
        await this.prisma.distributorProduct.create({
          data: {
            distributorId,
            productId: product.id,
            price,
            stockQuantity: 999,
            distributorSku: codStr,
            lastPriceUpdate: new Date(),
          },
        });
        itemsCreated++;
      }

      itemsProcessed++;
    }

    return {
      success: true,
      message: `Planilha importada com sucesso. Total: ${itemsProcessed}. Novos: ${itemsCreated}. Atualizados: ${itemsUpdated}.${itemsProcessed === 0 && skippedReason ? ' Motivo do primeiro erro: ' + skippedReason : ''}`,
    };
  }
}
