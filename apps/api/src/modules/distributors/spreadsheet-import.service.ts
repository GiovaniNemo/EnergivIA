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

    // Assumir que a primeira linha é o cabeçalho. Vamos procurar os índices das colunas.
    const headerRow = rows[0] as string[];
    
    // Normalizar cabeçalho para achar índices independentemente de espaços e maiúsculas
    const normalizeStr = (str: unknown) => str ? String(str).trim().toLowerCase() : '';
    
    let codIndex = -1, produtoIndex = -1, marcaIndex = -1, precoIndex = -1;
    
    // Tentativa 1: Procurar nos cabeçalhos
    for (let i = 0; i < headerRow.length; i++) {
      const h = normalizeStr(headerRow[i]);
      if (h.includes('cod')) codIndex = i;
      if (h.includes('produto') || h.includes('descri')) produtoIndex = i;
      if (h.includes('marca')) marcaIndex = i;
      if (h.includes('preço') || h.includes('preco') || h.includes('valor')) precoIndex = i;
    }

    // Tentativa 2: Fallback (se falhar, assumir o que vimos no print: A=0(COD), B=1(PRODUTO), E=4(MARCA), H=7(PRECO))
    if (produtoIndex === -1) produtoIndex = 1; // Pelo menos PRODUTO precisamos
    if (codIndex === -1) codIndex = 0;
    
    // O preço no print parecia ser a última ou penúltima coluna da tabela, se não encontrou no header:
    if (precoIndex === -1) {
      for (let i = headerRow.length - 1; i >= 0; i--) {
        if (!headerRow[i]) { // Preço estava sem cabeçalho no print (ou estava acima)
           precoIndex = i;
           break;
        }
      }
      if (precoIndex === -1) precoIndex = 7; // Fallback extremo (H)
    }
    
    if (marcaIndex === -1) marcaIndex = 4; // Fallback extremo (E)

    let itemsProcessed = 0;
    let itemsUpdated = 0;
    let itemsCreated = 0;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[produtoIndex]) continue; // Pular linhas vazias

      const produtoStr = String(row[produtoIndex]).trim();
      const codStr = row[codIndex] ? String(row[codIndex]).trim() : '';
      let marcaStr = row[marcaIndex] ? String(row[marcaIndex]).trim() : '';
      const precoRaw = row[precoIndex];

      if (!produtoStr) continue;

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
      message: `Planilha importada com sucesso. Total: ${itemsProcessed}. Novos: ${itemsCreated}. Atualizados: ${itemsUpdated}.`,
    };
  }
}
