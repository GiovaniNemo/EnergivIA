/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Optional,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { WhatsappCloudService } from "./whatsapp-cloud.service";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  computeProjectCostSection,
  PROJECT_COST_ESSENTIAL_MARGIN_NAME,
  roundMoney,
} from "@energivia/proposal-economia";
import pdfParse from "pdf-parse";
import { createWorker } from "tesseract.js";
import { AiUsageService } from "../ai-usage/ai-usage.service";
import { AiFeature } from "@prisma/client";
import { getTenantPlanDetails } from "../../common/utils/plan-limits";
import { ProposalsService, getNextProposalNumber } from "../proposals/proposals.service";

import type {
  ExtractedBillHistoryItem,
  ExtractedBillData,
  BillExtractionResult,
} from "./services/bill-extractor.service";
export type { ExtractedBillHistoryItem, ExtractedBillData, BillExtractionResult };
import {
  BILL_EXTRACTION_SYSTEM_PROMPT,
  parseBrazilianKwh,
  processExtractedBillData,
  BillExtractorService,
} from "./services/bill-extractor.service";
import { KitGenerationService } from "../kit/kit-generation.service";
import {
  getHsp,
  isLocationInput,
  normalizeTextSimple,
  GeoIrradianceService,
  HspLookupResult,
  MunicipalityCandidate,
  STATE_NAME_TO_UF,
  UF_TO_STATE_TITLE,
  STATE_CAPITALS,
  extractLocationFromFreeText,
} from "./services/geo-irradiance.service";
import { WhatsappGuestTrialService } from "./services/whatsapp-guest-trial.service";
import {
  WhatsappBotStep,
  WhatsappSessionData,
  isResetCommand,
  isBackCommand,
} from "./whatsapp-state.types";
import {
  generateVCard,
  formatInternationalPhone,
  type ContactVCardItem,
} from "../leads/utils/vcard-generator";
export type { WhatsappBotStep, WhatsappSessionData };

interface WebhookMessage {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  document?: { id?: string; filename?: string; mime_type?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string };
  voice?: { id?: string; mime_type?: string };
  interactive?: {
    type?: "button_reply" | "list_reply";
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string; description?: string };
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
    url?: string;
  };
}

interface WebhookPayload {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string } }>;
        messages?: WebhookMessage[];
      };
    }>;
  }>;
}

const SESSION_INACTIVITY_MS =
  Number(process.env["WHATSAPP_SESSION_INACTIVITY_MS"]) || 24 * 60 * 60 * 1000; // 24 horas (janela padrão da Meta/WhatsApp)

import { WhatsappPairingService } from "./whatsapp-pairing.service";

function expandInboundPhoneCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) return [];
  const out = new Set<string>();
  out.add(digits);
  if (digits.startsWith("55") && digits.length >= 12) {
    const without55 = digits.slice(2);
    out.add(without55);
    if (without55.length === 10) {
      out.add(`${without55.slice(0, 2)}9${without55.slice(2)}`);
    }
    if (without55.length === 11 && without55.charAt(2) === "9") {
      out.add(`${without55.slice(0, 2)}${without55.slice(3)}`);
    }
  } else if (digits.length === 10) {
    out.add(`${digits.slice(0, 2)}9${digits.slice(2)}`);
    out.add(`55${digits}`);
    out.add(`55${digits.slice(0, 2)}9${digits.slice(2)}`);
  } else if (digits.length === 11) {
    if (digits.charAt(2) === "9") {
      out.add(`${digits.slice(0, 2)}${digits.slice(3)}`);
    }
    out.add(`55${digits}`);
  }
  return [...out];
}

export function formatPhone(phone: string): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  const normalized = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }
  if (normalized.length === 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }
  return phone;
}

export function isValidClientName(name: string): boolean {
  if (!name) return false;
  const clean = name.trim();
  if (clean.length < 2) return false;
  // Deve conter ao menos uma letra
  if (!/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(clean)) return false;
  // Não pode conter excesso de dígitos (números de telefone ou sequências)
  const digits = clean.replace(/\D/g, "");
  if (digits.length >= 6) return false;
  const lower = clean.toLowerCase();
  if (/^(voltar|retornar|menu|iniciar|reiniciar|ajuda|cancelar|sair|0|0️⃣)$/.test(lower))
    return false;
  if (/^(?:telefone|whatsapp|whats|celular|fone|zap|numero|número)$/.test(lower)) return false;
  return true;
}

export function convertSpokenNumbersToDigits(text: string): string {
  if (!text) return "";
  let s = text;

  const norm = s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const hasPhoneContext =
    /\b(?:telefone|whatsapp|whats|celular|zap|fone|numero|número|contato|ddd|prefixo)\b/i.test(s);

  const numberWordPattern =
    /\b(?:zero|um|uma|dois|duas|tres|três|quatro|cinco|seis|meia|sete|oito|nove|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\b/gi;
  const matchCount = (norm.match(numberWordPattern) || []).length;

  // Se não tem contexto de telefone e tem menos de 3 números falados, não converte palavras para evitar falsos positivos
  if (!hasPhoneContext && matchCount < 3) {
    // Mesmo sem palavras por extenso, se houver dígitos soltos espaçados (ex: "44 9 8821 5497"), agrupa-os
    return s.replace(/(?:\b\d{1,4}[,\s\-]+){2,}\d{1,4}\b/g, (match) => {
      const digitsOnly = match.replace(/\D/g, "");
      if (digitsOnly.length >= 8 && digitsOnly.length <= 13) {
        return digitsOnly;
      }
      return match;
    });
  }

  // Remove prefixos como "ddd" ou "prefixo" antes dos dígitos
  s = s.replace(/\b(?:ddd|código\s+de\s+[aá]rea|prefixo)\s*:?\s*/gi, " ");

  const tensCompound: [RegExp, string][] = [
    [/\bvinte\s+e\s+(?:um|uma)\b/gi, "21"],
    [/\bvinte\s+e\s+(?:dois|duas)\b/gi, "22"],
    [/\bvinte\s+e\s+(?:três|tres)\b/gi, "23"],
    [/\bvinte\s+e\s+quatro\b/gi, "24"],
    [/\bvinte\s+e\s+cinco\b/gi, "25"],
    [/\bvinte\s+e\s+(?:seis|meia)\b/gi, "26"],
    [/\bvinte\s+e\s+sete\b/gi, "27"],
    [/\bvinte\s+e\s+oito\b/gi, "28"],
    [/\bvinte\s+e\s+nove\b/gi, "29"],

    [/\btrinta\s+e\s+(?:um|uma)\b/gi, "31"],
    [/\btrinta\s+e\s+(?:dois|duas)\b/gi, "32"],
    [/\btrinta\s+e\s+(?:três|tres)\b/gi, "33"],
    [/\btrinta\s+e\s+quatro\b/gi, "34"],
    [/\btrinta\s+e\s+cinco\b/gi, "35"],
    [/\btrinta\s+e\s+(?:seis|meia)\b/gi, "36"],
    [/\btrinta\s+e\s+sete\b/gi, "37"],
    [/\btrinta\s+e\s+oito\b/gi, "38"],
    [/\btrinta\s+e\s+nove\b/gi, "39"],

    [/\bquarenta\s+e\s+(?:um|uma)\b/gi, "41"],
    [/\bquarenta\s+e\s+(?:dois|duas)\b/gi, "42"],
    [/\bquarenta\s+e\s+(?:três|tres)\b/gi, "43"],
    [/\bquarenta\s+e\s+quatro\b/gi, "44"],
    [/\bquarenta\s+e\s+cinco\b/gi, "45"],
    [/\bquarenta\s+e\s+(?:seis|meia)\b/gi, "46"],
    [/\bquarenta\s+e\s+sete\b/gi, "47"],
    [/\bquarenta\s+e\s+oito\b/gi, "48"],
    [/\bquarenta\s+e\s+nove\b/gi, "49"],

    [/\bcinquenta\s+e\s+(?:um|uma)\b/gi, "51"],
    [/\bcinquenta\s+e\s+(?:dois|duas)\b/gi, "52"],
    [/\bcinquenta\s+e\s+(?:três|tres)\b/gi, "53"],
    [/\bcinquenta\s+e\s+quatro\b/gi, "54"],
    [/\bcinquenta\s+e\s+cinco\b/gi, "55"],
    [/\bcinquenta\s+e\s+(?:seis|meia)\b/gi, "56"],
    [/\bcinquenta\s+e\s+sete\b/gi, "57"],
    [/\bcinquenta\s+e\s+oito\b/gi, "58"],
    [/\bcinquenta\s+e\s+nove\b/gi, "59"],

    [/\bsessenta\s+e\s+(?:um|uma)\b/gi, "61"],
    [/\bsessenta\s+e\s+(?:dois|duas)\b/gi, "62"],
    [/\bsessenta\s+e\s+(?:três|tres)\b/gi, "63"],
    [/\bsessenta\s+e\s+quatro\b/gi, "64"],
    [/\bsessenta\s+e\s+cinco\b/gi, "65"],
    [/\bsessenta\s+e\s+(?:seis|meia)\b/gi, "66"],
    [/\bsessenta\s+e\s+sete\b/gi, "67"],
    [/\bsessenta\s+e\s+oito\b/gi, "68"],
    [/\bsessenta\s+e\s+nove\b/gi, "69"],

    [/\bsetenta\s+e\s+(?:um|uma)\b/gi, "71"],
    [/\bsetenta\s+e\s+(?:dois|duas)\b/gi, "72"],
    [/\bsetenta\s+e\s+(?:três|tres)\b/gi, "73"],
    [/\bsetenta\s+e\s+quatro\b/gi, "74"],
    [/\bsetenta\s+e\s+cinco\b/gi, "75"],
    [/\bsetenta\s+e\s+(?:seis|meia)\b/gi, "76"],
    [/\bsetenta\s+e\s+sete\b/gi, "77"],
    [/\bsetenta\s+e\s+oito\b/gi, "78"],
    [/\bsetenta\s+e\s+nove\b/gi, "79"],

    [/\boitenta\s+e\s+(?:um|uma)\b/gi, "81"],
    [/\boitenta\s+e\s+(?:dois|duas)\b/gi, "82"],
    [/\boitenta\s+e\s+(?:três|tres)\b/gi, "83"],
    [/\boitenta\s+e\s+quatro\b/gi, "84"],
    [/\boitenta\s+e\s+cinco\b/gi, "85"],
    [/\boitenta\s+e\s+(?:seis|meia)\b/gi, "86"],
    [/\boitenta\s+e\s+sete\b/gi, "87"],
    [/\boitenta\s+e\s+oito\b/gi, "88"],
    [/\boitenta\s+e\s+nove\b/gi, "89"],

    [/\bnoventa\s+e\s+(?:um|uma)\b/gi, "91"],
    [/\bnoventa\s+e\s+(?:dois|duas)\b/gi, "92"],
    [/\bnoventa\s+e\s+(?:três|tres)\b/gi, "93"],
    [/\bnoventa\s+e\s+quatro\b/gi, "94"],
    [/\bnoventa\s+e\s+cinco\b/gi, "95"],
    [/\bnoventa\s+e\s+(?:seis|meia)\b/gi, "96"],
    [/\bnoventa\s+e\s+sete\b/gi, "97"],
    [/\bnoventa\s+e\s+oito\b/gi, "98"],
    [/\bnoventa\s+e\s+nove\b/gi, "99"],
  ];

  for (const [regex, val] of tensCompound) {
    s = s.replace(regex, ` ${val} `);
  }

  const tensStandalone: [RegExp, string][] = [
    [/\bdez\b/gi, "10"],
    [/\bonze\b/gi, "11"],
    [/\bdoze\b/gi, "12"],
    [/\btreze\b/gi, "13"],
    [/\b(?:quatorze|catorze)\b/gi, "14"],
    [/\bquinze\b/gi, "15"],
    [/\bdezesseis\b/gi, "16"],
    [/\bdezessete\b/gi, "17"],
    [/\bdezoito\b/gi, "18"],
    [/\bdezenove\b/gi, "19"],
    [/\bvinte\b/gi, "20"],
    [/\btrinta\b/gi, "30"],
    [/\bquarenta\b/gi, "40"],
    [/\bcinquenta\b/gi, "50"],
    [/\bsessenta\b/gi, "60"],
    [/\bsetenta\b/gi, "70"],
    [/\boitenta\b/gi, "80"],
    [/\bnoventa\b/gi, "90"],
  ];

  for (const [regex, val] of tensStandalone) {
    s = s.replace(regex, ` ${val} `);
  }

  const digitsMap: [RegExp, string][] = [
    [/\bzero\b/gi, "0"],
    [/\b(?:um|uma)\b/gi, "1"],
    [/\b(?:dois|duas)\b/gi, "2"],
    [/\b(?:três|tres)\b/gi, "3"],
    [/\bquatro\b/gi, "4"],
    [/\bcinco\b/gi, "5"],
    [/\b(?:seis|meia|meia-dúzia|meia\s+dúzia)\b/gi, "6"],
    [/\bsete\b/gi, "7"],
    [/\boito\b/gi, "8"],
    [/\bnove\b/gi, "9"],
  ];

  for (const [regex, val] of digitsMap) {
    s = s.replace(regex, ` ${val} `);
  }

  // Agrupa clusters de dígitos espaçados que formam telefones (entre 8 e 13 dígitos)
  s = s.replace(/(?:\b\d{1,4}[,\s\-]+){2,}\d{1,4}\b/g, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 8 && digitsOnly.length <= 13) {
      return digitsOnly;
    }
    return match;
  });

  return s.replace(/\s+/g, " ").trim();
}

export function isNameOrPhoneCorrectionIntent(text: string): boolean {
  if (!text) return false;
  const norm = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return (
    /\b(?:ta\s+errado|esta\s+errado|ficou\s+errado|errou|corrigir|corrige|mudar|muda|trocar|troca|alterar|altera|substituir|substitui)\b/.test(
      norm
    ) ||
    /\b(?:nao\s+e\s+(?:esse|essa|o\s+nome|o\s+telefone|o\s+numero|o\s+zap))\b/.test(norm) ||
    /\b(?:o\s+(?:nome|telefone|numero|zap)\s+(?:correto|certo)\s+(?:e|eh|e))\b/.test(norm) ||
    /\b(?:nome\s+errado|telefone\s+errado|numero\s+errado|zap\s+errado)\b/.test(norm) ||
    /\b(?:na\s+verdade\s+(?:o\s+nome|o\s+telefone|o\s+zap|o\s+numero))\b/.test(norm)
  );
}

export function cleanExtractedName(rawName: string): string {
  if (!rawName) return "";
  let s = rawName.trim();

  // Remove prefixos conversacionais e de correção quando informa ou corrige nome (itera para múltiplos prefixos encadeados)
  let prev = "";
  let iterations = 0;
  while (prev !== s && iterations < 5) {
    prev = s;
    s = s.replace(
      /^(?:(?:não|nao),?\s*)?(?:(?:o\s+)?(?:nome|número|numero|telefone|whatsapp|whats|zap)?(?:\s+(?:do|da|dele|dela)(?:\s+(?:meu|minha))?\s*cliente(?:\s+final)?)?\s*(?:tá|ta|esta|está|ficou)?\s*errado,?\s*|(?:errou\s+(?:o\s+nome)?,?\s*)|(?:não|nao)\s+é\s+(?:esse|essa|o\s+dela|o\s+dele),?\s*|(?:corrige|corrigir|trocar|troca|mudar|muda|alterar|altera|atualizar|atualiza|colocar|coloca|botar|bota)\s+(?:aí|ai)?,?\s*(?:(?:o|a)\s+)?(?:nome|número|numero|telefone|whatsapp|whats|zap)?(?:\s+(?:do|da|dele|dela)(?:\s+(?:meu|minha))?\s*cliente(?:\s+final)?)?\s*(?:para|pro|pra|por|como)?:?\s*|(?:na\s+verdade\s+(?:o\s+nome\s+)?(?:dele|dela|do\s+cliente)?\s*(?:é|eh|e|:)?\s*)|(?:o\s+nome\s+(?:correto|certo)\s*(?:agora\s+)?(?:é|eh|e|:)?\s*)|(?:(?:o\s+)?nome\s+(?:do\s+cliente(?:\s+final)?|da\s+cliente(?:\s+final)?|do\s+meu\s+cliente|da\s+minha\s+cliente|dele|dela)?\s*(?:é|eh|e|:)?\s*)|(?:(?:o\s+)?(?:meu\s+)?cliente(?:\s+final)?\s*(?:é|eh|e|se\s+chama|:)\s*)|(?:(?:ele|ela)\s+(?:se\s+)?chama\s*)|(?:se\s+chama\s*)|(?:(?:o\s+)?nome\s*(?:é|eh|e|:)?\s*)|(?:(?:o\s+dela|o\s+dele)\s*(?:é|eh|e|:)?\s*)|(?:(?:do|da)\s+(?:meu\s+|minha\s+)?cliente(?:\s+final)?\s*(?:para|pro|pra|é|eh|e|como)?:?\s*)|(?:pode\s+ser\s+))\s*/i,
      ""
    );
    s = s.replace(/^(?:cliente|nome)\s*:\s*/i, "");
    s = s.replace(/^(?:para|pro|pra|como)\s+/i, "");
    s = s.replace(/^[,;\-/:|()=*~_.\s]+/, "");
    iterations++;
  }

  // Remove sufixos e conectores de telefone no final ou início (ex: ", e o é", ", e o telefone é", "e o whats:")
  s = s
    .replace(
      /[,;\s]+(?:(?:e|o)\s+)*(?:telefone|whats(?:app)?|cel(?:ular)?|fone|zap|contato|numero|número)?(?:\s+(?:dele|dela|do\s+cliente))?\s*(?:é|eh|e|:)?\s*$/i,
      ""
    )
    .replace(
      /^(?:[,;\s]+|(?:(?:e|o)\s+)+(?:telefone|whats(?:app)?|cel(?:ular)?|fone|zap|contato|numero|número)?(?:\s+(?:dele|dela|do\s+cliente))?\s*(?:é|eh|e|:)?\s*)/i,
      ""
    )
    .replace(/\b(?:e\s+o\s+é|e\s+o\s+e|e\s+o|e\s+é|é\s+o)\b/gi, " ")
    .replace(/^[,;\-/:|()=*~_.\s]+|[,;\-/:|()=*~_.\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Stop words residuais que não configuram nome de pessoa
  const stopWords = new Set([
    "o",
    "a",
    "os",
    "as",
    "e",
    "é",
    "eh",
    "dele",
    "dela",
    "do",
    "da",
    "de",
    "para",
    "pro",
    "pra",
    "meu",
    "minha",
    "seu",
    "sua",
    "whats",
    "whatsapp",
    "telefone",
    "celular",
    "numero",
    "número",
    "zap",
    "contato",
    "cliente",
    "final",
    "nome",
    "errado",
    "correto",
    "certo",
  ]);
  const words = s.split(" ").filter((w) => w.trim().length > 0);
  if (words.length === 0 || words.every((w) => stopWords.has(w.toLowerCase()))) {
    return "";
  }

  // Capitaliza o nome se tiver letras
  return words
    .map((w) =>
      w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()
    )
    .join(" ");
}

export function isNameCorrectionOrErrorNotice(text: string): boolean {
  if (!text) return false;
  const norm = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  return (
    /\b(?:ta\s+errado|esta\s+errado|ficou\s+errado|nao\s+e\s+esse|nao\s+e\s+essa|errou|corrigir\s+nome|mudar\s+nome|nome\s+errado|nao\s+o\s+dela|nao\s+o\s+dele)\b/.test(
      norm
    ) && !/\b(?:e|eh|chama|para)\s+[a-z]{3,}\s+[a-z]{3,}\b/.test(norm)
  );
}

export function extractNameAndPhone(text: string): { name: string; phone?: string } {
  const converted = convertSpokenNumbersToDigits(text);
  const cleanText = converted.trim();
  if (!cleanText) return { name: "" };

  // Procura padrão de telefone brasileiro amplo (com ou sem DDD, hífens, traços, espaços ou 55)
  // Ex: 449-8821-5497, 449-777-7770, (44) 98821-5497, 44 98821-5497, 44988215497, +55 44 98821-5497
  const phonePattern =
    /(?:\+?55[\s.-]*)?(?:\(?\s*([1-9]{2})\s*\)?[\s.-]*)?(?:9[\s.-]*)?\d{4,5}[\s.-]*\d{4}/g;

  let foundPhone: string | undefined;
  let matchStr = "";

  let match: RegExpExecArray | null;
  while ((match = phonePattern.exec(cleanText)) !== null) {
    const rawMatch = match[0];
    const digits = rawMatch.replace(/\D/g, "");
    const cleaned =
      digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
        ? digits.slice(2)
        : digits;
    if (cleaned.length === 10 || cleaned.length === 11) {
      const ddd = parseInt(cleaned.slice(0, 2), 10);
      if (ddd >= 11 && ddd <= 99) {
        foundPhone = cleaned;
        matchStr = rawMatch;
        break;
      }
    }
  }

  // Fallback: se a mensagem como um todo tiver 10 a 13 dígitos
  if (!foundPhone) {
    const allDigits = cleanText.replace(/\D/g, "");
    const cleaned =
      allDigits.startsWith("55") && (allDigits.length === 12 || allDigits.length === 13)
        ? allDigits.slice(2)
        : allDigits;
    if (cleaned.length === 10 || cleaned.length === 11) {
      const ddd = parseInt(cleaned.slice(0, 2), 10);
      if (ddd >= 11 && ddd <= 99) {
        foundPhone = cleaned;
        const firstDigitIdx = cleanText.search(/\d/);
        const lastDigitIdx =
          cleanText.length - 1 - cleanText.split("").reverse().join("").search(/\d/);
        if (firstDigitIdx >= 0 && lastDigitIdx >= firstDigitIdx) {
          matchStr = cleanText.slice(firstDigitIdx, lastDigitIdx + 1);
        } else {
          matchStr = cleanText;
        }
      }
    }
  }

  // Remove o telefone encontrado do texto para extrair o nome
  let rawName = cleanText;
  if (matchStr) {
    rawName = rawName.replace(matchStr, "");
  }

  const formattedName = cleanExtractedName(rawName);

  return {
    name: formattedName,
    phone: foundPhone,
  };
}

function parseKwpRate(
  input: string,
  systemKwp?: number
): { rate: number; isDerivedFromTotal?: boolean } | null {
  const clean = input.trim().toLowerCase();

  // Opções de menu ou confirmação
  if (
    clean === "1" ||
    clean === "1." ||
    clean === "1️⃣" ||
    clean === "opcao 1" ||
    clean === "opção 1" ||
    clean === "padrao" ||
    clean === "padrão" ||
    clean === "seguir" ||
    clean === "sim" ||
    clean === "manter" ||
    clean === "continuar" ||
    clean === "2" ||
    clean === "2." ||
    clean === "2️⃣" ||
    clean === "opcao 2" ||
    clean === "opção 2" ||
    clean === "0" ||
    clean === "0." ||
    clean === "0️⃣" ||
    clean === "voltar"
  ) {
    return null;
  }

  // Não interpretar unidades inequívocas de consumo, equipamentos ou usinas como preço
  if (
    /(?:kwh|kw[-/\s]*horas?|kw\/h|[-/\s]m[eê]s|placas?|m[oó]dulos?|pain[eé]is?|usina|gerador)/i.test(
      clean
    )
  ) {
    return null;
  }

  // Padrão com 'k', ex: "3k", "2.8k", "2,5k"
  const kMatch = clean.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*k\b/i);
  if (kMatch && kMatch[1]) {
    const kVal = parseFloat(kMatch[1].replace(",", "."));
    if (!isNaN(kVal) && kVal >= 0.5 && kVal <= 25) {
      return { rate: Math.round(kVal * 1000) };
    }
  }

  // Se explicitamente informou valor total: ex "total 8500", "8500 total", "valor total: R$ 8.500"
  const isExplicitTotal =
    clean.includes("total") || clean.includes("valor final") || clean.includes("preço final");

  // Padrão monetário / numérico geral
  // Ex: "4000", "4000,00", "4.000", "4.000,00", "R$ 3.200,00", "2500", "2800,50", "3200/kwp", "r$3.000", "3.200 por kwp"
  const match = clean.match(
    /(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?:\s*(?:reais)?(?:\s*(?:\/|\s*por\s*|\s*o\s*)?\s*kwp)?)?/i
  );
  if (!match || !match[1]) return null;

  let raw = match[1];
  if (raw.includes(".") && raw.includes(",")) {
    raw = raw.replace(/\./g, "").replace(",", ".");
  } else if (raw.includes(".")) {
    const parts = raw.split(".");
    const p0 = parts[0];
    const p1 = parts[1];
    if (parts.length === 2 && p0 !== undefined && p1 !== undefined) {
      if (p1.length === 3) {
        raw = p0 + p1;
      } else if (p1.length <= 2) {
        raw = p0 + "." + p1;
      } else {
        raw = raw.replace(/\./g, "");
      }
    } else {
      raw = raw.replace(/\./g, "");
    }
  } else if (raw.includes(",")) {
    const parts = raw.split(",");
    const p0 = parts[0];
    const p1 = parts[1];
    if (parts.length === 2 && p0 !== undefined && p1 !== undefined && p1.length <= 2) {
      raw = p0 + "." + p1;
    } else {
      raw = raw.replace(/,/g, "");
    }
  }

  const val = parseFloat(raw);
  if (isNaN(val)) return null;

  // Se o integrador digitou algo como "2.8" ou "3.2" (abreviação comum para 2800 ou 3200)
  if (val > 0 && val < 20) {
    return { rate: Math.round(val * 1000) };
  }

  // Se explicitamente informou como valor total OU se for um valor total acima de R$ 6.800 e não especificou /kwp
  if (
    (isExplicitTotal ||
      (val > 6800 &&
        !clean.includes("/kwp") &&
        !clean.includes("por kwp") &&
        !clean.includes("o kwp") &&
        !clean.includes("kwp"))) &&
    systemKwp &&
    systemKwp > 0
  ) {
    const derivedRate = Math.round((val / systemKwp) * 100) / 100;
    if (derivedRate >= 500 && derivedRate <= 25000) {
      return { rate: derivedRate, isDerivedFromTotal: true };
    }
  }

  // Faixa de R$/kWp aceitável no mercado solar brasileiro (R$ 500 a R$ 25.000)
  if (val >= 500 && val <= 25000) {
    return { rate: Math.round(val * 100) / 100 };
  }

  return null;
}

/** Formata a potência exibida com badge de MWp ou GWp quando exceder 1.000 kWp */
export function formatPowerBadge(kwp: number): string {
  if (!Number.isFinite(kwp) || kwp <= 0) return `${kwp} kWp`;
  if (kwp >= 1_000_000) {
    return `${kwp.toLocaleString("pt-BR")} kWp (${(kwp / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} GWp)`;
  }
  if (kwp >= 1000) {
    return `${kwp.toLocaleString("pt-BR")} kWp (${(kwp / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 3 })} MWp)`;
  }
  return `${kwp} kWp`;
}

/** Converte números no formato brasileiro (com ponto como milhar e vírgula como decimal) ou internacional */
export function parsePtBrNumber(valStr?: string | null): number {
  if (!valStr) return NaN;
  const clean = valStr.trim();
  // Se tem vírgula e pontos (ex: 1.000,50 ou 1.500.000,00)
  if (clean.includes(",") && clean.includes(".")) {
    return parseFloat(clean.replace(/\./g, "").replace(",", "."));
  }
  // Se tem vírgula (ex: 1000,50 ou 7,5)
  if (clean.includes(",")) {
    return parseFloat(clean.replace(",", "."));
  }
  // Se tem ponto: verificar se é separador de milhar (ex: 1.000 ou 1.500.000) ou decimal (ex: 7.5)
  if (clean.includes(".")) {
    const parts = clean.split(".");
    // Se a última parte tem exatamente 3 dígitos e todas as anteriores são inteiros -> milhar (ex: 1.000, 10.000, 1.500.000)
    const isThousands = parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    if (isThousands) {
      return parseFloat(clean.replace(/\./g, ""));
    }
    return parseFloat(clean);
  }
  return parseFloat(clean);
}

/** Extrai consumo médio mensal em kWh a partir de mensagens naturais em português */
export function parseConsumptionInput(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "").trim();

  // Pattern 1: Unidades explícitas de consumo de energia
  // kwh, kw hora(s), kw-hora, kw/hora, kw/h, kw/mês, kw mês, kw hora mês, kw/m, w/mês, w mes, watts mês, etc.
  const unitRegex =
    /(?:^|[^\w.,])(\d+[\d.,]*)\s*(?:kwh|kw[-/\s]*horas?|kw\/h|kw[-/\s]*(?:m[eê]s(?:es)?|m\b)|kwh[-/\s]*(?:m[eê]s(?:es)?|m\b)|w[-/\s]*(?:m[eê]s(?:es)?|m\b|horas?|h\b)|watts?[-/\s]*(?:m[eê]s(?:es)?|m\b|horas?))(?:[-/\s]*m[eê]s(?:es)?)?(?:\b|[^\w.,]|$)/i;
  const unitMatch = clean.match(unitRegex);
  if (unitMatch && unitMatch[1]) {
    const val = parsePtBrNumber(unitMatch[1]);
    if (Number.isFinite(val) && val >= 20 && val <= 500000) {
      return Math.round(val);
    }
  }

  // Pattern 2: Precedido por termos inequívocos de consumo
  // consumo (médio) (de) X (kw/kwh), gasto de X kw, conta de X kw, fatura de X kw, etc.
  const keywordPrefixRegex =
    /(?:consumo|gasto|m[ée]dia|conta|fatura|faturas|consumindo|gastando)\s*(?:m[ée]di[ao])?\s*(?:mensal)?\s*(?:de|em|da)?\s*(\d+[\d.,]*)\s*(?:kwh|kw[-/\s]*horas?|kw\/h|kw\s*\/\s*m[eê]s|kw\s+m[eê]s|kwh\s*\/\s*m[eê]s|kw|w)?(?:\b|[^\w.,]|$)/i;
  const kwMatch = clean.match(keywordPrefixRegex);
  if (kwMatch && kwMatch[1]) {
    const val = parsePtBrNumber(kwMatch[1]);
    if (Number.isFinite(val) && val >= 20 && val <= 500000) {
      return Math.round(val);
    }
  }

  // Pattern 3: Seguido por "de consumo", "de gasto", "por mês", "ao mês", "mensais"
  const suffixRegex =
    /(?:^|[^\w.,])(\d+[\d.,]*)\s*(?:kwh|kw|w)?\s*(?:de\s+consumo|de\s+gasto|por\s+m[eê]s|ao\s+m[eê]s|no\s+m[eê]s|mensa(?:l|is))(?:\b|[^\w.,]|$)/i;
  const suffixMatch = clean.match(suffixRegex);
  if (suffixMatch && suffixMatch[1]) {
    const val = parsePtBrNumber(suffixMatch[1]);
    if (Number.isFinite(val) && val >= 20 && val <= 500000) {
      return Math.round(val);
    }
  }

  // Pattern 4: Número isolado com 'kw' ou 'w' puro (sem 'p') que representa consumo (ex: 450 kw, 600 kw, 450w)
  // quando não precedido por termos explícitos de gerador/usina/sistema/kit e não acompanhado de módulo/placa
  const standaloneKwMatch = clean.match(
    /(?:^|[^\w.,])(\d+[\d.,]*)\s*(?:kw|w|watts?)(?:\b|[^\w.,]|$)/i
  );
  if (standaloneKwMatch && standaloneKwMatch[1]) {
    const hasModuleKeyword = /(?:placas?|m[oó]dulos?|pain[eé]is?|paineis?)/i.test(clean);
    const preKeyword =
      /(?:sistema|usina|pot[êe]ncia|gerador|kit|inversor|planta)\s*(?:de)?\s*$/i.test(
        clean.slice(0, standaloneKwMatch.index || 0)
      );
    if (!preKeyword && !hasModuleKeyword) {
      const val = parsePtBrNumber(standaloneKwMatch[1]);
      if (Number.isFinite(val) && val >= 30 && val <= 500000) {
        return Math.round(val);
      }
    }
  }

  return null;
}

/** Verifica se a mensagem indica desejo de pular a pergunta de valor da conta ou estimar pela tarifa regional */
export function isSkipBillValueInput(text: string): boolean {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[.,!?:;*~_]/g, "");
  return (
    clean === "0" ||
    clean === "0️⃣" ||
    clean === "pular" ||
    clean === "pula" ||
    clean === "ignorar" ||
    clean === "ignora" ||
    clean === "estimar" ||
    clean === "estima" ||
    clean === "estimativa" ||
    clean === "nao sei" ||
    clean === "não sei" ||
    clean === "deixa" ||
    clean === "padrao" ||
    clean === "padrão" ||
    clean === "sem valor"
  );
}

/** Extrai valor em reais (R$) da conta/fatura de luz a partir de mensagens naturais em português */
export function parseBillValueInput(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "").trim();

  // Se o texto for comando de pulo ("0", "pular"), não é valor da conta
  if (isSkipBillValueInput(clean)) return null;

  // Pattern A: Menção com contexto de fatura / conta / gasto / valor
  // ex: "conta de 850 reais", "fatura de R$ 1.100", "minha conta é de 850 reais", "pago 680 por mes", "gasto cerca de 750 reais de luz", "conta atual de 1200"
  const billContextRegex =
    /(?:conta|fatura|gasto|pago|pagando|valor|custo|faturas)\s*(?:de\s+luz|de\s+energia|atual|mensal|m[ée]dia)?\s*(?:[eé]|vem|d[aá]|uns|cerca\s+de|mais\s+ou\s+menos)?\s*(?:de|em|uns)?\s*(?:r\$\s*)?(\d+[\d.,]*)(?:\s*(?:reais|conto))?(?:\b|[^\w.,]|$)/i;

  const contextMatch = clean.match(billContextRegex);
  if (contextMatch && contextMatch[1]) {
    const matchIndex = contextMatch.index || 0;
    const postSnippet = clean
      .slice(matchIndex + contextMatch[0].length, matchIndex + contextMatch[0].length + 15)
      .toLowerCase();
    const isKwhOrKwp = /^\s*(?:kwh|kwp|kw\b|w\b|mwp)/.test(postSnippet);
    if (!isKwhOrKwp) {
      const val = parsePtBrNumber(contextMatch[1]);
      if (Number.isFinite(val) && val >= 25 && val <= 1_000_000) {
        return Math.round(val * 100) / 100;
      }
    }
  }

  // Pattern B: Frases com verbos de valor (ex: "dá mais ou menos uns 800 reais", "vem uns 920 reais")
  const colloquialValueRegex =
    /(?:d[aá]|vem|fica|est[aá])\s*(?:mais\s+ou\s+menos)?\s*(?:uns|cerca\s+de)?\s*(?:r\$\s*)?(\d+[\d.,]*)\s*(?:reais|conto)(?:\b|[^\w.,]|$)/i;
  const colloquialMatch = clean.match(colloquialValueRegex);
  if (colloquialMatch && colloquialMatch[1]) {
    const val = parsePtBrNumber(colloquialMatch[1]);
    if (Number.isFinite(val) && val >= 25 && val <= 1_000_000) {
      return Math.round(val * 100) / 100;
    }
  }

  // Pattern C: Símbolo R$ ou sufixo "reais" explícito em qualquer lugar do texto
  const currencyWithSymbolOrWordRegex =
    /(?:r\$\s*(\d+[\d.,]*)|(\d+[\d.,]*)\s*(?:reais|conto))(?:\b|[^\w.,]|$)/gi;

  let currMatch: RegExpExecArray | null;
  while ((currMatch = currencyWithSymbolOrWordRegex.exec(clean)) !== null) {
    const rawVal = currMatch[1] || currMatch[2];
    if (rawVal) {
      const val = parsePtBrNumber(rawVal);
      if (Number.isFinite(val) && val >= 25 && val <= 1_000_000) {
        return Math.round(val * 100) / 100;
      }
    }
  }

  // Pattern D: Se a mensagem for apenas um número isolado (comum em resposta à pergunta "Qual o valor da conta?")
  // Ex: "850", "850,00", "1.250,50", "2.500"
  // mas NÃO pode ter sufixo kwh/kwp/kw/w/placas/modulos
  const hasUnitKwh = /(?:kwh|kwp|kw\b|w\b|mwp|placas?|m[oó]dulos?|pain[eé]is?)/i.test(clean);
  if (!hasUnitKwh) {
    const standaloneNumberRegex = /^(?:r\$\s*)?(\d+[\d.,]*)\s*(?:reais|conto)?$/i;
    const numMatch = clean.match(standaloneNumberRegex);
    if (numMatch && numMatch[1]) {
      const val = parsePtBrNumber(numMatch[1]);
      if (Number.isFinite(val) && val >= 25 && val <= 1_000_000) {
        return Math.round(val * 100) / 100;
      }
    }
  }

  return null;
}

/** Tarifas médias residenciais de energia elétrica (R$/kWh com tributos) por UF (Referência ANEEL) */
export const UF_AVERAGE_TARIFFS: Record<string, number> = {
  AC: 0.98,
  AL: 0.96,
  AP: 0.92,
  AM: 0.95,
  BA: 0.94,
  CE: 0.95,
  DF: 0.86,
  ES: 0.85,
  GO: 0.89,
  MA: 0.97,
  MT: 0.94,
  MS: 0.93,
  MG: 0.96,
  PA: 1.05,
  PB: 0.93,
  PR: 0.87,
  PE: 0.94,
  PI: 0.96,
  RJ: 1.02,
  RN: 0.93,
  RS: 0.88,
  RO: 0.92,
  RR: 0.89,
  SC: 0.84,
  SP: 0.89,
  SE: 0.91,
  TO: 0.96,
};

export const DEFAULT_NATIONAL_AVERAGE_TARIFF = 0.89;

/** Retorna a tarifa média estimada em R$/kWh para a UF fornecida */
export function getRegionalAverageTariff(uf?: string | null): number {
  if (!uf) return DEFAULT_NATIONAL_AVERAGE_TARIFF;
  const upperUf = uf.trim().toUpperCase();
  return UF_AVERAGE_TARIFFS[upperUf] ?? DEFAULT_NATIONAL_AVERAGE_TARIFF;
}

/** Calcula a tarifa efetiva de energia (R$/kWh) baseada na conta ou fallback regional */
export function calculateEffectiveTariff(
  billValue: number | undefined | null,
  consumptionKwh: number | undefined | null,
  uf?: string | null
): number {
  if (billValue && consumptionKwh && consumptionKwh > 0) {
    const rawTariff = billValue / consumptionKwh;
    if (rawTariff >= 0.35 && rawTariff <= 2.5) {
      return Math.round(rawTariff * 10000) / 10000;
    }
  }
  return getRegionalAverageTariff(uf);
}

/** Converte entradas textuais de potência (ex: 3000 kwp, 3 mwp, 1.5 gw) para kWp */
export function parsePowerInput(text: string): number | null {
  if (!text) return null;
  const clean = text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "").trim();

  // Procurar por todos os candidatos de potência
  const powerCandidateRegex = /(\d+[\d.,]*)\s*(gwp|gw|mwp|mw|kwp|kw)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = powerCandidateRegex.exec(clean)) !== null) {
    const fullMatch = match[0];
    const valStr = match[1];
    if (!valStr) continue;
    const unit = match[2]?.toLowerCase() || "";
    const matchIndex = match.index;
    const matchEnd = matchIndex + fullMatch.length;

    // Substring anterior e posterior para análise de contexto
    const preText = clean.slice(Math.max(0, matchIndex - 35), matchIndex).toLowerCase();
    const postText = clean.slice(matchEnd, Math.min(clean.length, matchEnd + 35)).toLowerCase();

    // Se a unidade for kW (ou mw/gw) sem 'p', verificar se na verdade é consumo
    const isKwWithoutP = unit === "kw" || unit === "mw" || unit === "gw";

    // Checagem 1: se postText indica hora ou mês (ex: "kw hora", "kw/h", "kw/hora", "kw/mês", "kw mes", "kw por mês", "kw/m")
    const isFollowedByConsumption =
      /^\s*[-/]?\s*horas?\b|^\s*\/h\b|^\s*[-/]?\s*(?:m[eê]s(?:es)?|m\b)|^\s+(?:por|ao|no|cada)\s+m[eê]s\b|^\s+mensa(?:l|is)\b/.test(
        postText
      );

    // Checagem 2: se preText indica consumo (ex: "consumo de", "gasto de", "conta de", "fatura de", "média de")
    const isPrecededByConsumption =
      /(?:consumo|gasto|m[ée]dia|conta|fatura|faturas|consumindo|gastando)\s*(?:m[ée]di[ao])?\s*(?:mensal)?\s*(?:de|em|da)?\s*$/.test(
        preText
      );

    // Checagem 3: se postText diz "de consumo" ou "de gasto"
    const isFollowedByDeConsumo = /^\s+(?:de\s+)?(?:consumo|gasto)\b/.test(postText);

    if (
      isKwWithoutP &&
      (isFollowedByConsumption || isPrecededByConsumption || isFollowedByDeConsumo)
    ) {
      // Este candidato é consumo, NÃO potência de pico!
      continue;
    }

    const val = parsePtBrNumber(valStr);
    if (!Number.isFinite(val) || val <= 0) continue;

    // Se a unidade for 'kW' sem 'p' e o valor for alto (>= 50), sem palavra de sistema/usina/gerador,
    // é consumo de fatura de energia em kWh e NÃO uma usina fotovoltaica
    const hasPowerKeyword =
      /(?:sistema|usina|pot[êe]ncia|gerador|geradora|inversor|kit|planta)\s*(?:fotovoltaic[ao]|solar)?\s*(?:de|com)?\s*$/i.test(
        preText
      );
    if (isKwWithoutP && val >= 50 && !hasPowerKeyword) {
      continue;
    }

    // Mesmo com kwp, se a pessoa escreveu "consumo de 1000 kwp" (erro de digitação raro do usuário):
    if (isPrecededByConsumption && isFollowedByConsumption) {
      continue;
    }

    if (unit === "gwp" || unit === "gw") {
      return Math.min(val * 1_000_000, 5_000_000);
    }
    if (unit === "mwp" || unit === "mw") {
      return Math.min(val * 1_000, 5_000_000);
    }
    return Math.min(val, 5_000_000);
  }

  return null;
}

export const DEFAULT_GRID_OPTIONS_TEXT =
  `*_Qual o padrão de entrada da instalação?_* ⚡\n\n` +
  `> 1️⃣ *Monofásico 220V*\n` +
  `> 2️⃣ *Bifásico 127V/220V*\n` +
  `> 3️⃣ *Trifásico 220V*\n` +
  `> 4️⃣ *Trifásico 380V*\n` +
  `> 0️⃣ *Voltar / Corrigir localização ou consumo*\n\n` +
  `_(Responda com o número da opção)_`;

export const DEFAULT_TRIFASICO_VOLTAGE_QUESTION_TEXT =
  `*_A rede trifásica da instalação é 220V ou 380V?_* ⚡\n\n` +
  `_A concessionária não especifica a tensão na fatura, e o modelo do inversor varia conforme a rede:_\n\n` +
  `> 1️⃣ *Trifásico 220V* (127V / 220V)\n` +
  `> 2️⃣ *Trifásico 380V* (220V / 380V)\n` +
  `> 3️⃣ *Bifásico 127V/220V* (caso haja divergência na fatura)\n` +
  `> 4️⃣ *Monofásico 220V*\n` +
  `> 0️⃣ *Voltar*\n\n` +
  `_(Responda 1 para 220V ou 2 para 380V)_`;

export function buildLargeKitGridQuestionText(powerOrKwh: string): string {
  return (
    `*_Qual a tensão da rede trifásica para este sistema de ${powerOrKwh}?_* ⚡\n\n` +
    `_Para instalações desse porte, a conexão é trifásica. Confirme a tensão para dimensionar o inversor correto:_\n\n` +
    `> 1️⃣ *Trifásico 220V* (127V / 220V)\n` +
    `> 2️⃣ *Trifásico 380V* (220V / 380V)\n` +
    `> 3️⃣ *Bifásico 127V/220V*\n` +
    `> 4️⃣ *Monofásico 220V*\n` +
    `> 0️⃣ *Voltar*\n\n` +
    `_(Responda 1 para 220V ou 2 para 380V)_`
  );
}

export interface ExtractedIntegratorQuote {
  targetKWp?: number;
  targetModules?: number;
  modPowerWUser?: number;
  consumptionKwh?: number;
  roofType?: string;
  gridVoltage?: string;
  isTrifasicoGeneric?: boolean;
  cidade?: string;
  estado?: string;
  hsp?: number;
  inverterType?: "string" | "microinverter" | "hybrid" | "off_grid";
  inverterDescription?: string;
  inverterPowerKw?: number;
  hasBattery?: boolean;
  batteryKwh?: number;
  batteryQty?: number;
  isQuoteRequest: boolean;
}

/** Extrai entidades solares ricas de mensagens livres de integradores */
export function parseIntegratorQuoteEntities(rawText: string): ExtractedIntegratorQuote {
  if (!rawText) return { isQuoteRequest: false };

  // Remove caracteres invisíveis do WhatsApp
  const clean = rawText.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "").trim();
  const lower = clean.toLowerCase();

  let targetKWp: number | undefined;
  let targetModules: number | undefined;
  let modPowerWUser: number | undefined;
  let consumptionKwh: number | undefined;
  let roofType: string | undefined;
  let gridVoltage: string | undefined;
  let cidade: string | undefined;
  let estado: string | undefined;
  let hsp: number | undefined;
  let inverterType: "string" | "microinverter" | "hybrid" | "off_grid" | undefined;
  let inverterDescription: string | undefined;
  let inverterPowerKw: number | undefined;
  let hasBattery: boolean | undefined = undefined;
  let batteryKwh: number | undefined;
  let batteryQty: number | undefined;

  // 1. Extração de Inversor e Tecnologia (Microinversor / Híbrido)
  const isMicro =
    /\b(?:microinversor(?:es)?|micro)\b/i.test(clean) ||
    /\b(?:hoymiles|apsystems|tsun|delsolar\s*micro)\b/i.test(clean);

  const isHybrid =
    /\b(?:h[íi]brido(?:s)?|hybrid|off[- ]?grid)\b/i.test(clean) ||
    /\bdeye\s+h[íi]brido\b/i.test(clean);

  const isExplicitString =
    /\b(?:inversor\s+string|string\s+inversor|inversor\s+convencional)\b/i.test(clean);

  if (isMicro && !isExplicitString) {
    inverterType = "microinverter";
  } else if (isHybrid && !isExplicitString) {
    inverterType = "hybrid";
  }

  const invPowerMatch = clean.match(
    /(?:inversor|h[íi]brido|deye|growatt|solis|sungrow|huawei|saj)\s*(?:h[íi]brido\s*)?(\d+(?:[.,]\d+)?)\s*(?:k|kw)?\b/i
  );
  if (invPowerMatch && invPowerMatch[1]) {
    const p = parseFloat(invPowerMatch[1].replace(",", "."));
    if (p > 0 && p < 100000) {
      inverterPowerKw = p;
    }
  }
  const invLineMatch = clean.match(
    /(?:0?\d+\s+)?(?:inversor|h[íi]brido|microinversor|micro)\s*([^\n,]+)/i
  );
  if (invLineMatch && invLineMatch[1]) {
    inverterDescription = invLineMatch[0].trim();
  }

  // 2. Extração de Bateria (kWh ou quantidade de unidades)
  const isNoBattery =
    /\b(?:sem|zero|nenhuma|0)\s*(?:baterias?|m[oó]dulos?|packs?|kwh\s*de\s*bateria)\b/i.test(
      clean
    ) || /\bapenas\s*(?:o\s*)?inversor\s*(?:h[íi]brido)?\b/i.test(clean);

  if (isNoBattery) {
    hasBattery = false;
    batteryQty = 0;
  } else {
    // 2.1 Capacidade em kWh (ex: "10.24 kWh de bateria", "5kwh bateria", "bateria de 15 kwh")
    const batteryKwhMatch =
      clean.match(/(?:baterias?|armazenamento)[^\d\n]*(\d+(?:[.,]\d+)?)\s*(?:kwh|kw)\b/i) ||
      clean.match(/(\d+(?:[.,]\d+)?)\s*(?:kwh|kw)\s*(?:de\s+)?(?:baterias?|armazenamento)\b/i);
    if (batteryKwhMatch && batteryKwhMatch[1]) {
      const kwh = parseFloat(batteryKwhMatch[1].replace(",", "."));
      if (kwh > 0 && kwh <= 2000) {
        batteryKwh = kwh;
        hasBattery = true;
      }
    }

    // 2.2 Quantidade de unidades de bateria (ex: "2 baterias", "4 módulos de bateria", "1 bateria de lítio")
    const batteryQtyMatch =
      clean.match(/(\d+)\s*(?:baterias?|m[oó]dulos?\s*de\s*bateria|packs?\s*de\s*bateria)\b/i) ||
      clean.match(/(\d+)\s*(?:unidades?|un|packs?)\s*(?:de\s+)?baterias?\b/i);
    if (batteryQtyMatch && batteryQtyMatch[1]) {
      const qty = parseInt(batteryQtyMatch[1], 10);
      if (qty > 0 && qty <= 100) {
        batteryQty = qty;
        hasBattery = true;
      }
    }

    if (hasBattery === undefined && /(?:0?\d+\s+)?bateria\b/i.test(clean)) {
      hasBattery = true;
    }
  }

  // Se o usuário solicitou baterias, infere sistema híbrido se não foi explicitado
  if (hasBattery && !inverterType) {
    inverterType = "hybrid";
  }

  // 3. Extração de Módulos / Painéis / Placas e seus Watts
  const modMatch = clean.match(/(?:0?(\d+))\s*(?:placas?|m[oó]dulos?|pain[eé]is?|paineis?)\b/i);
  if (modMatch && modMatch[1]) {
    const count = parseInt(modMatch[1], 10);
    if (count >= 1 && count <= 50000) {
      targetModules = count;

      // Watts dos módulos: ex: 620w, 610, 585w
      const wattsMatch =
        clean.match(
          /(?:placas?|m[oó]dulos?|pain[eé]is?|paineis?)[^\d\n]*(\d{3,4})\s*(?:w|watts?)\b/i
        ) ||
        clean.match(/(?:placas?|m[oó]dulos?|pain[eé]is?|paineis?)\s+(\d{3,4})\b/i) ||
        clean.match(/\b(\d{3,4})\s*w\b/i);

      if (wattsMatch && wattsMatch[1]) {
        const w = parseInt(wattsMatch[1], 10);
        if (w >= 200 && w <= 800) {
          modPowerWUser = w;
          targetKWp = Number(((count * w) / 1000).toFixed(2));
        }
      }

      if (!targetKWp) {
        // Fallback de potência padrão de módulo comercial (585W)
        targetKWp = Number(((count * 585) / 1000).toFixed(2));
      }
    }
  }

  // 4. Extração de Consumo (kWh / kw hora / kw mês / consumo de X kw)
  const parsedConsumption = parseConsumptionInput(clean);
  if (parsedConsumption !== null) {
    consumptionKwh = parsedConsumption;
  }

  // 5. Extração de Potência explícita (kWp / MWp / GWp / kW) se explicitamente informada ou fallback
  const directKWp = parsePowerInput(clean);
  if (directKWp !== null && directKWp >= 0.5) {
    targetKWp = directKWp;
  } else if (!targetKWp && !consumptionKwh) {
    const kwpRegexMatch = clean.match(
      /(?:cota[çc][ãa]o|or[çc]amento|sistema|usina|pot[êe]ncia)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(kwp|mwp|mw)\b/i
    );
    if (kwpRegexMatch && kwpRegexMatch[1]) {
      const val = parsePtBrNumber(kwpRegexMatch[1]);
      if (Number.isFinite(val) && val >= 0.5 && val <= 5_000_000) {
        targetKWp = val;
      }
    }
  }

  // Se detectamos consumo (kWh) e a mensagem NÃO teve explicitamente "kwp/mwp" ou termo explícito de usina/sistema de potência,
  // prioriza SEMPRE o consumo e descarta qualquer potência equivocada:
  if (consumptionKwh !== undefined && targetKWp !== undefined) {
    const hasExplicitKwp =
      /\b(?:\d+[\d.,]*)\s*(?:kwp|mwp|gwp)\b/i.test(clean) ||
      /(?:sistema|usina|gerador|kit)\s*(?:de\s+)?(?:\d+[\d.,]*)\s*(?:kwp|mwp|kw)\b/i.test(clean);
    if (!hasExplicitKwp) {
      targetKWp = undefined;
    }
  }

  // 6. Extração de Estrutura de Telhado
  if (
    /(?:estrutura|telhado)?\s*(?:met[áa]lic[ao]|zinco|trapezoidal)\b/i.test(clean) ||
    /\bmet[áa]lic[ao]\b/i.test(clean)
  ) {
    roofType = "Metálico";
  } else if (
    /(?:madeira\s+fibrocimento|fibro\s*madeira|fibrocimento|fibro|amianto|ondulada)\b/i.test(clean)
  ) {
    roofType = "Fibrocimento";
  } else if (/(?:colonial|cer[âa]mic[ao]|francesa|romana)\b/i.test(clean)) {
    roofType = "Cerâmica (Colonial)";
  } else if (/\b(?:de\s+)?solo\b/i.test(clean)) {
    roofType = "Solo";
  } else if (/\b(?:de\s+)?laje\b/i.test(clean)) {
    roofType = "Laje";
  } else if (/\bfibrometal\b/i.test(clean)) {
    roofType = "Fibrometal";
  } else if (/(?:sem\s+estrutura|sem\s+telhado|nenhuma\s+estrutura)\b/i.test(clean)) {
    roofType = "Sem estrutura";
  }

  // 7. Extração de Padrão Elétrico / Tensão
  let isTrifasicoGeneric = false;
  if (
    /\b(?:trif[áa]sico\s*380|trifasico\s*380|tri\s*380|380\s*v(?:olts?)?|380v|trezentos\s+e\s+oitenta\s*(?:v|volts?)?)\b/i.test(
      clean
    )
  ) {
    gridVoltage = "Trifásico 380V";
  } else if (
    /\b(?:trif[áa]sico\s*220|trifasico\s*220|tri\s*220|220\s*v?\s*tri(?:f[áa]sico)?|duzentos\s+e\s+vinte\s*tri(?:f[áa]sico)?)\b/i.test(
      clean
    )
  ) {
    gridVoltage = "Trifásico 220V";
  } else if (
    /\b(?:bif[áa]sico\s*220|bifasico\s*220|bi\s*220|220\s*bi|127\/220|127\s*\/\s*220|bif[áa]sico|bifasico|\bbi\b)\b/i.test(
      clean
    )
  ) {
    gridVoltage = "Bifásico 127V/220V";
  } else if (
    /\b(?:monof[áa]sico\s*220|monofasico\s*220|mono\s*220|220\s*mono|monof[áa]sico|monofasico|\bmono\b)\b/i.test(
      clean
    )
  ) {
    gridVoltage = "Monofásico 220V";
  } else if (
    /\b(?:127\s*v(?:olts?)?|127v|cento\s+e\s+vinte\s+e\s+sete\s*(?:v|volts?)?)\b/i.test(clean)
  ) {
    gridVoltage = "Bifásico 127V/220V";
  } else if (
    /\b(?:220\s*v(?:olts?)?|220v|rede\s*220|duzentos\s+e\s+vinte\s*(?:v|volts?)?)\b/i.test(clean)
  ) {
    // Para usinas solares de grande porte (>= 8 kWp, >= 1000 kWh ou >= 14 placas), no Brasil a rede 220V é Trifásico 220V
    const isLarge = Boolean(
      (targetKWp && targetKWp >= 8) ||
      (consumptionKwh && consumptionKwh >= 1000) ||
      (targetModules && targetModules >= 14)
    );
    if (isLarge) {
      gridVoltage = "Trifásico 220V";
    } else {
      gridVoltage = "Monofásico 220V";
    }
  } else if (/\b(?:trif[áa]sico|trifasico|\btri\b)\b/i.test(clean)) {
    isTrifasicoGeneric = true;
  }

  // 8. Extração de Cidade / Local de Entrega
  const locResult = extractLocationFromFreeText(clean);
  if (locResult) {
    if (locResult.isStateOnly && locResult.uf) {
      estado = locResult.uf;
      hsp = locResult.hsp;
      cidade = undefined;
    } else if (locResult.city) {
      cidade = locResult.city;
      estado = locResult.uf;
      hsp = locResult.hsp;
    }
  }

  // 9. Determina se é solicitação de cotação
  const hasQuoteKeywords =
    lower.includes("cotação") ||
    lower.includes("cotacao") ||
    lower.includes("orçamento") ||
    lower.includes("orcamento") ||
    lower.includes("orçar") ||
    lower.includes("orcar") ||
    lower.includes("simular") ||
    lower.includes("simulação") ||
    lower.includes("simulacao") ||
    lower.includes("preciso de uma cotação") ||
    lower.includes("consegue orçar");

  const isQuoteRequest = Boolean(
    targetKWp ||
    targetModules ||
    consumptionKwh ||
    (inverterPowerKw && (roofType || targetModules || targetKWp)) ||
    (hasQuoteKeywords && (targetKWp || targetModules || roofType || consumptionKwh))
  );

  return {
    targetKWp,
    targetModules,
    modPowerWUser,
    consumptionKwh,
    roofType,
    gridVoltage,
    isTrifasicoGeneric,
    cidade,
    estado,
    hsp,
    inverterType,
    inverterDescription,
    inverterPowerKw,
    hasBattery,
    batteryKwh,
    batteryQty,
    isQuoteRequest,
  };
}

/** Detecta solicitações de arquivo ou documento PDF no WhatsApp */
export function isWhatsappPdfRequest(text: string): boolean {
  if (!text) return false;
  // Ignora mensagens que representam uploads de arquivos/documentos recebidos pelo WhatsApp
  const rawLower = text.toLowerCase().trim();
  if (
    rawLower.startsWith("[documento enviado") ||
    rawLower.startsWith("[foto enviada") ||
    rawLower.startsWith("[mensagem de áudio") ||
    rawLower.startsWith("[mensagem de audio") ||
    rawLower.startsWith("[mensagem do tipo")
  ) {
    return false;
  }
  // Remove caracteres invisíveis e marcas de direção do WhatsApp (LTR \u200E, RTL \u200F, ZWSP \u200B-\u200D, BOM \uFEFF, \u202A-\u202E)
  const stripped = text.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "");
  const clean = stripped
    .toLowerCase()
    .trim()
    .replace(/[.,!?:;*~_]/g, "");

  const exactMatches = [
    "pdf",
    "baixar pdf",
    "enviar pdf",
    "gerar pdf",
    "manda o pdf",
    "mandar pdf",
    "quero o pdf",
    "quero pdf",
    "manda pdf",
    "me manda o pdf",
    "manda em pdf",
    "envia em pdf",
    "enviar em pdf",
    "link do pdf",
    "arquivo pdf",
    "pdf por favor",
    "pdf pfv",
    "tem pdf",
    "tem em pdf",
    "versao pdf",
    "versão pdf",
    "proposta em pdf",
    "pdf da proposta",
  ];

  if (exactMatches.includes(clean)) {
    return true;
  }

  // Coincidência se contiver a palavra isolada "pdf"
  if (/\bpdf\b/i.test(clean)) {
    return true;
  }

  return false;
}

export function resolveQuoteIndexFromText(
  text: string,
  quotesOrMax: number | any[]
): number | null {
  if (!text || typeof text !== "string") return null;

  const max = Array.isArray(quotesOrMax) ? quotesOrMax.length : quotesOrMax;
  if (typeof max !== "number" || max <= 0) return null;

  const quotes = Array.isArray(quotesOrMax) ? quotesOrMax : [];

  // Normaliza acentuações e caracteres especiais
  const clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[*_~`#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return null;

  // Se o texto for puramente padrão de rede elétrico (ex: "bifásico", "padrão trifásico", "rede mono")
  if (
    /\b(?:monofasico|bifasico|trifasico|padrao\s+(?:mono|bi|tri)|rede\s+(?:mono|bi|tri)|127v|220v|380v)\b/i.test(
      clean
    )
  ) {
    return null;
  }

  // Se contém medida com unidade de energia/placa (ex: "10 placas", "500 kwh", "5 kwp")
  // e NÃO menciona explicitamente termos de escolha como "kit", "opcao", "standard", "elite", "premium"
  const hasTechnicalUnit = /\b(?:\d+\s*(?:kwh|kwp|watts?|w|placas?|paineis|modulos?))\b/i.test(
    clean
  );
  const hasSelectionWord =
    /\b(?:kit|opcao|standar[td]?|elite|premium|padra[oõ]|padrao|primeir[oa]|segund[oa]|terceir[oa]|escolho|prefiro|vai\s+de|manda|fica\s+com)\b/i.test(
      clean
    );
  if (hasTechnicalUnit && !hasSelectionWord) {
    return null;
  }

  // 1. Se quotes contiver distribuidora customizada (ex: "Solis", "Growatt", "Deye"), verifica menção
  if (quotes.length > 0) {
    for (let i = 0; i < quotes.length; i++) {
      const distName = quotes[i]?.distributorName;
      if (
        distName &&
        typeof distName === "string" &&
        !["standard", "elite", "premium"].includes(distName.toLowerCase())
      ) {
        const cleanDist = distName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase();
        const distRegex = new RegExp(`\\b${cleanDist}\\b`, "i");
        if (distRegex.test(clean)) {
          return i < max ? i : null;
        }
      }
    }
  }

  // 2. Pontuação por Tiers para desambiguação inteligente
  let scoreStandard = 0;
  let scoreElite = 0;
  let scorePremium = 0;

  // --- Tier 0: Standard ---
  // Variações fonéticas de "standard": standar (sem d), standard, standart, estandar, estandard, estande
  // e termos comuns: padrao, primeiro(a), opcao 1, kit 1, mais recomendado
  const standardNameRegex = /\b(?:standar[td]?|estandar[td]?|estande)\b/i;
  const standardPadraoRegex = /\b(?:padra[oõ]|padrao)\b/i;
  const standardOptionRegex =
    /\b(?:primeir[oa]|1[oºaª]|opcao\s*(?:1|um)|kit\s*(?:1|um)|numero\s*(?:1|um)|n[oº]?\s*(?:1|um)|mais\s+recomendad[oa]|recomendad[oa])\b/i;

  // --- Tier 1: Elite ---
  // Variações: elite, eliter, segundo(a), opcao 2, kit 2, intermediario(a), do meio
  const eliteNameRegex = /\b(?:elite|eliter|elit)\b/i;
  const eliteOptionRegex =
    /\b(?:segund[oa]|2[oºaª]|opcao\s*(?:2|dois|duas)|kit\s*(?:2|dois|duas)|numero\s*(?:2|dois|duas)|n[oº]?\s*(?:2|dois|duas)|intermediari[oa]|do\s+meio)\b/i;

  // --- Tier 2: Premium ---
  // Variações: premium, premio, premiun, premyun, terceiro(a), opcao 3, kit 3, o melhor, mais completo, top
  const premiumNameRegex = /\b(?:premium|premio|premiun|premyun|premiu)\b/i;
  const premiumOptionRegex =
    /\b(?:terceir[oa]|3[oºaª]|opcao\s*(?:3|tres)|kit\s*(?:3|tres)|numero\s*(?:3|tres)|n[oº]?\s*(?:3|tres)|mais\s+complet[oa]|o\s+melhor|melhor\s+kit|top|mais\s+top)\b/i;

  // Helper: detecta se um termo foi explicitamente negado (ex: "não quero o standard", "em vez do standard prefiro o elite")
  const isNegated = (termRegex: RegExp) => {
    const negationPattern = new RegExp(
      `(?:\\b(?:n[aã]o|sem)\\s+(?:(?:quero|vou|vai|precisa|gostei|curti)\\s+)?|ao\\s+inv[eé]s\\s+d[eao]s?|em\\s+vez\\s+d[eao]s?)\\s*(?:(?:o|a|do|da|de|pelo|pela|pro|pra|um|uma)\\s+)*(?:kit\\s+)?(?:opcao\\s+)?${termRegex.source}`,
      "i"
    );
    return negationPattern.test(clean);
  };

  if (standardNameRegex.test(clean) && !isNegated(standardNameRegex)) scoreStandard += 10;
  if (standardPadraoRegex.test(clean) && !isNegated(standardPadraoRegex)) scoreStandard += 8;
  if (standardOptionRegex.test(clean) && !isNegated(standardOptionRegex)) scoreStandard += 6;

  if (eliteNameRegex.test(clean) && !isNegated(eliteNameRegex)) scoreElite += 10;
  if (eliteOptionRegex.test(clean) && !isNegated(eliteOptionRegex)) scoreElite += 6;

  if (premiumNameRegex.test(clean) && !isNegated(premiumNameRegex)) scorePremium += 10;
  if (premiumOptionRegex.test(clean) && !isNegated(premiumOptionRegex)) scorePremium += 6;

  const highestScore = Math.max(scoreStandard, scoreElite, scorePremium);
  if (highestScore > 0) {
    if (highestScore === scoreStandard && max >= 1) return 0;
    if (highestScore === scoreElite && max >= 2) return 1;
    if (highestScore === scorePremium && max >= 3) return 2;
  }

  // 3. Fallback de dígitos ou cardinais/ordinais isolados (excluindo unidades de dimensão)
  const textWithoutUnits = clean.replace(
    /\b[1-9]\s*(?:placas?|paineis|modulos?|kwh|kwp|watts?|w)\b/gi,
    ""
  );

  const digitMatch = textWithoutUnits.match(/\b([1-9])\b/);
  if (digitMatch && digitMatch[1]) {
    const digitIdx = parseInt(digitMatch[1], 10) - 1;
    if (digitIdx >= 0 && digitIdx < max) {
      return digitIdx;
    }
  }

  // Números por extenso em português quando usados isolados ou como escolha
  if (/\b(?:um|uma)\b/i.test(textWithoutUnits) && max >= 1) return 0;
  if (/\b(?:dois|duas)\b/i.test(textWithoutUnits) && max >= 2) return 1;
  if (/\b(?:tres)\b/i.test(textWithoutUnits) && max >= 3) return 2;
  if (/\b(?:quatro)\b/i.test(textWithoutUnits) && max >= 4) return 3;
  if (/\b(?:cinco)\b/i.test(textWithoutUnits) && max >= 5) return 4;

  return null;
}

export interface AvailableProposalTemplate {
  id: string;
  name: string;
  isHybrid?: boolean;
  config?: any;
}

export function isTemplateHybridCompatible(template: { name?: string; config?: any }): boolean {
  if (!template) return false;

  // 1. Verificação por palavra-chave no nome do template
  const name = (template.name || "").toLowerCase();
  const hybridKeywords = [
    "híbrido",
    "hibrido",
    "bateria",
    "baterias",
    "bess",
    "armazenamento",
    "backup",
    "off-grid",
    "offgrid",
    "off grid",
  ];
  if (hybridKeywords.some((kw) => name.includes(kw))) {
    return true;
  }

  // 2. Verificação por estrutura de seções e campos do config/document
  const config = template.config;
  if (config && typeof config === "object") {
    const sections = Array.isArray(config.sections) ? config.sections : [];
    for (const section of sections) {
      if (!section) continue;
      // Seção explícita de storage_backup, hybrid_flow ou critical_loads_autonomy
      if (
        section.type === "storage_backup" ||
        section.type === "hybrid_flow" ||
        section.type === "critical_loads_autonomy"
      ) {
        return true;
      }
      // Seção proposal_equipment com produtos de bateria/híbrido
      if (section.type === "proposal_equipment") {
        const lines = section.fields?.equipmentLines;
        if (Array.isArray(lines)) {
          const hasBattery = lines.some((line: any) => {
            const cat = (line?.categoryName || line?.category || "").toLowerCase();
            const prodName = (line?.productName || line?.name || "").toLowerCase();
            return (
              cat.includes("battery") ||
              cat.includes("bateria") ||
              cat.includes("bess") ||
              prodName.includes("bateria") ||
              prodName.includes("híbrido") ||
              prodName.includes("hibrido")
            );
          });
          if (hasBattery) return true;
        }
      }
    }
  }

  return false;
}

export interface TemplateSelectionListResult {
  text: string;
  selectableTemplates: AvailableProposalTemplate[];
  incompatibleTemplates: AvailableProposalTemplate[];
}

export function formatTemplateSelectionList(
  templates: AvailableProposalTemplate[],
  isHybridQuote: boolean
): TemplateSelectionListResult {
  const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

  if (!isHybridQuote) {
    let text = "";
    templates.forEach((t, i) => {
      const emoji = numberEmojis[i] || `${i + 1}️⃣`;
      text += `> ${emoji} *${t.name}*\n`;
    });
    text += `> 0️⃣ *Voltar / Rever dados*\n`;

    return {
      text,
      selectableTemplates: templates,
      incompatibleTemplates: [],
    };
  }

  // Cotação Híbrida / com Bateria
  const hybridTemplates = templates.filter((t) => t.isHybrid);
  const onGridTemplates = templates.filter((t) => !t.isHybrid);

  let selectableTemplates: AvailableProposalTemplate[] = [];

  if (hybridTemplates.length > 0) {
    selectableTemplates = hybridTemplates;
  } else {
    // Se o integrador não tiver templates de híbrido, oferece o Blueprint Oficial Híbrido da EnergivIA
    selectableTemplates = [
      {
        id: "blueprint-hybrid-official",
        name: "Modelo Híbrido & Backup Solar (EnergivIA)",
        isHybrid: true,
      },
    ];
  }

  let text = "";
  selectableTemplates.forEach((t, i) => {
    const emoji = numberEmojis[i] || `${i + 1}️⃣`;
    text += `> ${emoji} *${t.name}*\n`;
  });

  // Risca os modelos on-grid com a formatação de WhatsApp (~...~)
  if (onGridTemplates.length > 0) {
    text += `\n*Modelos On-Grid incompatíveis com Baterias:*\n`;
    onGridTemplates.forEach((t) => {
      text += `> ~${t.name} (Incompatível com Baterias)~\n`;
    });
  }

  text += `> 0️⃣ *Voltar / Rever dados*\n`;

  return {
    text,
    selectableTemplates,
    incompatibleTemplates: onGridTemplates,
  };
}

export interface TemplateResolutionResult {
  success: boolean;
  chosenTemplate?: AvailableProposalTemplate;
  reason?: "incompatible_on_grid" | "invalid_option";
  errorMessage?: string;
}

export function resolveChosenTemplate(
  input: string,
  templates: AvailableProposalTemplate[],
  isHybridQuote: boolean
): TemplateResolutionResult {
  const { selectableTemplates, incompatibleTemplates } = formatTemplateSelectionList(
    templates,
    isHybridQuote
  );

  const clean = input.trim();
  const digitMatch = clean.match(/^(\d+)/);
  let requestedIdx: number | null = null;

  if (digitMatch && digitMatch[1]) {
    requestedIdx = parseInt(digitMatch[1], 10) - 1;
  } else {
    const lower = clean.toLowerCase();
    if (/\b(?:um|uma|primeiro|primeira)\b/i.test(lower)) requestedIdx = 0;
    else if (/\b(?:dois|duas|segundo|segunda)\b/i.test(lower)) requestedIdx = 1;
    else if (/\b(?:tres|três|terceiro|terceira)\b/i.test(lower)) requestedIdx = 2;
    else if (/\b(?:quatro|quarta|quarto)\b/i.test(lower)) requestedIdx = 3;
    else if (/\b(?:cinco|quinta|quinto)\b/i.test(lower)) requestedIdx = 4;
  }

  if (requestedIdx === null || requestedIdx < 0) {
    return {
      success: false,
      reason: "invalid_option",
      errorMessage: "Opção inválida. Por favor, envie o número do modelo desejado.",
    };
  }

  // Se for cotação híbrida
  if (isHybridQuote) {
    // Se o índice digitado corresponder a um dos templates híbridos selecionáveis
    if (requestedIdx < selectableTemplates.length) {
      return {
        success: true,
        chosenTemplate: selectableTemplates[requestedIdx],
      };
    }

    // Se o usuário digitou uma opção que bate com os templates on-grid riscados
    const isIncompatibleChoice =
      incompatibleTemplates.length > 0 &&
      requestedIdx >= selectableTemplates.length &&
      requestedIdx < selectableTemplates.length + incompatibleTemplates.length;

    return {
      success: false,
      reason: "incompatible_on_grid",
      errorMessage: isIncompatibleChoice
        ? "⚠️ Este modelo comercial é exclusivo para sistemas On-Grid convencionais e não possui suporte a baterias/backup. Para sistemas híbridos, escolha o modelo com armazenamento ou o Modelo Oficial Híbrido EnergivIA."
        : "⚠️ Este modelo comercial é exclusivo para sistemas On-Grid convencionais e não possui suporte a baterias/backup. Para sistemas híbridos, escolha o modelo com armazenamento ou o Modelo Oficial Híbrido EnergivIA.",
    };
  }

  // Cotação normal (On-Grid)
  if (requestedIdx < selectableTemplates.length) {
    return {
      success: true,
      chosenTemplate: selectableTemplates[requestedIdx],
    };
  }

  return {
    success: false,
    reason: "invalid_option",
    errorMessage: "Opção inválida. Por favor, envie o número do modelo desejado.",
  };
}

@Injectable()
export class WhatsappBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappBotService.name);
  private readonly inboundPhoneQueues = new Map<string, Promise<void>>();
  private genAI: GoogleGenerativeAI | null = null;
  private inactivityCheckTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly whatsappCloud: WhatsappCloudService,
    private readonly whatsappPairing: WhatsappPairingService,
    private readonly aiUsage: AiUsageService,
    private readonly geoIrradiance: GeoIrradianceService,
    private readonly billExtractor: BillExtractorService,
    private readonly kitGeneration: KitGenerationService,
    @Optional()
    @Inject(forwardRef(() => ProposalsService))
    private readonly proposalsService?: ProposalsService,
    @Optional()
    private guestTrial?: WhatsappGuestTrialService
  ) {
    if (!this.guestTrial && this.prisma) {
      this.guestTrial = new WhatsappGuestTrialService(this.prisma);
    }
    this.getGenAI();
  }

  public getGenAI(): GoogleGenerativeAI | null {
    if (this.genAI) return this.genAI;
    const geminiKey =
      this.config.get<string>("GOOGLE_GEMINI_API_KEY") ||
      this.config.get<string>("GEMINI_API_KEY") ||
      this.config.get<string>("GOOGLE_GENERATIVE_AI_API_KEY") ||
      process.env["GOOGLE_GEMINI_API_KEY"] ||
      process.env["GEMINI_API_KEY"] ||
      process.env["GOOGLE_GENERATIVE_AI_API_KEY"] ||
      "";
    if (geminiKey) {
      this.genAI = new GoogleGenerativeAI(geminiKey);
      return this.genAI;
    }
    return null;
  }

  onModuleInit() {
    this.inactivityCheckTimer = setInterval(() => {
      this.checkInactiveConversations().catch((err) => {
        this.logger.error("Erro ao verificar inatividade de conversas do WhatsApp:", err);
      });
    }, 30_000); // Executa verificação a cada 30 segundos

    // Auto-sincroniza o grupo de alertas executivos do WhatsApp se ainda não configurado
    setTimeout(() => {
      this.syncAlertGroup().catch((err) => {
        this.logger.warn(`[Admin Alerts] AutoSync inicial de grupo não pôde ser concluído: ${err}`);
      });
    }, 5000);
  }

  onModuleDestroy() {
    if (this.inactivityCheckTimer) {
      clearInterval(this.inactivityCheckTimer);
    }
  }

  private isFlowActive(lastBotContent: string): boolean {
    if (!lastBotContent) return false;
    const lowerContent = lastBotContent.toLowerCase();
    // Se a proposta já foi concluída, não há lembretes nem encerramento
    if (
      lowerContent.includes("proposta comercial gerada com sucesso") ||
      lowerContent.includes("acesse a proposta") ||
      lowerContent.includes("painel crm")
    ) {
      return false;
    }
    // Se já foi encerrado por inatividade ou reiniciado
    if (
      lowerContent.includes("encerramos este atendimento") ||
      lowerContent.includes("estou encerrando este atendimento") ||
      lowerContent.includes("sessão reiniciada com sucesso")
    ) {
      return false;
    }
    // Se está apenas no menu inicial (antes de qualquer fluxo ser iniciado)
    if (
      (lowerContent.includes("como posso ajudar você a gerar orçamentos") ||
        lowerContent.includes("escolha uma opção digitando o número:")) &&
      !lowerContent.includes("qual opção você prefere para o seu cliente")
    ) {
      return false;
    }

    // Verifica etapas ativas de atendimento / simulação
    return (
      lowerContent.includes("para qual cidade e estado será a instalação") ||
      lowerContent.includes("qual o padrão de entrada da instalação") ||
      lowerContent.includes("qual a estrutura do telhado") ||
      lowerContent.includes("estrutura do telhado") ||
      lowerContent.includes("taxa padrão configurada") ||
      lowerContent.includes("taxa padrão") ||
      lowerContent.includes("qual valor por kwp") ||
      lowerContent.includes("qual valor você deseja utilizar") ||
      lowerContent.includes("como deseja prosseguir para esta cotação") ||
      lowerContent.includes("como você deseja prosseguir para esta cotação") ||
      lowerContent.includes("qual opção você prefere para o seu cliente") ||
      lowerContent.includes("cliente final") ||
      lowerContent.includes("qual o nome do cliente final") ||
      lowerContent.includes("qual o whatsapp dele") ||
      lowerContent.includes("qual modelo de proposta comercial você deseja usar") ||
      lowerContent.includes("consumo médio mensal") ||
      lowerContent.includes("potência de pico") ||
      lowerContent.includes("placas solares") ||
      lowerContent.includes("fatura analisada com precisão") ||
      lowerContent.includes("dados extraídos com precisão")
    );
  }

  private async checkInactiveConversations(): Promise<void> {
    try {
      // Busca um phoneNumberId global recente caso alguma conversa não tenha salvo no metadata
      let globalPhoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      if (!globalPhoneNumberId) {
        const convWithPhone = await this.prisma.conversation.findFirst({
          where: {
            channel: "whatsapp",
          },
          orderBy: { createdAt: "desc" },
        });
        if (convWithPhone && (convWithPhone.metadata as any)?.phoneNumberId) {
          globalPhoneNumberId = (convWithPhone.metadata as any).phoneNumberId;
        }
      }

      // Busca todas as conversas ativas do canal WhatsApp que possuem mensagens
      const conversations = await this.prisma.conversation.findMany({
        where: {
          channel: "whatsapp",
          messages: { some: {} },
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      for (const conversation of conversations) {
        if (!conversation.messages || conversation.messages.length === 0) continue;

        const lastMsg = conversation.messages[conversation.messages.length - 1];
        if (!lastMsg || lastMsg.role !== "assistant") continue;

        // Se a conversa já foi encerrada por inatividade, não processa
        if (
          lastMsg.content.includes("encerramos este atendimento") ||
          lastMsg.content.includes("estou encerrando este atendimento")
        ) {
          continue;
        }

        // Recupera a última mensagem funcional (sem ser lembrete)
        const functionalMsgs = conversation.messages.filter(
          (m) => m.role === "assistant" && !m.content?.includes("Você ainda está por aí?")
        );
        const lastFunctionalBotMsg =
          functionalMsgs.length > 0 ? functionalMsgs[functionalMsgs.length - 1]?.content || "" : "";

        // Só monitora inatividade se um fluxo de atendimento foi iniciado e não concluído
        if (!this.isFlowActive(lastFunctionalBotMsg)) {
          continue;
        }

        // Calcula o tempo decorrido desde a última resposta do usuário (ou da pergunta do bot se não houve resposta ainda)
        const lastUserMsg = [...conversation.messages].reverse().find((m) => m.role === "user");
        const referenceDate = lastUserMsg
          ? new Date(lastUserMsg.createdAt)
          : new Date(functionalMsgs[functionalMsgs.length - 1]?.createdAt || lastMsg.createdAt);
        const totalIdleTimeMs = Date.now() - referenceDate.getTime();

        const meta = (conversation.metadata as any) || {};
        const toWaId = meta.customerWaId || conversation.title;
        const phoneNumberId = meta.phoneNumberId || globalPhoneNumberId;

        if (!toWaId || !phoneNumberId) continue;

        // 15 MINUTOS OU MAIS: Encerra educadamente e profissionalmente
        if (totalIdleTimeMs >= 15 * 60 * 1000) {
          const closureText =
            `Como não tivemos retorno por aqui, encerramos este atendimento. ☀️\n\n` +
            `Quando quiser iniciar uma nova cotação, basta nos enviar uma mensagem. Estamos à disposição e ótimas vendas!`;

          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: closureText,
          });

          // Limpa as mensagens antigas para que a próxima interação comece do zero
          await this.prisma.message.deleteMany({
            where: { conversationId: conversation.id },
          });

          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: closureText,
              channel: "whatsapp",
            },
          });

          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          this.logger.log(
            `Conversa ${conversation.id} (${toWaId}) encerrada por inatividade de 15 minutos.`
          );

          await this.flushPendingProposalViewAlerts(conversation.id, phoneNumberId, toWaId);
          continue;
        }

        // 10 MINUTOS: Pergunta educadamente se o usuário ainda está por aí
        if (totalIdleTimeMs >= 10 * 60 * 1000) {
          // Se já enviou o lembrete, não envia de novo
          if (lastMsg.content.includes("Você ainda está por aí?")) {
            continue;
          }

          const reminderText =
            `Olá! Você ainda está por aí? ☀️\n\n` +
            `Podemos continuar sua simulação quando quiser. Falta pouco para gerarmos a proposta para o seu cliente!`;

          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: reminderText,
          });

          await this.prisma.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: reminderText,
              channel: "whatsapp",
            },
          });

          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          this.logger.log(
            `Lembrete de 10 min enviado para conversa ${conversation.id} (${toWaId}).`
          );
        }
      }
    } catch (err) {
      this.logger.error("Erro na rotina de checagem de inatividade do WhatsApp:", err);
    }
  }

  async handleWebhookPayload(payload: WebhookPayload): Promise<void> {
    if (!payload || !payload.entry || !Array.isArray(payload.entry)) {
      return;
    }

    for (const entry of payload.entry) {
      const changes = entry.changes;
      if (!changes || !Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== "messages") continue;
        const val = change.value;
        if (!val || !val.messages || !Array.isArray(val.messages)) continue;

        const metadata = val.metadata;
        const phoneNumberId =
          metadata?.phone_number_id || this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") || "";
        const contacts = val.contacts || [];

        for (const message of val.messages) {
          await this.processSingleMessage({
            message,
            phoneNumberId,
            contactName: contacts[0]?.profile?.name || "Integrador",
          });
        }
      }
    }
  }

  async handleEvolutionWebhookPayload(payload: any): Promise<void> {
    if (!payload) return;

    // Normalização: a Evolution pode enviar { event: "messages.upsert", data: { ... } }
    // ou MESSAGES_UPSERT, array de dados ou payload direto
    const rawEvent = typeof payload.event === "string" ? payload.event.toLowerCase() : "";
    const event = rawEvent.replace(/[_-]/g, ".");
    if (event && event !== "messages.upsert" && event !== "messages.update") {
      // Ignora status de conexão, contatos, etc.
      return;
    }

    let rawData = payload.data || payload;
    if (
      rawData &&
      typeof rawData === "object" &&
      "messages" in rawData &&
      Array.isArray((rawData as any).messages)
    ) {
      rawData = (rawData as any).messages;
    }
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    if (!data || typeof data !== "object") return;
    const key = data.key;
    if (!key) return;

    const remoteJid = key.remoteJid || "";
    // Ignora status do WhatsApp
    if (remoteJid.includes("status@broadcast")) {
      return;
    }

    // Tratamento de grupos do WhatsApp
    // NOTA: Permite comandos administrativos mesmo se fromMe for true (caso o dono envie do número pareado ao bot)
    if (remoteJid.endsWith("@g.us")) {
      const activeAlertGroup = await this.getAdminAlertGroupJid();

      // SEGURANÇA E PRIVACIDADE MÁXIMA:
      // Se o canal oficial de alertas já foi configurado, o robô é terminantemente PROIBIDO de responder em qualquer outro grupo!
      // Qualquer mensagem ou tentativa de comando vinda de grupos não-autorizados é descartada em silêncio absoluto.
      if (activeAlertGroup && activeAlertGroup !== remoteJid) {
        return;
      }

      let msgObj: any = data.message || {};
      if (msgObj.ephemeralMessage?.message) {
        msgObj = msgObj.ephemeralMessage.message;
      }
      if (msgObj.viewOnceMessage?.message) {
        msgObj = msgObj.viewOnceMessage.message;
      }
      if (msgObj.documentWithCaptionMessage?.message) {
        msgObj = msgObj.documentWithCaptionMessage.message;
      }

      const incomingText = (
        msgObj.conversation ||
        msgObj.extendedTextMessage?.text ||
        msgObj.imageMessage?.caption ||
        msgObj.videoMessage?.caption ||
        msgObj.buttonsResponseMessage?.selectedDisplayText ||
        msgObj.templateButtonReplyMessage?.selectedDisplayText ||
        msgObj.listResponseMessage?.title ||
        ""
      )
        .trim()
        .toLowerCase();

      this.logger.log(
        `[WhatsApp Group] Mensagem recebida no grupo ${remoteJid}: "${incomingText}" (fromMe: ${Boolean(key.fromMe)})`
      );

      // Se NENHUM grupo está ativo ainda, só processa o comando de ativação para definir o canal oficial
      if (!activeAlertGroup) {
        if (
          incomingText.includes("#ativar-alerta") ||
          incomingText.includes("#ativar-alertas") ||
          incomingText.includes("#alerta") ||
          incomingText.includes("ativar alertas") ||
          incomingText.includes("ativar-alertas") ||
          incomingText.includes("ativar alerta")
        ) {
          await this.handleAdminGroupActivation(remoteJid, data.pushName);
        }
        return;
      }

      // Se JÁ É o canal oficial de alertas autorizado (remoteJid === activeAlertGroup):
      if (
        incomingText.includes("#teste-alerta") ||
        incomingText.includes("#teste-alertas") ||
        incomingText.includes("#alerta-teste")
      ) {
        await this.handleAdminGroupTestAlert(remoteJid);
        return;
      }

      if (incomingText.includes("#status-alerta") || incomingText.includes("#status-alertas")) {
        await this.handleAdminGroupStatus(remoteJid);
        return;
      }

      if (
        incomingText.includes("#desativar-alerta") ||
        incomingText.includes("#desativar-alertas")
      ) {
        await this.handleAdminGroupDeactivation(remoteJid);
        return;
      }

      if (
        incomingText.includes("#ativar-alerta") ||
        incomingText.includes("#ativar-alertas") ||
        incomingText.includes("#alerta") ||
        incomingText.includes("ativar alertas") ||
        incomingText.includes("ativar-alertas") ||
        incomingText.includes("ativar alerta")
      ) {
        await this.handleAdminGroupActivation(remoteJid, data.pushName);
        return;
      }

      // Qualquer conversa normal dentro do grupo de alertas é ignorada em silêncio
      return;
    }

    // Ignora mensagens enviadas pelo próprio bot em conversas 1:1
    if (key.fromMe) return;

    const fromWaId = remoteJid.replace(/@.*$/, "").replace(/\D/g, "");
    if (!fromWaId) return;

    const messageContent = data.message || {};
    const messageId = key.id || `evo_${Date.now()}`;
    const contactName = data.pushName || "Integrador";

    let msgType = "unknown";
    const mappedMessage: WebhookMessage = {
      id: messageId,
      from: fromWaId,
    };

    // 1. Mensagem de texto simples ou estendida
    if (messageContent.conversation) {
      msgType = "text";
      mappedMessage.type = "text";
      mappedMessage.text = { body: messageContent.conversation };
    } else if (messageContent.extendedTextMessage?.text) {
      msgType = "text";
      mappedMessage.type = "text";
      mappedMessage.text = { body: messageContent.extendedTextMessage.text };
    }
    // 2. Documento (ex: conta de luz em PDF)
    else if (messageContent.documentMessage) {
      msgType = "document";
      const doc = messageContent.documentMessage;
      mappedMessage.type = "document";
      mappedMessage.document = {
        id: messageId,
        filename: doc.fileName || doc.title || "fatura.pdf",
        mime_type: doc.mimetype || "application/pdf",
      };

      this.whatsappCloud.registerEvolutionRawMessage(messageId, {
        key: data.key,
        message: data.message || messageContent,
      });

      const b64 = doc.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          mappedMessage.document.mime_type || "application/pdf"
        );
      }
    }
    // 3. Imagem (ex: foto de conta de luz)
    else if (messageContent.imageMessage) {
      msgType = "image";
      const img = messageContent.imageMessage;
      mappedMessage.type = "image";
      mappedMessage.image = {
        id: messageId,
        caption: img.caption || "",
        mime_type: img.mimetype || "image/jpeg",
      };

      this.whatsappCloud.registerEvolutionRawMessage(messageId, {
        key: data.key,
        message: data.message || messageContent,
      });

      const b64 = img.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          mappedMessage.image.mime_type || "image/jpeg"
        );
      }
    }
    // 4. Áudio / Mensagem de Voz (Evolution API)
    else if (messageContent.audioMessage || messageContent.pttMessage) {
      const audioData = messageContent.audioMessage || messageContent.pttMessage;
      msgType = "audio";
      mappedMessage.type = "audio";
      const audioMime = audioData?.mimetype || "audio/ogg; codecs=opus";
      mappedMessage.audio = { id: messageId, mime_type: audioMime };

      this.whatsappCloud.registerEvolutionRawMessage(messageId, {
        key: data.key,
        message: data.message || messageContent,
      });

      const b64 = audioData?.base64 || data.base64 || messageContent.base64;
      if (b64) {
        const cleanB64 = b64.replace(/^data:.*?;base64,/, "");
        this.whatsappCloud.registerMediaBuffer(
          messageId,
          Buffer.from(cleanB64, "base64"),
          audioMime
        );
      }
    }
    // 5. Botões e Listas Interativas (Evolution API)
    else if (messageContent.buttonsResponseMessage) {
      msgType = "text";
      mappedMessage.type = "text";
      const btnId =
        messageContent.buttonsResponseMessage.selectedButtonId ||
        messageContent.buttonsResponseMessage.selectedDisplayText ||
        "";
      mappedMessage.text = { body: btnId };
    } else if (messageContent.listResponseMessage) {
      msgType = "text";
      mappedMessage.type = "text";
      const rowId =
        messageContent.listResponseMessage.singleSelectReply?.selectedRowId ||
        messageContent.listResponseMessage.title ||
        "";
      mappedMessage.text = { body: rowId };
    } else if (messageContent.templateButtonReplyMessage) {
      msgType = "text";
      mappedMessage.type = "text";
      const tId =
        messageContent.templateButtonReplyMessage.selectedId ||
        messageContent.templateButtonReplyMessage.selectedDisplayText ||
        "";
      mappedMessage.text = { body: tId };
    }
    // 6. Localização / Google Maps (Evolution API / Baileys)
    else if (messageContent.locationMessage || messageContent.liveLocationMessage) {
      msgType = "location";
      const loc = messageContent.locationMessage || messageContent.liveLocationMessage;
      mappedMessage.type = "location";
      mappedMessage.location = {
        latitude: Number(loc.degreesLatitude ?? loc.latitude),
        longitude: Number(loc.degreesLongitude ?? loc.longitude),
        name: loc.name || "",
        address: loc.address || "",
        url: loc.url || "",
      };
    }

    if (msgType === "unknown") {
      this.logger.debug(
        `[Evolution API] Mensagem de tipo desconhecido/não suportada recebida de ${fromWaId}`
      );
      return;
    }

    await this.processSingleMessage({
      message: mappedMessage,
      phoneNumberId: payload.instance || "evolution",
      contactName,
    });
  }

  async handleAdminGroupActivation(groupJid: string, senderName?: string, force = false) {
    this.logger.log(
      `[Admin Alerts] Solicitação de ativação de grupo de alertas: ${groupJid} (solicitado por ${senderName || "Admin"}, force=${force})`
    );
    try {
      const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
      });

      const currentJid = existing?.value?.trim();

      if (currentJid && !force) {
        if (currentJid === groupJid) {
          this.logger.log(`[Admin Alerts] Grupo ${groupJid} já é o canal oficial de alertas.`);
          const alreadyActiveMsg =
            `✅ *ESTE GRUPO JÁ ESTÁ ATIVO COMO O CANAL DE ALERTAS!* 🚀\n\n` +
            `Este grupo é o canal oficial configurado para receber notificações executivas da EnergivIA em tempo real:\n\n` +
            `• 🚨 *Central de Ajuda & Chamados*\n` +
            `• 👤 *Novos Cadastros de Integradores*\n` +
            `• ⏳ *Tentativa de Pagamento (Checkout Iniciado)*\n` +
            `• 💳 *Pagamentos Confirmados*\n\n` +
            `👉 Para testar o envio de um alerta agora, envie neste grupo:\n` +
            `*#teste-alerta*`;

          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId: groupJid,
            body: alreadyActiveMsg,
          });
          return;
        }

        // Se já configurado para OUTRO grupo: BLOQUEIO TOTAL E SILENCIOSO!
        // Nenhuma resposta enviada para não expor a plataforma nem poluir outros grupos.
        this.logger.warn(
          `[Admin Alerts] BLOQUEADO: Tentativa de ativação no grupo ${groupJid} rejeitada. Já travado para ${currentJid}.`
        );
        return;
      }

      await this.prisma.systemSetting.upsert({
        where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
        update: { value: groupJid },
        create: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID", value: groupJid },
      });

      const confirmationMsg =
        `🚨 *GRUPO DE ALERTAS ENERGIVIA ATIVADO COM SUCESSO!* ✅\n\n` +
        `Olá! Este grupo foi configurado como o canal oficial de notificações executivas da plataforma.\n\n` +
        `*Você receberá alertas em tempo real de:*\n` +
        `• 🚨 *Central de Ajuda:* Chamados de suporte, bugs e melhorias;\n` +
        `• 👤 *Novos Cadastros:* Novos integradores que se registraram;\n` +
        `• ⏳ *Intenção de Pagamento:* Clientes que chegaram na tela de pagamento;\n` +
        `• 💳 *Pagamentos Confirmados:* Assinaturas ativadas.\n\n` +
        `👉 Para testar o funcionamento agora mesmo, envie neste grupo:\n` +
        `*#teste-alerta*\n\n` +
        `_(Alertas de propostas desativados para este canal)_`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: groupJid,
        body: confirmationMsg,
      });
      this.logger.log(`[Admin Alerts] Confirmação enviada para o grupo ${groupJid}`);
    } catch (err) {
      this.logger.error(`[Admin Alerts] Falha ao registrar/responder no grupo ${groupJid}: ${err}`);
    }
  }

  async handleAdminGroupTestAlert(groupJid: string) {
    try {
      const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const testMsg =
        `🔔 *TESTE DE ALERTA OPERACIONAL ENERGIVIA*\n\n` +
        `Conexão com o WhatsApp funcionando perfeitamente! ✅\n\n` +
        `• *Status:* Ativo e operacional\n` +
        `• *ID do Grupo:* \`${groupJid}\`\n` +
        `• *Data/Hora:* ${now}\n\n` +
        `Todos os novos chamados da central de ajuda, cadastros na plataforma e pagamentos aprovados serão notificados aqui automaticamente.`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: groupJid,
        body: testMsg,
      });
    } catch (err) {
      this.logger.error(`[Admin Alerts] Erro ao enviar teste para grupo ${groupJid}: ${err}`);
    }
  }

  async handleAdminGroupStatus(groupJid: string) {
    try {
      const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
      });
      const currentJid = existing?.value?.trim();
      const isCurrentThisGroup = currentJid === groupJid;

      const statusMsg =
        `📊 *STATUS DO CANAL DE ALERTAS*\n\n` +
        `• *Este Grupo:* \`${groupJid}\`\n` +
        `• *Grupo Vinculado:* \`${currentJid || "Nenhum"}\`\n` +
        `• *Situação:* ${isCurrentThisGroup ? "🟢 Ativo e Configurado para este grupo" : currentJid ? "🟡 Vinculado a outro canal" : "🔴 Não configurado"}\n\n` +
        (isCurrentThisGroup
          ? `_Envie #teste-alerta para testar ou #desativar-alertas para desligar._`
          : `_Envie #ativar-alertas ou #ativar-alertas-force para vincular a este grupo._`);

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: groupJid,
        body: statusMsg,
      });
    } catch (err) {
      this.logger.error(`[Admin Alerts] Erro ao checar status do grupo ${groupJid}: ${err}`);
    }
  }

  async handleAdminGroupDeactivation(groupJid: string) {
    try {
      const phoneNumberId = this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID")?.trim() || "";
      await this.prisma.systemSetting.deleteMany({
        where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
      });
      const deactMsg =
        `🛑 *CANAL DE ALERTAS DESATIVADO COM SUCESSO!*\n\n` +
        `Este grupo não receberá mais notificações automáticas da plataforma.\n\n` +
        `_Para reativar a qualquer momento, envie *#ativar-alertas*._`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: groupJid,
        body: deactMsg,
      });
    } catch (err) {
      this.logger.error(`[Admin Alerts] Erro ao desativar alertas para grupo ${groupJid}: ${err}`);
    }
  }

  async handleContactsVCardExport(params: {
    tenantId: string;
    phoneNumberId: string;
    toWaId: string;
  }): Promise<void> {
    try {
      const leads = await this.prisma.lead.findMany({
        where: { tenantId: params.tenantId, deletedAt: null },
        select: { name: true, whatsapp: true, email: true, company: true },
      });

      const conversations = await this.prisma.conversation.findMany({
        where: { organizationId: params.tenantId, channel: "whatsapp" },
        select: { title: true, metadata: true },
      });

      const contactsMap = new Map<string, ContactVCardItem>();

      for (const l of leads) {
        const phone = formatInternationalPhone(l.whatsapp || "");
        if (!phone || phone.length < 10) continue;
        contactsMap.set(phone, {
          name: l.name,
          phone,
          email: l.email || undefined,
          company: l.company || undefined,
          role: "Cliente",
        });
      }

      for (const c of conversations) {
        const meta =
          c.metadata && typeof c.metadata === "object"
            ? (c.metadata as Record<string, unknown>)
            : {};
        const sessionData =
          meta["sessionData"] && typeof meta["sessionData"] === "object"
            ? (meta["sessionData"] as Record<string, unknown>)
            : {};
        const raw =
          typeof c.title === "string" && c.title.match(/^\d+$/)
            ? c.title
            : String(meta["customerWaId"] || meta["phone"] || "");
        const phone = formatInternationalPhone(raw);
        if (!phone || phone.length < 10) continue;

        const existing = contactsMap.get(phone);
        const contactName =
          (typeof meta["contactName"] === "string" && (meta["contactName"] as string)) ||
          (typeof sessionData["clientName"] === "string" &&
            (sessionData["clientName"] as string)) ||
          "Integrador Solar";

        if (!existing) {
          contactsMap.set(phone, {
            name: contactName,
            phone,
            role: "Integrador Solar",
          });
        } else if (existing.name === "Integrador" || existing.name === "Integrador Solar") {
          if (contactName && contactName !== "Integrador" && contactName !== "Integrador Solar") {
            existing.name = contactName;
          }
        }
      }

      const items = Array.from(contactsMap.values());
      const vcard = generateVCard(items);
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `contatos-energivia-${dateStr}.vcf`;

      const introMsg =
        `📲 *Exportação da sua Agenda (.vcf)* ☀️\n\n` +
        `Encontrei *${items.length} contatos* (integradores e clientes) vinculados à sua conta.\n\n` +
        `Estou enviando o arquivo da agenda logo abaixo.\n` +
        `👉 *Basta tocar no arquivo recebido e selecionar "Salvar contatos" ou "Importar" no seu celular!*\n\n` +
        `_Isso adicionará todos os números à agenda do seu aparelho, liberando imediatamente o recurso de *Status do WhatsApp*._`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body: introMsg,
      });

      await this.whatsappCloud.sendDocumentMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        fileName,
        documentBase64: Buffer.from(vcard, "utf-8").toString("base64"),
        mimetype: "text/vcard",
        caption: "📁 Toque para importar todos os contatos no seu celular",
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`[Contacts Export] Erro ao exportar contatos vCard: ${errMsg}`);
      await this.whatsappCloud.sendTextMessage({
        phoneNumberId: params.phoneNumberId,
        toWaId: params.toWaId,
        body: "❌ Ocorreu um erro ao gerar o arquivo de contatos. Por favor, tente novamente em instantes.",
      });
    }
  }

  async syncAlertGroup(): Promise<{
    success: boolean;
    groupJid?: string;
    subject?: string;
    alreadyLocked?: boolean;
    groupsFound?: Array<{ id: string; subject: string }>;
  }> {
    try {
      const existing = await this.getAdminAlertGroupJid();
      if (existing) {
        this.logger.log(`[Admin Alerts] Grupo já ativo e bloqueado: ${existing}`);
        return { success: true, groupJid: existing, alreadyLocked: true };
      }

      const groups = await this.whatsappCloud.fetchAllEvolutionGroups();
      this.logger.log(`[Admin Alerts] Grupos obtidos da Evolution API: ${groups.length}`);

      const match = groups.find(
        (g) =>
          g.subject.toLowerCase().includes("alerta") || g.subject.toLowerCase().includes("alertas")
      );

      if (match) {
        await this.handleAdminGroupActivation(match.id, "AutoSync");
        return { success: true, groupJid: match.id, subject: match.subject };
      }

      return {
        success: false,
        groupsFound: groups,
      };
    } catch (err) {
      this.logger.error(`[Admin Alerts] Erro ao sincronizar grupo de alertas: ${err}`);
      return { success: false };
    }
  }

  async getAdminAlertGroupJid(): Promise<string | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: "ADMIN_WHATSAPP_ALERT_GROUP_JID" },
    });
    return setting?.value?.trim() || null;
  }

  private async resolveAuthorizedTenant(fromWaId: string) {
    const candidates = expandInboundPhoneCandidates(fromWaId);

    const boundPhone = await this.prisma.tenantWhatsappInboundPhone.findFirst({
      where: {
        phoneDigits: { in: candidates },
      },
      include: {
        organization: {
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        },
      },
    });

    if (boundPhone && boundPhone.organization) {
      const orgSettings =
        (boundPhone.organization.settings as Record<string, unknown> | null) || {};
      if (orgSettings["specialAccessRevoked"] === true) {
        this.logger.warn(
          `Tentativa de acesso via WhatsApp de organização com acesso especial revogado: ${boundPhone.organization.id}`
        );
        // Expurga o vínculo residual para garantir bloqueio definitivo
        await this.prisma.tenantWhatsappInboundPhone.deleteMany({
          where: { organizationId: boundPhone.organization.id },
        });
        return null;
      }
      return boundPhone.organization;
    }

    return null;
  }

  private async isTenantPlanActive(tenant: {
    id: string;
    createdAt: Date | string;
    settings?: unknown;
    subscription?: {
      status: string;
      plan?: { id?: string; name?: string | null; features?: unknown } | null;
    } | null;
  }): Promise<{
    active: boolean;
    reason?: "trial_expired" | "proposal_limit_reached" | "bot_disabled";
    planName?: string;
    monthlyLimit?: number | null;
  }> {
    const planDetails = getTenantPlanDetails(tenant);

    if (planDetails.isTrial) {
      const proposalsCount = await this.prisma.proposal.count({
        where: { tenantId: tenant.id, deletedAt: null },
      });

      // No WhatsApp, todo integrador/empresa em teste tem direito garantido a pelo menos
      // 3 cotações gratuitas completas de degustação, mesmo que o prazo de 7 dias úteis da web tenha expirado.
      if (planDetails.trialExpired && proposalsCount >= 3) {
        return { active: false, reason: "trial_expired", planName: planDetails.planName };
      }

      if (proposalsCount >= 20) {
        return {
          active: false,
          reason: "proposal_limit_reached",
          planName: planDetails.planName,
          monthlyLimit: 20,
        };
      }

      return { active: true, planName: planDetails.planName };
    }

    if (!planDetails.features.hasWhatsappBot) {
      return { active: false, reason: "bot_disabled", planName: planDetails.planName };
    }

    const monthlyLimit = planDetails.features.maxProposalsPerMonth;
    if (monthlyLimit !== null && monthlyLimit !== undefined && monthlyLimit > 0) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const count = await this.prisma.proposal.count({
        where: {
          tenantId: tenant.id,
          deletedAt: null,
          createdAt: { gte: startOfMonth },
        },
      });

      if (count >= monthlyLimit) {
        return {
          active: false,
          reason: "proposal_limit_reached",
          planName: planDetails.planName,
          monthlyLimit,
        };
      }
    }

    return { active: true, planName: planDetails.planName };
  }

  public async processSingleMessage({
    message,
    phoneNumberId,
    contactName,
  }: {
    message: WebhookMessage;
    phoneNumberId: string;
    contactName: string;
  }): Promise<void> {
    const fromWaId = message?.from || "";
    if (!fromWaId) {
      return this.processSingleMessageInternal({ message, phoneNumberId, contactName });
    }

    const currentQueue = this.inboundPhoneQueues.get(fromWaId) || Promise.resolve();
    const nextTask = currentQueue
      .catch(() => {})
      .then(() => this.processSingleMessageInternal({ message, phoneNumberId, contactName }))
      .finally(() => {
        if (this.inboundPhoneQueues.get(fromWaId) === nextTask) {
          this.inboundPhoneQueues.delete(fromWaId);
        }
      });

    this.inboundPhoneQueues.set(fromWaId, nextTask);
    return nextTask;
  }

  private async processSingleMessageInternal({
    message,
    phoneNumberId,
    contactName,
  }: {
    message: WebhookMessage;
    phoneNumberId: string;
    contactName: string;
  }): Promise<void> {
    const waMessageId = message.id;
    const fromWaId = message.from;
    const msgType = message.type;

    if (!waMessageId || !fromWaId) return;

    // 1. Deduplicação de Webhook
    const existing = await this.prisma.whatsappInboundMessage.findUnique({
      where: { waMessageId },
    });
    if (existing) {
      this.logger.debug(`Mensagem duplicada ignorada: ${waMessageId}`);
      return;
    }

    // 2. Extração inicial do texto para verificar comando de pareamento
    let incomingText = "";
    if (msgType === "text") {
      incomingText = (message.text?.body || "").trim();
    } else if (msgType === "interactive") {
      const interactive = message.interactive;
      if (interactive?.type === "button_reply") {
        incomingText = (
          interactive.button_reply?.id ||
          interactive.button_reply?.title ||
          ""
        ).trim();
      } else if (interactive?.type === "list_reply") {
        incomingText = (interactive.list_reply?.id || interactive.list_reply?.title || "").trim();
      }
    } else if (msgType === "location" && message.location) {
      const loc = message.location;
      let resolvedLoc: { city: string; uf: string; hsp: number } | null = null;

      // 1º Tenta extrair pelo nome ou endereço do pino do Maps
      if (loc.name || loc.address) {
        const fullAddress = `${loc.name || ""} ${loc.address || ""}`.trim();
        const extracted = extractLocationFromFreeText(fullAddress);
        if (extracted && extracted.city && extracted.uf) {
          resolvedLoc = { city: extracted.city, uf: extracted.uf, hsp: extracted.hsp || 5.0 };
        }
      }

      // 2º Se não encontrou por texto, calcula o município brasileiro mais próximo pelas coordenadas GPS (Haversine)
      if (!resolvedLoc && Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude)) {
        const closest = this.geoIrradiance.findClosestMunicipality(loc.latitude, loc.longitude);
        if (closest) {
          resolvedLoc = { city: closest.city, uf: closest.uf, hsp: closest.hsp };
        }
      }

      if (resolvedLoc) {
        incomingText = `${resolvedLoc.city}/${resolvedLoc.uf}`;
        this.logger.log(
          `[WhatsApp Location] Pino do Maps recebido (${loc.latitude}, ${loc.longitude}): resolvido para ${incomingText} (HSP: ${resolvedLoc.hsp})`
        );
      } else {
        incomingText = (loc.address || loc.name || "Localização compartilhada").trim();
      }
    }

    // Orientação para ativação de alertas se o comando for enviado em chat privado 1:1
    const lowerInbound = incomingText.toLowerCase();
    if (
      lowerInbound.includes("#ativar-alerta") ||
      lowerInbound.includes("#ativar-alertas") ||
      lowerInbound.includes("ativar alertas") ||
      lowerInbound.includes("#teste-alerta") ||
      lowerInbound.includes("#status-alertas")
    ) {
      const guideMsg =
        `ℹ️ *Ativação de Alertas Operacionais*\n\n` +
        `Para receber os alertas de chamados, cadastros e pagamentos:\n\n` +
        `1. Crie um grupo no WhatsApp (ex: *🚨 Alertas EnergivIA*);\n` +
        `2. Adicione este número do robô como membro do grupo;\n` +
        `3. Envie o comando *#ativar-alertas* *DENTRO DO GRUPO* (não aqui no privado);\n` +
        `4. O robô responderá no grupo confirmando a ativação!\n\n` +
        `_Dica: Se você já adicionou o robô ao grupo, basta abrir o grupo e digitar *#ativar-alertas* lá._`;

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: guideMsg,
      });
      return;
    }

    // Interceptação de comando de exportação de contatos (.vcf) para salvar na agenda do celular
    const isContactsExport =
      lowerInbound.startsWith("#contato") ||
      lowerInbound.startsWith("#exportar-contato") ||
      lowerInbound.startsWith("#salvar-contato") ||
      lowerInbound.startsWith("#vcf") ||
      lowerInbound === "exportar contatos" ||
      lowerInbound === "salvar contatos" ||
      lowerInbound === "baixar contatos";

    if (isContactsExport) {
      const authorizedTenant = await this.resolveAuthorizedTenant(fromWaId);
      const tenantId =
        authorizedTenant?.id ||
        (await this.prisma.tenant.findFirst({ where: { deletedAt: null }, select: { id: true } }))
          ?.id;

      if (tenantId) {
        await this.handleContactsVCardExport({
          tenantId,
          phoneNumberId,
          toWaId: fromWaId,
        });
        return;
      }
    }

    // 3. Verificação de Código de Pareamento (Token de Ativação)
    const pairingMatch = incomingText.match(/(?:CONECTAR[ -]*)?(\b\d{6}\b)/i);
    if (pairingMatch && pairingMatch[1]) {
      const code = pairingMatch[1];
      const pairingInfo = this.whatsappPairing.consumePairingCode(code);
      if (pairingInfo) {
        // Valida se o plano da organização contempla a ferramenta de WhatsApp
        const targetTenant = await this.prisma.tenant.findUnique({
          where: { id: pairingInfo.organizationId },
          include: {
            subscription: {
              include: { plan: true },
            },
          },
        });

        if (targetTenant) {
          const tenantPlan = getTenantPlanDetails(targetTenant);
          if (!tenantPlan.features.hasWhatsappBot || tenantPlan.features.maxWhatsappNumbers === 0) {
            const deniedMsg =
              `Olá! ☀️ O atendimento e dimensionamento solar por WhatsApp com IA não está disponível no plano da organização *${pairingInfo.organizationName}* (${tenantPlan.planName}).\n\n` +
              `Esta ferramenta é exclusiva dos planos *Pro* e *Plus*.\n\n` +
              `Para desbloquear o assistente de IA no WhatsApp e começar a cotar por aqui, faça upgrade do seu plano em:\n` +
              `👉 *https://www.energivia.com.br/gestao/meus-planos*`;

            await this.whatsappCloud.sendTextMessage({
              phoneNumberId,
              toWaId: fromWaId,
              body: deniedMsg,
            });
            return;
          }
        }

        const cleanDigits = fromWaId.replace(/\D/g, "");
        const candidates = expandInboundPhoneCandidates(fromWaId);

        // Remove número de outra organização se estivesse cadastrado
        await this.prisma.tenantWhatsappInboundPhone.deleteMany({
          where: { phoneDigits: { in: candidates } },
        });

        // Cadastra o número na organização correta
        await this.prisma.tenantWhatsappInboundPhone.create({
          data: {
            organizationId: pairingInfo.organizationId,
            phoneDigits: cleanDigits.startsWith("55") ? cleanDigits.slice(2) : cleanDigits,
            label: `WhatsApp de ${contactName}`,
          },
        });

        const successMsg =
          `🎉 *WhatsApp Vinculado com Sucesso!* ☀️\n\n` +
          `Seu número foi conectado à empresa *${pairingInfo.organizationName}*.\n` +
          `Status: *Autorizado e Ativo* ✅\n\n` +
          `A partir de agora, você pode me enviar contas de luz (PDF ou foto) ou solicitar dimensionamentos solares diretamente por aqui!`;

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: successMsg,
        });
        return;
      }
    }

    // 4. Resolução da Organização / Tenant do Integrador
    let tenant = await this.resolveAuthorizedTenant(fromWaId);
    let isGuestTrial = false;

    if (!tenant) {
      if (!this.guestTrial) {
        this.guestTrial = new WhatsappGuestTrialService(this.prisma);
      }
      const demoTenant = await this.guestTrial.getOrCreateDemoTenant();

      // Busca se já existe conversa prévia de degustação para este número
      const existingConv = await this.prisma.conversation.findFirst({
        where: {
          organizationId: demoTenant.id,
          channel: "whatsapp",
          title: fromWaId,
        },
        select: { id: true, metadata: true },
      });

      const trialStatus = this.guestTrial.getGuestTrialStatus(existingConv);

      if (!trialStatus.allowed) {
        this.logger.warn(
          `Novo número ${fromWaId} tentou usar o bot mas atingiu o limite de 3 cotações de teste gratuito.`
        );
        const trialExceededMsg = this.buildGuestTrialExceededMessage();
        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: trialExceededMsg,
        });
        return;
      }

      tenant = demoTenant;
      isGuestTrial = true;
    }

    // 5. Verificação de Assinatura / Plano Ativo (apenas para organizações cadastradas, nunca bloqueia degustação de convidados)
    if (!isGuestTrial) {
      const planStatus = await this.isTenantPlanActive(tenant);
      if (!planStatus.active) {
        this.logger.warn(
          `Plano inativo/expirado para organização ${tenant.id} no WhatsApp ${fromWaId} (${planStatus.reason})`
        );
        let blockMsg =
          `Olá! ☀️ O assistente de WhatsApp com IA para dimensionamento solar da *EnergivIA* não está incluso no seu plano (${planStatus.planName || "Standard"}).\n\n` +
          `O atendimento e dimensionamento automático por WhatsApp com IA é exclusivo dos planos *Pro* e *Plus*.\n\n` +
          `Para desbloquear o assistente de IA 24/7 e cotações no WhatsApp, escolha o seu plano em:\n` +
          `👉 *https://www.energivia.com.br/gestao/meus-planos*`;

        if (planStatus.reason === "proposal_limit_reached") {
          blockMsg =
            planStatus.monthlyLimit && planStatus.monthlyLimit > 20
              ? `Olá! ⚡ Sua empresa atingiu o limite mensal de ${planStatus.monthlyLimit} propostas do seu plano (${planStatus.planName || "atual"}).\n\n` +
                `Para continuar gerando propostas comerciais ilimitadas com IA pelo WhatsApp, faça upgrade para o *Plano Pro* em:\n` +
                `👉 *https://www.energivia.com.br/gestao/meus-planos*`
              : `Olá! ⚡ Sua empresa atingiu o limite de 20 cotações gratuitas do período de teste da *EnergivIA*.\n\n` +
                `Para continuar gerando propostas comerciais ilimitadas e dimensionamentos com IA para seus clientes pelo WhatsApp, escolha o seu plano em:\n` +
                `👉 *https://www.energivia.com.br/gestao/meus-planos*`;
        } else if (planStatus.reason === "trial_expired") {
          blockMsg =
            `Olá! ☀️ O período de teste gratuito de 7 dias úteis da sua organização na *EnergivIA* foi concluído.\n\n` +
            `Para continuar utilizando o assistente de IA, dimensionamentos e propostas comerciais automáticas pelo WhatsApp, escolha o seu plano em:\n` +
            `👉 *https://www.energivia.com.br/gestao/meus-planos*`;
        }

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: blockMsg,
        });
        return;
      }
    }

    // 4. Busca ou criação da Conversa vinculada à Organização do Integrador
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        organizationId: tenant.id,
        channel: "whatsapp",
        title: fromWaId,
      },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    const isNewMedia = msgType === "document" || msgType === "image";

    if (conversation && conversation.messages.length > 0) {
      const lastMsg = conversation.messages[conversation.messages.length - 1];
      const timeSinceLastMsg = lastMsg ? Date.now() - new Date(lastMsg.createdAt).getTime() : 0;

      // 15 MINUTOS OU MAIS: Se inativo por mais de 15 minutos no fluxo OU última msg foi encerramento OU inativo > 24h OU nova fatura OU proposta concluída > 1h:
      const isInactive15MinInFlow =
        lastMsg && timeSinceLastMsg >= 15 * 60 * 1000 && this.isFlowActive(lastMsg.content);
      const wasClosed =
        lastMsg &&
        (lastMsg.content.includes("encerramos este atendimento") ||
          lastMsg.content.includes("estou encerrando este atendimento"));
      const isExpired24h = lastMsg && timeSinceLastMsg > SESSION_INACTIVITY_MS;
      const isCompletedProposalExpired =
        lastMsg &&
        timeSinceLastMsg >= 60 * 60 * 1000 &&
        (lastMsg.content.includes("proposta comercial gerada com sucesso") ||
          lastMsg.content.includes("proposta mais recente está disponível") ||
          (conversation.metadata as Record<string, any>)?.["step"] === "PROPOSAL_COMPLETED");

      const shouldResetSession =
        isInactive15MinInFlow ||
        wasClosed ||
        isExpired24h ||
        isNewMedia ||
        isCompletedProposalExpired;

      if (shouldResetSession) {
        this.logger.log(
          `Resetando contexto para nova sessão: de=${fromWaId}, motivo=${
            isInactive15MinInFlow
              ? "inatividade_15min"
              : wasClosed
                ? "atendimento_encerrado"
                : isNewMedia
                  ? "nova_midia"
                  : isCompletedProposalExpired
                    ? "proposta_concluida_expirada_1h"
                    : "inatividade_24h"
          }`
        );
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });

        conversation = await this.prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      }
    }

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          organizationId: tenant.id,
          channel: "whatsapp",
          title: fromWaId,
          metadata: {
            customerWaId: fromWaId,
            contactName,
            phoneNumberId,
            isGuestTrial,
            trialQuotesUsed: 0,
            trialMaxQuotes: 3,
            step: "IDLE",
          },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    } else {
      const currentMeta = (conversation.metadata as Record<string, any>) || {};
      const shouldFlagTrial = isGuestTrial || currentMeta["isGuestTrial"] === true;
      const updatedMeta: Record<string, any> = {
        ...currentMeta,
        customerWaId: fromWaId,
        contactName: contactName || currentMeta["contactName"],
        phoneNumberId: phoneNumberId || currentMeta["phoneNumberId"],
        isGuestTrial: shouldFlagTrial,
      };

      if (!conversation.messages || conversation.messages.length === 0) {
        updatedMeta["step"] = "IDLE";
        if (updatedMeta["sessionData"]) {
          updatedMeta["sessionData"] = {
            lastProposalId: updatedMeta["sessionData"]["lastProposalId"],
          };
        }
      }

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          updatedAt: new Date(),
          metadata: updatedMeta,
        },
      });
    }

    await this.prisma.whatsappInboundMessage.create({
      data: {
        waMessageId,
        conversationId: conversation.id,
      },
    });

    // 5. Extração de Conteúdo (Fatura / Texto / Imagem)
    let extractionResult: BillExtractionResult | null = null;

    this.logger.log(`Mensagem recebida do WhatsApp: tipo=${msgType}, de=${fromWaId}`);

    if (msgType === "text" || msgType === "interactive") {
      if (!incomingText) {
        if (msgType === "text") {
          incomingText = message.text?.body || "";
        } else if (msgType === "interactive") {
          const interactive = message.interactive;
          incomingText =
            interactive?.button_reply?.id ||
            interactive?.button_reply?.title ||
            interactive?.list_reply?.id ||
            interactive?.list_reply?.title ||
            "";
        }
      }
      const lowerText = incomingText.toLowerCase().trim();
      if (
        lowerText === "novo" ||
        lowerText === "reiniciar" ||
        lowerText === "nova cotação" ||
        lowerText === "nova cotacao"
      ) {
        await this.prisma.message.deleteMany({
          where: { conversationId: conversation.id },
        });

        const convMeta = (conversation.metadata as Record<string, any>) || {};
        const isTrialActive = isGuestTrial || convMeta["isGuestTrial"] === true;
        let resetMsg = `Sessão reiniciada com sucesso! ☀️\n\nEnvie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio em kWh para começarmos uma nova simulação.`;

        if (isTrialActive && this.guestTrial) {
          const trialStatus = this.guestTrial.getGuestTrialStatus(conversation);
          resetMsg =
            `Sessão reiniciada com sucesso! ☀️\n\n` +
            `🎁 *Você possui ${trialStatus.remaining} de ${trialStatus.trialMaxQuotes} cotações de teste disponíveis.*\n\n` +
            `Envie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio em kWh para começarmos uma nova simulação.`;
        }

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: resetMsg,
        });
        return;
      }
    } else if (msgType === "document") {
      const doc = message.document;
      incomingText = `[Documento enviado: ${doc?.filename || "fatura.pdf"}]`;
      if (doc?.id) {
        this.logger.log(`Iniciando extração do PDF mediaId=${doc.id}`);
        extractionResult = await this.extractFromMediaDocument(doc.id, doc.mime_type);
      }
    } else if (msgType === "image") {
      const img = message.image;
      incomingText = `[Foto enviada: ${img?.caption || "Foto da fatura"}]`;
      if (img?.id) {
        this.logger.log(`Iniciando extração da imagem mediaId=${img.id}`);
        extractionResult = await this.extractFromMediaImage(img.id, img.mime_type);
      }
    } else if (msgType === "audio" || msgType === "voice") {
      const audioObj = message.audio || message.voice;
      const audioMediaId = audioObj?.id || message.id;
      const mimeType = audioObj?.mime_type || "audio/ogg";

      let transcribed = "";
      if (audioMediaId) {
        this.logger.log(`Iniciando transcrição de áudio via Gemini mediaId=${audioMediaId}`);
        const media = await this.whatsappCloud.downloadWhatsappMedia(audioMediaId);
        if (media?.buffer) {
          transcribed =
            (await this.transcribeAudioWithGemini(
              media.buffer,
              media.mimeType || mimeType,
              conversation.organizationId
            )) || "";
        }
      }

      if (transcribed && transcribed.trim().length > 0) {
        this.logger.log(`Áudio transcrito com sucesso via Gemini: "${transcribed}"`);
        incomingText = convertSpokenNumbersToDigits(transcribed.trim());
      } else {
        incomingText = "[Mensagem de áudio recebida]";
      }
    } else if (msgType === "location") {
      // incomingText já foi resolvido em linhas anteriores para "Cidade/UF"
      if (!incomingText || incomingText.startsWith("[Mensagem")) {
        incomingText = "Localização compartilhada";
      }
    } else {
      incomingText = `[Mensagem do tipo ${msgType} recebida]`;
    }

    const isAudioMsg = msgType === "audio" || msgType === "voice";
    const audioObj = message.audio || message.voice;
    const audioMediaId = audioObj?.id || message.id;

    // Salva a mensagem do usuário no banco
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: incomingText,
        channel: "whatsapp",
        metadata:
          msgType === "location"
            ? {
                isLocation: true,
                latitude: message.location?.latitude,
                longitude: message.location?.longitude,
                address: message.location?.address,
                name: message.location?.name,
                resolvedLocation: incomingText,
              }
            : extractionResult &&
                extractionResult.isValidForSizing &&
                extractionResult.exactAverageKwh >= 20
              ? {
                  exactAverageKwh: extractionResult.exactAverageKwh,
                  monthCount: extractionResult.monthCount,
                  totalSumKwh: extractionResult.totalSumKwh,
                  cidade: extractionResult.data.cidade,
                  uf: extractionResult.data.uf,
                  distribuidora: extractionResult.data.distribuidora,
                  codigo_instalacao_ou_uc: extractionResult.data.codigo_instalacao_ou_uc,
                  isValidForSizing: true,
                }
              : extractionResult
                ? {
                    isValidForSizing: false,
                    isLegible: false,
                    rejectionReason: extractionResult.rejectionReason,
                  }
                : isAudioMsg
                  ? {
                      isAudio: true,
                      originalAudioId: audioMediaId,
                      transcription:
                        incomingText !== "[Mensagem de áudio recebida]" ? incomingText : undefined,
                    }
                  : undefined,
      },
    });

    // Atualiza conversa com a nova mensagem
    const freshConversation = await this.prisma.conversation.findUnique({
      where: { id: conversation.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    // 5.1 Solicitação de PDF sob demanda (não automático)
    // SOMENTE se for texto digitado pelo usuário (nunca quando for documento/imagem de fatura)
    if (msgType === "text" && this.isPdfRequest(incomingText)) {
      await this.handlePdfOnDemandRequest({
        conversation: freshConversation || conversation,
        phoneNumberId,
        fromWaId,
      });
      return;
    }

    // 6. Gera a resposta pelo motor de estado do bot e gera a proposta real
    let replyText = "";
    try {
      replyText = await this.generateBotResponse({
        conversation: freshConversation || conversation,
        incomingText,
        extractionResult,
        contactName,
      });
    } catch (err: any) {
      this.logger.error(`Erro ao gerar resposta do bot para ${fromWaId}:`, err);
      replyText =
        "Desculpe, ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente (digite '0' ou 'novo').";
    }

    if (replyText) {
      const parts = replyText.split("\n---CLIENT_FORWARD_MESSAGE---\n");
      const mainReply = parts[0] || replyText;
      const forwardMessage = parts[1] || "";

      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: mainReply,
          channel: "whatsapp",
        },
      });

      const sentMain = await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: mainReply,
      });

      if (forwardMessage) {
        // Se o envio principal falhou na Evolution API (socket lock ou rate limit), aguarda e retenta uma vez
        if (sentMain === false) {
          this.logger.warn(
            `[WhatsApp Bot] Retentando envio da mensagem principal de conferência para ${fromWaId}...`
          );
          await new Promise((resolve) => setTimeout(resolve, 800));
          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId: fromWaId,
            body: mainReply,
          });
        }

        // Delay de segurança (1200ms) para o gateway WhatsApp / Baileys processar a fila em ordem sem engolir mensagens
        await new Promise((resolve) => setTimeout(resolve, 1200));

        await this.prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: "assistant",
            content: forwardMessage,
            channel: "whatsapp",
          },
        });

        await this.whatsappCloud.sendTextMessage({
          phoneNumberId,
          toWaId: fromWaId,
          body: forwardMessage,
        });
      }

      // Se acabou de gerar a proposta, descarrega alertas pendentes de visualização
      if (
        mainReply.includes("Proposta Comercial Gerada com Sucesso") ||
        mainReply.includes("Proposta comercial gerada com sucesso")
      ) {
        await this.flushPendingProposalViewAlerts(conversation.id, phoneNumberId, fromWaId);
      }
    }
  }

  private async flushPendingProposalViewAlerts(
    conversationId: string,
    phoneNumberId: string,
    toWaId: string
  ): Promise<void> {
    try {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { metadata: true },
      });
      const meta = (conv?.metadata as Record<string, any>) || {};
      const alerts = Array.isArray(meta["pendingProposalViewAlerts"])
        ? (meta["pendingProposalViewAlerts"] as string[])
        : [];
      if (alerts.length > 0) {
        const nextMeta: Record<string, any> = { ...meta };
        delete nextMeta["pendingProposalViewAlerts"];
        await this.prisma.conversation.update({
          where: { id: conversationId },
          data: { metadata: nextMeta },
        });

        for (const alertBody of alerts) {
          await this.whatsappCloud.sendTextMessage({
            phoneNumberId,
            toWaId,
            body: alertBody,
          });
        }
      }
    } catch (err) {
      this.logger.warn(`Falha ao descarregar alertas pendentes de visualização: ${err}`);
    }
  }

  private isPdfRequest(text: string): boolean {
    return isWhatsappPdfRequest(text);
  }

  private async handlePdfOnDemandRequest({
    conversation,
    phoneNumberId,
    fromWaId,
  }: {
    conversation: { id: string; organizationId: string; metadata?: any };
    phoneNumberId: string;
    fromWaId: string;
  }): Promise<void> {
    const meta = (conversation.metadata as Record<string, any>) || {};
    let targetProposalId = meta["lastProposalId"] as string | undefined;
    let clientName = meta["lastClientName"] as string | undefined;

    if (!targetProposalId) {
      const latestProposal = await this.prisma.proposal.findFirst({
        where: {
          tenantId: conversation.organizationId,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, proposalNumber: true },
      });

      if (latestProposal) {
        targetProposalId = latestProposal.id;
        clientName = latestProposal.title?.replace(/^Proposta Comercial\s*-\s*/i, "");
      }
    }

    if (!targetProposalId) {
      const notFoundMsg =
        `_Não encontrei nenhuma proposta recente nesta conversa para gerar o PDF._ ☀️\n\n` +
        `Você pode gerar uma nova cotação enviando a conta de luz (PDF ou foto) ou digitando o consumo médio em kWh.`;

      await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: notFoundMsg,
          channel: "whatsapp",
        },
      });

      await this.whatsappCloud.sendTextMessage({
        phoneNumberId,
        toWaId: fromWaId,
        body: notFoundMsg,
      });
      return;
    }

    // 1. Mensagem de aguardo imediata
    const waitMsg = `_Gerando o arquivo PDF da sua proposta, aguarde um instante..._ ⏳`;
    await this.whatsappCloud.sendTextMessage({
      phoneNumberId,
      toWaId: fromWaId,
      body: waitMsg,
    });

    try {
      if (this.proposalsService) {
        const pdfBuffer = await this.proposalsService.generatePdf(targetProposalId);
        if (pdfBuffer && pdfBuffer.length > 0) {
          const base64Data = Buffer.from(pdfBuffer).toString("base64");
          const safeClient = (clientName || "Cliente")
            .replace(/[^\w\s-]/g, "")
            .trim()
            .replace(/\s+/g, "_");
          const fileName = `Proposta_${safeClient}.pdf`;

          const sent = await this.whatsappCloud.sendDocumentMessage({
            phoneNumberId,
            toWaId: fromWaId,
            fileName,
            documentBase64: `data:application/pdf;base64,${base64Data}`,
            caption: `📄 Proposta Comercial - ${clientName || "EnergivIA"}`,
            mimetype: "application/pdf",
          });

          if (sent) {
            await this.prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: "assistant",
                content: `[Documento PDF enviado: ${fileName}]`,
                channel: "whatsapp",
              },
            });
            return;
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `Erro ao gerar/enviar PDF sob demanda para proposta ${targetProposalId}:`,
        err
      );
    }

    // Fallback: caso o buffer ou envio de mídia falhe
    const appBaseUrl =
      process.env["APP_BASE_URL"] ||
      process.env["PUBLIC_WEB_APP_BASE_URL"] ||
      this.config.get<string>("APP_BASE_URL") ||
      "https://www.energivia.com.br";
    const fallbackMsg =
      `📄 Não foi possível enviar o anexo diretamente agora, mas você pode abrir e baixar o PDF no navegador pelo link:\n` +
      `${appBaseUrl}/proposta/${targetProposalId}?pdf=true`;

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: fallbackMsg,
        channel: "whatsapp",
      },
    });

    await this.whatsappCloud.sendTextMessage({
      phoneNumberId,
      toWaId: fromWaId,
      body: fallbackMsg,
    });
  }

  private async runOcrOnBuffer(buffer: Buffer): Promise<string> {
    try {
      const worker = await createWorker();
      await worker.loadLanguage("por");
      await worker.initialize("por");
      const {
        data: { text },
      } = await worker.recognize(buffer);
      await worker.terminate();
      return text || "";
    } catch (err) {
      this.logger.error("Erro no OCR Tesseract WhatsApp:", err);
      return "";
    }
  }

  private parseBillTextDeterministic(text: string): {
    data: ExtractedBillData;
    isComplete: boolean;
  } {
    const t = (text || "").replace(/[\u00A0\r]/g, " ");

    let distribuidora: string | undefined;
    const providers = [
      { name: "COPEL", pattern: /\b(copel|copel\s+distribui[cç][aã]o)\b/i },
      { name: "ENEL", pattern: /\b(enel|eletropaulo|ampla|coelce)\b/i },
      { name: "CPFL", pattern: /\b(cpfl|paulista|piratininga|santa\s+cruz)\b/i },
      { name: "CEMIG", pattern: /\b(cemig|companhia\s+energ[eé]tica\s+de\s+minas)\b/i },
      { name: "EQUATORIAL", pattern: /\b(equatorial|ceal|cepisa|celpa|cemar)\b/i },
      { name: "ENERGISA", pattern: /\b(energisa)\b/i },
      { name: "NEOENERGIA", pattern: /\b(neoenergia|coelba|celpe|cosern|elektro)\b/i },
      { name: "LIGHT", pattern: /\b(light\s+servi[cç]os)\b/i },
      { name: "EDP", pattern: /\b(edp|bandeirante|escelsa)\b/i },
      { name: "RGE", pattern: /\b(rge|rio\s+grande\s+energia)\b/i },
      { name: "CELESC", pattern: /\b(celesc)\b/i },
    ];
    for (const p of providers) {
      if (p.pattern.test(t)) {
        distribuidora = p.name;
        break;
      }
    }

    let consumptionKwh: number | undefined;
    const kwhPatterns = [
      /(?:consumo\s+(?:ativo|faturado|medido|do\s+m[eê]s)?|total\s+consumo)[\s:=]*(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)/i,
      /(\d{1,6}(?:[.,]\d{1,3})?)\s*(?:kwh|kw-h)\s*(?:\/m[eê]s)?/i,
    ];
    for (const p of kwhPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const val = parseBrazilianKwh(m[1]);
        if (val > 0 && val < 500000) {
          consumptionKwh = val;
          break;
        }
      }
    }

    let totalAmount: number | undefined;
    const brlPatterns = [
      /(?:total\s+a\s+pagar|valor\s+total|total\s+fatura|valor\s+a\s+pagar|total\s+da\s+fatura)[\s:=]*r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2})?)/i,
      /r\$\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{2}))/i,
    ];
    for (const p of brlPatterns) {
      const m = t.match(p);
      if (m && m[1]) {
        const clean = m[1].replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
        const n = parseFloat(clean);
        if (Number.isFinite(n) && n > 0) {
          totalAmount = Number(n.toFixed(2));
          break;
        }
      }
    }

    let referenceMonth: string | undefined;
    const refMatch = t.match(
      /(?:compet[eê]ncia|refer[eê]ncia|m[eê]s\/ano)[\s:=]*([0-1]?\d\s*\/\s*(?:20)?\d{2})/i
    );
    if (refMatch && refMatch[1]) {
      referenceMonth = refMatch[1].replace(/\s+/g, "");
    } else {
      const mmMatch = t.match(/\b(0[1-9]|1[0-2])[\/-](20\d{2}|\d{2})\b/);
      if (mmMatch) {
        referenceMonth = `${mmMatch[1]}/${mmMatch[2]}`;
      }
    }

    let tipo_conexao: string | undefined;
    if (/trif[aá]sico/i.test(t)) {
      tipo_conexao = "Trifásico";
    } else if (/bif[aá]sico/i.test(t)) {
      tipo_conexao = "Bifásico";
    } else if (/monof[aá]sico/i.test(t)) {
      tipo_conexao = "Monofásico";
    }

    // 5. Cidade / UF
    const ufList = [
      "AC",
      "AL",
      "AP",
      "AM",
      "BA",
      "CE",
      "DF",
      "ES",
      "GO",
      "MA",
      "MT",
      "MS",
      "MG",
      "PA",
      "PB",
      "PR",
      "PE",
      "PI",
      "RJ",
      "RN",
      "RS",
      "RO",
      "RR",
      "SC",
      "SP",
      "SE",
      "TO",
    ];
    let cidade: string | undefined;
    let uf: string | undefined;

    // 1. Procura primeiro Cidade/UF no bloco de Unidade Consumidora / Endereço / CEP
    const cepCityUfMatch = t.match(
      /(?:(?:MUNIC[IÍ]PIO|CIDADE|LOCAL(?:IDADE)?|ENDERE[CÇ]O|UNIDADE\s+CONSUMIDORA)[\s:=]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|\d{5}[-\s]?\d{3}[\s,.-]+([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})|([A-ZÁ-Ú\s]{3,35})\s*[-/]\s*([A-Z]{2})[\s,.-]+(?:CEP|\d{5}))/i
    );
    if (cepCityUfMatch) {
      const candCity = (cepCityUfMatch[1] || cepCityUfMatch[2] || cepCityUfMatch[3] || "").trim();
      const candUf = (cepCityUfMatch[2] || cepCityUfMatch[4] || "").toUpperCase();
      if (ufList.includes(candUf) && candCity.length >= 3) {
        cidade = candCity;
        uf = candUf;
      }
    }

    // 2. Se não encontrou ou capturou Curitiba da Copel, faz busca em todas as ocorrências de CIDADE - UF
    const cityMatches = [...t.matchAll(/([A-ZÁ-Ú\s]{3,30})\s*[-/]\s*([A-Z]{2})\b/gi)];
    const validMatches: Array<{ city: string; uf: string }> = [];

    for (const cm of cityMatches) {
      const candUf = cm[2]?.toUpperCase() || "";
      const candCity = (cm[1] || "").trim();
      if (!ufList.includes(candUf)) continue;
      const low = candCity.toLowerCase();
      if (
        low.includes("emissao") ||
        low.includes("vencimento") ||
        low.includes("distribuicao") ||
        low.includes("distribuidora") ||
        low.includes("biazetto") ||
        low.includes("sede") ||
        low.includes("protocolo") ||
        low.includes("cnpj")
      ) {
        continue;
      }
      validMatches.push({ city: candCity, uf: candUf });
    }

    if (distribuidora === "COPEL") {
      const nonCuritiba = validMatches.find((m) => !m.city.toLowerCase().includes("curitiba"));
      if (nonCuritiba) {
        cidade = nonCuritiba.city;
        uf = nonCuritiba.uf;
      } else if (!cidade && validMatches.length > 0) {
        cidade = validMatches[0]?.city;
        uf = validMatches[0]?.uf;
      }
    } else if (validMatches.length > 0 && !cidade) {
      cidade = validMatches[0]?.city;
      uf = validMatches[0]?.uf;
    }

    // 6. Histórico de Consumo
    const historyCandidates: ExtractedBillHistoryItem[] = [];

    const monthMap: Record<string, string> = {
      "01": "JAN",
      "02": "FEV",
      "03": "MAR",
      "04": "ABR",
      "05": "MAI",
      "06": "JUN",
      "07": "JUL",
      "08": "AGO",
      "09": "SET",
      "10": "OUT",
      "11": "NOV",
      "12": "DEZ",
    };

    let historyText = t;
    const historySectionMatch = t.match(
      /(?:HIST[OÓ]RICO\s+DE\s+CONSUMO|CONSUMO\s+FATURADO|EVOLU[CÇ][AÃ]O\s+DO\s+CONSUMO|HIST[OÓ]RICO)[\s\S]{1,2000}/i
    );
    if (historySectionMatch) {
      historyText = historySectionMatch[0];
    }

    const rowRegex =
      /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|0[1-9]|1[0-2])[\s\/\-_]*(20\d{2}|\d{2})?\b(?=([^\n\r]{0,60}))/gi;
    const matches = [...historyText.matchAll(rowRegex)];

    for (const m of matches) {
      if (!m[1]) continue;
      let monStr = m[1].toUpperCase();

      if (m[1].match(/^\d{2}$/) && !m[2]) {
        continue;
      }

      if (monthMap[monStr]) monStr = monthMap[monStr]!;
      const yr = m[2] ? (m[2].length === 2 ? `20${m[2]}` : m[2]) : "";
      const label = yr ? `${monStr}/${yr}` : monStr;

      const restOfLine = m[3] || "";
      const numberMatches = [...restOfLine.matchAll(/\b(\d{1,5}(?:[.,]\d{1,3})?)\b/g)];

      const validNumbers = numberMatches
        .map((nm) => parseBrazilianKwh(nm[1]))
        .filter(
          (n) => n > 0 && n < 50000 && ![2022, 2023, 2024, 2025, 2026, 2027, 2028].includes(n)
        );

      if (validNumbers.length > 0) {
        let consumption = 0;
        const possibleConsumptions = validNumbers.filter((n) => n > 35);
        if (possibleConsumptions.length > 0 && typeof possibleConsumptions[0] === "number") {
          consumption = possibleConsumptions[0];
        } else {
          consumption = Math.max(...validNumbers);
        }
        historyCandidates.push({ mes_ano: label, consumo_kwh: consumption });
      }
    }

    const seenMonths = new Set<string>();
    const deduplicatedHistory: ExtractedBillHistoryItem[] = [];
    for (const item of historyCandidates) {
      if (!seenMonths.has(item.mes_ano)) {
        seenMonths.add(item.mes_ano);
        deduplicatedHistory.push(item);
      }
    }

    const normalizedHistory =
      deduplicatedHistory.length > 12 ? deduplicatedHistory.slice(0, 12) : deduplicatedHistory;

    if (!consumptionKwh && normalizedHistory.length > 0) {
      consumptionKwh = normalizedHistory[0]?.consumo_kwh;
    }
    if (!referenceMonth && normalizedHistory.length > 0) {
      referenceMonth = normalizedHistory[0]?.mes_ano;
    }

    const missingFields: string[] = [];
    if (!distribuidora) missingFields.push("Distribuidora");
    if (!cidade) missingFields.push("Cidade");
    if (!uf) missingFields.push("UF");
    if (!consumptionKwh && normalizedHistory.length === 0) missingFields.push("Consumo do Mês");
    if (normalizedHistory.length < 6)
      missingFields.push(
        `Histórico parcial (${normalizedHistory.length} meses encontrados pelo OCR, acionando IA para conferência de todos os meses)`
      );

    const isComplete = missingFields.length === 0;

    return {
      data: {
        distribuidora,
        cidade,
        uf,
        tipo_conexao,
        mes_referencia_atual: referenceMonth,
        consumo_mes_atual_kwh: consumptionKwh,
        valor_total_fatura_reais: totalAmount,
        historico_consumo: normalizedHistory,
      },
      isComplete,
    };
  }

  private async extractFromMediaDocument(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      let text = "";
      if (media.mimeType.includes("pdf") || mimeType?.includes("pdf")) {
        try {
          const parsed = await pdfParse(media.buffer);
          text = parsed.text || "";
        } catch {
          // ignora erro pdfParse
        }
        if (!text || text.trim().length < 30) {
          text = await this.runOcrOnBuffer(media.buffer);
        }
      } else {
        text = await this.runOcrOnBuffer(media.buffer);
      }

      if (text && text.trim().length > 30) {
        // Envia o texto extraído pelo OCR/PDF diretamente para a IA interpretar com precisão
        const aiParsed = await this.parseBillTextWithAI(text);
        if (aiParsed) {
          this.logger.log(
            "Fatura WhatsApp interpretada com sucesso pela IA a partir do texto OCR/PDF."
          );
          return aiParsed;
        }

        // Fallback determinístico offline se a IA falhar
        const deterministic = this.parseBillTextDeterministic(text);
        return processExtractedBillData(deterministic.data, text);
      }
    } catch (e) {
      this.logger.error("Erro extraindo PDF da fatura:", e);
    }
    return null;
  }

  private async extractFromMediaImage(
    mediaId: string,
    mimeType?: string
  ): Promise<BillExtractionResult | null> {
    try {
      const media = await this.whatsappCloud.downloadWhatsappMedia(mediaId);
      if (!media || !media.buffer) return null;

      // 1. Visão Computacional OpenAI (ChatGPT prioridade primária solicitada)
      const openAiKey = this.config.get<string>("OPENAI_API_KEY");
      if (openAiKey) {
        try {
          const fromVision = await this.extractImageWithOpenAI(
            media.buffer,
            media.mimeType || mimeType || "image/jpeg",
            openAiKey
          );
          if (fromVision) return fromVision;
        } catch (openAiErr) {
          this.logger.warn(
            `Tentativa OpenAI visão falhou, tentando fallback Gemini: ${String(openAiErr)}`
          );
        }
      }

      // 2. Fallback: Visão Computacional Gemini (se OpenAI falhar ou não configurado)
      if (this.genAI) {
        const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
        for (const modelName of candidateModels) {
          try {
            const model = this.genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
              BILL_EXTRACTION_SYSTEM_PROMPT,
              {
                inlineData: {
                  data: media.buffer.toString("base64"),
                  mimeType: media.mimeType || mimeType || "image/jpeg",
                },
              },
            ]);

            const respText = result.response.text();
            const clean = respText
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim();
            const parsed = JSON.parse(clean) as ExtractedBillData;
            const processed = processExtractedBillData(parsed);
            if (processed) return processed;
          } catch (geminiErr) {
            this.logger.warn(
              `Tentativa Gemini visão (${modelName}) falhou, tentando fallback: ${String(geminiErr)}`
            );
          }
        }
      }

      // 3. Fallback OCR Tesseract local se nenhuma API de IA de visão estiver disponível
      const ocrText = await this.runOcrOnBuffer(media.buffer);
      if (ocrText && ocrText.trim().length > 30) {
        const deterministic = this.parseBillTextDeterministic(ocrText);
        return processExtractedBillData(deterministic.data, ocrText);
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem da fatura:", e);
    }
    return null;
  }

  private async parseBillTextWithAI(
    pdfText: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    return this.billExtractor.parseBillTextWithAI(pdfText, organizationId);
  }

  /**
   * Transcreve e compreende áudio com Google Gemini Multimodal.
   * Suporta modelos Flash (gemini-2.0-flash e gemini-1.5-flash).
   * Caso o Gemini não esteja disponível ou falhe, aciona fallback para OpenAI Whisper.
   */
  async transcribeAudioWithGemini(
    audioBuffer: Buffer,
    mimeType: string = "audio/ogg",
    organizationId?: string | null
  ): Promise<string | null> {
    const genAI = this.getGenAI();
    if (!genAI) {
      this.logger.warn(
        "transcribeAudioWithGemini: genAI não configurado (chave ausente), tentando contingência OpenAI Whisper"
      );
      return this.transcribeAudioWithOpenAI(audioBuffer, mimeType, organizationId);
    }

    // Normaliza mimeType removendo parâmetros (ex: 'audio/ogg; codecs=opus' -> 'audio/ogg')
    const firstPart = (mimeType || "audio/ogg").split(";")[0];
    let cleanMime = firstPart ? firstPart.trim().toLowerCase() : "audio/ogg";
    if (!cleanMime.startsWith("audio/")) {
      cleanMime = "audio/ogg";
    }

    const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
    const prompt = `Transcreva com máxima fidelidade e precisão para o português do Brasil todo o conteúdo falado neste áudio.
Regras estritas:
1. Retorne APENAS a transcrição literal do que o usuário falou.
2. Não adicione saudações como "Aqui está a transcrição", não use aspas extras e não faça comentários.
3. Preserve e formate termos técnicos e grandezas de energia solar quando falados (ex: "10 kWp", "26 kWp", "450 kWh", "550W", "220V", "380V", "módulos", "painéis", "inversor", "monofásico", "bifásico", "trifásico", "telhado cerâmico/colonial/metálico/fibrocimento/fibromadeira", e cidades/estados como "Maringá PR", "Londrina PR", "Cuiabá MT", "Presidente Prudente SP").
4. Preserve opções e escolhas de kits solares: 'Opção 1 Standard' (ou 'Standard', 'kit Standard', 'standar'), 'Opção 2 Elite' (ou 'Elite', 'kit Elite') e 'Opção 3 Premium' (ou 'Premium', 'kit Premium'). Se falado 'standar', transcreva preferencialmente como 'Standard'.
5. Quando números de telefone ou WhatsApp forem falados (ex: "quarenta e quatro nove oito...", "ddd quarenta e quatro..."), transcreva os números preferencialmente como dígitos numéricos (ex: "44 98821-5497"). Trate a palavra "meia" como o dígito 6 quando falada no contexto de dígitos de telefone.
6. Preserve nomes de clientes e pessoas com clareza e fidelidade (ex: "Lucas Gabriel", "João da Silva", "Marcelo Teste").
7. Se o áudio for inaudível, contiver apenas ruído, silêncio ou não houver fala compreensível, responda exatamente: [inaudível]`;

    for (const modelName of candidateModels) {
      const startTime = Date.now();
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            inlineData: {
              data: audioBuffer.toString("base64"),
              mimeType: cleanMime,
            },
          },
          prompt,
        ]);

        const latencyMs = Date.now() - startTime;
        const rawText = result.response?.text()?.trim() || "";
        const usage = result.response?.usageMetadata;

        if (usage) {
          void this.aiUsage.logUsage({
            organizationId,
            provider: "google",
            feature: AiFeature.AUDIO_TRANSCRIPTION,
            model: modelName,
            promptTokens: usage.promptTokenCount || 0,
            completionTokens: usage.candidatesTokenCount || 0,
            totalTokens: usage.totalTokenCount || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

        const clean = rawText.replace(/^["'`]|["'`]$/g, "").trim();

        if (
          clean &&
          clean.toLowerCase() !== "[inaudível]" &&
          clean.toLowerCase() !== "inaudível" &&
          clean.toLowerCase() !== "[inaudivel]" &&
          clean.toLowerCase() !== "inaudivel"
        ) {
          return clean;
        }
      } catch (err: any) {
        this.logger.warn(
          `Falha ao transcrever áudio com Gemini (${modelName}): ${err?.message || String(err)}`
        );
      }
    }

    // Se o Gemini oscilar ou falhar, executa contingência automática com Whisper da OpenAI
    this.logger.warn(
      "transcribeAudioWithGemini: Gemini indisponível para este áudio, executando fallback OpenAI Whisper"
    );
    return this.transcribeAudioWithOpenAI(audioBuffer, mimeType, organizationId);
  }

  /**
   * Fallback de transcrição de áudio com OpenAI Whisper (whisper-1).
   * Acionado caso o Google Gemini apresente instabilidade ou ausência de chave.
   */
  async transcribeAudioWithOpenAI(
    audioBuffer: Buffer,
    mimeType: string = "audio/ogg",
    organizationId?: string | null
  ): Promise<string | null> {
    const openAiKey = this.config.get<string>("OPENAI_API_KEY") || process.env["OPENAI_API_KEY"];
    if (!openAiKey) return null;

    const startTime = Date.now();
    try {
      const ext =
        mimeType.includes("mp4") || mimeType.includes("m4a")
          ? "m4a"
          : mimeType.includes("mp3")
            ? "mp3"
            : mimeType.includes("wav")
              ? "wav"
              : "ogg";

      const cleanMime = mimeType.split(";")[0]?.trim() || "audio/ogg";
      const blob = new Blob([audioBuffer], { type: cleanMime });
      const formData = new FormData();
      formData.append("file", blob, `audio.${ext}`);
      formData.append("model", "whisper-1");
      formData.append("language", "pt");
      formData.append(
        "prompt",
        "Cotação de energia solar, nome do cliente Lucas Gabriel, João da Silva, telefone WhatsApp 44 98821-5497, kWp, kWh, módulos, inversores, telhado metálico, fibromadeira, fibrocimento, cerâmica, colonial, 220V, 380V, Opção 1 Standard, Opção 2 Elite, Opção 3 Premium, kit Standard, kit Elite, kit Premium"
      );

      const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openAiKey}`,
        },
        body: formData,
      });

      if (resp.ok) {
        const json = (await resp.json()) as { text?: string };
        const text = json.text?.trim();
        if (text) {
          const latencyMs = Date.now() - startTime;
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.AUDIO_TRANSCRIPTION,
            model: "whisper-1",
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
            latencyMs,
            status: "SUCCESS",
          });
          this.logger.log(`Áudio transcrito via contingência OpenAI Whisper: "${text}"`);
          return text;
        }
      } else {
        const errText = await resp.text().catch(() => "");
        this.logger.warn(`OpenAI Whisper retornou status ${resp.status}: ${errText.slice(0, 200)}`);
      }
    } catch (err: unknown) {
      this.logger.error("Erro na transcrição de áudio com OpenAI Whisper:", err);
    }
    return null;
  }

  private async extractImageWithOpenAI(
    buffer: Buffer,
    mimeType: string,
    apiKey: string,
    organizationId?: string | null
  ): Promise<BillExtractionResult | null> {
    const startTime = Date.now();
    const model = "gpt-4o";
    try {
      const base64 = buffer.toString("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: BILL_EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analise minuciosamente a imagem desta conta de luz em alta resolução. Extraia todos os dados gerais e TODOS os meses da tabela de histórico de consumo/faturamento sem omitir nenhum mês:",
                },
                { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
              ],
            },
          ],
        }),
      });

      const latencyMs = Date.now() - startTime;
      if (response.ok) {
        const json = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        if (json.usage) {
          void this.aiUsage.logUsage({
            organizationId,
            feature: AiFeature.OCR_BILL_VISION,
            model,
            promptTokens: json.usage.prompt_tokens || 0,
            completionTokens: json.usage.completion_tokens || 0,
            totalTokens: json.usage.total_tokens || 0,
            latencyMs,
            status: "SUCCESS",
          });
        }

        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content) as ExtractedBillData;
          return processExtractedBillData(parsed);
        }
      } else {
        void this.aiUsage.logUsage({
          organizationId,
          feature: AiFeature.OCR_BILL_VISION,
          model,
          latencyMs,
          status: "ERROR",
          errorMessage: `OpenAI HTTP ${response.status}`,
        });
      }
    } catch (e) {
      this.logger.error("Erro extraindo imagem com OpenAI:", e);
    }
    return null;
  }

  private async getOrganizationDefaultKwpRate(organizationId?: string): Promise<number> {
    let ratePerKwp = 2800;
    if (organizationId) {
      try {
        const org = await this.prisma.tenant.findUnique({ where: { id: organizationId } });
        if (org) {
          const raw = (org.settings as any)?.defaultKwpRate;
          if (typeof raw === "number" && !isNaN(raw) && raw > 0) {
            ratePerKwp = raw;
          } else if (typeof raw === "string" && raw.trim()) {
            const num = Number(raw.replace(/[^\d.-]/g, ""));
            if (!isNaN(num) && num > 0) ratePerKwp = num;
          } else if ((org as any).defaultKwpRate) {
            ratePerKwp = Number((org as any).defaultKwpRate);
          }
        }
      } catch (e) {
        this.logger.error("Erro buscando defaultKwpRate da organização:", e);
      }
    }
    return ratePerKwp;
  }

  private getSystemSizingSummary(sessionCtx: {
    targetKWp?: number;
    targetModules?: number;
    modPowerWUser?: number;
    consumptionKwh?: number;
    [key: string]: any;
  }) {
    let finalTargetKWp = 3.0;
    const geracaoPorKwp = 130; // média nacional kWh/mês por kWp
    if (typeof sessionCtx.targetKWp === "number" && sessionCtx.targetKWp > 0) {
      finalTargetKWp = sessionCtx.targetKWp;
    } else if (
      typeof sessionCtx.targetModules === "number" &&
      sessionCtx.targetModules > 0 &&
      typeof sessionCtx.modPowerWUser === "number" &&
      sessionCtx.modPowerWUser > 0
    ) {
      finalTargetKWp = (sessionCtx.targetModules * sessionCtx.modPowerWUser) / 1000;
    } else if (typeof sessionCtx.targetModules === "number" && sessionCtx.targetModules > 0) {
      finalTargetKWp = (sessionCtx.targetModules * (sessionCtx.modPowerWUser || 585)) / 1000;
    } else if (typeof sessionCtx.consumptionKwh === "number" && sessionCtx.consumptionKwh > 0) {
      finalTargetKWp = sessionCtx.consumptionKwh / geracaoPorKwp;
    }
    const safeKwp = Math.max(0.5, finalTargetKWp);
    const modulePowerW = sessionCtx.modPowerWUser || 585;
    const moduleQty =
      sessionCtx.targetModules || Math.max(4, Math.round((safeKwp * 1000) / modulePowerW));
    const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;
    const estimatedGeneration = Math.round(realSystemKwp * geracaoPorKwp);

    return {
      realSystemKwp,
      moduleQty,
      modulePowerW,
      estimatedGeneration,
    };
  }

  private mapRoofTypeToCatalog(roofType?: string): string {
    const r = (roofType || "").toLowerCase();
    if (r.includes("solo") || r.includes("ground") || r === "4") return "ground";
    if (r.includes("metal") || r.includes("metálic") || r === "3") return "metal";
    if (r.includes("laje") || r === "5") return "laje";
    if (r.includes("fibrometal") || r === "6") return "fibrometal";
    if (r.includes("fibro") || r === "2") return "fibromadeira";
    if (r.includes("sem") || r === "7" || r === "none") return "none";
    return "ceramic";
  }

  private getRoofLabel(roofType?: string): string {
    const r = (roofType || "").toLowerCase();
    if (r.includes("solo") || r.includes("ground") || r === "4") return "Solo";
    if (r.includes("metal") || r.includes("metálic") || r === "3") return "Metálico";
    if (r.includes("laje") || r === "5") return "Laje";
    if (r.includes("fibrometal") || r === "6") return "Fibrometal";
    if (r.includes("fibro") || r === "2") return "Fibrocimento";
    if (r.includes("sem") || r === "7" || r === "none") return "Sem estrutura";
    return "Cerâmico (Colonial)";
  }

  private async calculateDistributorKits({
    consumptionKwh,
    targetKWp,
    targetModules,
    modPowerWUser,
    cidade,
    estado,
    roofType,
    gridVoltage: _gridVoltage,
    inverterType,
    batteryKwh,
    batteryQty,
    batteryVoltageType: _batteryVoltageType,
    hasBms,
    hasBattery,
    organizationId,
    customRatePerKwp,
  }: {
    consumptionKwh?: number;
    targetKWp?: number;
    targetModules?: number;
    modPowerWUser?: number;
    cidade?: string;
    estado?: string;
    roofType?: string;
    gridVoltage?: string;
    inverterType?: string;
    batteryKwh?: number;
    batteryQty?: number;
    batteryVoltageType?: "LV" | "HV";
    hasBms?: boolean;
    hasBattery?: boolean;
    organizationId?: string;
    customRatePerKwp?: number;
  }) {
    let gridTopology: string | undefined = undefined;
    if (_gridVoltage) {
      const gv = _gridVoltage.toLowerCase();
      if (gv.includes("mono")) {
        gridTopology = "mono_220";
      } else if (gv.includes("bif") || gv.includes("127")) {
        gridTopology = "biphasic_127_220";
      } else if (gv.includes("380")) {
        gridTopology = "tri_380";
      } else if (gv.includes("220") && gv.includes("tri")) {
        gridTopology = "tri_220";
      }
    }

    const mappedInverterType: "string" | "microinverter" | "hybrid" | "off_grid" =
      inverterType === "micro" || inverterType === "microinverter"
        ? "microinverter"
        : inverterType === "hybrid"
          ? "hybrid"
          : inverterType === "off_grid"
            ? "off_grid"
            : "string";

    let finalTargetKWp = 3.0;
    let monthlyFactor = 130;
    if (cidade || estado) {
      const hspRes = this.geoIrradiance.getHsp(cidade || "São Paulo", estado || "SP");
      if (hspRes && hspRes.hsp > 0) {
        monthlyFactor = Math.max(90, Math.min(180, Math.round(hspRes.hsp * 30 * 0.85)));
      }
    }

    if (typeof targetKWp === "number" && targetKWp > 0) {
      finalTargetKWp = targetKWp;
    } else if (
      typeof targetModules === "number" &&
      targetModules > 0 &&
      typeof modPowerWUser === "number" &&
      modPowerWUser > 0
    ) {
      finalTargetKWp = (targetModules * modPowerWUser) / 1000;
    } else if (typeof targetModules === "number" && targetModules > 0) {
      finalTargetKWp = (targetModules * (modPowerWUser || 585)) / 1000;
    } else if (typeof consumptionKwh === "number" && consumptionKwh > 0) {
      finalTargetKWp = consumptionKwh / monthlyFactor;
    }
    const safeKwp = Math.max(0.5, finalTargetKWp);

    let ratePerKwp = 2800;
    if (customRatePerKwp && customRatePerKwp >= 500 && customRatePerKwp <= 25000) {
      ratePerKwp = customRatePerKwp;
    } else if (organizationId) {
      ratePerKwp = await this.getOrganizationDefaultKwpRate(organizationId);
    }

    const mappedRoofType = this.mapRoofTypeToCatalog(roofType);
    const roofLabel = this.getRoofLabel(roofType);

    // 1. Tenta gerar via KitGenerationService (mesmo serviço que abastece a plataforma web)
    if (this.kitGeneration) {
      try {
        const tiersRes = await this.kitGeneration.generateDistributorTiers(
          {
            system_kw: safeKwp,
            roof_type: mappedRoofType,
            inverter_type: mappedInverterType,
            monthly_yield: monthlyFactor,
            monthly_generation_factor: monthlyFactor,
            grid_topology: gridTopology,
          },
          organizationId
        );

        if (tiersRes && tiersRes.tiers && tiersRes.tiers.length > 0) {
          const costBenefitTier =
            tiersRes.tiers.find((t) => t.tier_id === "cost_benefit") || tiersRes.tiers[0]!;
          const refKwp =
            safeKwp > 0 ? safeKwp : costBenefitTier.kit_result?.system_power_kw || safeKwp;
          const uniformTotalPrice = Math.round(refKwp * ratePerKwp * 100) / 100;

          return tiersRes.tiers.map((t) => {
            const realSystemKwp = t.kit_result.system_power_kw;
            const totalPrice = uniformTotalPrice;
            const invQty = t.inverter_qty || t.kit_result.inverter?.quantity || 1;
            const isMicro = mappedInverterType === "microinverter";
            const invLabel = isMicro
              ? `${invQty}x Microinversor${invQty > 1 ? "es" : ""}`
              : invQty > 1
                ? `${invQty}x Inversores`
                : `1x Inversor`;
            const kitItems = [
              `• ${t.module_qty}x Módulos ${t.module_brand} ${t.module_power_w}W`,
              `• ${invLabel} ${t.inverter_brand} ${t.inverter_power_kw}kW`,
            ];
            if (roofLabel !== "Sem estrutura") {
              kitItems.push(`• Estrutura: ${roofLabel}`);
            }

            if (mappedInverterType === "hybrid" && (hasBattery || batteryQty || batteryKwh)) {
              const bQty = batteryQty || (batteryKwh ? Math.ceil(batteryKwh / 5.12) : 1);
              const bKwh = batteryKwh || Math.round(bQty * 5.12 * 100) / 100;
              const batBrand = t.inverter_brand || "Deye";
              kitItems.push(
                `• ${bQty}x Bateria${bQty > 1 ? "s" : ""} de Lítio ${batBrand} (${bKwh} kWh)`
              );
              if (hasBms) {
                kitItems.push(`• 1x Control Box / BMS de Cluster ${batBrand} HV`);
              }
            }

            const structuredItems = (t.kit_result.kit_items || []).map((it) => ({
              productId: it.product_id,
              productName: it.product_name,
              brandName: it.brand_name || "",
              categoryName: "equipment",
              quantity: it.quantity,
              unitPrice: it.unit_price,
              lineTotal: Math.round(it.unit_price * it.quantity * 100) / 100,
            }));

            return {
              distributorName: t.name,
              distributorId: `kwp-${t.tier_id}`,
              totalPrice,
              ratePerKwp,
              materialsTotal: t.equipment_total,
              kwp: realSystemKwp,
              estimatedGeneration: Math.round(realSystemKwp * (monthlyFactor || 130)),
              items: kitItems,
              invName: t.inverter_brand,
              modCount: t.module_qty,
              modName: t.module_brand,
              structuredItems,
              kitResult: t.kit_result,
            };
          });
        }
      } catch (err) {
        this.logger.warn(
          "Erro ao gerar kits do catálogo real pelo KitGenerationService, usando fallback:",
          err
        );
      }
    }

    // 2. Fallback de contingência caso não haja produtos ativos no catálogo
    // Busca marcas preferenciais cadastradas pelo integrador no tenant.settings
    let preferredModuleBrand = "DAH Solar";
    let preferredInverterBrand = "Growatt";
    let preferredMicroInverterBrand = "Hoymiles";
    let preferredHybridInverterBrand = "Deye";

    let modTiers:
      | { standard?: string[]; elite?: string[]; premium?: string[]; priority?: string | null }
      | undefined;
    let invTiers:
      | { standard?: string[]; elite?: string[]; premium?: string[]; priority?: string | null }
      | undefined;
    let microTiers:
      | { standard?: string[]; elite?: string[]; premium?: string[]; priority?: string | null }
      | undefined;
    let hybridTiers:
      | { standard?: string[]; elite?: string[]; premium?: string[]; priority?: string | null }
      | undefined;

    if (organizationId) {
      try {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: organizationId },
          select: { settings: true },
        });
        const settings = (tenant?.settings as Record<string, unknown>) || {};
        if (
          Array.isArray(settings["preferredModuleBrands"]) &&
          settings["preferredModuleBrands"].length > 0
        ) {
          preferredModuleBrand = String(settings["preferredModuleBrands"][0]);
        }
        if (
          Array.isArray(settings["preferredInverterBrands"]) &&
          settings["preferredInverterBrands"].length > 0
        ) {
          preferredInverterBrand = String(settings["preferredInverterBrands"][0]);
        }
        if (
          Array.isArray(settings["preferredMicroInverterBrands"]) &&
          settings["preferredMicroInverterBrands"].length > 0
        ) {
          preferredMicroInverterBrand = String(settings["preferredMicroInverterBrands"][0]);
        }
        if (
          Array.isArray(settings["preferredHybridInverterBrands"]) &&
          settings["preferredHybridInverterBrands"].length > 0
        ) {
          preferredHybridInverterBrand = String(settings["preferredHybridInverterBrands"][0]);
        }

        if (settings["moduleBrandTiers"] && typeof settings["moduleBrandTiers"] === "object") {
          modTiers = settings["moduleBrandTiers"] as typeof modTiers;
        }
        if (settings["inverterBrandTiers"] && typeof settings["inverterBrandTiers"] === "object") {
          invTiers = settings["inverterBrandTiers"] as typeof invTiers;
        }
        if (
          settings["microInverterBrandTiers"] &&
          typeof settings["microInverterBrandTiers"] === "object"
        ) {
          microTiers = settings["microInverterBrandTiers"] as typeof microTiers;
        }
        if (
          settings["hybridInverterBrandTiers"] &&
          typeof settings["hybridInverterBrandTiers"] === "object"
        ) {
          hybridTiers = settings["hybridInverterBrandTiers"] as typeof hybridTiers;
        }
      } catch {}
    }

    const isMicro = mappedInverterType === "microinverter";
    const isHybrid = mappedInverterType === "hybrid";

    const modulePowerW = modPowerWUser || 585;
    const moduleQty = targetModules || Math.max(4, Math.round((safeKwp * 1000) / modulePowerW));
    const realSystemKwp = Math.round(((moduleQty * modulePowerW) / 1000) * 100) / 100;

    const invPowerSizes = [3, 3.6, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 75, 100];
    let invPower = 3;
    let invCount = 1;
    if (isMicro) {
      invPower = 2;
      invCount = Math.max(1, Math.ceil(realSystemKwp / 2));
    } else if (realSystemKwp > 3.8) {
      if (realSystemKwp <= 130) {
        for (const size of invPowerSizes) {
          if (size * 1.3 >= realSystemKwp) {
            invPower = size;
            break;
          }
        }
        if (invPower < realSystemKwp / 1.3) invPower = Math.ceil(realSystemKwp);
      } else {
        // Usina de grande porte: escala N inversores idênticos de teto 75kW ou 100kW
        invCount = Math.max(2, Math.ceil(realSystemKwp / (75 * 1.3)));
        const perInvKw = realSystemKwp / invCount;
        for (const size of invPowerSizes) {
          if (size * 1.3 >= perInvKw) {
            invPower = size;
            break;
          }
        }
      }
    }

    let standardInverterBrand: string;
    let eliteInverterBrand: string;
    let premiumInverterBrand: string;

    if (isMicro) {
      if (
        microTiers?.standard?.length ||
        microTiers?.elite?.length ||
        microTiers?.premium?.length
      ) {
        standardInverterBrand = microTiers.standard?.[0] || "SAJ";
        eliteInverterBrand = microTiers.elite?.[0] || "Growatt";
        premiumInverterBrand = microTiers.premium?.[0] || microTiers.priority || "DEYE";
      } else {
        standardInverterBrand = preferredMicroInverterBrand || "NEP";
        eliteInverterBrand =
          preferredMicroInverterBrand && preferredMicroInverterBrand.toLowerCase() !== "nep"
            ? preferredMicroInverterBrand
            : "Hoymiles";
        premiumInverterBrand = "GoodWe";
      }
    } else if (isHybrid) {
      if (
        hybridTiers?.standard?.length ||
        hybridTiers?.elite?.length ||
        hybridTiers?.premium?.length
      ) {
        standardInverterBrand = hybridTiers.standard?.[0] || "Deye";
        eliteInverterBrand = hybridTiers.elite?.[0] || "Growatt";
        premiumInverterBrand = hybridTiers.premium?.[0] || hybridTiers.priority || "Huawei";
      } else {
        standardInverterBrand = preferredHybridInverterBrand || "Deye";
        eliteInverterBrand = preferredHybridInverterBrand || "Deye";
        premiumInverterBrand = "Huawei";
      }
    } else {
      if (invTiers?.standard?.length || invTiers?.elite?.length || invTiers?.premium?.length) {
        standardInverterBrand = invTiers.standard?.[0] || "Solplanet";
        eliteInverterBrand = invTiers.elite?.[0] || "Growatt";
        premiumInverterBrand = invTiers.premium?.[0] || invTiers.priority || "Sungrow";
      } else {
        standardInverterBrand = preferredInverterBrand || "Solplanet";
        eliteInverterBrand = preferredInverterBrand || "Growatt";
        premiumInverterBrand = "Huawei";
      }
    }

    const standardModuleBrand = modTiers?.standard?.[0] || preferredModuleBrand || "DAH Solar";
    const eliteModuleBrand = modTiers?.elite?.[0] || preferredModuleBrand || "Canadian Solar";
    const premiumModuleBrand = modTiers?.premium?.[0] || "Jinko Solar";

    const tiers = [
      {
        id: "economic",
        distributorName: "Standard",
        distributorId: "kwp-standard",
        materialCostFactor: 0.88,
        inverterBrand: standardInverterBrand,
        moduleBrand: standardModuleBrand,
      },
      {
        id: "cost_benefit",
        distributorName: "Elite",
        distributorId: "kwp-elite",
        materialCostFactor: 1.0,
        inverterBrand: eliteInverterBrand,
        moduleBrand: eliteModuleBrand,
      },
      {
        id: "premium",
        distributorName: "Premium",
        distributorId: "kwp-premium",
        materialCostFactor: 1.15,
        inverterBrand: premiumInverterBrand,
        moduleBrand: premiumModuleBrand,
      },
    ];

    const results = tiers.map((cfg) => {
      const baseEquipmentRate = ratePerKwp * 0.55;
      const tierEquipmentRate = baseEquipmentRate * cfg.materialCostFactor;
      const totalPrice = Math.round(safeKwp * ratePerKwp * 100) / 100;

      const baseEquipmentBudget = Math.round(realSystemKwp * tierEquipmentRate);
      const modTotal = baseEquipmentBudget * 0.5;
      const invTotal = baseEquipmentBudget * 0.36;

      const structuredItems = [
        {
          productId: "kwp-mod",
          productName: `Módulo ${cfg.moduleBrand} ${modulePowerW}W N-Type`,
          brandName: cfg.moduleBrand,
          categoryName: "module",
          quantity: moduleQty,
          unitPrice: modTotal / moduleQty,
          lineTotal: modTotal,
        },
        {
          productId: "kwp-inv",
          productName: isMicro
            ? `${invCount > 1 ? `${invCount}x ` : ""}Microinversor ${cfg.inverterBrand} ${invPower}kW`
            : isHybrid
              ? `Inversor Híbrido ${cfg.inverterBrand} ${invPower}kW`
              : invCount > 1
                ? `${invCount}x Inversor ${cfg.inverterBrand} ${invPower}kW`
                : `Inversor ${cfg.inverterBrand} ${invPower}kW`,
          brandName: cfg.inverterBrand,
          categoryName: isMicro ? "microinverter" : isHybrid ? "hybrid_inverter" : "inverter",
          quantity: invCount,
          unitPrice: invTotal / invCount,
          lineTotal: invTotal,
        },
      ];

      if (roofLabel !== "Sem estrutura") {
        const structTotal = baseEquipmentBudget * 0.14;
        structuredItems.push({
          productId: "kwp-struct",
          productName: `Estrutura para ${moduleQty} módulos (${roofLabel})`,
          brandName: "Universal",
          categoryName: "structure",
          quantity: moduleQty,
          unitPrice: structTotal / moduleQty,
          lineTotal: structTotal,
        });
      }

      const invLabel = isMicro
        ? `${invCount}x Microinversor${invCount > 1 ? "es" : ""}`
        : isHybrid
          ? `1x Inversor Híbrido`
          : invCount > 1
            ? `${invCount}x Inversores`
            : `1x Inversor`;
      const kitItems = [
        `• ${moduleQty}x Módulos ${cfg.moduleBrand} ${modulePowerW}W`,
        `• ${invLabel} ${cfg.inverterBrand} ${invPower}kW`,
      ];
      if (roofLabel !== "Sem estrutura") {
        kitItems.push(`• Estrutura: ${roofLabel}`);
      }
      if (isHybrid && (hasBattery || batteryQty || batteryKwh)) {
        const bQty = batteryQty || (batteryKwh ? Math.ceil(batteryKwh / 5.12) : 1);
        const bKwh = batteryKwh || Math.round(bQty * 5.12 * 100) / 100;
        const batBrand = cfg.inverterBrand || "Deye";
        kitItems.push(
          `• ${bQty}x Bateria${bQty > 1 ? "s" : ""} de Lítio ${batBrand} (${bKwh} kWh)`
        );
        if (hasBms) {
          kitItems.push(`• 1x Control Box / BMS de Cluster ${batBrand} HV`);
        }
      }

      return {
        distributorName: cfg.distributorName,
        distributorId: cfg.distributorId,
        totalPrice,
        ratePerKwp,
        materialsTotal: baseEquipmentBudget,
        kwp: realSystemKwp,
        estimatedGeneration: Math.round(realSystemKwp * (monthlyFactor || 130)),
        items: kitItems,
        invName: cfg.inverterBrand,
        modCount: moduleQty,
        modName: cfg.moduleBrand,
        structuredItems,
      };
    });

    return results;
  }

  private async getAvailableTemplates(
    tenantId: string,
    options?: { isHybrid?: boolean }
  ): Promise<AvailableProposalTemplate[]> {
    const orgTemplates = await this.prisma.proposalTemplate.findMany({
      where: { tenantId, status: "PUBLISHED", deletedAt: null },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      take: 5,
    });

    if (orgTemplates.length > 0) {
      return orgTemplates.map((t) => ({
        id: t.id,
        name: t.name,
        isHybrid: isTemplateHybridCompatible(t),
      }));
    }

    const blueprints = await this.prisma.proposalTemplateBlueprint.findMany({
      where: { published: true },
      orderBy: { sortOrder: "asc" },
      take: 5,
    });

    if (blueprints.length > 0) {
      return blueprints.map((b) => ({
        id: b.id,
        name: b.name,
        isHybrid: isTemplateHybridCompatible({ name: b.name, config: b.document }),
      }));
    }

    if (options?.isHybrid) {
      return [
        {
          id: "default-hibrido-bess",
          name: "Modelo Híbrido & Backup Solar (EnergivIA)",
          isHybrid: true,
        },
        { id: "default-moderno", name: "Modelo Comercial Moderno", isHybrid: false },
        { id: "default-executivo", name: "Modelo Executivo Solar", isHybrid: false },
      ];
    }

    return [
      { id: "default-moderno", name: "Modelo Comercial Moderno (Padrão)", isHybrid: false },
      { id: "default-executivo", name: "Modelo Executivo Solar", isHybrid: false },
      { id: "default-minimalista", name: "Modelo Minimalista", isHybrid: false },
    ];
  }

  private readonly ROOF_OPTIONS_TEXT =
    `*_Qual a estrutura do telhado?_* 🏠\n\n` +
    `> 1️⃣ *Cerâmica (Colonial)* (Telhas cerâmicas convencionais)\n` +
    `> 2️⃣ *Fibrocimento* (Telhas de fibrocimento em madeira)\n` +
    `> 3️⃣ *Metálico* (Telhas trapezoidais ou zipadas)\n` +
    `> 4️⃣ *Solo* (Estrutura para usina de solo)\n` +
    `> 5️⃣ *Laje* (Laje plana de concreto com triângulos)\n` +
    `> 6️⃣ *Fibrometal* (Fibrocimento em vigas metálicas)\n` +
    `> 7️⃣ *Sem estrutura* (Apenas equipamentos (sem fixação))\n` +
    `> 0️⃣ *Voltar / Corrigir padrão elétrico*\n\n` +
    `_(Responda com o número da opção)_`;

  private readonly GRID_OPTIONS_TEXT = DEFAULT_GRID_OPTIONS_TEXT;

  public readonly INVERTER_TYPE_OPTIONS_TEXT =
    `*_Qual tecnologia de inversor você prefere para esta cotação?_* ⚡\n\n` +
    `> 1️⃣ *Inversor Tradicional (String)* (Mais comum para telhados convencionais)\n` +
    `> 2️⃣ *Microinversor* (Ideal para múltiplas águas ou sombreamentos)\n` +
    `> 3️⃣ *Inversor Híbrido* (Com suporte a baterias para backup/armazenamento)\n` +
    `> 0️⃣ *Voltar / Corrigir estrutura*\n\n` +
    `_(Responda com o número da opção desejada)_`;

  public readonly BATTERY_STORAGE_OPTIONS_TEXT =
    `*_Qual o armazenamento de bateria desejado para este sistema híbrido?_* 🔋\n\n` +
    `Você pode responder informando a capacidade em *kWh*, a *quantidade de baterias* ou indicar *sem bateria*:\n\n` +
    `> • Digite a capacidade (ex: \`5 kWh\`, \`10.24 kWh\`, \`15 kWh\`)\n` +
    `> • Ou digite a quantidade (ex: \`1 bateria\`, \`2 módulos\`, \`4 baterias\`)\n` +
    `> • Ou digite \`0\` ou \`sem bateria\` se desejar apenas o inversor híbrido\n\n` +
    `_(Ou envie 0️⃣ para voltar ao passo anterior)_`;

  private readonly TRIFASICO_VOLTAGE_QUESTION_TEXT = DEFAULT_TRIFASICO_VOLTAGE_QUESTION_TEXT;

  private buildLargeKitGridQuestionText(powerOrKwh: string): string {
    return buildLargeKitGridQuestionText(powerOrKwh);
  }

  private formatBrl(value: number): string {
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  public resolveQuoteIndexFromText(text: string, quotesOrMax: number | any[]): number | null {
    return resolveQuoteIndexFromText(text, quotesOrMax);
  }

  /** Etapa 2: kit escolhido -> pergunta o preço de venda por kWp */
  private buildPriceQuestionText(quote: any, orgDefaultRate: number): string {
    const total = Math.round(quote.kwp * orgDefaultRate * 100) / 100;
    const items: string[] = Array.isArray(quote.items) ? quote.items : [];
    return (
      `*_Kit ${quote.distributorName} selecionado!_* ☀️\n\n` +
      `> ⚡ Potência: \`${quote.kwp} kWp\` | Geração estimada: \`${quote.estimatedGeneration} kWh/mês\`\n` +
      items.map((i) => `> ${i}\n`).join("") +
      `\n*_Como você deseja prosseguir para esta cotação?_*\n\n` +
      `> 1️⃣ *Seguir com o preço padrão* (\`R$ ${this.formatBrl(orgDefaultRate)}/kWp\` — Total: \`R$ ${this.formatBrl(total)}\`)\n` +
      `> 2️⃣ *Informar outro preço por kWp* (ex: \`2500\`, \`R$ 3.200\` ou \`total 18500\`)\n` +
      `> 0️⃣ *Voltar / Escolher outro kit*\n\n` +
      `_(Responda 1, 2 ou digite o preço por kWp diretamente)_`
    );
  }

  /** Etapa 3: preço definido -> resumo com valor total e pergunta o nome do cliente */
  private buildPriceAppliedText(quote: any, rate: number, isDerivedFromTotal?: boolean): string {
    const total = Math.round(quote.kwp * rate * 100) / 100;
    const derivedNote = isDerivedFromTotal
      ? `\n_(Convertido a partir do valor total informado)_`
      : "";
    return (
      `*_Preço aplicado:_* \`R$ ${this.formatBrl(rate)}/kWp\` ✅${derivedNote}\n\n` +
      `*_Resumo da cotação — Kit ${quote.distributorName}:_*\n` +
      `> ⚡ Potência: \`${quote.kwp} kWp\`\n` +
      `> 💰 Valor total: \`R$ ${this.formatBrl(total)}\` (${quote.kwp} kWp × R$ ${this.formatBrl(rate)})\n` +
      `> _Validade da cotação: 3 dias úteis_\n\n` +
      `*_Qual o nome do cliente final para a proposta comercial?_*\n` +
      `_(ou digite 0️⃣ para alterar o preço)_`
    );
  }

  public formatPowerBadge(kwp: number): string {
    return formatPowerBadge(kwp);
  }

  public parsePowerInput(text: string): number | null {
    return parsePowerInput(text);
  }

  public parseConsumptionInput(text: string): number | null {
    return parseConsumptionInput(text);
  }

  public parsePtBrNumber(valStr?: string | null): number {
    return parsePtBrNumber(valStr);
  }

  public parseIntegratorQuoteEntities(text: string): ExtractedIntegratorQuote {
    return parseIntegratorQuoteEntities(text);
  }

  /** Formata a mensagem com as opções numeradas de estados para municípios homônimos */
  public buildAmbiguousCityPrompt(cityName: string, candidates: MunicipalityCandidate[]): string {
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const optionsText = candidates
      .slice(0, 10)
      .map((c, idx) => {
        const emoji = numberEmojis[idx] || `${idx + 1}.`;
        const capitalBadge = c.isCapital ? " (Capital)" : "";
        const stateDesc = c.stateName ? ` - ${c.stateName}${capitalBadge}` : "";
        return `> ${emoji} *${c.city}/${c.uf}*${stateDesc}`;
      })
      .join("\n");

    return (
      `Encontrei mais de um município chamado *${cityName}*. 📍\n` +
      `Para qual estado será a instalação?\n\n` +
      optionsText +
      `\n> 0️⃣ *Voltar / Digitar outra cidade*\n\n` +
      `_(Responda com o número da opção ou a sigla do estado)_`
    );
  }

  /** Finaliza a seleção de localidade identificada e avança para a próxima etapa da simulação */
  public async finalizeLocationSelection(
    hspRes: HspLookupResult,
    sessionCtx: {
      cidade?: string;
      estado?: string;
      hsp?: number;
      targetKWp?: number;
      targetModules?: number;
      consumptionKwh?: number;
      billValue?: number;
      gridVoltage?: string;
      roofType?: string;
      pendingCityCandidates?: MunicipalityCandidate[];
      pendingCityName?: string;
      customRatePerKwp?: number;
    },
    setStep: (nextStep: WhatsappBotStep, patchData?: Partial<WhatsappSessionData>) => Promise<any>,
    kitsFor: (opts: { roofType?: string; customRatePerKwp?: number }) => Promise<any[]>
  ): Promise<string> {
    delete sessionCtx.pendingCityCandidates;
    delete sessionCtx.pendingCityName;
    sessionCtx.cidade = hspRes.city;
    sessionCtx.estado = hspRes.uf;
    sessionCtx.hsp = hspRes.hsp;

    // Se o valor da conta ainda NÃO foi informado (e não veio de fatura nem de texto inicial):
    // Pergunta o valor da conta de luz em R$ e aguarda AWAITING_BILL_VALUE
    if (sessionCtx.billValue === undefined) {
      await setStep("AWAITING_BILL_VALUE", {
        cidade: hspRes.city,
        uf: hspRes.uf,
        hsp: hspRes.hsp,
      });

      return (
        `*_Localização Identificada!_* \`${hspRes.city}/${hspRes.uf}\` 📍☀️\n` +
        `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n\n` +
        `💡 *Qual é o valor médio da conta de luz atual em R$?*\n\n` +
        `> Digite o valor (ex: *850* ou *850,00*).\n` +
        `> Ou envie *0* para estimar automaticamente pela tarifa da sua região.`
      );
    }

    const isLargeKit = Boolean(
      (sessionCtx.targetKWp && sessionCtx.targetKWp >= 15) ||
      (sessionCtx.targetModules && sessionCtx.targetModules >= 26) ||
      (sessionCtx.consumptionKwh && sessionCtx.consumptionKwh >= 2500)
    );

    const hasCompleteVoltage = Boolean(sessionCtx.gridVoltage?.includes("V"));

    // Se já possui Padrão Elétrico com tensão e Telhado definidos: Fast-forward direto pros kits!
    if (hasCompleteVoltage && sessionCtx.roofType) {
      const quotes = await kitsFor({ roofType: sessionCtx.roofType });
      if (quotes.length > 0) {
        await setStep("AWAITING_KIT_SELECTION", {
          cidade: hspRes.city,
          uf: hspRes.uf,
          hsp: hspRes.hsp,
          billValue: sessionCtx.billValue,
          gridType: sessionCtx.gridVoltage,
          roofType: sessionCtx.roofType,
        });
        return (
          `*_Localização Identificada!_* \`${hspRes.city}/${hspRes.uf}\` 📍☀️\n` +
          `> ⚡ Padrão Elétrico: *${sessionCtx.gridVoltage}*\n` +
          `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
          this.formatQuotesListText(quotes, sessionCtx)
        );
      }
    }

    // Se já possui Padrão Elétrico com tensão, mas falta Telhado: vai para AWAITING_ROOF_TYPE
    if (hasCompleteVoltage && !sessionCtx.roofType) {
      await setStep("AWAITING_ROOF_TYPE", {
        cidade: hspRes.city,
        uf: hspRes.uf,
        hsp: hspRes.hsp,
        billValue: sessionCtx.billValue,
        gridType: sessionCtx.gridVoltage,
      });
      return (
        `*_Localização Identificada!_* \`${hspRes.city}/${hspRes.uf}\` 📍☀️\n` +
        `> ⚡ Padrão Elétrico: *${sessionCtx.gridVoltage}*\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    }

    // Falta Padrão Elétrico (ou tensão 220V/380V não especificada): vai para AWAITING_GRID_TYPE
    await setStep("AWAITING_GRID_TYPE", {
      cidade: hspRes.city,
      uf: hspRes.uf,
      hsp: hspRes.hsp,
      billValue: sessionCtx.billValue,
      roofType: sessionCtx.roofType,
    });
    const roofInfo = sessionCtx.roofType ? `> 🏠 Estrutura: *${sessionCtx.roofType}*\n` : "";
    const gridPrompt = isLargeKit
      ? this.buildLargeKitGridQuestionText(
          sessionCtx.targetKWp
            ? this.formatPowerBadge(sessionCtx.targetKWp)
            : sessionCtx.consumptionKwh
              ? `${sessionCtx.consumptionKwh} kWh/mês`
              : "grande porte"
        )
      : this.GRID_OPTIONS_TEXT;

    return (
      `*_Localização Identificada!_* 📍☀️\n\n` +
      `> Cidade: \`${hspRes.city}/${hspRes.uf}\`\n` +
      `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n` +
      roofInfo +
      `\n` +
      gridPrompt
    );
  }

  /** Etapa 1: lista os grupos de kits (sem preço) para o integrador escolher */
  public formatQuotesListText(
    quotes: any[],
    sessionCtx: {
      targetKWp?: number;
      targetModules?: number;
      consumptionKwh?: number;
      cidade?: string;
      estado?: string;
      customRatePerKwp?: number;
    }
  ): string {
    const localidade =
      sessionCtx.cidade && sessionCtx.estado
        ? ` em \`${sessionCtx.cidade}/${sessionCtx.estado}\``
        : sessionCtx.cidade
          ? ` em \`${sessionCtx.cidade}\``
          : "";

    const formattedHeaderPower = sessionCtx.targetKWp
      ? formatPowerBadge(sessionCtx.targetKWp)
      : null;
    const infoCabecalho = formattedHeaderPower
      ? `para a potência de \`${formattedHeaderPower}\`${localidade}`
      : sessionCtx.targetModules
        ? `para \`${sessionCtx.targetModules} módulos\`${localidade}`
        : `para o consumo de \`${sessionCtx.consumptionKwh || 300} kWh/mês\`${localidade}`;

    let quoteText = `Excelente! Seguem os grupos de kits dimensionados ${infoCabecalho}:\n\n`;

    quotes.forEach((q, index) => {
      const tierName =
        q.distributorName || (index === 0 ? "Standard" : index === 1 ? "Elite" : "Premium");
      const isTop = index === 0;
      const tag = isTop ? " (Mais Recomendado)" : "";
      const trophy = isTop ? " 🏆" : "";

      quoteText += `*_Opção ${index + 1} — ${tierName}${tag}_*${trophy}\n`;
      if (q.kwp && q.estimatedGeneration) {
        quoteText += `> ⚡ Potência: \`${formatPowerBadge(q.kwp)}\` | Geração estimada: \`${q.estimatedGeneration} kWh/mês\`\n`;
      }

      const items: string[] =
        q.items && q.items.length > 0
          ? q.items
          : q.structuredItems && q.structuredItems.length > 0
            ? q.structuredItems.map(
                (si: any) => `• ${si.quantity > 1 ? `${si.quantity}x ` : ""}${si.productName}`
              )
            : [];
      if (items.length > 0) {
        items.forEach((item: string) => {
          quoteText += `> ${item}\n`;
        });
      }
      quoteText += `\n`;
    });

    quoteText += `Qual opção você prefere para o seu cliente?\n`;
    quoteText += `_(Responda com o número ou nome da opção: 1 Standard, 2 Elite ou 3 Premium. Na sequência você define o preço por kWp)_\n`;
    quoteText += `> 💡 *Quer trocar de tecnologia?* Envie *micro*, *híbrido* ou *string* para recalcular esta potência.\n`;
    quoteText += `> 0️⃣ *Voltar / Escolher tecnologia*\n\n`;
    quoteText += `Equipe *_EnergivIA._*`;
    return quoteText;
  }

  private numToEmoji(num: number): string {
    const emojis: Record<number, string> = {
      1: "1️⃣",
      2: "2️⃣",
      3: "3️⃣",
      4: "4️⃣",
      5: "5️⃣",
      6: "6️⃣",
      7: "7️⃣",
      8: "8️⃣",
      9: "9️⃣",
      10: "🔟",
    };
    return emojis[num] || `${num}️⃣`;
  }

  private getGreetingText(contactName?: string): string {
    const now = new Date();
    const utcHours = now.getUTCHours();
    const brHours = (utcHours - 3 + 24) % 24;

    let saudacao = "Olá";
    if (brHours >= 5 && brHours < 12) {
      saudacao = "Bom dia";
    } else if (brHours >= 12 && brHours < 18) {
      saudacao = "Boa tarde";
    } else {
      saudacao = "Boa noite";
    }

    const cleanName = (contactName || "").trim();
    const firstName = cleanName && cleanName !== "Integrador" ? ` ${cleanName.split(" ")[0]}` : "";

    return `${saudacao}${firstName}! Tudo bem? ☀️`;
  }

  public buildGreetingMenu(contactName?: string): string {
    const greeting = this.getGreetingText(contactName);
    return (
      `${greeting}\n\n` +
      `Sou seu assistente de vendas e dimensionamento da *_EnergivIA._*\n\n` +
      `*_Como posso ajudar você a gerar orçamentos hoje?_*\n\n` +
      `> 1️⃣ *Enviar fatura de energia* (PDF ou foto)\n` +
      `> 2️⃣ *Simular por consumo mensal* (ex: \`450 kWh\`)\n` +
      `> 3️⃣ *Simular por potência de pico* (ex: \`5 kWp\`)\n` +
      `> 4️⃣ *Simular por quantidade de placas* (ex: \`10 módulos\`)\n\n` +
      `> 💡 *Tecnologias Suportadas:* Inversor Tradicional (String), Microinversor e Inversor Híbrido (com baterias).\n\n` +
      `_(Responda com o número da opção ou envie a conta de luz diretamente)_\n\n` +
      `Equipe *_EnergivIA._*`
    );
  }

  public buildGuestGreetingMenu(contactName?: string, trialQuotesRemaining = 3): string {
    const greeting = this.getGreetingText(contactName);
    return (
      `${greeting}\n\n` +
      `Sou seu assistente de vendas e dimensionamento da *_EnergivIA._*\n\n` +
      `🎁 *Você ganhou 3 cotações completas gratuitas de teste!*\n` +
      `_(Restam ${trialQuotesRemaining} cotações no seu teste gratuito)_\n\n` +
      `*_Como posso ajudar você a gerar orçamentos hoje?_*\n\n` +
      `> 1️⃣ *Enviar fatura de energia* (PDF ou foto)\n` +
      `> 2️⃣ *Simular por consumo mensal* (ex: \`450 kWh\`)\n` +
      `> 3️⃣ *Simular por potência de pico* (ex: \`5 kWp\`)\n` +
      `> 4️⃣ *Simular por quantidade de placas* (ex: \`10 módulos\`)\n\n` +
      `> 💡 *Tecnologias Suportadas:* Inversor Tradicional (String), Microinversor e Inversor Híbrido (com baterias).\n\n` +
      `_(Responda com o número da opção ou envie a conta de luz diretamente)_\n\n` +
      `Equipe *_EnergivIA._*`
    );
  }

  public buildGuestTrialExceededMessage(): string {
    return (
      `Olá! ☀️ Você já utilizou suas *3 cotações gratuitas de degustação* da EnergivIA.\n\n` +
      `Esperamos que tenha gostado da velocidade e precisão das propostas comerciais! 🚀\n\n` +
      `Para continuar gerando propostas comerciais ilimitadas com IA, personalizar o valor por kWp, usar o logotipo da sua empresa e cadastrar seus próprios clientes, escolha o seu plano em:\n` +
      `👉 *https://www.energivia.com.br/gestao/meus-planos*`
    );
  }

  private async searchCatalogProducts(query: string, limit = 5) {
    try {
      const clean = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s\d]/g, " ")
        .trim();

      const stopWords = new Set([
        "de",
        "do",
        "da",
        "dos",
        "das",
        "para",
        "com",
        "sem",
        "em",
        "na",
        "no",
        "nas",
        "nos",
        "um",
        "uma",
        "uns",
        "umas",
        "o",
        "a",
        "os",
        "as",
        "que",
        "qual",
        "quanto",
        "custa",
        "valor",
        "preco",
        "preço",
        "tem",
        "voce",
        "voces",
        "temos",
        "sobre",
        "qualquer",
        "mais",
        "ola",
        "olá",
        "bom",
        "dia",
        "boa",
        "tarde",
        "noite",
        "gostaria",
        "saber",
      ]);

      const terms = clean.split(/\s+/).filter((t) => t.length >= 2 && !stopWords.has(t));

      const OR: any[] = [];
      for (const term of terms) {
        OR.push({ name: { contains: term, mode: "insensitive" } });
        OR.push({ category: { name: { contains: term, mode: "insensitive" } } });
        OR.push({ brand: { name: { contains: term, mode: "insensitive" } } });
      }

      const products = await this.prisma.product.findMany({
        where: {
          active: true,
          ...(OR.length > 0 ? { OR } : {}),
        },
        include: {
          brand: true,
          category: true,
          distributorProducts: {
            include: { distributor: true },
            take: 3,
          },
        },
        take: limit,
      });

      return products;
    } catch (e) {
      this.logger.error("Erro pesquisando catálogo de produtos para WhatsApp:", e);
      return [];
    }
  }

  private async answerFreeformQuestion({
    userQuestion,
    organizationId,
  }: {
    userQuestion: string;
    organizationId?: string | null;
  }): Promise<string> {
    const openAiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!openAiKey && !this.genAI) {
      return (
        `Não consegui consultar as especificações no momento. ` +
        `Para cotar um kit completo, você pode me enviar a fatura em PDF/foto ou digitar o consumo médio em kWh (ex: *450 kWh*).`
      );
    }

    const matchingProducts = await this.searchCatalogProducts(userQuestion, 4);

    let catalogContext = "";
    if (matchingProducts.length > 0) {
      catalogContext = "PRODUTOS ENCONTRADOS NO BANCO DE DADOS DA PLATAFORMA ENERGIVIA:\n";
      for (const p of matchingProducts) {
        const prices = p.distributorProducts
          .map(
            (dp) =>
              `${dp.distributor.name}: R$ ${Number(dp.price).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (Estoque: ${dp.stockQuantity})`
          )
          .join(" | ");
        const specsText = p.specs ? JSON.stringify(p.specs) : "Padrão do fabricante";
        catalogContext += `- Produto: ${p.name}\n  Categoria: ${p.category?.name || "Solar"}\n  Marca: ${p.brand?.name || "Fabricante"}\n  Ficha Técnica / Specs: ${specsText}\n  Preços / Distribuidores: ${prices || "Sob consulta"}\n`;
      }
    } else {
      catalogContext =
        "NENHUM PRODUTO ESPECÍFICO ENCONTRADO NO CATÁLOGO DO BANCO DE DADOS PARA ESSA PESQUISA.";
    }

    const systemPrompt = `Você é o assistente técnico e comercial inteligente da plataforma EnergivIA via WhatsApp.
REGRAS OBRIGATÓRIAS E INEGOCIÁVEIS:
1. ESCOPO ESTRITO: Responda APENAS sobre energia solar fotovoltaica e estritamente sobre os produtos/dados cadastrados na EnergivIA. Se o usuário perguntar sobre qualquer assunto fora de energia solar (esportes, piadas, culinária, política, curiosidades gerais, etc.), recuse educadamente em 1 linha e convide-o a simular um projeto solar ou tirar dúvidas da plataforma.
2. ZERO ALUCINAÇÃO / DADOS REAIS: Utilize EXCLUSIVAMENTE os produtos, fichas técnicas e preços listados abaixo em "CONTEXTO DO CATÁLOGO". NUNCA invente preços, potências, garantias ou marcas. NUNCA mencione informações da internet que não estejam no catálogo abaixo.
3. SE NÃO ENCONTRAR NO CATÁLOGO: Se o produto ou especificação exata não constar no catálogo abaixo, diga claramente em 1 ou 2 frases que não localizou esse modelo cadastrado no momento no catálogo dos distribuidores e oriente a informar o consumo (kWh) ou potência (kWp) para simularmos um kit completo.
4. RESPOSTA ULTRACURTA E DIRETA (MÁXIMO 2 A 3 FRASES): Seja 100% conciso, amigável e direto ao ponto. Proibido textos longos, introduções prolixas ou listas extensas. Economize tokens ao máximo.

CONTEXTO DO CATÁLOGO:
${catalogContext}`;

    // 1. Provedor OpenAI (prioridade primária solicitada para o ChatGPT)
    if (openAiKey) {
      const startTime = Date.now();
      const model = "gpt-4o-mini";
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openAiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            max_tokens: 150,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userQuestion },
            ],
          }),
        });

        const latencyMs = Date.now() - startTime;
        if (response.ok) {
          const json = (await response.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
            usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
          };

          if (json.usage) {
            void this.aiUsage.logUsage({
              organizationId,
              feature: AiFeature.WHATSAPP_BOT,
              model,
              promptTokens: json.usage.prompt_tokens || 0,
              completionTokens: json.usage.completion_tokens || 0,
              totalTokens: json.usage.total_tokens || 0,
              latencyMs,
              status: "SUCCESS",
            });
          }

          const answer = json.choices?.[0]?.message?.content?.trim();
          if (answer) return answer;
        } else {
          this.logger.warn(
            `OpenAI retornou status ${response.status} em answerFreeformQuestion, tentando fallback Gemini`
          );
        }
      } catch (err) {
        this.logger.warn(
          `Erro na resposta OpenAI em answerFreeformQuestion, tentando fallback Gemini: ${String(err)}`
        );
      }
    }

    // 2. Provedor Gemini (fallback de contingência se OpenAI falhar ou não configurado)
    if (this.genAI) {
      const candidateModels = ["gemini-2.0-flash", "gemini-1.5-flash"];
      for (const modelName of candidateModels) {
        const startTime = Date.now();
        try {
          const model = this.genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent([
            systemPrompt,
            `Pergunta do integrador: ${userQuestion}`,
          ]);
          const latencyMs = Date.now() - startTime;
          const usage = result.response.usageMetadata;
          if (usage) {
            void this.aiUsage.logUsage({
              organizationId,
              provider: "google",
              feature: AiFeature.WHATSAPP_BOT,
              model: modelName,
              promptTokens: usage.promptTokenCount || 0,
              completionTokens: usage.candidatesTokenCount || 0,
              totalTokens: usage.totalTokenCount || 0,
              latencyMs,
              status: "SUCCESS",
            });
          }
          const text = result.response.text()?.trim();
          if (text) return text;
        } catch (geminiErr) {
          this.logger.warn(
            `Erro no Gemini (${modelName}) em answerFreeformQuestion fallback: ${String(geminiErr)}`
          );
        }
      }
    }

    return "Não localizei essa informação no catálogo no momento. Você pode enviar a conta de luz ou digitar o consumo em kWh para gerarmos uma cotação completa!";
  }

  public async processWebChatMessage({
    messages,
    incomingText,
    organizationId,
    contactName,
    extractionResult,
  }: {
    messages?: Array<{
      role: string;
      content?: string | null;
      metadata?: unknown;
    }>;
    incomingText?: string;
    organizationId?: string;
    contactName?: string;
    extractionResult?: BillExtractionResult | null;
  }): Promise<string> {
    let orgId = (organizationId || "").trim();
    if (!orgId) {
      try {
        const firstTenant = await this.prisma.tenant.findFirst({ select: { id: true } });
        orgId = firstTenant?.id || "default-org";
      } catch {
        orgId = "default-org";
      }
    }

    const conversation = {
      id: "web-chat-session",
      organizationId: orgId,
      title: "Web Chat",
      metadata: { contactName: contactName || "Integrador" },
      messages: messages || [],
    };

    if (this.isPdfRequest(incomingText || "")) {
      const latestProposal = await this.prisma.proposal.findFirst({
        where: { tenantId: orgId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true },
      });
      if (latestProposal) {
        const appBaseUrl =
          process.env["APP_BASE_URL"] ||
          process.env["PUBLIC_WEB_APP_BASE_URL"] ||
          this.config.get<string>("APP_BASE_URL") ||
          "https://www.energivia.com.br";
        return `📄 Você pode visualizar e baixar o PDF da sua proposta diretamente pelo link:\n👉 ${appBaseUrl}/proposta/${latestProposal.id}?pdf=true`;
      }
      return `_Não encontrei nenhuma proposta recente para gerar o PDF._ ☀️\n\nVocê pode gerar uma nova cotação enviando a conta de luz ou digitando o consumo médio em kWh.`;
    }

    const reply = await this.generateBotResponse({
      conversation,
      incomingText: incomingText || "",
      extractionResult: extractionResult || null,
      contactName,
    });
    if (reply.includes("\n---CLIENT_FORWARD_MESSAGE---\n")) {
      const [main, fwd] = reply.split("\n---CLIENT_FORWARD_MESSAGE---\n");
      return `${main}\n\n━━━━━━━━━━━━━━━━━━━━\n\n*Mensagem para encaminhar ao cliente:*\n\n${fwd}`;
    }
    return reply;
  }

  private async generateBotResponse({
    conversation,
    incomingText,
    extractionResult,
    contactName,
  }: {
    conversation: {
      id: string;
      organizationId: string;
      title: string | null;
      metadata?: unknown;
      messages?: Array<{
        role: string;
        content?: string | null;
        metadata?: unknown;
        createdAt?: Date | string;
      }>;
      updatedAt?: Date | string;
    };
    incomingText: string;
    extractionResult: BillExtractionResult | null;
    contactName?: string;
  }): Promise<string> {
    const lower = incomingText.toLowerCase().trim();
    const messages = conversation?.messages || [];
    const resolvedContactName =
      contactName ||
      (conversation?.metadata as Record<string, unknown> | null | undefined)?.[
        "contactName"
      ]?.toString() ||
      "Integrador";

    const convMeta = (conversation?.metadata as Record<string, any>) || {};
    const isGuestTrial = convMeta["isGuestTrial"] === true;
    const trialStatus =
      isGuestTrial && this.guestTrial ? this.guestTrial.getGuestTrialStatus(conversation) : null;

    const getGreetingMenu = () => {
      if (isGuestTrial && trialStatus) {
        return this.buildGuestGreetingMenu(resolvedContactName, trialStatus.remaining);
      }
      return this.buildGreetingMenu(resolvedContactName);
    };

    const isGreetingText = (txt: string): boolean => {
      if (!txt) return false;
      const clean = txt
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?:;*~_]/g, "");

      const greetingWords = [
        "oi",
        "oii",
        "oiii",
        "ola",
        "olá",
        "opa",
        "eai",
        "e aí",
        "eaí",
        "bom dia",
        "boa tarde",
        "boa noite",
        "boa",
        "tudo bem",
        "tudo bom",
        "salve",
        "fala",
        "hello",
        "hi",
        "hey",
        "menu",
        "inicio",
        "início",
        "iniciar",
        "comecar",
        "começar",
        "novo",
        "nova",
        "reiniciar",
        "reset",
        "voltar",
        "gerar",
        "orçamento",
        "orcamento",
        "proposta",
        "nova proposta",
        "nova cotação",
        "nova cotacao",
        "outro cliente",
        "cotar",
        "cotação",
        "cotacao",
        "simular",
        "simulação",
        "simulacao",
        "ajuda",
        "help",
        "opcoes",
        "opções",
      ];

      return (
        greetingWords.includes(clean) ||
        clean.startsWith("bom dia") ||
        clean.startsWith("boa tarde") ||
        clean.startsWith("boa noite") ||
        clean.startsWith("ola ") ||
        clean.startsWith("olá ") ||
        clean.startsWith("oi ") ||
        clean.startsWith("opa ") ||
        clean.startsWith("quero ") ||
        clean.startsWith("fazer ") ||
        clean.startsWith("criar ") ||
        clean.startsWith("iniciar ") ||
        clean.startsWith("simular ")
      );
    };

    // Recupera mensagens do assistente e a última mensagem funcional
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    const lastRawBotMsg =
      assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]?.content || ""
        : "";
    const functionalAssistantMessages = assistantMessages.filter(
      (m) =>
        !m.content?.includes("Você ainda está por aí?") &&
        !m.content?.includes("encerramos este atendimento")
    );
    const lastBotMsg =
      functionalAssistantMessages.length > 0
        ? functionalAssistantMessages[functionalAssistantMessages.length - 1]?.content || ""
        : lastRawBotMsg;

    if (incomingText === "[Mensagem de áudio recebida]") {
      return (
        `Não consegui compreender o áudio com clareza. 🎙️\n\n` +
        `Pode me enviar outro áudio com a sua solicitação ou, se preferir, digitar os dados da cotação (ex: *15 kWp telhado metálico Curitiba*)?`
      );
    }

    // Helper interno para decodificar o estado acumulado da conversa
    interface ExtractedSessionContext {
      consumptionKwh?: number;
      targetKWp?: number;
      targetModules?: number;
      modPowerWUser?: number;
      cidade?: string;
      estado?: string;
      distribuidora?: string;
      ucNumber?: string;
      hsp?: number;
      pendingCityCandidates?: MunicipalityCandidate[];
      pendingCityName?: string;
      gridVoltage?: string;
      roofType?: string;
      customRatePerKwp?: number;
      clientName?: string;
      clientWhatsapp?: string;
      chosenQuoteIndex: number;
      billValue?: number;
      inverterType?: "string" | "microinverter" | "hybrid" | "off_grid";
      inverterDescription?: string;
      batteryKwh?: number;
      batteryQty?: number;
      batteryVoltageType?: "LV" | "HV";
      hasBms?: boolean;
      hasBattery?: boolean;
    }

    const extractContextFromSession = (): ExtractedSessionContext => {
      let consumptionKwh: number | undefined;
      let targetKWp: number | undefined;
      let targetModules: number | undefined;
      let modPowerWUser: number | undefined;
      let cidade: string | undefined = undefined;
      let estado: string | undefined = undefined;
      let distribuidora: string | undefined = undefined;
      let ucNumber: string | undefined = undefined;
      let hsp: number | undefined = undefined;
      let pendingCityCandidates: MunicipalityCandidate[] | undefined = undefined;
      let pendingCityName: string | undefined = undefined;
      let gridVoltage: string | undefined = undefined;
      let roofType: string | undefined = undefined;
      let customRatePerKwp: number | undefined;
      let clientName: string | undefined = undefined;
      let clientWhatsapp: string | undefined = undefined;
      let chosenQuoteIndex = 0;
      let billValue: number | undefined = undefined;
      let inverterType: "string" | "microinverter" | "hybrid" | "off_grid" | undefined = undefined;
      let inverterDescription: string | undefined = undefined;
      let batteryKwh: number | undefined = undefined;
      let batteryQty: number | undefined = undefined;
      let batteryVoltageType: "LV" | "HV" | undefined = undefined;
      let hasBms: boolean | undefined = undefined;
      let hasBattery: boolean | undefined = undefined;

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        if (!m) continue;
        const meta = m.metadata as Record<string, unknown> | null | undefined;
        if (meta) {
          if (meta["exactAverageKwh"]) consumptionKwh = Number(meta["exactAverageKwh"]);
          if (meta["consumptionKwh"]) consumptionKwh = Number(meta["consumptionKwh"]);
          if (meta["billValue"]) billValue = Number(meta["billValue"]);
          if (meta["targetKWp"]) targetKWp = Number(meta["targetKWp"]);
          if (meta["targetModules"]) targetModules = Number(meta["targetModules"]);
          if (meta["cidade"]) cidade = String(meta["cidade"]);
          if (meta["uf"]) estado = String(meta["uf"]);
          if (meta["distribuidora"]) distribuidora = String(meta["distribuidora"]);
          if (meta["codigo_instalacao_ou_uc"]) ucNumber = String(meta["codigo_instalacao_ou_uc"]);
          if (meta["ucNumber"]) ucNumber = String(meta["ucNumber"]);
          if (meta["gridVoltage"]) gridVoltage = String(meta["gridVoltage"]);
          if (meta["roofType"]) roofType = String(meta["roofType"]);
          if (meta["customRatePerKwp"]) customRatePerKwp = Number(meta["customRatePerKwp"]);
          if (meta["inverterType"]) inverterType = meta["inverterType"] as any;
          if (meta["inverterDescription"])
            inverterDescription = String(meta["inverterDescription"]);
          if (meta["batteryKwh"] !== undefined) batteryKwh = Number(meta["batteryKwh"]);
          if (meta["batteryQty"] !== undefined) batteryQty = Number(meta["batteryQty"]);
          if (meta["batteryVoltageType"]) batteryVoltageType = meta["batteryVoltageType"] as any;
          if (meta["hasBms"] !== undefined) hasBms = Boolean(meta["hasBms"]);
          if (meta["hasBattery"] !== undefined) hasBattery = Boolean(meta["hasBattery"]);
        }

        const content = typeof m.content === "string" ? m.content : "";
        const lowerC = content.toLowerCase().trim();

        // 7. Nome e WhatsApp do Cliente (pode ser detectado pelas confirmações do assistente)
        if (m.role === "assistant") {
          // Se o assistente exibiu o menu principal ou concluiu/reiniciou um fluxo, reseta todos os dados da cotação anterior
          if (
            content.includes("Como posso ajudar você a gerar orçamentos hoje") ||
            content.includes("Sou seu assistente de vendas") ||
            content.includes("escolha como deseja iniciar") ||
            content.includes("Não compreendi sua mensagem") ||
            content.includes("encerramos este atendimento") ||
            content.includes("Quando quiser iniciar uma nova cotação") ||
            content.includes("Sua proposta comercial de energia solar está pronta") ||
            content.includes("Link da proposta comercial") ||
            content.includes("Proposta Comercial gerada com sucesso") ||
            content.includes("Sessão reiniciada com sucesso") ||
            (content.includes("Simular por consumo mensal") &&
              content.includes("Simular por potência de pico"))
          ) {
            consumptionKwh = undefined;
            targetKWp = undefined;
            targetModules = undefined;
            modPowerWUser = undefined;
            cidade = undefined;
            estado = undefined;
            hsp = undefined;
            pendingCityCandidates = undefined;
            pendingCityName = undefined;
            gridVoltage = undefined;
            roofType = undefined;
            customRatePerKwp = undefined;
            clientName = undefined;
            clientWhatsapp = undefined;
            chosenQuoteIndex = 0;
            billValue = undefined;
            inverterType = undefined;
            inverterDescription = undefined;
            batteryKwh = undefined;
            batteryQty = undefined;
            batteryVoltageType = undefined;
            hasBms = undefined;
            hasBattery = undefined;
          } else if (
            content.includes("Simulação por Quantidade de Módulos") ||
            content.includes("placas solares você deseja no kit")
          ) {
            consumptionKwh = undefined;
            targetKWp = undefined;
          } else if (
            content.includes("Simulação por Potência de Pico") ||
            content.includes("Qual a *potência de pico* desejada")
          ) {
            consumptionKwh = undefined;
            targetModules = undefined;
            modPowerWUser = undefined;
          } else if (
            content.includes("Simulação por Consumo Mensal") ||
            content.includes("consumo médio mensal")
          ) {
            targetKWp = undefined;
            targetModules = undefined;
            modPowerWUser = undefined;
          }

          const kitSelM = content.match(/Kit (Standard|Elite|Premium) selecionado/i);
          if (kitSelM && kitSelM[1]) {
            const kn = kitSelM[1].toLowerCase();
            chosenQuoteIndex = kn === "standard" ? 0 : kn === "elite" ? 1 : 2;
          }

          const precoM = content.match(/Preço aplicado:[_*\s]*`?R\$\s*([\d.,]+)\/kWp/i);
          if (precoM && precoM[1]) {
            const parsedPreco = parseKwpRate(precoM[1]);
            if (parsedPreco) customRatePerKwp = parsedPreco.rate;
          }
          const consM = content.match(
            /(?:Consumo Registrado|Consumo m[ée]dio(?: de)?):?[_*\s]*`?(\d+[\d.,]*)`?\s*kWh/i
          );
          if (consM && consM[1]) {
            const cVal = Math.round(parsePtBrNumber(consM[1]));
            if (cVal >= 20 && cVal <= 500000) {
              consumptionKwh = cVal;
              targetKWp = undefined;
              targetModules = undefined;
              modPowerWUser = undefined;
            }
          }

          const potM = content.match(
            /(?:Potência Solicitada|Potência Registrada):?[_*\s]*`?([\d.,]+)`?\s*kWp/i
          );
          if (potM && potM[1]) {
            targetKWp = parsePtBrNumber(potM[1]);
            consumptionKwh = undefined;
            targetModules = undefined;
            modPowerWUser = undefined;
          }

          const qtyM = content.match(
            /(?:Quantidade Solicitada|Módulos Registrados):?[_*\s]*`?(\d+)`?\s*(?:placas|m[oó]dulos)/i
          );
          if (qtyM && qtyM[1]) {
            targetModules = parseInt(qtyM[1], 10);
            const pM = content.match(/`?(\d{3,4})`?\s*w/i);
            if (pM && pM[1]) {
              modPowerWUser = parseInt(pM[1], 10);
            }
            consumptionKwh = undefined;
            targetKWp = undefined;
          }

          const gridM = content.match(/Padrão Elétrico Registrado:?[_*\s]*`?([^`*]+?)`?\s*⚡/i);
          if (gridM && gridM[1]) {
            gridVoltage = gridM[1].trim();
          }

          const rateMatch =
            content.match(
              /Taxa (?:personalizada|aplicada|padrão aplicada|definida):\s*\*?R\$\s*([\d.,]+)\/kWp\*?/i
            ) || content.match(/\(Taxa:\s*R\$\s*([\d.,]+)\/kWp\)/i);
          if (rateMatch && rateMatch[1]) {
            const parsed = parseKwpRate(rateMatch[1]);
            if (parsed) customRatePerKwp = parsed.rate;
          }

          const roofM =
            content.match(
              /Estrutura(?: registrada)?:?[_*\s]*`?\*?([^*`🏠\n]+?)\*?`?(?:\s*🏠|\.|\n|$)/i
            ) ||
            content.match(/Estrutura Selecionada:?[_*\s]*`?\*?([^*`🏠\n]+?)\*?`?/i) ||
            content.match(/>\s*🏠\s*Estrutura:\s*\*([^*]+)\*/i) ||
            content.match(/>\s*Estrutura:\s*\*([^*]+)\*/i);
          if (roofM && roofM[1]) {
            const rawRoof = roofM[1].replace(/[*_`]/g, "").trim();
            const validRoofList = [
              "Cerâmica (Colonial)",
              "Fibrocimento",
              "Metálico",
              "Solo",
              "Laje",
              "Fibrometal",
              "Sem estrutura",
            ];
            const matchedValid = validRoofList.find(
              (vr) =>
                rawRoof.toLowerCase() === vr.toLowerCase() ||
                rawRoof.toLowerCase().includes(vr.toLowerCase()) ||
                vr.toLowerCase().includes(rawRoof.toLowerCase())
            );
            if (
              matchedValid &&
              rawRoof.length >= 4 &&
              !rawRoof.includes("voltar") &&
              !rawRoof.includes("alterar")
            ) {
              roofType = matchedValid;
            }
          }

          const bothM = content.match(/Cliente \*([^*]+)\* e WhatsApp \*([^*]+)\*/i);
          if (bothM?.[1]) {
            clientName = bothM[1].replace(/\*/g, "").trim();
            if (bothM[2]) clientWhatsapp = bothM[2].replace(/\D/g, "");
          } else {
            const nameM1 = content.match(/registrar o cliente \*?([^*.]+)\*?\./i);
            const nameM2 = content.match(/Cliente \*([^*]+)\* anotado/i);
            if (nameM1?.[1]) clientName = nameM1[1].replace(/\*/g, "").trim();
            else if (nameM2?.[1]) clientName = nameM2[1].replace(/\*/g, "").trim();
          }

          const locM =
            content.match(
              /(?:Localização Identificada|Localização Corrigida|Localização Mantida|Cidade):?[_*\s!]*`?\*?([^*\/`\n]+)\/([A-Za-z]{2})\*?`?/i
            ) ||
            content.match(
              /(?:em|para)\s+`?\*?([^*\/`\n]{3,40})\/([A-Za-z]{2})\*?`?\s*(?:\.|\(|☀️|📍|\n|$|\s)/i
            );
          if (locM && locM[1] && locM[2]) {
            cidade = locM[1].replace(/[*_`]/g, "").trim();
            estado = locM[2].replace(/[*_`]/g, "").trim().toUpperCase();
          }

          continue; // Não analisa mensagens do bot para evitar capturar exemplos de texto
        }

        if (
          lowerC === "novo" ||
          lowerC === "reiniciar" ||
          lowerC === "nova cotação" ||
          lowerC === "nova cotacao" ||
          lowerC === "nova proposta" ||
          lowerC === "menu" ||
          lowerC === "início" ||
          lowerC === "inicio"
        ) {
          consumptionKwh = undefined;
          targetKWp = undefined;
          targetModules = undefined;
          modPowerWUser = undefined;
          cidade = undefined;
          estado = undefined;
          hsp = undefined;
          pendingCityCandidates = undefined;
          pendingCityName = undefined;
          gridVoltage = undefined;
          roofType = undefined;
          customRatePerKwp = undefined;
          clientName = undefined;
          clientWhatsapp = undefined;
          chosenQuoteIndex = 0;
          billValue = undefined;
          inverterType = undefined;
          inverterDescription = undefined;
          batteryKwh = undefined;
          batteryQty = undefined;
          batteryVoltageType = undefined;
          hasBms = undefined;
          hasBattery = undefined;
          continue;
        }

        const quoteEnt = parseIntegratorQuoteEntities(content);
        if (quoteEnt.roofType && !roofType) roofType = quoteEnt.roofType;
        if (quoteEnt.gridVoltage && !gridVoltage) gridVoltage = quoteEnt.gridVoltage;
        if (quoteEnt.cidade && !cidade) {
          cidade = quoteEnt.cidade;
          if (quoteEnt.estado) estado = quoteEnt.estado;
        }

        const prevAssistantForLead = i > 0 ? messages[i - 1]?.content || "" : "";
        const isMainMenuMsg =
          prevAssistantForLead.includes("Como posso ajudar você a gerar orçamentos hoje") ||
          prevAssistantForLead.includes("Sou seu assistente de vendas") ||
          prevAssistantForLead.includes("escolha como deseja iniciar") ||
          prevAssistantForLead.includes("Não compreendi sua mensagem") ||
          prevAssistantForLead.includes("encerramos este atendimento") ||
          prevAssistantForLead.includes("Quando quiser iniciar uma nova cotação") ||
          prevAssistantForLead.includes("1️⃣ *Enviar fatura") ||
          (prevAssistantForLead.includes("Simular por consumo mensal") &&
            prevAssistantForLead.includes("Simular por potência de pico"));

        if (
          prevAssistantForLead.includes("taxa padrão configurada") ||
          prevAssistantForLead.includes("Qual valor por kWp") ||
          prevAssistantForLead.includes("Como deseja prosseguir para esta cotação")
        ) {
          const parsed = parseKwpRate(content);
          if (parsed) {
            customRatePerKwp = parsed.rate;
          }
        }

        if (
          prevAssistantForLead.includes("cliente final") ||
          prevAssistantForLead.includes("E qual o WhatsApp dele") ||
          prevAssistantForLead.includes("WhatsApp correto")
        ) {
          const { name: parsedName, phone: parsedPhone } = extractNameAndPhone(content);
          if (parsedPhone) {
            clientWhatsapp = parsedPhone;
          }
          if (
            parsedName &&
            isValidClientName(parsedName) &&
            !prevAssistantForLead.includes("E qual o WhatsApp dele")
          ) {
            clientName = parsedName;
          }
        }

        // 1. Extração de Potência (kWp / MWp / GWp)
        const parsedP = this.parsePowerInput(content);
        if (parsedP !== null && parsedP >= 0.5) {
          targetKWp = parsedP;
          targetModules = undefined;
          modPowerWUser = undefined;
          consumptionKwh = undefined;
        } else if (
          !isMainMenuMsg &&
          (prevAssistantForLead.includes("Simulação por Potência de Pico") ||
            prevAssistantForLead.includes("potência de pico desejada") ||
            prevAssistantForLead.includes("potência desejada em kWp") ||
            prevAssistantForLead.includes("potência (kWp)"))
        ) {
          const numM = content.match(/(\d+(?:[.,]\d+)?)/);
          if (numM && numM[1] && parseConsumptionInput(content) === null) {
            const pVal = parsePtBrNumber(numM[1]);
            if (pVal >= 0.5 && pVal <= 5_000_000) {
              targetKWp = pVal;
              targetModules = undefined;
              modPowerWUser = undefined;
              consumptionKwh = undefined;
            }
          }
        }

        // 2. Extração de Módulos
        const modM = content.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)/i);
        if (modM && modM[1]) {
          targetModules = parseInt(modM[1], 10);
          const pM = content.match(/(\d{3,4})\s*w/i);
          if (pM && pM[1]) {
            modPowerWUser = parseInt(pM[1], 10);
          }
          targetKWp = undefined;
          consumptionKwh = undefined;
        } else if (
          !isMainMenuMsg &&
          (prevAssistantForLead.includes("Simulação por Quantidade de Módulos") ||
            prevAssistantForLead.includes("placas solares você deseja no kit") ||
            prevAssistantForLead.includes("quantidade de placas"))
        ) {
          const numM = content.match(/(\d+)/);
          if (numM && numM[1]) {
            const mVal = parseInt(numM[1], 10);
            if (mVal >= 1 && mVal <= 10000) {
              targetModules = mVal;
              const pM = content.match(/(\d{3,4})\s*w/i);
              if (pM && pM[1]) {
                modPowerWUser = parseInt(pM[1], 10);
              }
              targetKWp = undefined;
              consumptionKwh = undefined;
            }
          }
        }

        // 3. Extração de Consumo kWh
        const parsedConsFromContent = parseConsumptionInput(content);
        if (parsedConsFromContent !== null) {
          consumptionKwh = parsedConsFromContent;
          if (parsedP === null) {
            targetKWp = undefined;
          }
          targetModules = undefined;
          modPowerWUser = undefined;
        } else if (
          !isMainMenuMsg &&
          (prevAssistantForLead.includes("Simulação por Consumo Mensal") ||
            prevAssistantForLead.includes("consumo médio mensal") ||
            prevAssistantForLead.includes("consumo em kWh") ||
            prevAssistantForLead.includes("consumo (kWh)"))
        ) {
          const numM = content.match(/(\d+[\d.,]*)/);
          if (numM && numM[1]) {
            const val = Math.round(parsePtBrNumber(numM[1]));
            if (val >= 20 && val <= 500000) {
              consumptionKwh = val;
              targetKWp = undefined;
              targetModules = undefined;
              modPowerWUser = undefined;
            }
          }
        }

        // 4. Extração de Cidade e Estado
        const prevContent = prevAssistantForLead;
        if (
          prevContent.includes("Para qual cidade e estado será a instalação") ||
          prevContent.includes("Para qual cidade de") ||
          prevContent.includes("Estado Identificado:") ||
          prevContent.includes("Vamos alterar a localização") ||
          prevContent.includes("Vamos corrigir a localização") ||
          prevContent.includes("Não identifiquei o município") ||
          prevContent.includes("Não identifiquei a cidade") ||
          prevContent.includes("informe a cidade e a sigla do estado") ||
          prevContent.includes("informe a cidade e estado")
        ) {
          const hspRes = getHsp(content);
          if (isLocationInput(content) || hspRes.exact) {
            if (hspRes.isStateOnly) {
              estado = hspRes.uf;
              cidade = undefined;
            } else if (hspRes.city) {
              cidade = hspRes.city;
              estado = hspRes.uf;
            }
          }
        }

        const cityM = content.match(
          /(?:entrega\s+em|para|em|na cidade de|no munic[íi]pio de|cidade(?:\s*de)?)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );
        if (cityM && cityM[1]) {
          const candidate = (
            cityM[1] + (cityM[2] ? `/${cityM[2]}` : cityM[3] ? `/${cityM[3]}` : "")
          ).trim();
          const candLower = candidate.toLowerCase();
          if (
            !candLower.includes("monof") &&
            !candLower.includes("bifas") &&
            !candLower.includes("trifas") &&
            !candLower.includes("ceram") &&
            !candLower.includes("fibro") &&
            !candLower.includes("metal")
          ) {
            const hspRes = getHsp(candidate);
            if (hspRes && (isLocationInput(candidate) || hspRes.exact)) {
              if (hspRes.isStateOnly) {
                estado = hspRes.uf;
                cidade = undefined;
              } else if (hspRes.city) {
                cidade = hspRes.city;
                estado = hspRes.uf;
              }
            }
          }
        }

        if (
          lowerC.startsWith("mudar cidade") ||
          lowerC.startsWith("trocar cidade") ||
          lowerC.startsWith("alterar cidade") ||
          (isLocationInput(content) && !prevContent.includes("cliente final"))
        ) {
          const hspRes = getHsp(content);
          if (hspRes && (isLocationInput(content) || hspRes.exact)) {
            if (hspRes.isStateOnly) {
              estado = hspRes.uf;
              cidade = undefined;
            } else if (hspRes.city) {
              cidade = hspRes.city;
              estado = hspRes.uf;
            }
          }
        }

        // 5. Extração de Padrão Elétrico
        if (
          lowerC === "1" ||
          lowerC.includes("1️⃣") ||
          lowerC.includes("monofásico") ||
          lowerC.includes("monofasico") ||
          lowerC.includes("mono 220") ||
          lowerC.includes("mono")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Monofásico 220V";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("2️⃣") ||
          lowerC.includes("bifásico") ||
          lowerC.includes("bifasico") ||
          lowerC.includes("127/220") ||
          lowerC.includes("bi 220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Bifásico 127V/220V";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("3️⃣") ||
          lowerC.includes("trifasico 220") ||
          lowerC.includes("trifásico 220") ||
          lowerC.includes("tri 220") ||
          lowerC.includes("tri_220")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Trifásico 220V";
          }
        } else if (
          lowerC === "4" ||
          lowerC.includes("4️⃣") ||
          lowerC.includes("trifasico 380") ||
          lowerC.includes("trifásico 380") ||
          lowerC.includes("tri 380") ||
          lowerC.includes("tri_380") ||
          lowerC.includes("380v")
        ) {
          if (messages[i - 1]?.content?.includes("Qual o padrão de entrada da instalação")) {
            gridVoltage = "Trifásico 380V";
          }
        }

        // 6. Extração de Tipo de Telhado
        const isRoofQuestion =
          messages[i - 1]?.content?.includes("Qual a estrutura do telhado") ||
          messages[i - 1]?.content?.includes("estrutura do telhado");

        if (
          lowerC === "1" ||
          lowerC.includes("1️⃣") ||
          lowerC.includes("cerâmica") ||
          lowerC.includes("ceramica") ||
          lowerC.includes("colonial")
        ) {
          if (isRoofQuestion) {
            roofType = "Cerâmica (Colonial)";
          }
        } else if (
          lowerC === "2" ||
          lowerC.includes("2️⃣") ||
          lowerC.includes("fibrocimento") ||
          lowerC.includes("fibromadeira")
        ) {
          if (isRoofQuestion) {
            roofType = "Fibrocimento";
          }
        } else if (
          lowerC === "3" ||
          lowerC.includes("3️⃣") ||
          lowerC.includes("metálico") ||
          lowerC.includes("metalico")
        ) {
          if (isRoofQuestion) {
            roofType = "Metálico";
          }
        } else if (lowerC === "4" || lowerC.includes("4️⃣") || lowerC.includes("solo")) {
          if (isRoofQuestion) {
            roofType = "Solo";
          }
        } else if (lowerC === "5" || lowerC.includes("5️⃣") || lowerC.includes("laje")) {
          if (isRoofQuestion) {
            roofType = "Laje";
          }
        } else if (lowerC === "6" || lowerC.includes("6️⃣") || lowerC.includes("fibrometal")) {
          if (isRoofQuestion) {
            roofType = "Fibrometal";
          }
        } else if (
          lowerC === "7" ||
          lowerC.includes("7️⃣") ||
          lowerC.includes("sem estrutura") ||
          lowerC.includes("nenhuma")
        ) {
          if (isRoofQuestion) {
            roofType = "Sem estrutura";
          }
        }
      }

      return {
        consumptionKwh,
        targetKWp,
        targetModules,
        modPowerWUser,
        cidade,
        estado,
        distribuidora,
        ucNumber,
        hsp,
        pendingCityCandidates,
        pendingCityName,
        gridVoltage,
        roofType,
        customRatePerKwp,
        clientName,
        clientWhatsapp,
        chosenQuoteIndex,
        billValue,
        inverterType,
        inverterDescription,
        batteryKwh,
        batteryQty,
        batteryVoltageType,
        hasBms,
        hasBattery,
      };
    };

    const sessionCtx = extractContextFromSession();
    const storedSessionData: WhatsappSessionData = convMeta["sessionData"] || {};
    let currentStep: WhatsappBotStep = convMeta["step"] || "IDLE";

    // Hidrata sessionCtx a partir do sessionData estruturado persistido ou da raiz de convMeta (compatibilidade)
    const isAtMenuOrCompleted =
      currentStep === "IDLE" ||
      currentStep === "PROPOSAL_COMPLETED" ||
      lastBotMsg.includes("Como posso ajudar você a gerar orçamentos hoje") ||
      lastBotMsg.includes("Sou seu assistente de vendas e dimensionamento") ||
      lastBotMsg.includes("Sessão reiniciada com sucesso") ||
      lastBotMsg.includes("Sua proposta comercial de energia solar está pronta") ||
      lastBotMsg.includes("Link da proposta comercial") ||
      lastBotMsg.includes("Proposta Comercial gerada com sucesso");

    const isNewBillSubmission =
      Boolean(extractionResult) ||
      incomingText.startsWith("[Documento enviado") ||
      incomingText.startsWith("[Foto enviada") ||
      lower.includes("[documento enviado") ||
      lower.includes("[foto enviada");

    const hasDirectKwhInput =
      parseConsumptionInput(incomingText) !== null ||
      /(?:consumo|simular)?\s*(\d+[\d.,]*)\s*kwh/i.test(incomingText);
    const quoteEntities = parseIntegratorQuoteEntities(incomingText);
    const isNewQuoteRequest =
      isNewBillSubmission ||
      (isAtMenuOrCompleted && (hasDirectKwhInput || quoteEntities.isQuoteRequest));

    if (sessionCtx.billValue === undefined && !isNewBillSubmission) {
      const directBillInput = parseBillValueInput(incomingText);
      if (directBillInput !== null && directBillInput >= 25 && directBillInput <= 1_000_000) {
        sessionCtx.billValue = directBillInput;
      }
    }

    const rawCidade = storedSessionData.cidade || convMeta["cidade"];
    const rawUf = storedSessionData.uf || convMeta["uf"];
    const rawConsumption = storedSessionData.consumptionKwh ?? convMeta["consumptionKwh"];
    const rawKwp = storedSessionData.kwp ?? convMeta["kwp"];
    const rawModuleCount = storedSessionData.moduleCount ?? convMeta["moduleCount"];
    const rawGridType = storedSessionData.gridType || convMeta["gridType"];
    const rawRoofType = storedSessionData.roofType || convMeta["roofType"];
    const rawKwpRate = storedSessionData.kwpRate ?? convMeta["kwpRate"];
    const rawClientName = storedSessionData.clientName || convMeta["clientName"];
    const rawClientPhone = storedSessionData.clientPhone || convMeta["clientPhone"];
    const rawInverterType = storedSessionData.inverterType || (convMeta["inverterType"] as any);
    const rawInverterDescription =
      storedSessionData.inverterDescription || (convMeta["inverterDescription"] as any);
    const rawBatteryKwh = storedSessionData.batteryKwh ?? (convMeta["batteryKwh"] as any);
    const rawBatteryQty = storedSessionData.batteryQty ?? (convMeta["batteryQty"] as any);
    const rawBatteryVoltageType =
      storedSessionData.batteryVoltageType || (convMeta["batteryVoltageType"] as any);
    const rawHasBms = storedSessionData.hasBms ?? (convMeta["hasBms"] as any);
    const rawHasBattery = storedSessionData.hasBattery ?? (convMeta["hasBattery"] as any);
    const rawBillValue = storedSessionData.billValue ?? (convMeta["billValue"] as any);
    const rawDistribuidora = storedSessionData.distribuidora || convMeta["distribuidora"];
    const rawUcNumber = storedSessionData.ucNumber || convMeta["ucNumber"];

    // CRUCIAL: Se a conversa estiver ociosa (menu inicial), com proposta concluída, ou se enviou uma nova fatura,
    // NUNCA hidrata dados de localização (cidade/UF), padrão de rede, telhado ou potência de cotações antigas!
    if (!isAtMenuOrCompleted && !isNewBillSubmission) {
      if (rawCidade && !sessionCtx.cidade) sessionCtx.cidade = rawCidade;
      if (rawUf && !sessionCtx.estado) sessionCtx.estado = rawUf;
      if (rawDistribuidora && !sessionCtx.distribuidora)
        sessionCtx.distribuidora = rawDistribuidora;
      if (rawUcNumber && !sessionCtx.ucNumber) sessionCtx.ucNumber = rawUcNumber;
      if (rawBillValue !== undefined && sessionCtx.billValue === undefined)
        sessionCtx.billValue = rawBillValue;
      if (
        rawConsumption !== undefined &&
        !sessionCtx.consumptionKwh &&
        !sessionCtx.targetKWp &&
        !sessionCtx.targetModules
      )
        sessionCtx.consumptionKwh = rawConsumption;
      if (
        rawKwp !== undefined &&
        !sessionCtx.targetKWp &&
        !sessionCtx.consumptionKwh &&
        !sessionCtx.targetModules
      )
        sessionCtx.targetKWp = rawKwp;
      if (
        rawModuleCount !== undefined &&
        !sessionCtx.targetModules &&
        !sessionCtx.consumptionKwh &&
        !sessionCtx.targetKWp
      )
        sessionCtx.targetModules = rawModuleCount;
      if (rawGridType && !sessionCtx.gridVoltage) sessionCtx.gridVoltage = rawGridType;
      if (rawRoofType && !sessionCtx.roofType) sessionCtx.roofType = rawRoofType;
      if (rawKwpRate !== undefined && !sessionCtx.customRatePerKwp)
        sessionCtx.customRatePerKwp = rawKwpRate;
      if (rawClientName && (!sessionCtx.clientName || sessionCtx.clientName === "Cliente"))
        sessionCtx.clientName = rawClientName;
      if (
        rawClientPhone &&
        (!sessionCtx.clientWhatsapp || sessionCtx.clientWhatsapp === "WhatsApp")
      )
        sessionCtx.clientWhatsapp = rawClientPhone;
      if (rawInverterType && !sessionCtx.inverterType) sessionCtx.inverterType = rawInverterType;
      if (rawInverterDescription && !sessionCtx.inverterDescription)
        sessionCtx.inverterDescription = rawInverterDescription;
      if (rawBatteryKwh !== undefined && sessionCtx.batteryKwh === undefined)
        sessionCtx.batteryKwh = rawBatteryKwh;
      if (rawBatteryQty !== undefined && sessionCtx.batteryQty === undefined)
        sessionCtx.batteryQty = rawBatteryQty;
      if (rawBatteryVoltageType && !sessionCtx.batteryVoltageType)
        sessionCtx.batteryVoltageType = rawBatteryVoltageType;
      if (rawHasBms !== undefined && sessionCtx.hasBms === undefined) sessionCtx.hasBms = rawHasBms;
      if (rawHasBattery !== undefined && sessionCtx.hasBattery === undefined)
        sessionCtx.hasBattery = rawHasBattery;
    }
    if (typeof storedSessionData.selectedQuoteIndex === "number") {
      sessionCtx.chosenQuoteIndex = storedSessionData.selectedQuoteIndex;
    }
    if (storedSessionData.pendingCityCandidates && !sessionCtx.pendingCityCandidates) {
      sessionCtx.pendingCityCandidates = storedSessionData.pendingCityCandidates;
    }
    if (storedSessionData.pendingCityName && !sessionCtx.pendingCityName) {
      sessionCtx.pendingCityName = storedSessionData.pendingCityName;
    }

    // Defesa em profundidade: Se a cidade armazenada for na verdade um Estado (ex: "Alagoas", "Bahia", "Minas Gerais")
    // autocorrige para que a cidade não fique com o nome do estado e o estado não seja distorcido:
    if (sessionCtx.cidade) {
      const normStoredCity = normalizeTextSimple(sessionCtx.cidade);
      if (
        STATE_NAME_TO_UF[normStoredCity] &&
        normStoredCity !== "SAO PAULO" &&
        normStoredCity !== "RIO DE JANEIRO"
      ) {
        const correctUf = STATE_NAME_TO_UF[normStoredCity];
        sessionCtx.estado = correctUf;
        delete sessionCtx.cidade;
        delete storedSessionData.cidade;
        storedSessionData.uf = correctUf;
      }
    }

    // Auto-recuperação de candidatos a partir da última mensagem do bot se histórico perdeu metadata
    if (!sessionCtx.pendingCityCandidates && lastBotMsg.includes("chamado")) {
      const cityMatchFromBot = lastBotMsg.match(/chamado\s+\*?([^*\n.📍]+)\*?/i);
      if (cityMatchFromBot && cityMatchFromBot[1]) {
        const cityNameExtracted = cityMatchFromBot[1].trim();
        sessionCtx.pendingCityName = cityNameExtracted;
        const lookup = getHsp(cityNameExtracted);
        if (lookup.candidates && lookup.candidates.length > 1) {
          sessionCtx.pendingCityCandidates = lookup.candidates;
        }
      }
    }

    if (
      extractionResult &&
      extractionResult.data &&
      extractionResult.isValidForSizing &&
      extractionResult.exactAverageKwh >= 20
    ) {
      if (extractionResult.data.cidade && !sessionCtx.cidade) {
        sessionCtx.cidade = extractionResult.data.cidade;
      }
      if (extractionResult.data.uf && !sessionCtx.estado) {
        sessionCtx.estado = extractionResult.data.uf.trim().toUpperCase();
      }
      if (extractionResult.exactAverageKwh && !sessionCtx.consumptionKwh) {
        sessionCtx.consumptionKwh = extractionResult.exactAverageKwh;
      }
      if (extractionResult.data.valor_total_fatura_reais && sessionCtx.billValue === undefined) {
        sessionCtx.billValue = extractionResult.data.valor_total_fatura_reais;
      }
      if (extractionResult.data.distribuidora && !sessionCtx.distribuidora) {
        sessionCtx.distribuidora = extractionResult.data.distribuidora;
      }
      if (extractionResult.data.codigo_instalacao_ou_uc && !sessionCtx.ucNumber) {
        sessionCtx.ucNumber = extractionResult.data.codigo_instalacao_ou_uc;
      }
    }

    // Helper determinístico para atualizar estado e dados acumulados
    const setStep = async (nextStep: WhatsappBotStep, patchData?: Partial<WhatsappSessionData>) => {
      currentStep = nextStep;
      const updatedSessionData: WhatsappSessionData = {
        ...storedSessionData,
        cidade: sessionCtx.cidade,
        uf: sessionCtx.estado,
        distribuidora: sessionCtx.distribuidora,
        ucNumber: sessionCtx.ucNumber,
        consumptionKwh: sessionCtx.consumptionKwh,
        billValue: sessionCtx.billValue,
        kwp: sessionCtx.targetKWp,
        moduleCount: sessionCtx.targetModules,
        gridType: sessionCtx.gridVoltage,
        roofType: sessionCtx.roofType,
        inverterType: sessionCtx.inverterType,
        batteryKwh: sessionCtx.batteryKwh,
        batteryQty: sessionCtx.batteryQty,
        batteryVoltageType: sessionCtx.batteryVoltageType,
        hasBms: sessionCtx.hasBms,
        hasBattery: sessionCtx.hasBattery,
        kwpRate: sessionCtx.customRatePerKwp,
        clientName: sessionCtx.clientName,
        clientPhone: sessionCtx.clientWhatsapp,
        selectedQuoteIndex: sessionCtx.chosenQuoteIndex,
        pendingCityCandidates: sessionCtx.pendingCityCandidates,
        pendingCityName: sessionCtx.pendingCityName,
        ...(patchData || {}),
      };

      if (patchData) {
        if (patchData.cidade !== undefined) sessionCtx.cidade = patchData.cidade;
        if (patchData.uf !== undefined) sessionCtx.estado = patchData.uf;
        if (patchData.distribuidora !== undefined)
          sessionCtx.distribuidora = patchData.distribuidora;
        if (patchData.ucNumber !== undefined) sessionCtx.ucNumber = patchData.ucNumber;
        if (patchData.consumptionKwh !== undefined)
          sessionCtx.consumptionKwh = patchData.consumptionKwh;
        if (patchData.billValue !== undefined) sessionCtx.billValue = patchData.billValue;
        if (patchData.kwp !== undefined) sessionCtx.targetKWp = patchData.kwp;
        if (patchData.moduleCount !== undefined) sessionCtx.targetModules = patchData.moduleCount;
        if (patchData.gridType !== undefined) sessionCtx.gridVoltage = patchData.gridType;
        if (patchData.roofType !== undefined) sessionCtx.roofType = patchData.roofType;
        if (patchData.inverterType !== undefined) sessionCtx.inverterType = patchData.inverterType;
        if (patchData.batteryKwh !== undefined) sessionCtx.batteryKwh = patchData.batteryKwh;
        if (patchData.batteryQty !== undefined) sessionCtx.batteryQty = patchData.batteryQty;
        if (patchData.batteryVoltageType !== undefined)
          sessionCtx.batteryVoltageType = patchData.batteryVoltageType;
        if (patchData.hasBms !== undefined) sessionCtx.hasBms = patchData.hasBms;
        if (patchData.hasBattery !== undefined) sessionCtx.hasBattery = patchData.hasBattery;
      }

      if (nextStep === "IDLE") {
        delete updatedSessionData.cidade;
        delete updatedSessionData.uf;
        delete updatedSessionData.consumptionKwh;
        delete updatedSessionData.billValue;
        delete updatedSessionData.kwp;
        delete updatedSessionData.moduleCount;
        delete updatedSessionData.gridType;
        delete updatedSessionData.roofType;
        delete updatedSessionData.inverterType;
        delete updatedSessionData.inverterDescription;
        delete updatedSessionData.batteryKwh;
        delete updatedSessionData.batteryQty;
        delete updatedSessionData.batteryVoltageType;
        delete updatedSessionData.hasBms;
        delete updatedSessionData.hasBattery;
        delete updatedSessionData.kwpRate;
        delete updatedSessionData.clientName;
        delete updatedSessionData.clientPhone;
        delete updatedSessionData.selectedQuoteIndex;
        delete updatedSessionData.pendingCityCandidates;
        delete updatedSessionData.pendingCityName;
        delete updatedSessionData.quotesList;

        sessionCtx.cidade = undefined;
        sessionCtx.estado = undefined;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.billValue = undefined;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        sessionCtx.gridVoltage = undefined;
        sessionCtx.roofType = undefined;
        sessionCtx.inverterType = undefined;
        sessionCtx.inverterDescription = undefined;
        sessionCtx.batteryKwh = undefined;
        sessionCtx.batteryQty = undefined;
        sessionCtx.batteryVoltageType = undefined;
        sessionCtx.hasBms = undefined;
        sessionCtx.hasBattery = undefined;
        sessionCtx.customRatePerKwp = undefined;
        sessionCtx.clientName = undefined;
        sessionCtx.clientWhatsapp = undefined;
        sessionCtx.chosenQuoteIndex = 0;
        sessionCtx.pendingCityCandidates = undefined;
        sessionCtx.pendingCityName = undefined;
      }

      conversation.metadata = {
        ...((conversation.metadata as Record<string, any>) || {}),
        step: nextStep,
        sessionData: updatedSessionData,
      };

      if (
        conversation.id &&
        conversation.id !== "web-chat-session" &&
        this.prisma?.conversation?.update
      ) {
        try {
          const currentConvMeta = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: {
                ...currentConvMeta,
                step: nextStep,
                sessionData: updatedSessionData,
              },
            },
          });
        } catch (err) {
          this.logger?.warn?.(`Erro ao persistir step ${nextStep} no metadata:`, err);
        }
      }
      return updatedSessionData;
    };

    // Helper: recalcula os grupos de kits para a sessão atual
    const kitsFor = (
      overrides: { roofType?: string; customRatePerKwp?: number; inverterType?: string } = {}
    ) =>
      this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: overrides.roofType || sessionCtx.roofType || "Cerâmica (Colonial)",
        gridVoltage: sessionCtx.gridVoltage || "Monofásico 220V",
        inverterType: overrides.inverterType || sessionCtx.inverterType,
        organizationId: conversation.organizationId,
        customRatePerKwp: overrides.customRatePerKwp,
      });
    const NO_KITS_TEXT =
      `No momento não encontramos kits com todos os componentes e estrutura (${sessionCtx.roofType || "padrão"}) disponíveis em estoque compatível.\n\n` +
      `Você pode selecionar a opção "7️⃣ Sem estrutura" para cotar apenas os equipamentos elétricos ou escolher outro tipo de telhado (ou envie 0️⃣ para voltar).`;

    // 0.1 Se o usuário solicitou PDF a qualquer momento (inclusive durante ou após proposta)
    if (!extractionResult && isWhatsappPdfRequest(incomingText)) {
      let targetProposalId = storedSessionData["lastProposalId"] || convMeta["lastProposalId"];

      if (!targetProposalId && this.prisma?.proposal) {
        try {
          const latestProposal = await this.prisma.proposal.findFirst({
            where: { tenantId: conversation.organizationId, deletedAt: null },
            orderBy: { createdAt: "desc" },
            select: { id: true, title: true, proposalNumber: true },
          });
          if (latestProposal) {
            targetProposalId = latestProposal.id;
          }
        } catch {
          // Silencioso se não encontrar
        }
      }

      if (targetProposalId) {
        const customerWaId =
          convMeta["customerWaId"] ||
          (typeof conversation.title === "string" && conversation.title.match(/^\d+$/)
            ? conversation.title
            : null);
        const phoneNumberId =
          convMeta["phoneNumberId"] ||
          this.config.get<string>("WHATSAPP_PHONE_NUMBER_ID") ||
          "evolution";

        if (
          customerWaId &&
          conversation.id !== "web-chat-session" &&
          typeof this?.handlePdfOnDemandRequest === "function"
        ) {
          this.handlePdfOnDemandRequest({
            conversation: conversation as any,
            phoneNumberId,
            fromWaId: customerWaId,
          }).catch((err) => {
            this.logger?.error?.(
              "Erro no disparo do PDF sob demanda via generateBotResponse:",
              err
            );
          });

          return `_Gerando o arquivo PDF da sua proposta, aguarde um instante..._ ⏳`;
        }

        const appBaseUrl =
          process.env["APP_BASE_URL"] ||
          process.env["PUBLIC_WEB_APP_BASE_URL"] ||
          this.config.get<string>("APP_BASE_URL") ||
          "https://www.energivia.com.br";
        return (
          `📄 Você pode visualizar e baixar o PDF da sua proposta diretamente pelo link:\n` +
          `👉 ${appBaseUrl}/proposta/${targetProposalId}?pdf=true\n\n` +
          `_Caso queira iniciar uma nova simulação solar, digite *novo*._`
        );
      }

      return (
        `_Não encontrei nenhuma proposta recente nesta conversa para gerar o PDF._ ☀️\n\n` +
        `Você pode gerar uma nova cotação enviando a conta de luz (PDF ou foto) ou digitando o consumo médio em kWh.`
      );
    }

    // 0.2 Se a conversa estiver no estado PROPOSAL_COMPLETED (proposta já gerada com sucesso)
    // MAS SE O USUÁRIO ENVIOU UMA NOVA FATURA OU DADOS DE UMA NOVA COTAÇÃO, NÃO BLOQUEIA!

    // Helper: intercepta correções dinâmicas de dimensionamento (ou reclamações de cotação errada) em qualquer etapa
    const handleDimensioningCorrection = async (): Promise<string | null> => {
      const isReportingError =
        lower.includes("errad") ||
        lower.includes("não é isso") ||
        lower.includes("nao e isso") ||
        lower.includes("tá errado") ||
        lower.includes("ta errado") ||
        lower.includes("cotando errado") ||
        lower.includes("cotação errada") ||
        lower.includes("muito car") ||
        lower.includes("muito alt");

      if (isReportingError) {
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.modPowerWUser = undefined;
        sessionCtx.chosenQuoteIndex = 0;
        await setStep("AWAITING_CITY", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          roofType: sessionCtx.roofType,
          kwp: undefined,
          moduleCount: undefined,
          consumptionKwh: undefined,
        });
        return (
          `Compreendido! Vamos corrigir o dimensionamento da sua cotação. 📝☀️\n\n` +
          `Por favor, informe o consumo mensal (ex: \`450 kWh\`), a potência desejada (ex: \`5 kWp\`) ou a quantidade de placas (ex: \`10 placas\`).\n\n` +
          `_(Ou informe consumo e cidade juntos: ex: \`450 kWh em ${sessionCtx.cidade || "Cotia"}/${sessionCtx.estado || "SP"}\`)_`
        );
      }

      const correctedConsumption = parseConsumptionInput(incomingText);
      const correctedPower = parsePowerInput(incomingText);
      const pureNumMatchCorrection = incomingText.trim().match(/^(\d{2,5})$/);
      const pureValCorrection =
        pureNumMatchCorrection && pureNumMatchCorrection[1]
          ? parseInt(pureNumMatchCorrection[1], 10)
          : null;
      const isPureNumConsumption =
        pureValCorrection !== null &&
        pureValCorrection >= 30 &&
        pureValCorrection <= 50000 &&
        (!sessionCtx.targetKWp || pureValCorrection < 500 || pureValCorrection > 25000);

      const hasCorrection =
        correctedConsumption !== null ||
        correctedPower !== null ||
        quoteEntities.isQuoteRequest ||
        isPureNumConsumption;

      if (!hasCorrection) {
        return null;
      }

      // Aplica a correção no sessionCtx
      if (correctedConsumption !== null && correctedPower === null) {
        sessionCtx.consumptionKwh = correctedConsumption;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
      } else if (isPureNumConsumption && pureValCorrection !== null) {
        sessionCtx.consumptionKwh = pureValCorrection;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
      } else if (correctedPower !== null && correctedPower >= 0.5) {
        sessionCtx.targetKWp = correctedPower;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
      } else if (quoteEntities.targetModules) {
        sessionCtx.targetModules = quoteEntities.targetModules;
        sessionCtx.modPowerWUser = quoteEntities.modPowerWUser;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.targetKWp = undefined;
      } else if (quoteEntities.consumptionKwh) {
        sessionCtx.consumptionKwh = quoteEntities.consumptionKwh;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
      } else if (quoteEntities.targetKWp) {
        sessionCtx.targetKWp = quoteEntities.targetKWp;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
      }

      if (quoteEntities.roofType) sessionCtx.roofType = quoteEntities.roofType;
      if (quoteEntities.gridVoltage) sessionCtx.gridVoltage = quoteEntities.gridVoltage;
      if (quoteEntities.inverterType) sessionCtx.inverterType = quoteEntities.inverterType;
      if (quoteEntities.inverterDescription)
        sessionCtx.inverterDescription = quoteEntities.inverterDescription;
      if (quoteEntities.batteryKwh !== undefined) sessionCtx.batteryKwh = quoteEntities.batteryKwh;
      if (quoteEntities.batteryQty !== undefined) sessionCtx.batteryQty = quoteEntities.batteryQty;
      if (quoteEntities.hasBattery !== undefined) sessionCtx.hasBattery = quoteEntities.hasBattery;
      if (quoteEntities.cidade) {
        sessionCtx.cidade = quoteEntities.cidade;
        if (quoteEntities.estado) sessionCtx.estado = quoteEntities.estado;
      } else if (quoteEntities.estado) {
        sessionCtx.estado = quoteEntities.estado;
      }

      sessionCtx.chosenQuoteIndex = 0;

      let header = "";
      if (sessionCtx.consumptionKwh) {
        header = `*_Consumo Registrado:_* \`${sessionCtx.consumptionKwh} kWh/mês\` ☀️\n`;
      } else if (sessionCtx.targetKWp) {
        header = `*_Potência Solicitada:_* \`${this.formatPowerBadge(sessionCtx.targetKWp)}\` ☀️\n`;
      } else if (sessionCtx.targetModules) {
        header = `*_Quantidade Solicitada:_* \`${sessionCtx.targetModules} placas\` ☀️\n`;
      }

      // 1. Falta a cidade
      if (!sessionCtx.cidade) {
        await setStep("AWAITING_CITY", {
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          uf: sessionCtx.estado,
          inverterType: sessionCtx.inverterType,
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          hasBattery: sessionCtx.hasBattery,
        });
        return (
          header +
          `\nPara qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
        );
      }

      // 2. Se é inversor híbrido e ainda não informou a bateria
      if (
        sessionCtx.inverterType === "hybrid" &&
        sessionCtx.hasBattery === undefined &&
        sessionCtx.batteryKwh === undefined &&
        sessionCtx.batteryQty === undefined
      ) {
        if (!sessionCtx.gridVoltage) {
          await setStep("AWAITING_GRID_TYPE", {
            cidade: sessionCtx.cidade,
            uf: sessionCtx.estado,
            kwp: sessionCtx.targetKWp,
            moduleCount: sessionCtx.targetModules,
            consumptionKwh: sessionCtx.consumptionKwh,
            roofType: sessionCtx.roofType,
            inverterType: sessionCtx.inverterType,
            batteryKwh: sessionCtx.batteryKwh,
            batteryQty: sessionCtx.batteryQty,
            hasBattery: sessionCtx.hasBattery,
          });
          return (
            header +
            `> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\`\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }
        await setStep("AWAITING_BATTERY_STORAGE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          gridType: sessionCtx.gridVoltage,
          roofType: sessionCtx.roofType,
          inverterType: "hybrid",
        });
        return (
          header +
          `> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\`\n` +
          `> ⚡ Padrão Elétrico: *${sessionCtx.gridVoltage}*\n\n` +
          this.BATTERY_STORAGE_OPTIONS_TEXT
        );
      }

      // 3. Se já tem telhado e cidade, calcula os novos kits imediatamente!
      if (sessionCtx.roofType) {
        const newQuotes = await kitsFor({ roofType: sessionCtx.roofType });
        if (newQuotes.length > 0) {
          await setStep("AWAITING_KIT_SELECTION", {
            cidade: sessionCtx.cidade,
            uf: sessionCtx.estado,
            kwp: sessionCtx.targetKWp,
            moduleCount: sessionCtx.targetModules,
            consumptionKwh: sessionCtx.consumptionKwh,
            roofType: sessionCtx.roofType,
            gridType: sessionCtx.gridVoltage,
            inverterType: sessionCtx.inverterType,
            batteryKwh: sessionCtx.batteryKwh,
            batteryQty: sessionCtx.batteryQty,
            hasBattery: sessionCtx.hasBattery,
            selectedQuoteIndex: 0,
          });
          return (
            header +
            `> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\`\n` +
            `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
            this.formatQuotesListText(newQuotes, sessionCtx)
          );
        }
      }

      // 4. Se falta padrão elétrico
      if (!sessionCtx.gridVoltage) {
        await setStep("AWAITING_GRID_TYPE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          roofType: sessionCtx.roofType,
          inverterType: sessionCtx.inverterType,
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          hasBattery: sessionCtx.hasBattery,
        });
        return (
          header +
          `> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\`\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }

      // 5. Se falta telhado
      await setStep("AWAITING_ROOF_TYPE", {
        cidade: sessionCtx.cidade,
        uf: sessionCtx.estado,
        kwp: sessionCtx.targetKWp,
        moduleCount: sessionCtx.targetModules,
        consumptionKwh: sessionCtx.consumptionKwh,
        gridType: sessionCtx.gridVoltage,
        inverterType: sessionCtx.inverterType,
        batteryKwh: sessionCtx.batteryKwh,
        batteryQty: sessionCtx.batteryQty,
        hasBattery: sessionCtx.hasBattery,
      });
      return (
        header +
        `> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\`\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    };

    if (currentStep === "PROPOSAL_COMPLETED" && isNewQuoteRequest) {
      if (isGuestTrial && trialStatus && trialStatus.remaining <= 0) {
        return this.buildGuestTrialExceededMessage();
      }

      await setStep("IDLE", {
        cidade: undefined,
        uf: undefined,
        hsp: undefined,
        consumptionKwh: undefined,
        kwp: undefined,
        moduleCount: undefined,
        gridType: undefined,
        roofType: undefined,
        quotesList: undefined,
        selectedQuoteIndex: undefined,
        selectedTierName: undefined,
        kwpRate: undefined,
        quotedSaleBrl: undefined,
        clientName: undefined,
        clientPhone: undefined,
        selectedTemplateId: undefined,
      });

      sessionCtx.targetKWp = undefined;
      sessionCtx.targetModules = undefined;
      sessionCtx.modPowerWUser = undefined;
      sessionCtx.consumptionKwh = undefined;
      sessionCtx.roofType = undefined;
      sessionCtx.gridVoltage = undefined;
      sessionCtx.cidade = undefined;
      sessionCtx.estado = undefined;
      sessionCtx.clientName = undefined;
      sessionCtx.clientWhatsapp = undefined;
    } else if (currentStep === "PROPOSAL_COMPLETED") {
      const lowerClean = incomingText
        .replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E]/g, "")
        .toLowerCase()
        .trim()
        .replace(/[.,!?:;*~_]/g, "");

      // 0. Correção de Nome e/ou Telefone pós-proposta (via áudio ou texto)
      const { name: correctedName, phone: correctedPhone } = extractNameAndPhone(incomingText);
      const isCorrection =
        isNameOrPhoneCorrectionIntent(incomingText) ||
        (isValidClientName(correctedName) && /\b(?:nome|cliente|chama)\b/i.test(incomingText)) ||
        (correctedPhone && /\b(?:telefone|whatsapp|whats|zap|numero|número)\b/i.test(incomingText));

      if (isCorrection && (isValidClientName(correctedName) || correctedPhone)) {
        const targetProposalId = storedSessionData["lastProposalId"] || convMeta["lastProposalId"];

        if (targetProposalId) {
          try {
            const proposal = await this.prisma.proposal.findUnique({
              where: { id: targetProposalId },
              include: { deal: true },
            });

            if (proposal) {
              const newName = isValidClientName(correctedName) ? correctedName : undefined;
              const newPhone = correctedPhone || undefined;

              if (newName) {
                await this.prisma.proposal.update({
                  where: { id: targetProposalId },
                  data: {
                    title: `Proposta Comercial - ${newName}`,
                    ...(newPhone ? { clientContactWhatsapp: newPhone } : {}),
                  },
                });

                if (proposal.dealId) {
                  await this.prisma.deal.update({
                    where: { id: proposal.dealId },
                    data: {
                      title: `Sistema Fotovoltaico - ${newName}`,
                    },
                  });

                  if (proposal.deal?.leadId) {
                    await this.prisma.lead.update({
                      where: { id: proposal.deal.leadId },
                      data: {
                        name: newName,
                        ...(newPhone ? { whatsapp: newPhone } : {}),
                      },
                    });
                  }
                }
                sessionCtx.clientName = newName;
              } else if (newPhone && proposal.deal?.leadId) {
                await this.prisma.lead.update({
                  where: { id: proposal.deal.leadId },
                  data: { whatsapp: newPhone },
                });
                await this.prisma.proposal.update({
                  where: { id: targetProposalId },
                  data: { clientContactWhatsapp: newPhone },
                });
                sessionCtx.clientWhatsapp = newPhone;
              }
            }
          } catch (updateErr) {
            this.logger.error(
              "Erro ao atualizar proposta existente com correção de nome/telefone:",
              updateErr
            );
          }
        }

        const effectiveName = sessionCtx.clientName || correctedName || "Cliente";
        const effectivePhone = sessionCtx.clientWhatsapp || correctedPhone;

        const appBaseUrl =
          process.env["APP_BASE_URL"] ||
          process.env["PUBLIC_WEB_APP_BASE_URL"] ||
          this.config.get<string>("APP_BASE_URL") ||
          "https://www.energivia.com.br";
        const proposalLink = targetProposalId ? `${appBaseUrl}/proposta/${targetProposalId}` : "";

        return (
          `Dados corrigidos com sucesso na proposta comercial! 👤✨\n\n` +
          `> Cliente: *${effectiveName}*\n` +
          (effectivePhone ? `> WhatsApp: \`${formatPhone(effectivePhone)}\`\n\n` : `\n`) +
          (proposalLink
            ? `*_Link atualizado da proposta:_* 🔗\n${proposalLink}\n\n` +
              `_💡 O nome e o contato do cliente já foram atualizados no sistema e no PDF._`
            : `_Os dados do cliente foram atualizados para as próximas cotações._`)
        );
      }

      // 1. Agradecimentos e confirmações comuns pós-proposta (sempre atendidos com simpatia)
      const gratitudeMatches = [
        "obrigado",
        "obrigada",
        "valeu",
        "show",
        "show de bola",
        "perfeito",
        "ok",
        "top",
        "muito bom",
        "blz",
        "beleza",
        "legal",
        "ótimo",
        "otimo",
        "agradeço",
        "agradecido",
        "valeu demais",
        "combinado",
        "certo",
        "belezinha",
        "gratidão",
      ];
      if (
        gratitudeMatches.some(
          (g) => lowerClean === g || lowerClean.startsWith(`${g} `) || lowerClean.endsWith(` ${g}`)
        )
      ) {
        return (
          `De nada, *${resolvedContactName}*! Ficamos sempre à disposição. ☀️\n\n` +
          `Sempre que precisar de uma nova cotação, basta enviar a conta de luz por aqui!`
        );
      }

      // 2. Reinício explícito via comando "novo", "reiniciar", etc.
      const isRestart =
        lowerClean === "novo" ||
        lowerClean === "reiniciar" ||
        lowerClean === "nova cotação" ||
        lowerClean === "nova cotacao" ||
        lowerClean === "nova proposta" ||
        lowerClean === "outro cliente";

      if (isRestart) {
        await setStep("IDLE", {
          cidade: undefined,
          uf: undefined,
          hsp: undefined,
          consumptionKwh: undefined,
          kwp: undefined,
          moduleCount: undefined,
          gridType: undefined,
          roofType: undefined,
          quotesList: undefined,
          selectedQuoteIndex: undefined,
          selectedTierName: undefined,
          kwpRate: undefined,
          quotedSaleBrl: undefined,
          clientName: undefined,
          clientPhone: undefined,
          selectedTemplateId: undefined,
        });

        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.roofType = undefined;
        sessionCtx.gridVoltage = undefined;
        sessionCtx.cidade = undefined;
        sessionCtx.estado = undefined;
        sessionCtx.clientName = undefined;
        sessionCtx.clientWhatsapp = undefined;

        if (isGuestTrial && trialStatus) {
          if (trialStatus.remaining <= 0) {
            return this.buildGuestTrialExceededMessage();
          }
          return (
            `Vamos iniciar uma nova cotação solar! ☀️\n\n` +
            `_(Restam ${trialStatus.remaining} cotações no seu teste gratuito)_\n\n` +
            `Envie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio mensal em kWh para começarmos.`
          );
        }
        return (
          `Vamos iniciar uma nova cotação solar! ☀️\n\n` +
          `Envie a conta de luz do seu cliente (PDF ou foto) ou digite o consumo médio mensal em kWh para começarmos.`
        );
      }

      // 3. Verificação de expiração temporal e saudações
      const lastAssistantMsg = assistantMessages[assistantMessages.length - 1];
      const lastAssistantTime =
        lastAssistantMsg && (lastAssistantMsg as any).createdAt
          ? new Date((lastAssistantMsg as any).createdAt).getTime()
          : conversation?.updatedAt
            ? new Date(conversation.updatedAt).getTime()
            : 0;
      const isProposalOlderThan1Hour =
        lastAssistantTime > 0 && Date.now() - lastAssistantTime >= 60 * 60 * 1000;

      const isGreeting = isGreetingText(incomingText);
      const isOptionSelection = /^(?:op[çc][ãa]o\s*)?[1-5]\.?$/i.test(lowerClean);

      // Se o usuário enviou uma saudação ("oi", "olá", etc.), escolheu uma opção do menu ou se a proposta já tem mais de 1 hora:
      if (isGreeting || isOptionSelection || isProposalOlderThan1Hour) {
        await setStep("IDLE", {
          cidade: undefined,
          uf: undefined,
          hsp: undefined,
          consumptionKwh: undefined,
          kwp: undefined,
          moduleCount: undefined,
          gridType: undefined,
          roofType: undefined,
          quotesList: undefined,
          selectedQuoteIndex: undefined,
          selectedTierName: undefined,
          kwpRate: undefined,
          quotedSaleBrl: undefined,
          clientName: undefined,
          clientPhone: undefined,
          selectedTemplateId: undefined,
        });

        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.roofType = undefined;
        sessionCtx.gridVoltage = undefined;
        sessionCtx.cidade = undefined;
        sessionCtx.estado = undefined;
        sessionCtx.clientName = undefined;
        sessionCtx.clientWhatsapp = undefined;

        if (isGuestTrial && trialStatus && trialStatus.remaining <= 0) {
          return this.buildGuestTrialExceededMessage();
        }

        // Se for saudação ("oi", "olá", etc.) ou proposta expirada sem ser seleção de opção específica:
        if (
          isGreeting ||
          (!isOptionSelection && isProposalOlderThan1Hour && !quoteEntities.isQuoteRequest)
        ) {
          return getGreetingMenu();
        }

        // Se for opção numérica (1 a 5) ou cotação direta em sessão expirada, deixa fluir para os tratadores de IDLE abaixo
      } else {
        // Mensagem orientadora pós-proposta recente (para perguntas não compreendidas logo após a emissão)
        const targetProposalId = storedSessionData["lastProposalId"] || convMeta["lastProposalId"];
        const appBaseUrl =
          process.env["APP_BASE_URL"] ||
          process.env["PUBLIC_WEB_APP_BASE_URL"] ||
          this.config.get<string>("APP_BASE_URL") ||
          "https://www.energivia.com.br";
        const linkMsg = targetProposalId
          ? `Sua proposta mais recente está disponível em:\n👉 ${appBaseUrl}/proposta/${targetProposalId}\n\n`
          : "";

        return (
          `Sua proposta comercial já foi gerada com sucesso! ☀️\n\n` +
          linkMsg +
          `Para realizar uma nova cotação, basta enviar outra conta de luz (PDF ou foto) ou informar o consumo em kWh.`
        );
      }
    }

    // 1. Se acabou de extrair a fatura com sucesso e dados válidos para dimensionamento
    if (
      extractionResult &&
      extractionResult.isValidForSizing &&
      extractionResult.exactAverageKwh >= 20
    ) {
      const cidade = extractionResult.data.cidade
        ? `${extractionResult.data.cidade}${extractionResult.data.uf ? `/${extractionResult.data.uf.trim().toUpperCase()}` : ""}`
        : "localidade a confirmar";
      const kwh = extractionResult.exactAverageKwh;
      const meses = extractionResult.monthCount || 1;
      const tipoConexao = extractionResult.data.tipo_conexao || "";
      const baseTexto =
        meses > 1
          ? `baseado no histórico de ${meses} meses da fatura`
          : `baseado no consumo do mês atual da fatura`;

      const isTrifasico =
        /trif[áa]sic/i.test(tipoConexao) ||
        (kwh >= 800 && !/bif[áa]sic|monof[áa]sic/i.test(tipoConexao));

      if (isTrifasico && (!sessionCtx.gridVoltage || !sessionCtx.gridVoltage.includes("V"))) {
        await setStep("AWAITING_GRID_TYPE", {
          cidade: extractionResult.data.cidade || sessionCtx.cidade,
          uf: extractionResult.data.uf
            ? extractionResult.data.uf.trim().toUpperCase()
            : sessionCtx.estado,
          consumptionKwh: kwh,
        });

        return (
          `*_Fatura Analisada com Precisão!_* 📄⚡\n\n` +
          `Consumo médio de \`${kwh.toLocaleString("pt-BR")} kWh/mês\` em \`${cidade}\`.\n` +
          `> Histórico: *${baseTexto}*\n` +
          `> Padrão identificado: *Trifásico* ⚡\n\n` +
          (this.TRIFASICO_VOLTAGE_QUESTION_TEXT || DEFAULT_TRIFASICO_VOLTAGE_QUESTION_TEXT)
        );
      }

      let resolvedGrid = sessionCtx.gridVoltage;
      if (!resolvedGrid) {
        if (/bif[áa]sic/i.test(tipoConexao)) {
          resolvedGrid = "Bifásico 127V/220V";
        } else if (/monof[áa]sic/i.test(tipoConexao)) {
          resolvedGrid = "Monofásico 220V";
        }
      }

      if (!resolvedGrid) {
        await setStep("AWAITING_GRID_TYPE", {
          cidade: extractionResult.data.cidade || sessionCtx.cidade,
          uf: extractionResult.data.uf
            ? extractionResult.data.uf.trim().toUpperCase()
            : sessionCtx.estado,
          consumptionKwh: kwh,
        });

        return (
          `*_Fatura Analisada com Precisão!_* 📄⚡\n\n` +
          `Consumo médio de \`${kwh.toLocaleString("pt-BR")} kWh/mês\` em \`${cidade}\`.\n` +
          `> Histórico: *${baseTexto}*\n\n` +
          (this.GRID_OPTIONS_TEXT || DEFAULT_GRID_OPTIONS_TEXT)
        );
      }

      sessionCtx.gridVoltage = resolvedGrid;
      const conexaoInfo = `\n> Padrão de rede identificado: *${resolvedGrid}*`;

      await setStep("AWAITING_ROOF_TYPE", {
        cidade: extractionResult.data.cidade || sessionCtx.cidade,
        uf: extractionResult.data.uf
          ? extractionResult.data.uf.trim().toUpperCase()
          : sessionCtx.estado,
        consumptionKwh: kwh,
        gridType: resolvedGrid,
      });

      return (
        `*_Fatura Analisada com Precisão!_* 📄⚡\n\n` +
        `Consumo médio de \`${kwh.toLocaleString("pt-BR")} kWh/mês\` em \`${cidade}\`.\n\n` +
        `> Histórico: *${baseTexto}*${conexaoInfo}\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    }

    // 2. Trava de Segurança EnergivIA para foto ou documento com baixa nitidez ou dados insuficientes
    const isImageSubmission =
      incomingText.startsWith("[Foto enviada") ||
      lower.includes("[foto enviada") ||
      Boolean(
        extractionResult &&
        !extractionResult.isValidForSizing &&
        incomingText.toLowerCase().includes("foto")
      );

    const isDocumentSubmission =
      incomingText.startsWith("[Documento enviado") ||
      lower.includes("[documento enviado") ||
      Boolean(
        extractionResult &&
        !extractionResult.isValidForSizing &&
        incomingText.toLowerCase().includes("documento")
      );

    if (
      isImageSubmission &&
      (!extractionResult ||
        !extractionResult.isValidForSizing ||
        extractionResult.exactAverageKwh < 20)
    ) {
      const motivo =
        extractionResult?.rejectionReason ||
        extractionResult?.data?.motivo_recusa ||
        "A foto enviada está com pouca nitidez, corte ou reflexos na tabela de histórico de consumo.";

      return (
        `⚠️ *_Não foi possível ler os dados da sua conta com clareza_* 🔍📸\n\n` +
        `A foto enviada não permitiu identificar com segurança os *dados fundamentais para o dimensionamento* (como o histórico de consumo em kWh ou localização da unidade).\n\n` +
        `> 🛡️ *Trava Anti-Alucinação EnergivIA:* Para proteger seu dimensionamento contra erros graves e evitar orçamentos incorretos, nossa IA é proibida de inventar ou chutar números que não estejam 100% nítidos na imagem.\n` +
        `> 🔎 *Diagnóstico da imagem:* _${motivo}_\n\n` +
        `💡 *Como prosseguir:*\n` +
        `• 📸 Envie uma *nova foto mais nítida*, reta e bem iluminada da fatura;\n` +
        `• 📄 Ou envie o arquivo da conta em formato *PDF original*;\n` +
        `• ⚡ Ou digite diretamente o consumo médio mensal do seu cliente (ex: \`450 kWh\`) para prosseguirmos agora mesmo!\n\n` +
        `_(Ou digite 0️⃣ para voltar ao menu inicial)_`
      );
    }

    if (
      isDocumentSubmission &&
      (!extractionResult ||
        !extractionResult.isValidForSizing ||
        extractionResult.exactAverageKwh < 20)
    ) {
      const motivo =
        extractionResult?.rejectionReason ||
        extractionResult?.data?.motivo_recusa ||
        "O documento não contém camada de texto legível ou histórico de consumo identificado.";

      return (
        `⚠️ *_Não foi possível ler os dados da fatura enviada_* 📄🔍\n\n` +
        `O documento enviado não contém os *dados fundamentais legíveis* para dimensionamento (como histórico de consumo em kWh ou localização).\n\n` +
        `> 🛡️ *Trava Anti-Alucinação EnergivIA:* Para garantir a precisão do seu orçamento solar, não inventamos dados aproximados quando os números originais não são legíveis.\n` +
        `> 🔎 *Diagnóstico do documento:* _${motivo}_\n\n` +
        `💡 *Como prosseguir:*\n` +
        `• 📄 Envie o arquivo *PDF original* emitido pela distribuidora;\n` +
        `• 📸 Ou envie uma foto nítida da conta de energia;\n` +
        `• ⚡ Ou digite diretamente o consumo médio mensal em kWh (ex: \`450 kWh\`) para avançarmos!\n\n` +
        `_(Ou digite 0️⃣ para voltar ao menu inicial)_`
      );
    }

    if (
      extractionResult &&
      (!extractionResult.isValidForSizing || extractionResult.exactAverageKwh < 20)
    ) {
      const motivo =
        extractionResult.rejectionReason ||
        extractionResult.data?.motivo_recusa ||
        "Não foi possível identificar com nitidez os dados de consumo para dimensionamento.";

      return (
        `⚠️ *_Não foi possível ler os dados da conta com clareza_* 🔍\n\n` +
        `O arquivo enviado não permitiu identificar com segurança os *dados fundamentais para dimensionamento* (histórico de consumo em kWh ou localização).\n\n` +
        `> 🛡️ *Trava Anti-Alucinação EnergivIA:* Para garantir propostas solares 100% confiáveis, nossa inteligência artificial não inventa dados quando a conta está ilegível ou cortada.\n` +
        `> 🔎 *Diagnóstico da leitura:* _${motivo}_\n\n` +
        `💡 *Como prosseguir:*\n` +
        `• 📸 Envie uma nova foto mais nítida ou o arquivo em *PDF original*;\n` +
        `• ⚡ Ou digite diretamente o consumo médio em kWh (ex: \`450 kWh\`) para simularmos agora mesmo!\n\n` +
        `_(Ou digite 0️⃣ para voltar ao menu inicial)_`
      );
    }

    // Se o bot enviou o lembrete de 10 min e o usuário apenas confirmou presença (ex: "sim", "estou aqui", "oi"):
    if (
      lastRawBotMsg.includes("Você ainda está por aí?") &&
      (lower === "sim" ||
        lower === "estou" ||
        lower === "oi" ||
        lower === "ola" ||
        lower === "olá" ||
        lower === "opa" ||
        lower === "estou aqui" ||
        lower === "continuar" ||
        lower === "bora" ||
        lower === "estou por aqui" ||
        lower === "to aqui" ||
        lower === "tô aqui")
    ) {
      const priorFunctional = assistantMessages.filter(
        (m) => !m.content?.includes("Você ainda está por aí?")
      );
      const priorQuestion =
        priorFunctional.length > 0
          ? priorFunctional[priorFunctional.length - 1]?.content || ""
          : "";
      if (priorQuestion) {
        return `Maravilha! Continuando de onde paramos:\n\n${priorQuestion}`;
      }
    }

    // Comando global de reinicialização / novo orçamento
    if (isResetCommand(incomingText)) {
      await setStep("IDLE", {
        cidade: undefined,
        uf: undefined,
        hsp: undefined,
        consumptionKwh: undefined,
        kwp: undefined,
        moduleCount: undefined,
        gridType: undefined,
        roofType: undefined,
        quotesList: undefined,
        selectedQuoteIndex: undefined,
        selectedTierName: undefined,
        kwpRate: undefined,
        quotedSaleBrl: undefined,
        clientName: undefined,
        clientPhone: undefined,
        selectedTemplateId: undefined,
      });
      return getGreetingMenu();
    }

    // Tratamento Universal de Voltar / Corrigir
    const userWantsBack =
      isBackCommand(incomingText) ||
      lower === "corrigir" ||
      lower === "opcao 0" ||
      lower === "opção 0";

    if (userWantsBack) {
      if (
        currentStep === "AWAITING_TEMPLATE_SELECTION" ||
        lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")
      ) {
        await setStep("AWAITING_CLIENT_PHONE");
        return `Certo! Qual o WhatsApp correto do cliente com DDD? (ou digite 0️⃣ para voltar ao nome)`;
      }

      if (
        currentStep === "AWAITING_CLIENT_PHONE" ||
        lastBotMsg.includes("E qual o WhatsApp dele") ||
        lastBotMsg.includes("qual o WhatsApp") ||
        lastBotMsg.includes("qual o whatsapp") ||
        lastBotMsg.includes("WhatsApp correto")
      ) {
        await setStep("AWAITING_CLIENT_NAME");
        return `Sem problemas! Qual o nome do cliente final para a proposta comercial? (ou digite 0️⃣ para alterar o preço)`;
      }

      const isClientNameQuestion =
        currentStep === "AWAITING_CLIENT_NAME" ||
        currentStep === "AWAITING_CUSTOM_PRICE" ||
        (lastBotMsg.includes("nome") &&
          (lastBotMsg.includes("cliente") ||
            lastBotMsg.includes("proposta") ||
            lastBotMsg.includes("CRM"))) ||
        lastBotMsg.includes("Qual o nome do seu cliente") ||
        lastBotMsg.includes("Qual o nome do cliente final") ||
        lastBotMsg.includes("nome correto do cliente final");

      if (isClientNameQuestion) {
        await setStep("AWAITING_PRICE_CONFIRMATION");
        const quotes = await kitsFor();
        if (quotes.length > 0) {
          const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
          if (quote) {
            const orgDefaultRate = await this.getOrganizationDefaultKwpRate(
              conversation.organizationId
            );
            return this.buildPriceQuestionText(quote, orgDefaultRate);
          }
        }
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      if (
        currentStep === "AWAITING_PRICE_CONFIRMATION" ||
        lastBotMsg.includes("Como você deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("Como deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("taxa padrão configurada") ||
        lastBotMsg.includes("Qual valor por kWp") ||
        lastBotMsg.includes("Qual valor você deseja utilizar")
      ) {
        await setStep("AWAITING_KIT_SELECTION");
        const quotes = await kitsFor();
        if (quotes.length === 0) return NO_KITS_TEXT;
        return (
          `Certo! Vamos escolher outro kit. ☀️\n\n` + this.formatQuotesListText(quotes, sessionCtx)
        );
      }

      if (
        currentStep === "AWAITING_KIT_SELECTION" ||
        lastBotMsg.includes("Qual opção você prefere para o seu cliente")
      ) {
        await setStep("AWAITING_INVERTER_TYPE");
        return (
          `Certo! Vamos escolher a tecnologia do inversor. ⚡\n\n` + this.INVERTER_TYPE_OPTIONS_TEXT
        );
      }

      if (
        currentStep === "AWAITING_INVERTER_TYPE" ||
        lastBotMsg.includes("Qual tecnologia de inversor você prefere")
      ) {
        await setStep("AWAITING_ROOF_TYPE");
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      if (
        currentStep === "AWAITING_ROOF_TYPE" ||
        lastBotMsg.includes("Qual a estrutura do telhado") ||
        lastBotMsg.includes("estrutura do telhado")
      ) {
        await setStep("AWAITING_GRID_TYPE");
        return (
          `Sem problemas! Vamos corrigir o padrão elétrico da instalação. ⚡\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }

      if (
        currentStep === "AWAITING_CITY_STATE" ||
        Boolean(sessionCtx.pendingCityCandidates && sessionCtx.pendingCityCandidates.length > 0) ||
        lastBotMsg.includes("Para qual estado será a instalação") ||
        lastBotMsg.includes("Encontrei mais de um município chamado")
      ) {
        delete sessionCtx.pendingCityCandidates;
        delete sessionCtx.pendingCityName;
        await setStep("AWAITING_CITY");
        return (
          `Certo! Vamos alterar a localização. 📍\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: \`Cuiabá/MT\`, \`Maringá/PR\`, \`São Paulo/SP\`)`
        );
      }

      if (
        currentStep === "AWAITING_GRID_TYPE" ||
        lastBotMsg.includes("Qual o padrão de entrada da instalação?")
      ) {
        await setStep("AWAITING_BILL_VALUE");
        return (
          `Certo! Vamos alterar o valor da conta de luz. 💡\n\n` +
          `Qual é o valor médio da conta de luz em R$? (Ex: \`850\` ou \`850,00\`)\n` +
          `_(Ou envie 0️⃣ para estimar pela tarifa regional ou voltar para a cidade)_`
        );
      }

      if (
        currentStep === "AWAITING_BILL_VALUE" ||
        lastBotMsg.includes("Qual é o valor médio da conta de luz atual em R$?") ||
        lastBotMsg.includes("valor médio da conta de luz atual em R$")
      ) {
        delete sessionCtx.pendingCityCandidates;
        delete sessionCtx.pendingCityName;
        await setStep("AWAITING_CITY");
        if (sessionCtx.consumptionKwh) {
          return (
            `Certo! Vamos alterar a localização ou o consumo. 📍\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Cuiabá/MT\`, \`Maringá/PR\`, \`São Paulo/SP\`)`
          );
        }
        return (
          `Certo! Vamos alterar o dimensionamento. ☀️\n\n` +
          `Envie a potência desejada (ex: \`5 kWp\`), a quantidade de placas (ex: \`10 placas\`) ou o consumo médio (ex: \`450 kWh\`).`
        );
      }

      if (
        currentStep === "AWAITING_CITY" ||
        lastBotMsg.includes("Simulação por Consumo Mensal") ||
        lastBotMsg.includes("consumo médio mensal") ||
        lastBotMsg.includes("Simulação por Potência de Pico") ||
        lastBotMsg.includes("potência de pico desejada") ||
        lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
        lastBotMsg.includes("placas solares você deseja no kit") ||
        lastBotMsg.includes("Para qual cidade e estado será a instalação") ||
        lastBotMsg.includes("Vamos alterar a localização") ||
        lastBotMsg.includes("Vamos corrigir a localização") ||
        lastBotMsg.includes("Não identifiquei o município") ||
        lastBotMsg.includes("Não identifiquei a cidade") ||
        lastBotMsg.includes("informe a cidade e a sigla do estado") ||
        lastBotMsg.includes("informe a cidade e estado")
      ) {
        await setStep("IDLE");
        return getGreetingMenu();
      }

      return (
        `*_O que você gostaria de alterar ou corrigir?_* 📝\n\n` +
        `> 1️⃣ *Cidade e Estado* (ex: digite \`Cuiabá/MT\`)\n` +
        `> 2️⃣ *Consumo ou Potência* (ex: digite \`500 kWh\` ou \`6 kWp\`)\n` +
        `> 3️⃣ *Padrão de Entrada* (ex: digite \`mono\`, \`bi\` ou \`tri 380V\`)\n` +
        `> 4️⃣ *Estrutura do Telhado* (ex: digite \`solo\`, \`laje\` ou \`fibrocimento\`)\n` +
        `> 5️⃣ *Reiniciar do início* (digite \`novo\`)\n\n` +
        `_(Responda com o número da opção desejada ou o comando)_`
      );
    }

    // ESTADO A: O Bot apresentou os grupos de kits (Standard, Elite, Premium) -> escolhido o kit, pergunta o preço por kWp
    if (
      currentStep === "AWAITING_KIT_SELECTION" ||
      lastBotMsg.includes("Qual opção você prefere para o seu cliente")
    ) {
      // 0. ALTERNÂNCIA RÁPIDA DE TECNOLOGIA: micro, hibrido, string
      const cleanLower = lower.replace(/[\*\_]/g, "").trim();
      const isSwitchToMicro =
        cleanLower === "micro" ||
        cleanLower === "microinversor" ||
        cleanLower === "microinversores" ||
        cleanLower.startsWith("cotar micro") ||
        cleanLower.startsWith("com micro");

      const isSwitchToHybrid =
        cleanLower === "hibrido" ||
        cleanLower === "híbrido" ||
        cleanLower === "bateria" ||
        cleanLower === "baterias" ||
        cleanLower.startsWith("cotar hibrido") ||
        cleanLower.startsWith("cotar híbrido");

      const isSwitchToString =
        cleanLower === "string" ||
        cleanLower === "convencional" ||
        cleanLower === "inversor string" ||
        cleanLower.startsWith("cotar string");

      if (isSwitchToMicro) {
        sessionCtx.inverterType = "microinverter";
        const newQuotes = await kitsFor({ inverterType: "microinverter" });
        if (newQuotes.length > 0) {
          await setStep("AWAITING_KIT_SELECTION", {
            inverterType: "microinverter",
            selectedQuoteIndex: 0,
          });
          return (
            `*_Tecnologia Atualizada:_* \`Microinversores\` ⚡\n\n` +
            this.formatQuotesListText(newQuotes, sessionCtx)
          );
        }
      }

      if (isSwitchToString) {
        sessionCtx.inverterType = "string";
        sessionCtx.hasBattery = false;
        sessionCtx.batteryQty = 0;
        sessionCtx.batteryKwh = 0;
        sessionCtx.hasBms = false;
        const newQuotes = await kitsFor({ inverterType: "string" });
        if (newQuotes.length > 0) {
          await setStep("AWAITING_KIT_SELECTION", {
            inverterType: "string",
            hasBattery: false,
            batteryQty: 0,
            batteryKwh: 0,
            hasBms: false,
            selectedQuoteIndex: 0,
          });
          return (
            `*_Tecnologia Atualizada:_* \`Inversor Convencional (String)\` ⚡\n\n` +
            this.formatQuotesListText(newQuotes, sessionCtx)
          );
        }
      }

      if (isSwitchToHybrid) {
        sessionCtx.inverterType = "hybrid";
        if (
          sessionCtx.hasBattery === undefined &&
          sessionCtx.batteryKwh === undefined &&
          sessionCtx.batteryQty === undefined
        ) {
          await setStep("AWAITING_BATTERY_STORAGE", {
            inverterType: "hybrid",
          });
          return (
            `*_Tecnologia Atualizada:_* \`Inversor Híbrido\` ⚡\n\n` +
            this.BATTERY_STORAGE_OPTIONS_TEXT
          );
        }
        const newQuotes = await kitsFor({ inverterType: "hybrid" });
        if (newQuotes.length > 0) {
          await setStep("AWAITING_KIT_SELECTION", {
            inverterType: "hybrid",
            selectedQuoteIndex: 0,
          });
          return (
            `*_Tecnologia Atualizada:_* \`Inversor Híbrido\` ⚡\n\n` +
            this.formatQuotesListText(newQuotes, sessionCtx)
          );
        }
      }

      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const idx = this.resolveQuoteIndexFromText(incomingText, quotes);
      if (idx !== null && quotes[idx]) {
        sessionCtx.chosenQuoteIndex = idx;
        const orgDefaultRate = await this.getOrganizationDefaultKwpRate(
          conversation.organizationId
        );
        await setStep("AWAITING_PRICE_CONFIRMATION", {
          selectedQuoteIndex: idx,
          selectedTierName: quotes[idx].distributorName,
        });
        return this.buildPriceQuestionText(quotes[idx], orgDefaultRate);
      }

      const correctionResult = await handleDimensioningCorrection();
      if (correctionResult) return correctionResult;

      return (
        `Opção não reconhecida.\n\n` +
        `Qual opção você prefere para o seu cliente?\n` +
        `_(Responda 1 Standard, 2 Elite ou 3 Premium, ou envie 0️⃣ para voltar e alterar a estrutura)_`
      );
    }

    const generateProposalAndReply = async (
      chosenOption: number | AvailableProposalTemplate = 0
    ): Promise<string> => {
      const isHybridQuote =
        sessionCtx.inverterType === "hybrid" ||
        sessionCtx.inverterType === "off_grid" ||
        (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
          (sessionCtx as any).batteryCapacityKwh > 0) ||
        (typeof (sessionCtx as any).batteryQuantity === "number" &&
          (sessionCtx as any).batteryQuantity > 0);

      const availableTemplates = await this.getAvailableTemplates(conversation.organizationId, {
        isHybrid: isHybridQuote,
      });

      let chosenTemplate: AvailableProposalTemplate;
      if (typeof chosenOption === "object" && chosenOption !== null) {
        chosenTemplate = chosenOption;
      } else {
        const { selectableTemplates } = formatTemplateSelectionList(
          availableTemplates,
          isHybridQuote
        );
        chosenTemplate = selectableTemplates[chosenOption] ||
          availableTemplates[chosenOption] ||
          availableTemplates[0] || {
            id: isHybridQuote ? "blueprint-hybrid-official" : "default-moderno",
            name: isHybridQuote
              ? "Modelo Híbrido & Backup Solar (EnergivIA)"
              : "Modelo Comercial Moderno",
            isHybrid: isHybridQuote,
          };
      }

      let clientName =
        sessionCtx.clientName && isValidClientName(sessionCtx.clientName)
          ? sessionCtx.clientName
          : "Cliente";
      let clientWhatsapp =
        sessionCtx.clientWhatsapp && sessionCtx.clientWhatsapp !== "WhatsApp"
          ? sessionCtx.clientWhatsapp
          : "WhatsApp";
      const chosenQuoteIndex = sessionCtx.chosenQuoteIndex || 0;

      // Recupera escolhas das mensagens
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if (!m) continue;
        const content = typeof m.content === "string" ? m.content.trim() : "";

        if (clientWhatsapp === "WhatsApp") {
          const { phone } = extractNameAndPhone(content);
          if (phone) {
            clientWhatsapp = phone;
          }
        }

        if (m.role === "assistant" && content.includes("E qual o WhatsApp dele")) {
          for (let j = i + 1; j < messages.length; j++) {
            const nextUserMsg = messages[j];
            if (
              nextUserMsg &&
              nextUserMsg.role === "user" &&
              typeof nextUserMsg.content === "string"
            ) {
              const digits = nextUserMsg.content.replace(/\D/g, "");
              if (digits.length >= 8) {
                clientWhatsapp = digits;
              }
              break;
            }
          }
        }
      }

      const quotes = await this.calculateDistributorKits({
        consumptionKwh: sessionCtx.consumptionKwh,
        targetKWp: sessionCtx.targetKWp,
        targetModules: sessionCtx.targetModules,
        modPowerWUser: sessionCtx.modPowerWUser,
        cidade: sessionCtx.cidade || "São Paulo",
        estado: sessionCtx.estado || "SP",
        roofType: sessionCtx.roofType || "Cerâmica (Colonial)",
        gridVoltage: sessionCtx.gridVoltage,
        inverterType: sessionCtx.inverterType,
        batteryKwh: sessionCtx.batteryKwh,
        batteryQty: sessionCtx.batteryQty,
        batteryVoltageType: sessionCtx.batteryVoltageType,
        hasBms: sessionCtx.hasBms,
        hasBattery: sessionCtx.hasBattery,
        organizationId: conversation.organizationId,
        customRatePerKwp: sessionCtx.customRatePerKwp,
      });

      const effectiveConsumption =
        sessionCtx.consumptionKwh ||
        (sessionCtx.targetKWp
          ? Math.round(sessionCtx.targetKWp * 130)
          : sessionCtx.targetModules
            ? Math.round(
                ((sessionCtx.targetModules * (sessionCtx.modPowerWUser || 585)) / 1000) * 130
              )
            : 300);

      const calculatedFallbackKwp =
        sessionCtx.targetKWp ||
        (sessionCtx.targetModules
          ? Number(
              ((sessionCtx.targetModules * (sessionCtx.modPowerWUser || 585)) / 1000).toFixed(2)
            )
          : Number((effectiveConsumption / 100).toFixed(2)));

      const selectedQuote = quotes[chosenQuoteIndex] ||
        quotes[0] || {
          distributorName: "Edeltec Solar",
          distributorId: undefined,
          totalPrice: Math.round(effectiveConsumption * 28),
          ratePerKwp: 0,
          materialsTotal: Math.round(effectiveConsumption * 28),
          kwp: calculatedFallbackKwp,
          estimatedGeneration: effectiveConsumption,
          items: [] as string[],
          invName: "",
          modCount: 0,
          modName: "",
          structuredItems: [],
        };

      let proposalId = "";
      let quotedSaleBrl = selectedQuote.totalPrice;
      try {
        // 1. Cria o Lead no CRM da Organização
        const lead = await this.prisma.lead.create({
          data: {
            tenantId: conversation.organizationId,
            name: clientName,
            whatsapp: clientWhatsapp || "WhatsApp",
            source: "Chatbot WhatsApp",
          },
        });

        // 2. Custos do Projeto e Margem
        const orgRuleRows = await this.prisma.companyCostRule.findMany({
          where: { organizationId: conversation.organizationId },
          orderBy: [{ name: "asc" }, { minKwp: "asc" }],
        });
        const organizationRules = orgRuleRows.map((r) => ({
          id: r.id,
          name: r.name,
          calculationType: r.calculationType as "FIXED" | "PERCENTAGE" | "PER_KWP",
          value: r.value.toNumber(),
          minKwp: r.minKwp?.toNumber() ?? null,
          maxKwp: r.maxKwp?.toNumber() ?? null,
          percentageBase: r.percentageBase ?? null,
        }));
        const materialsSubtotal =
          (selectedQuote as any).materialsTotal > 0
            ? (selectedQuote as any).materialsTotal
            : selectedQuote.totalPrice;
        const costCalc = computeProjectCostSection(
          materialsSubtotal,
          selectedQuote.kwp,
          organizationRules
        );
        // Valor de venda final: preserva o valor cotado/acordado no WhatsApp se definido
        if (selectedQuote.totalPrice > 0) {
          quotedSaleBrl = selectedQuote.totalPrice;

          // Reconcilia a linha de margem em projectCostLines para que os custos internos reflitam exatamente o total acordado
          const marginIndex = costCalc.projectCostLines.findIndex(
            (l) =>
              l.name === PROJECT_COST_ESSENTIAL_MARGIN_NAME ||
              (l.name || "").toLowerCase().includes("margem") ||
              (l.name || "").toLowerCase().includes("lucro")
          );
          const nonMarginCosts = costCalc.projectCostLines.reduce((acc, curr, idx) => {
            if (idx === marginIndex) return acc;
            return acc + (curr.appliedAmountBrl ?? 0);
          }, 0);
          const effectiveMarginBrl = Math.max(
            0,
            roundMoney(quotedSaleBrl - materialsSubtotal - nonMarginCosts)
          );
          if (marginIndex >= 0 && costCalc.projectCostLines[marginIndex]) {
            costCalc.projectCostLines[marginIndex].appliedAmountBrl = effectiveMarginBrl;
            costCalc.projectCostLines[marginIndex].value = effectiveMarginBrl;
            costCalc.projectCostLines[marginIndex].calculationType = "FIXED";
          } else if (effectiveMarginBrl > 0) {
            costCalc.projectCostLines.push({
              name: PROJECT_COST_ESSENTIAL_MARGIN_NAME,
              calculationType: "FIXED",
              value: effectiveMarginBrl,
              appliedAmountBrl: effectiveMarginBrl,
              source: "organization",
            });
          }
        } else {
          quotedSaleBrl = costCalc.computedSaleFromCostRulesBrl;
        }

        // 3. Cria Deal
        const deal = await this.prisma.deal.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            title: `Sistema Fotovoltaico - ${clientName}`,
            stage: "PROPOSAL",
            value: quotedSaleBrl,
          },
        });

        // 4. Calcula Tarifa Efetiva e Cria Dimensionamento
        const effectiveTariff = calculateEffectiveTariff(
          sessionCtx.billValue,
          effectiveConsumption,
          sessionCtx.estado
        );
        const calculatedBillValue =
          sessionCtx.billValue ?? Math.round(effectiveConsumption * effectiveTariff);
        const monthlySavingsVal = Math.round(effectiveConsumption * effectiveTariff * 0.95);
        const calculatedPayback =
          monthlySavingsVal > 0
            ? Math.max(1, Math.round((quotedSaleBrl / (monthlySavingsVal * 12)) * 10) / 10)
            : 3.2;

        await this.prisma.systemSizing.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Dimensionamento IA - ${selectedQuote.kwp} kWp`,
            input: {
              monthlyConsumptionKwh: effectiveConsumption,
              energyPriceKwh: effectiveTariff,
              billValue: calculatedBillValue,
              cidade: sessionCtx.cidade || "São Paulo",
              estado: sessionCtx.estado || "SP",
            },
            result: {
              recommendedPowerKw: selectedQuote.kwp,
              estimatedGeneration: selectedQuote.estimatedGeneration,
            },
          },
        });

        // 5. Cria Simulação
        const simulation = await this.prisma.simulation.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            name: `Simulação Comercial IA`,
            input: {
              systemSizeKw: selectedQuote.kwp,
              investmentAmount: quotedSaleBrl,
              financingType: "CASH",
              energyPriceKwh: effectiveTariff,
              billValue: calculatedBillValue,
              monthlyConsumptionKwh: effectiveConsumption,
              distributor: sessionCtx.distribuidora || undefined,
              consumerUnitNumber: sessionCtx.ucNumber || undefined,
              sizing: {
                monthlyConsumptionKwh: effectiveConsumption,
                energyPriceKwh: effectiveTariff,
                billValue: calculatedBillValue,
                cidade: sessionCtx.cidade || "São Paulo",
                estado: sessionCtx.estado || "SP",
                distributor: sessionCtx.distribuidora || undefined,
                distribuidora: sessionCtx.distribuidora || undefined,
                consumerUnitNumber: sessionCtx.ucNumber || undefined,
                ucNumber: sessionCtx.ucNumber || undefined,
                codigo_instalacao_ou_uc: sessionCtx.ucNumber || undefined,
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
              },
            },
            result: {
              paybackYears: calculatedPayback,
              monthlySavings: monthlySavingsVal,
              monthlySavingsBrl: monthlySavingsVal,
              annualSavings: [monthlySavingsVal * 12],
              sizing: {
                recommendedPowerKw: selectedQuote.kwp,
                estimatedGeneration: selectedQuote.estimatedGeneration,
                estimatedProductionKwhMonth: selectedQuote.estimatedGeneration,
              },
            },
          },
        });

        // 6. Template
        let template =
          chosenTemplate?.id && !chosenTemplate.id.startsWith("blueprint-hybrid-official")
            ? await this.prisma.proposalTemplate.findFirst({
                where: {
                  id: chosenTemplate.id,
                  tenantId: conversation.organizationId,
                  deletedAt: null,
                },
              })
            : null;

        if (!template && chosenTemplate?.id) {
          let blueprint = await this.prisma.proposalTemplateBlueprint.findFirst({
            where: { id: chosenTemplate.id, published: true },
          });
          if (!blueprint && isHybridQuote) {
            blueprint = await this.prisma.proposalTemplateBlueprint.findFirst({
              where: {
                published: true,
                OR: [
                  { name: { contains: "Híbrido", mode: "insensitive" } },
                  { name: { contains: "Bateria", mode: "insensitive" } },
                  { name: { contains: "Backup", mode: "insensitive" } },
                ],
              },
            });
          }
          if (blueprint) {
            template = await this.prisma.proposalTemplate.create({
              data: {
                tenantId: conversation.organizationId,
                name: blueprint.name,
                status: "PUBLISHED",
                config: blueprint.document as any,
                version: 1,
              },
            });
          }
        }

        if (!template && isHybridQuote) {
          template = await this.prisma.proposalTemplate.create({
            data: {
              tenantId: conversation.organizationId,
              name: "Modelo Híbrido & Backup Solar (EnergivIA)",
              status: "PUBLISHED",
              config: {
                sections: [
                  { id: "hero-1", type: "hero_cover", title: "Capa do Projeto Solar Híbrido" },
                  {
                    id: "gen-1",
                    type: "generation_chart",
                    title: "Estimativa de Geração & Consumo",
                  },
                  { id: "bess-1", type: "storage_backup", title: "Armazenamento & Backup (BESS)" },
                  {
                    id: "flow-1",
                    type: "hybrid_flow",
                    title: "Modos de Operação 24h & Ciclo Solar",
                  },
                  {
                    id: "loads-1",
                    type: "critical_loads_autonomy",
                    title: "Cargas Protegidas & Autonomia no Apagão",
                  },
                  { id: "equip-1", type: "proposal_equipment", title: "Equipamentos & Baterias" },
                  { id: "fin-1", type: "financial_summary", title: "Investimento & Economia" },
                ],
              },
              version: 1,
            },
          });
        }

        const defaultTemplate =
          template ||
          (await this.prisma.proposalTemplate.findFirst({
            where: {
              tenantId: conversation.organizationId,
              status: "PUBLISHED",
              deletedAt: null,
            },
            orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
          }));

        const rawKitItems = (selectedQuote as any).structuredItems?.length
          ? (selectedQuote as any).structuredItems
          : (selectedQuote.items || []).map((rawStr: string) => {
              let clean = rawStr
                .replace(/^[*_~`>•\-\s]+/, "")
                .replace(/[*_~`\s]+$/, "")
                .trim();
              const prefixMatch = clean.match(
                /^(?:inversor|microinversor|m[oó]dulos?|pain[eé]is?|estrutura|cabos?|conectores?)\s*:\s*(.*)$/i
              );
              if (prefixMatch && prefixMatch[1]) {
                clean = prefixMatch[1].trim();
              }
              let quantity = 1;
              const qMatch = clean.match(/^(\d+)x\s*(.*)$/i);
              if (qMatch && qMatch[1] && qMatch[2]) {
                quantity = parseInt(qMatch[1], 10);
                clean = qMatch[2].trim();
              }
              const isMod =
                /m[oó]dulo|painel|placa|astronergy|canadian|longi|jinko|ja solar|trina|osda|dah/i.test(
                  clean
                );
              const isInv =
                /inversor|micro|solplanet|growatt|deye|saj|solis|sungrow|huawei|goodwe/i.test(
                  clean
                );
              return {
                productId: "",
                productName: clean,
                brandName:
                  (selectedQuote as any).modName && isMod
                    ? (selectedQuote as any).modName
                    : (selectedQuote as any).invName && isInv
                      ? (selectedQuote as any).invName
                      : "",
                categoryName: isMod ? "module" : isInv ? "inverter" : "equipment",
                quantity,
                unitPrice: 0,
                lineTotal: 0,
              };
            });

        // 7. Proposta Comercial
        const proposalNumber = await getNextProposalNumber(
          this.prisma,
          conversation.organizationId
        );
        const proposal = await this.prisma.proposal.create({
          data: {
            tenantId: conversation.organizationId,
            dealId: deal.id,
            simulationId: simulation.id,
            proposalTemplateId: template?.id || defaultTemplate?.id || null,
            proposalTemplateVersion: template?.version || defaultTemplate?.version || 1,
            proposalNumber,
            title: `Proposta Comercial - ${clientName}`,
            validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            renderedData: {
              integrator: {
                version: 1,
                kitItems: rawKitItems,
                equipmentSubtotalBrl: materialsSubtotal,
                quotedSaleBrl: quotedSaleBrl,
                systemPowerKw: selectedQuote.kwp,
                sourceType: "kwp_rate",
                projectCostLines: costCalc.projectCostLines,
                defaultEssentialCostNames: costCalc.defaultEssentialCostNames,
                computedSaleFromCostRulesBrl: quotedSaleBrl,
                templateName:
                  template?.name ||
                  chosenTemplate?.name ||
                  defaultTemplate?.name ||
                  "Modelo Comercial Padrão",
                distributorCompany: sessionCtx.distribuidora || undefined,
                consumerUnitNumber: sessionCtx.ucNumber || undefined,
              },
            } as any,
          },
        });

        proposalId = proposal.id;

        await setStep("PROPOSAL_COMPLETED", {
          lastProposalId: proposal.id,
          lastProposalNumber: proposalNumber,
          lastClientName: clientName,
          quotedSaleBrl,
          selectedTemplateId: template?.id || defaultTemplate?.id || chosenTemplate?.id,
        });

        try {
          const currentConvMeta = (conversation.metadata as Record<string, any>) || {};
          await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              metadata: {
                ...currentConvMeta,
                step: "PROPOSAL_COMPLETED",
                lastProposalId: proposal.id,
                lastClientName: clientName,
                lastProposalNumber: proposalNumber,
              },
            },
          });
        } catch (metaErr) {
          this.logger.warn("Erro ao atualizar metadata da conversa com lastProposalId:", metaErr);
        }

        await this.prisma.leadActivityLog.create({
          data: {
            tenantId: conversation.organizationId,
            leadId: lead.id,
            kind: "PROPOSAL_CREATED",
            label: `Proposta de ${selectedQuote.kwp} kWp gerada via WhatsApp`,
          },
        });
      } catch (err) {
        this.logger.error("Erro gerando proposta completa no banco:", err);
      }

      let trialQuotesCount = 0;
      let trialQuotesRemaining = 0;
      if (isGuestTrial && this.guestTrial && proposalId) {
        try {
          const trialResult = await this.guestTrial.recordProposalCompleted(
            conversation.id,
            proposalId
          );
          trialQuotesCount = trialResult.trialQuotesUsed;
          trialQuotesRemaining = trialResult.remaining;
        } catch (trialErr) {
          this.logger.warn("Erro ao debitar cota de degustação:", trialErr);
        }
      }

      const appBaseUrl =
        process.env["APP_BASE_URL"] ||
        process.env["PUBLIC_WEB_APP_BASE_URL"] ||
        process.env["NEXT_PUBLIC_APP_URL"] ||
        this.config.get<string>("APP_BASE_URL") ||
        this.config.get<string>("NEXT_PUBLIC_APP_URL") ||
        "https://www.energivia.com.br";

      const clientProposalBaseUrl = (
        process.env["CLIENT_PROPOSAL_BASE_URL"] ||
        process.env["PROPOSAL_PUBLIC_BASE_URL"] ||
        process.env["PROPOSAL_SHORT_URL_BASE"] ||
        this.config.get<string>("CLIENT_PROPOSAL_BASE_URL") ||
        this.config.get<string>("PROPOSAL_PUBLIC_BASE_URL") ||
        this.config.get<string>("PROPOSAL_SHORT_URL_BASE") ||
        appBaseUrl
      ).replace(/\/$/, "");

      const integratorPreviewLink = proposalId
        ? `${appBaseUrl}/proposta/${proposalId}?preview=true`
        : `${appBaseUrl}/propostas`;

      const clientProposalLink = proposalId
        ? `${clientProposalBaseUrl}/p/${proposalId}`
        : `${clientProposalBaseUrl}/p`;

      const estimatedGenerationKwh =
        selectedQuote.estimatedGeneration || Math.round(selectedQuote.kwp * 130);

      const trialCounterText = isGuestTrial
        ? `📊 *Cotação [${trialQuotesCount || 1} de 3] gerada com sucesso!*\n` +
          (trialQuotesRemaining > 0
            ? `_(Você ainda possui ${trialQuotesRemaining} cotaç${trialQuotesRemaining === 1 ? "ão gratuita" : "ões gratuitas"} de teste)_\n\n`
            : `_(Você utilizou suas 3 cotações de teste gratuito)_\n\n`) +
          `💡 *Dica:* Na plataforma oficial da EnergivIA você pode personalizar sua logo, criar seus próprios modelos de proposta, gerenciar clientes e definir suas margens de lucro: *https://www.energivia.com.br*\n\n`
        : "";

      const integratorSummaryMsg =
        `*_Proposta Comercial Gerada com Sucesso!_* 📋✨\n\n` +
        `Cliente: *${clientName}*\n\n` +
        `> ☀️ *Potência:* \`${selectedQuote.kwp} kWp\`\n` +
        `> 🏠 *Estrutura:* \`${sessionCtx.roofType || "Cerâmica (Colonial)"}\`\n` +
        `> 🎨 *Modelo:* \`${chosenTemplate?.name || "Modelo Comercial Padrão"}\`\n` +
        `> 💰 *Valor Total:* \`R$ ${quotedSaleBrl.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\`\n\n` +
        (trialCounterText ? `${trialCounterText}` : "") +
        `*_Link de conferência (exclusivo para você):_* 🔗\n` +
        `${integratorPreviewLink}\n\n` +
        `_💡 Abra este link acima para revisar a proposta com segurança. Ele **não dispara avisos de visualização**._\n\n` +
        `_👉 A mensagem a seguir foi preparada para você **encaminhar direto para o seu cliente**. Quando ele abrir o link da proposta, você receberá um **alerta imediato aqui no WhatsApp** avisando que ele está visualizando!_\n\n` +
        `Equipe *_EnergivIA._*`;

      const clientForwardMsg =
        `Olá, *${clientName}*! Tudo bem?\n\n` +
        `Elaborei sua proposta de energia solar sob medida. O sistema projetado terá *${selectedQuote.kwp} kWp* de potência, com geração média estimada de *${estimatedGenerationKwh} kWh/mês* e redução de até *90%* na sua conta de luz.\n\n` +
        `Acesse sua proposta comercial completa com os equipamentos e simulação no link abaixo:\n` +
        `${clientProposalLink}\n\n` +
        `Qualquer dúvida ou ajuste que precisar, estou à disposição!`;

      return `${integratorSummaryMsg}\n---CLIENT_FORWARD_MESSAGE---\n${clientForwardMsg}`;
    };

    // ESTADO B: O Bot pediu o nome do cliente final (ou o nome correto)
    const isAskingClientName =
      currentStep === "AWAITING_CLIENT_NAME" ||
      (lastBotMsg.includes("nome") &&
        (lastBotMsg.includes("cliente") ||
          lastBotMsg.includes("CRM") ||
          lastBotMsg.includes("proposta") ||
          lastBotMsg.includes("registrarmos"))) ||
      lastBotMsg.includes("Qual o nome do seu cliente") ||
      lastBotMsg.includes("Qual o nome do cliente final") ||
      lastBotMsg.includes("nome correto do cliente final");

    if (isAskingClientName) {
      const lower = incomingText.toLowerCase().trim();
      const isGreeting =
        /^(olá|ola|oi|oii|bom dia|boa tarde|boa noite|menu|iniciar|ajuda|novo|reiniciar)$/i.test(
          lower
        );
      if (isGreeting) {
        return (
          `Olá! Identifiquei sua mensagem. ☀️\n\n` +
          `Para gerarmos a proposta comercial oficial, qual o nome do seu cliente final? (Ex: João da Silva)\n` +
          `(Ou envie 0️⃣ para voltar e ver os kits disponíveis, ou *novo* para iniciar outra simulação)`
        );
      }

      if (isNameCorrectionOrErrorNotice(incomingText)) {
        return `Por favor, informe o nome do seu cliente final para a proposta comercial (Ex: João da Silva):`;
      }

      const { name, phone } = extractNameAndPhone(incomingText);
      const digits = incomingText.replace(/\D/g, "");
      const cleanedDigits =
        digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
          ? digits.slice(2)
          : digits;
      const detectedPhone =
        phone ||
        (cleanedDigits.length === 10 || cleanedDigits.length === 11 ? cleanedDigits : undefined);

      const hasValidName = isValidClientName(name);

      // Se o usuário já enviou o Nome E o WhatsApp na mesma mensagem (ex: "cezar 44988117969" ou "nome do cliente é Lucas Gabriel e o whatsapp é 44988117969")
      if (detectedPhone && hasValidName) {
        sessionCtx.clientName = name;
        sessionCtx.clientWhatsapp = detectedPhone;

        if (isGuestTrial) {
          return generateProposalAndReply(0);
        }

        await setStep("AWAITING_TEMPLATE_SELECTION", {
          clientName: name,
          clientPhone: detectedPhone,
        });

        const isHybridQuote =
          sessionCtx.inverterType === "hybrid" ||
          sessionCtx.inverterType === "off_grid" ||
          (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
            (sessionCtx as any).batteryCapacityKwh > 0) ||
          (typeof (sessionCtx as any).batteryQuantity === "number" &&
            (sessionCtx as any).batteryQuantity > 0);

        const templates = await this.getAvailableTemplates(conversation.organizationId, {
          isHybrid: isHybridQuote,
        });
        const { text: templateListText } = formatTemplateSelectionList(templates, isHybridQuote);

        return (
          `Cliente *${name}* e WhatsApp \`${formatPhone(detectedPhone)}\` registrados com sucesso! 👤✨\n\n` +
          `*_Qual modelo de proposta comercial você deseja usar para o seu cliente?_*\n\n` +
          `${templateListText}\n` +
          `_(Responda com o número da opção desejada ou digite 0️⃣ para corrigir o nome/telefone)_`
        );
      }

      // Se enviou apenas o telefone sem nome
      if (detectedPhone && !hasValidName) {
        sessionCtx.clientWhatsapp = detectedPhone;
        await setStep("AWAITING_CLIENT_NAME", { clientPhone: detectedPhone });
        return `Anotado o WhatsApp \`${formatPhone(detectedPhone)}\`! E qual o *nome* do seu cliente final para a proposta comercial?`;
      }

      // Se enviou apenas o nome
      if (hasValidName) {
        sessionCtx.clientName = name;
        await setStep("AWAITING_CLIENT_PHONE", { clientName: name });
        return `Certo, vou registrar o cliente *${name}*. E qual o WhatsApp dele com DDD? (ou digite 0️⃣ para voltar)`;
      }

      // Se não for nem telefone nem nome válido (ex: apenas números soltos ou caracteres inválidos)
      return `Por favor, informe o *nome* do seu cliente final para a proposta comercial (Ex: João da Silva):\n\n_(Ou envie 0️⃣ para voltar e ver os kits disponíveis)_`;
    }

    // ESTADO C: O Bot pediu o WhatsApp do cliente final -> Apresenta os modelos de proposta
    const isAskingPhone =
      currentStep === "AWAITING_CLIENT_PHONE" ||
      lastBotMsg.includes("E qual o WhatsApp dele") ||
      lastBotMsg.includes("qual o WhatsApp") ||
      lastBotMsg.includes("qual o whatsapp") ||
      lastBotMsg.includes("WhatsApp correto");

    if (isAskingPhone) {
      const clientNameMatch =
        lastBotMsg.match(/registrar o cliente \*?([^*.]+)\*?\./i) ||
        lastBotMsg.match(/Cliente \*([^*]+)\*/i);
      let clientName =
        clientNameMatch?.[1]?.replace(/\*/g, "").trim() || sessionCtx.clientName || "Cliente";

      // 1. Se o usuário avisou que o nome está errado ("Não, o dela tá errado", "nome errado", etc.)
      if (isNameCorrectionOrErrorNotice(incomingText)) {
        await setStep("AWAITING_CLIENT_NAME");
        return `Sem problemas! Qual o nome correto do seu cliente final para a proposta comercial? (ou digite 0️⃣ para alterar o preço)`;
      }

      const { name: newName, phone } = extractNameAndPhone(incomingText);
      const digits = incomingText.replace(/\D/g, "");
      const cleanedDigits =
        digits.startsWith("55") && (digits.length === 12 || digits.length === 13)
          ? digits.slice(2)
          : digits;
      const fallbackPhone =
        cleanedDigits.length === 10 || cleanedDigits.length === 11 ? cleanedDigits : undefined;
      const resolvedPhone = phone || fallbackPhone;

      if (!resolvedPhone) {
        // Usuário enviou apenas um novo nome (sem número de telefone)
        if (isValidClientName(newName)) {
          sessionCtx.clientName = newName;
          await setStep("AWAITING_CLIENT_PHONE", { clientName: newName });
          return `Certo, corrigi o nome para *${newName}*. E qual o WhatsApp dele com DDD? (ou digite 0️⃣ para voltar)`;
        }

        return `Por favor, informe o WhatsApp do cliente com DDD (Ex: \`44 99111-7531\`):\n\n_(Ou digite 0️⃣ para voltar ao nome anterior)_`;
      }

      // Se informou nome e telefone na mesma mensagem
      if (isValidClientName(newName)) {
        clientName = newName;
      }

      sessionCtx.clientName = clientName;
      sessionCtx.clientWhatsapp = resolvedPhone;

      if (isGuestTrial) {
        return generateProposalAndReply(0);
      }

      await setStep("AWAITING_TEMPLATE_SELECTION", {
        clientName,
        clientPhone: sessionCtx.clientWhatsapp,
      });

      const isHybridQuote =
        sessionCtx.inverterType === "hybrid" ||
        sessionCtx.inverterType === "off_grid" ||
        (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
          (sessionCtx as any).batteryCapacityKwh > 0) ||
        (typeof (sessionCtx as any).batteryQuantity === "number" &&
          (sessionCtx as any).batteryQuantity > 0);

      const templates = await this.getAvailableTemplates(conversation.organizationId, {
        isHybrid: isHybridQuote,
      });
      const { text: templateListText } = formatTemplateSelectionList(templates, isHybridQuote);

      const phoneDisplay = ` e WhatsApp \`${formatPhone(resolvedPhone)}\``;

      return (
        `Cliente *${clientName}*${phoneDisplay} anotado com sucesso! 👤✨\n\n` +
        `*_Qual modelo de proposta comercial você deseja usar para o seu cliente?_*\n\n` +
        `${templateListText}\n` +
        `_(Responda com o número da opção desejada)_`
      );
    }

    // ESTADO D: O Bot pediu para escolher o modelo de proposta -> GERA PROPOSTA COMPLETA!
    if (
      currentStep === "AWAITING_TEMPLATE_SELECTION" ||
      lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")
    ) {
      // 1. Verifica se o usuário solicitou correção de dados (via áudio ou texto)
      const { name: correctedName, phone: correctedPhone } = extractNameAndPhone(incomingText);
      const isCorrection =
        isNameOrPhoneCorrectionIntent(incomingText) ||
        isNameCorrectionOrErrorNotice(incomingText) ||
        (correctedPhone && !/^[1-5]$/.test(incomingText.trim())) ||
        (isValidClientName(correctedName) && !/^[1-5]$/.test(incomingText.trim()));

      if (isCorrection) {
        let updated = false;
        if (isValidClientName(correctedName)) {
          sessionCtx.clientName = correctedName;
          updated = true;
        }
        if (correctedPhone) {
          sessionCtx.clientWhatsapp = correctedPhone;
          updated = true;
        }

        if (updated) {
          const clientName = sessionCtx.clientName || "Cliente";
          const clientPhone = sessionCtx.clientWhatsapp || "";
          await setStep("AWAITING_TEMPLATE_SELECTION", {
            clientName,
            clientPhone,
          });

          const isHybridQuote =
            sessionCtx.inverterType === "hybrid" ||
            sessionCtx.inverterType === "off_grid" ||
            (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
              (sessionCtx as any).batteryCapacityKwh > 0) ||
            (typeof (sessionCtx as any).batteryQuantity === "number" &&
              (sessionCtx as any).batteryQuantity > 0);

          const templates = await this.getAvailableTemplates(conversation.organizationId, {
            isHybrid: isHybridQuote,
          });
          const { text: templateListText } = formatTemplateSelectionList(templates, isHybridQuote);

          const phoneDisplay = clientPhone ? ` e WhatsApp \`${formatPhone(clientPhone)}\`` : "";

          return (
            `Dados corrigidos com sucesso! 👤✨\n\n` +
            `> Cliente: *${clientName}*${phoneDisplay}\n\n` +
            `*_Qual modelo de proposta comercial você deseja usar para o seu cliente?_*\n\n` +
            `${templateListText}\n` +
            `_(Responda com o número da opção desejada ou digite 0️⃣ para corrigir o nome/telefone)_`
          );
        }
      }

      // 2. Se enviou 0 ou voltar:
      if (
        lower === "0" ||
        lower === "0️⃣" ||
        lower === "voltar" ||
        lower === "rever" ||
        isNameCorrectionOrErrorNotice(incomingText)
      ) {
        await setStep("AWAITING_CLIENT_NAME");
        return `Sem problemas! Qual o nome correto do seu cliente final para a proposta comercial? (Ex: João da Silva)`;
      }

      const isHybridQuote =
        sessionCtx.inverterType === "hybrid" ||
        sessionCtx.inverterType === "off_grid" ||
        (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
          (sessionCtx as any).batteryCapacityKwh > 0) ||
        (typeof (sessionCtx as any).batteryQuantity === "number" &&
          (sessionCtx as any).batteryQuantity > 0);

      const availableTemplates = await this.getAvailableTemplates(conversation.organizationId, {
        isHybrid: isHybridQuote,
      });

      const resolution = resolveChosenTemplate(incomingText, availableTemplates, isHybridQuote);

      if (!resolution.success) {
        const { text: templateListText } = formatTemplateSelectionList(
          availableTemplates,
          isHybridQuote
        );
        if (resolution.reason === "incompatible_on_grid") {
          return (
            `⚠️ *Modelo não compatível com Sistema Híbrido/Bateria!*\n\n` +
            `O modelo comercial selecionado é exclusivo para sistemas On-Grid convencionais e não suporta armazenamento ou backup.\n` +
            `Para sistemas com baterias, selecione um dos modelos compatíveis:\n\n` +
            `${templateListText}\n` +
            `_(Digite o número do modelo híbrido ou 0️⃣ para voltar)_`
          );
        }

        return (
          `Opção não reconhecida. Por favor, selecione o *modelo de proposta*:\n\n` +
          `${templateListText}\n` +
          `_(Responda com o número da opção desejada)_`
        );
      }

      return generateProposalAndReply(resolution.chosenTemplate || 0);
    }

    // ESTADO D.1: O Bot perguntou a capacidade de baterias para o inversor híbrido
    if (
      currentStep === "AWAITING_BATTERY_STORAGE" ||
      lastBotMsg.includes("armazenamento de bateria desejado") ||
      lastBotMsg.includes("Qual o armazenamento de bateria")
    ) {
      if (
        lower === "voltar" ||
        lower === "retornar" ||
        lower === "mudar inversor" ||
        lower === "trocar tecnologia" ||
        lower === "trocar inversor"
      ) {
        await setStep("AWAITING_INVERTER_TYPE");
        return (
          `Certo! Vamos escolher a tecnologia do inversor. ⚡\n\n` + this.INVERTER_TYPE_OPTIONS_TEXT
        );
      }

      // 1. Verificar se o usuário optou por sem bateria
      const isSemBateria =
        lower === "0" ||
        lower === "0️⃣" ||
        lower === "sem" ||
        lower === "nenhuma" ||
        lower.includes("sem bateria") ||
        lower.includes("sem baterias") ||
        lower.includes("nenhuma bateria") ||
        lower.includes("apenas inversor") ||
        lower.includes("somente inversor") ||
        lower.includes("apenas híbrido") ||
        lower.includes("somente híbrido") ||
        lower.includes("0 bateria") ||
        lower.includes("zero bateria");

      if (isSemBateria) {
        sessionCtx.hasBattery = false;
        sessionCtx.batteryQty = 0;
        sessionCtx.batteryKwh = 0;
        sessionCtx.hasBms = false;

        if (sessionCtx.roofType) {
          const quotes = await kitsFor({ roofType: sessionCtx.roofType });
          if (quotes.length > 0) {
            await setStep("AWAITING_KIT_SELECTION", {
              hasBattery: false,
              batteryQty: 0,
              batteryKwh: 0,
              hasBms: false,
            });
            return (
              `*_Armazenamento Registrado:_* \`Sem baterias (somente inversor híbrido)\` 🔋\n` +
              `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
              this.formatQuotesListText(quotes, sessionCtx)
            );
          }
        }

        await setStep("AWAITING_ROOF_TYPE", {
          hasBattery: false,
          batteryQty: 0,
          batteryKwh: 0,
          hasBms: false,
        });
        return (
          `*_Armazenamento Registrado:_* \`Sem baterias (somente inversor híbrido)\` 🔋\n\n` +
          this.ROOF_OPTIONS_TEXT
        );
      }

      // 2. Extração de kWh ou quantidade de baterias
      let extractedKwh: number | undefined;
      let extractedQty: number | undefined;

      const kwhMatch =
        incomingText.match(
          /(?:baterias?|armazenamento)[^\d\n]*(\d+(?:[.,]\d+)?)\s*(?:kwh|kw)\b/i
        ) || incomingText.match(/(\d+(?:[.,]\d+)?)\s*(?:kwh|kw)\b/i);

      if (kwhMatch && kwhMatch[1]) {
        const val = parseFloat(kwhMatch[1].replace(",", "."));
        if (val > 0 && val <= 2000) {
          extractedKwh = val;
        }
      }

      const qtyMatch =
        incomingText.match(/(\d+)\s*(?:baterias?|m[oó]dulos?|packs?|unidades?|un)\b/i) ||
        incomingText.trim().match(/^(\d{1,2})$/);

      if (qtyMatch && qtyMatch[1] && !extractedKwh) {
        const val = parseInt(qtyMatch[1], 10);
        if (val > 0 && val <= 100) {
          extractedQty = val;
        }
      }

      if (extractedKwh !== undefined || extractedQty !== undefined) {
        sessionCtx.hasBattery = true;
        if (extractedKwh !== undefined) sessionCtx.batteryKwh = extractedKwh;
        if (extractedQty !== undefined) sessionCtx.batteryQty = extractedQty;

        // Trava Técnica Deye HV / Trifásico 380V:
        // Sistemas trifásicos 380V ou usinas >= 15kW usam barramento de alta tensão (HV)
        // que exige no mínimo 4 módulos de bateria e 1 BMS/Control Box para partir.
        const isHvGrid =
          sessionCtx.gridVoltage === "Trifásico 380V" ||
          (sessionCtx.targetKWp && sessionCtx.targetKWp >= 15) ||
          (sessionCtx.inverterDescription && /\bhv\b/i.test(sessionCtx.inverterDescription));

        let hvNotice = "";
        if (isHvGrid) {
          sessionCtx.batteryVoltageType = "HV";
          sessionCtx.hasBms = true;
          const minHvQty = 4;
          if (sessionCtx.batteryQty !== undefined && sessionCtx.batteryQty < minHvQty) {
            sessionCtx.batteryQty = minHvQty;
            hvNotice = `\n> ⚠️ *Aviso Técnico HV:* Para inversores híbridos de Alta Tensão (HV / Trifásico 380V), o banco exige um *mínimo técnico de 4 módulos de bateria* e *BMS (Control Box)* incluso.\n`;
          }
        } else {
          sessionCtx.batteryVoltageType = "LV";
          sessionCtx.hasBms = false;
        }

        const badgeText = sessionCtx.batteryKwh
          ? `\`${sessionCtx.batteryKwh} kWh\``
          : `\`${sessionCtx.batteryQty} baterias\``;

        if (sessionCtx.roofType) {
          const quotes = await kitsFor({ roofType: sessionCtx.roofType });
          if (quotes.length > 0) {
            await setStep("AWAITING_KIT_SELECTION", {
              batteryKwh: sessionCtx.batteryKwh,
              batteryQty: sessionCtx.batteryQty,
              batteryVoltageType: sessionCtx.batteryVoltageType,
              hasBms: sessionCtx.hasBms,
              hasBattery: true,
            });
            return (
              `*_Armazenamento Registrado:_* ${badgeText} 🔋\n` +
              hvNotice +
              `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
              this.formatQuotesListText(quotes, sessionCtx)
            );
          }
        }

        await setStep("AWAITING_ROOF_TYPE", {
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          batteryVoltageType: sessionCtx.batteryVoltageType,
          hasBms: sessionCtx.hasBms,
          hasBattery: true,
        });

        return (
          `*_Armazenamento Registrado:_* ${badgeText} 🔋\n` +
          hvNotice +
          `\n` +
          this.ROOF_OPTIONS_TEXT
        );
      }

      // Se o usuário solicitou uma correção de dimensionamento ou outra coisa
      const correctionResult = await handleDimensioningCorrection();
      if (correctionResult) return correctionResult;

      return (
        `Não consegui identificar a capacidade da bateria. Por favor, informe em kWh ou unidades (ex: \`10.24 kWh\` ou \`2 baterias\`), ou envie \`sem bateria\`:\n\n` +
        this.BATTERY_STORAGE_OPTIONS_TEXT
      );
    }

    // ESTADO D.2: O Bot perguntou a tecnologia de inversor (1-String, 2-Micro, 3-Híbrido)
    if (
      currentStep === "AWAITING_INVERTER_TYPE" ||
      lastBotMsg.includes("Qual tecnologia de inversor você prefere")
    ) {
      if (isBackCommand(incomingText)) {
        await setStep("AWAITING_ROOF_TYPE");
        return `Certo! Vamos alterar a estrutura do telhado. 🏠\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      // Opção 1: Inversor Tradicional (String)
      const isChoiceString =
        lower === "1" ||
        lower === "1." ||
        lower.includes("1️⃣") ||
        lower === "string" ||
        lower === "tradicional" ||
        lower === "inversor tradicional" ||
        lower.includes("string") ||
        lower.includes("tradicional");

      // Opção 2: Microinversor
      const isChoiceMicro =
        lower === "2" ||
        lower === "2." ||
        lower.includes("2️⃣") ||
        lower === "micro" ||
        lower === "microinversor" ||
        lower === "microinversores" ||
        lower.includes("micro");

      // Opção 3: Inversor Híbrido
      const isChoiceHybrid =
        lower === "3" ||
        lower === "3." ||
        lower.includes("3️⃣") ||
        lower === "hibrido" ||
        lower === "híbrido" ||
        lower === "inversor hibrido" ||
        lower === "inversor híbrido" ||
        lower.includes("hibrid") ||
        lower.includes("híbrid");

      if (isChoiceString) {
        sessionCtx.inverterType = "string";
        const quotes = await kitsFor({ inverterType: "string" });
        if (quotes.length === 0) return NO_KITS_TEXT;
        await setStep("AWAITING_KIT_SELECTION", { inverterType: "string" });
        return (
          `*_Tecnologia Selecionada:_* \`Inversor Tradicional (String)\` ⚡\n` +
          `> 🏠 Estrutura: *${sessionCtx.roofType || "Estrutura Padrão"}*\n\n` +
          this.formatQuotesListText(quotes, sessionCtx)
        );
      }

      if (isChoiceMicro) {
        sessionCtx.inverterType = "microinverter";
        const quotes = await kitsFor({ inverterType: "microinverter" });
        if (quotes.length === 0) return NO_KITS_TEXT;
        await setStep("AWAITING_KIT_SELECTION", { inverterType: "microinverter" });
        return (
          `*_Tecnologia Selecionada:_* \`Microinversor\` ⚡\n` +
          `> 🏠 Estrutura: *${sessionCtx.roofType || "Estrutura Padrão"}*\n\n` +
          this.formatQuotesListText(quotes, sessionCtx)
        );
      }

      if (isChoiceHybrid) {
        sessionCtx.inverterType = "hybrid";
        await setStep("AWAITING_BATTERY_STORAGE", { inverterType: "hybrid" });
        return (
          `*_Tecnologia Selecionada:_* \`Inversor Híbrido\` ⚡\n\n` +
          this.BATTERY_STORAGE_OPTIONS_TEXT
        );
      }

      const correctionResult = await handleDimensioningCorrection();
      if (correctionResult) return correctionResult;

      return (
        `Opção não reconhecida. Por favor, responda com o número da opção desejada (1, 2 ou 3) ou envie 0️⃣ para voltar:\n\n` +
        this.INVERTER_TYPE_OPTIONS_TEXT
      );
    }

    // ESTADO E: O Bot perguntou a estrutura do telhado OU o usuário respondeu a estrutura
    const roofMatch = [
      { key: "1", name: "Cerâmica (Colonial)" },
      { key: "1️⃣", name: "Cerâmica (Colonial)" },
      { key: "2", name: "Fibrocimento" },
      { key: "2️⃣", name: "Fibrocimento" },
      { key: "3", name: "Metálico" },
      { key: "3️⃣", name: "Metálico" },
      { key: "4", name: "Solo" },
      { key: "4️⃣", name: "Solo" },
      { key: "5", name: "Laje" },
      { key: "5️⃣", name: "Laje" },
      { key: "6", name: "Fibrometal" },
      { key: "6️⃣", name: "Fibrometal" },
      { key: "7", name: "Sem estrutura" },
      { key: "7️⃣", name: "Sem estrutura" },
      { key: "cerâmica", name: "Cerâmica (Colonial)" },
      { key: "ceramica", name: "Cerâmica (Colonial)" },
      { key: "colonial", name: "Cerâmica (Colonial)" },
      { key: "fibrocimento", name: "Fibrocimento" },
      { key: "fibromadeira", name: "Fibrocimento" },
      { key: "metálico", name: "Metálico" },
      { key: "metalico", name: "Metálico" },
      { key: "metal", name: "Metálico" },
      { key: "solo", name: "Solo" },
      { key: "laje", name: "Laje" },
      { key: "fibrometal", name: "Fibrometal" },
      { key: "sem estrutura", name: "Sem estrutura" },
      { key: "sem", name: "Sem estrutura" },
      { key: "nenhuma", name: "Sem estrutura" },
    ].find((r) => lower === r.key || lower.includes(r.key));

    if (
      currentStep === "AWAITING_ROOF_TYPE" ||
      lastBotMsg.includes("Qual a estrutura do telhado") ||
      lastBotMsg.includes("estrutura do telhado")
    ) {
      if (roofMatch) {
        const selectedRoof = roofMatch.name;
        sessionCtx.roofType = selectedRoof;

        // Se o integrador já especificou a tecnologia previamente:
        if (sessionCtx.inverterType) {
          if (
            sessionCtx.inverterType === "hybrid" &&
            !sessionCtx.hasBattery &&
            sessionCtx.batteryKwh === undefined &&
            sessionCtx.batteryQty === undefined
          ) {
            await setStep("AWAITING_BATTERY_STORAGE", { roofType: selectedRoof });
            return (
              `*_Estrutura Selecionada:_* \`${selectedRoof}\` 🏠\n\n` +
              this.BATTERY_STORAGE_OPTIONS_TEXT
            );
          }

          const quotes = await kitsFor({ roofType: selectedRoof });
          if (quotes.length === 0) return NO_KITS_TEXT;

          await setStep("AWAITING_KIT_SELECTION", { roofType: selectedRoof });

          return (
            `*_Estrutura Selecionada:_* \`${selectedRoof}\` 🏠\n\n` +
            this.formatQuotesListText(quotes, sessionCtx)
          );
        }

        // Caso contrário, pergunta a tecnologia desejada de forma evidente!
        await setStep("AWAITING_INVERTER_TYPE", { roofType: selectedRoof });
        return (
          `*_Estrutura Selecionada:_* \`${selectedRoof}\` 🏠\n\n` + this.INVERTER_TYPE_OPTIONS_TEXT
        );
      }

      const correctionResult = await handleDimensioningCorrection();
      if (correctionResult) return correctionResult;

      return (
        `Opção de telhado não reconhecida. Por favor, responda com o número da opção (1 a 7) ou envie 0️⃣ para voltar:\n\n` +
        this.ROOF_OPTIONS_TEXT
      );
    }

    // ESTADO E.1: O Bot perguntou se deseja seguir com o preço padrão configurado ou informar outro preço por kWp
    if (
      currentStep === "AWAITING_PRICE_CONFIRMATION" ||
      lastBotMsg.includes("preço padrão") ||
      lastBotMsg.includes("taxa padrão configurada") ||
      lastBotMsg.includes("Como você deseja prosseguir para esta cotação?") ||
      lastBotMsg.includes("Como deseja prosseguir para esta cotação")
    ) {
      const orgDefaultRate = await this.getOrganizationDefaultKwpRate(conversation.organizationId);
      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
      if (!quote) return NO_KITS_TEXT;

      // Opção 1: Seguir com o preço padrão da conta
      const isChoice1 =
        lower === "1" ||
        lower === "1." ||
        lower.includes("1️⃣") ||
        lower === "opcao 1" ||
        lower === "opção 1" ||
        lower === "padrao" ||
        lower === "padrão" ||
        lower === "seguir" ||
        lower === "sim" ||
        lower === "manter" ||
        lower === "continuar";

      if (isChoice1) {
        sessionCtx.customRatePerKwp = orgDefaultRate;
        await setStep("AWAITING_CLIENT_NAME", { kwpRate: orgDefaultRate });
        return this.buildPriceAppliedText(quote, orgDefaultRate);
      }

      // Opção 2: Deseja informar outro preço por kWp
      const isChoice2 =
        lower === "2" ||
        lower === "2." ||
        lower.includes("2️⃣") ||
        lower === "opcao 2" ||
        lower === "opção 2" ||
        lower === "editar" ||
        lower === "outro" ||
        lower === "mudar" ||
        lower === "alterar" ||
        lower === "trocar";

      if (isChoice2) {
        await setStep("AWAITING_CUSTOM_PRICE");
        return (
          `*_Personalização de Preço por kWp_* 💰\n\n` +
          `Kit selecionado: *${quote.distributorName}* (\`${quote.kwp} kWp\`)\n\n` +
          `*_Qual preço você deseja utilizar para esta cotação?_*\n\n` +
          `> 💵 *Por kWp:* ex: \`2500\`, \`R$ 3.200,00\` ou \`4000\`\n` +
          `> 🏷️ *Ou valor total do projeto:* ex: \`total 18500\` (calculado automaticamente)\n` +
          `> 0️⃣ *Voltar*\n\n` +
          `_(Envie o valor desejado ou 0️⃣ para voltar)_`
        );
      }

      // Usuário digitou o valor diretamente (ex: "4000", "2500", "R$ 3.200", "4.000/kwp", "total 18500")
      const directParsed = parseKwpRate(incomingText, quote.kwp);
      if (directParsed) {
        sessionCtx.customRatePerKwp = directParsed.rate;
        await setStep("AWAITING_CLIENT_NAME", { kwpRate: directParsed.rate });
        return this.buildPriceAppliedText(
          quote,
          directParsed.rate,
          directParsed.isDerivedFromTotal
        );
      }

      const correctionResult = await handleDimensioningCorrection();
      if (correctionResult) return correctionResult;

      return `Opção não reconhecida.\n\n` + this.buildPriceQuestionText(quote, orgDefaultRate);
    }

    // ESTADO E.2: O Bot pediu especificamente para digitar o preço por kWp
    if (
      currentStep === "AWAITING_CUSTOM_PRICE" ||
      lastBotMsg.includes("Qual preço você deseja utilizar") ||
      lastBotMsg.includes("Qual valor por kWp") ||
      lastBotMsg.includes("Qual valor você deseja utilizar")
    ) {
      const quotes = await kitsFor();
      if (quotes.length === 0) return NO_KITS_TEXT;
      const quote = quotes[sessionCtx.chosenQuoteIndex] || quotes[0];
      if (!quote) return NO_KITS_TEXT;
      const parsedRateObj = parseKwpRate(incomingText, quote.kwp);
      if (parsedRateObj) {
        sessionCtx.customRatePerKwp = parsedRateObj.rate;
        await setStep("AWAITING_CLIENT_NAME", { kwpRate: parsedRateObj.rate });
        return this.buildPriceAppliedText(
          quote,
          parsedRateObj.rate,
          parsedRateObj.isDerivedFromTotal
        );
      }

      const customPriceCorrection = await handleDimensioningCorrection();
      if (customPriceCorrection) return customPriceCorrection;

      return (
        `Valor não reconhecido. Por favor, informe o preço por kWp desejado:\n\n` +
        `> Ex: \`2500\`, \`R$ 3.200,00\`, \`4000\` ou \`total 18500\`\n` +
        `> Envie 0️⃣ para voltar\n\n` +
        `_(Qual preço você deseja utilizar para esta cotação?)_`
      );
    }

    // ESTADO E.3: O Bot perguntou o valor da conta de luz em R$
    if (
      currentStep === "AWAITING_BILL_VALUE" ||
      lastBotMsg.includes("Qual é o valor médio da conta de luz atual em R$?") ||
      lastBotMsg.includes("valor médio da conta de luz atual em R$")
    ) {
      // 1. Se o usuário quiser pular ou estimar pela tarifa regional
      if (isSkipBillValueInput(incomingText)) {
        sessionCtx.billValue = undefined;

        const hasCompleteVoltage = Boolean(sessionCtx.gridVoltage?.includes("V"));
        if (hasCompleteVoltage && sessionCtx.roofType) {
          const quotes = await kitsFor({ roofType: sessionCtx.roofType });
          if (quotes.length > 0) {
            await setStep("AWAITING_KIT_SELECTION", { billValue: undefined });
            return (
              `Perfeito! Usaremos a tarifa média estimada da sua concessionária. ⚡\n\n` +
              this.formatQuotesListText(quotes, sessionCtx)
            );
          }
        }

        if (hasCompleteVoltage && !sessionCtx.roofType) {
          await setStep("AWAITING_ROOF_TYPE", { billValue: undefined });
          return (
            `Perfeito! Usaremos a tarifa média estimada da sua concessionária. ⚡\n\n` +
            this.ROOF_OPTIONS_TEXT
          );
        }

        await setStep("AWAITING_GRID_TYPE", { billValue: undefined });
        const isLargeKit = Boolean(
          (sessionCtx.targetKWp && sessionCtx.targetKWp >= 15) ||
          (sessionCtx.targetModules && sessionCtx.targetModules >= 26) ||
          (sessionCtx.consumptionKwh && sessionCtx.consumptionKwh >= 2500)
        );
        const gridPrompt = isLargeKit
          ? this.buildLargeKitGridQuestionText(
              sessionCtx.targetKWp
                ? this.formatPowerBadge(sessionCtx.targetKWp)
                : sessionCtx.consumptionKwh
                  ? `${sessionCtx.consumptionKwh} kWh/mês`
                  : "grande porte"
            )
          : this.GRID_OPTIONS_TEXT;

        return (
          `Perfeito! Usaremos a tarifa média estimada da sua concessionária. ⚡\n\n` +
          `Qual o padrão de entrada da instalação?\n\n` +
          gridPrompt
        );
      }

      // 2. Extração do valor informado
      const parsedBill = parseBillValueInput(incomingText);
      if (parsedBill !== null && parsedBill >= 25 && parsedBill <= 1_000_000) {
        sessionCtx.billValue = parsedBill;

        const hasCompleteVoltage = Boolean(sessionCtx.gridVoltage?.includes("V"));
        if (hasCompleteVoltage && sessionCtx.roofType) {
          const quotes = await kitsFor({ roofType: sessionCtx.roofType });
          if (quotes.length > 0) {
            await setStep("AWAITING_KIT_SELECTION", { billValue: parsedBill });
            return (
              `*_Valor da Conta Registrado:_* *${parsedBill.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}* 💡\n\n` +
              this.formatQuotesListText(quotes, sessionCtx)
            );
          }
        }

        if (hasCompleteVoltage && !sessionCtx.roofType) {
          await setStep("AWAITING_ROOF_TYPE", { billValue: parsedBill });
          return (
            `*_Valor da Conta Registrado:_* *${parsedBill.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}* 💡\n\n` +
            this.ROOF_OPTIONS_TEXT
          );
        }

        await setStep("AWAITING_GRID_TYPE", { billValue: parsedBill });
        const isLargeKit = Boolean(
          (sessionCtx.targetKWp && sessionCtx.targetKWp >= 15) ||
          (sessionCtx.targetModules && sessionCtx.targetModules >= 26) ||
          (sessionCtx.consumptionKwh && sessionCtx.consumptionKwh >= 2500)
        );
        const gridPrompt = isLargeKit
          ? this.buildLargeKitGridQuestionText(
              sessionCtx.targetKWp
                ? this.formatPowerBadge(sessionCtx.targetKWp)
                : sessionCtx.consumptionKwh
                  ? `${sessionCtx.consumptionKwh} kWh/mês`
                  : "grande porte"
            )
          : this.GRID_OPTIONS_TEXT;

        return (
          `*_Valor da Conta Registrado:_* *${parsedBill.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}* 💡\n\n` +
          `Qual o padrão de entrada da instalação?\n\n` +
          gridPrompt
        );
      }

      // 3. Verifica correção de dimensionamento
      const billCorrection = await handleDimensioningCorrection();
      if (billCorrection) return billCorrection;

      // 4. Fallback orientativo
      return (
        `Valor não reconhecido. 💡\n\n` +
        `Por favor, informe o valor médio da conta de luz em reais:\n` +
        `> Exemplo: \`850\` ou \`R$ 850,00\`\n` +
        `> Ou envie *0* para estimar automaticamente pela tarifa regional.\n\n` +
        `_(Ou digite 0️⃣ para voltar)_`
      );
    }

    // ESTADO F: O Bot perguntou o padrão de entrada da rede elétrica
    if (
      currentStep === "AWAITING_GRID_TYPE" ||
      lastBotMsg.includes("Qual o padrão de entrada da instalação?") ||
      lastBotMsg.includes("rede trifásica") ||
      lastBotMsg.includes("tensão da rede trifásica") ||
      lastBotMsg.includes("220V ou 380V")
    ) {
      // Verifica se o usuário enviou explicitamente uma localização para corrigir (ex: "Cuiabá/MT", "mudar cidade para Curitiba")
      const wantsToChangeLocation =
        lower.startsWith("mudar cidade") ||
        lower.startsWith("trocar cidade") ||
        lower.startsWith("alterar cidade") ||
        isLocationInput(incomingText);

      if (wantsToChangeLocation) {
        const hspRes = getHsp(incomingText);
        if (hspRes && (isLocationInput(incomingText) || hspRes.exact)) {
          if (hspRes.isStateOnly && hspRes.uf) {
            const stateTitle = UF_TO_STATE_TITLE[hspRes.uf] || hspRes.uf;
            const capital = STATE_CAPITALS[hspRes.uf] || "";
            sessionCtx.estado = hspRes.uf;
            delete sessionCtx.cidade;
            await setStep("AWAITING_CITY", {
              ...storedSessionData,
              uf: hspRes.uf,
            });
            return (
              `*_Estado Identificado:_* *${stateTitle} (${hspRes.uf})* 📍\n\n` +
              `Para qual cidade de ${stateTitle} será a instalação?\n` +
              `> Responda com a cidade (ex: \`${capital}\`) ou responda 1️⃣ para utilizar a capital (*${capital}/${hspRes.uf}*).\n\n` +
              `_(Ou envie 0️⃣ para voltar ao menu inicial)_`
            );
          }

          if (hspRes.ambiguous && hspRes.candidates && hspRes.candidates.length > 1) {
            await setStep("AWAITING_CITY_STATE", {
              pendingCityCandidates: hspRes.candidates,
              pendingCityName: hspRes.city,
            });
            return this.buildAmbiguousCityPrompt(hspRes.city, hspRes.candidates);
          }
          delete sessionCtx.pendingCityCandidates;
          delete sessionCtx.pendingCityName;
          sessionCtx.cidade = hspRes.city;
          sessionCtx.estado = hspRes.uf;
          sessionCtx.hsp = hspRes.hsp;
          await setStep("AWAITING_GRID_TYPE", {
            cidade: hspRes.city,
            uf: hspRes.uf,
            hsp: hspRes.hsp,
          });
          return (
            `*_Localização Corrigida com Sucesso!_* 📍☀️\n\n` +
            `> Cidade: \`${hspRes.city}/${hspRes.uf}\`\n` +
            `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }
      }

      const isTrifasicoSpecificPrompt =
        lastBotMsg.includes("tensão da rede trifásica") ||
        lastBotMsg.includes("rede trifásica da instalação é 220V ou 380V") ||
        lastBotMsg.includes("rede trifásica é 220V ou 380V") ||
        lastBotMsg.includes("A rede trifásica do cliente é 220V ou 380V") ||
        lastBotMsg.includes("Responda 1 para 220V ou 2 para 380V");

      let chosenGrid = "";
      if (isTrifasicoSpecificPrompt) {
        if (
          lower === "1" ||
          lower === "1." ||
          lower.includes("1️⃣") ||
          lower === "220" ||
          lower === "220v" ||
          lower.includes("tri 220") ||
          lower.includes("tri_220") ||
          lower.includes("trifásico 220") ||
          lower.includes("trifasico 220")
        ) {
          chosenGrid = "Trifásico 220V";
        } else if (
          lower === "2" ||
          lower === "2." ||
          lower.includes("2️⃣") ||
          lower === "380" ||
          lower === "380v" ||
          lower.includes("tri 380") ||
          lower.includes("tri_380") ||
          lower.includes("trifásico 380") ||
          lower.includes("trifasico 380")
        ) {
          chosenGrid = "Trifásico 380V";
        } else if (
          lower === "3" ||
          lower === "3." ||
          lower.includes("3️⃣") ||
          lower.includes("bi") ||
          lower.includes("127/220")
        ) {
          chosenGrid = "Bifásico 127V/220V";
        } else if (
          lower === "4" ||
          lower === "4." ||
          lower.includes("4️⃣") ||
          lower.includes("mono")
        ) {
          chosenGrid = "Monofásico 220V";
        }
      } else {
        if (lower === "1" || lower === "1." || lower.includes("1️⃣") || lower.includes("mono")) {
          chosenGrid = "Monofásico 220V";
        } else if (
          lower === "2" ||
          lower === "2." ||
          lower.includes("2️⃣") ||
          lower.includes("bi") ||
          lower.includes("127/220")
        ) {
          chosenGrid = "Bifásico 127V/220V";
        } else if (
          lower === "3" ||
          lower === "3." ||
          lower.includes("3️⃣") ||
          lower.includes("tri 220") ||
          lower.includes("tri_220") ||
          lower.includes("trifásico 220") ||
          lower.includes("trifasico 220")
        ) {
          chosenGrid = "Trifásico 220V";
        } else if (
          lower === "4" ||
          lower === "4." ||
          lower.includes("4️⃣") ||
          lower.includes("tri 380") ||
          lower.includes("tri_380") ||
          lower.includes("trifásico 380") ||
          lower.includes("trifasico 380") ||
          lower === "380" ||
          lower === "380v"
        ) {
          chosenGrid = "Trifásico 380V";
        } else if (lower === "220" || lower === "220v") {
          if (sessionCtx.targetKWp && sessionCtx.targetKWp >= 8) {
            chosenGrid = "Trifásico 220V";
          } else {
            chosenGrid = "Monofásico 220V";
          }
        }
      }

      // Se o usuário digitou apenas "trifásico" / "tri" sem especificar a tensão
      if (
        !chosenGrid &&
        (lower === "trifasico" ||
          lower === "trifásico" ||
          lower === "tri" ||
          lower.includes("trifas") ||
          lower.includes("trifás"))
      ) {
        return (
          `*_A rede trifásica é 220V ou 380V?_* ⚡\n\n` +
          `Como o modelo do inversor varia conforme a tensão da rede, por favor informe:\n\n` +
          `> 1️⃣ *Trifásico 220V* (127V / 220V)\n` +
          `> 2️⃣ *Trifásico 380V* (220V / 380V)\n\n` +
          `_(Responda 1 para 220V ou 2 para 380V)_`
        );
      }

      if (chosenGrid) {
        sessionCtx.gridVoltage = chosenGrid;

        if (!sessionCtx.cidade) {
          await setStep("AWAITING_CITY", {
            ...storedSessionData,
            gridType: chosenGrid,
            uf: sessionCtx.estado,
          });
          if (sessionCtx.estado) {
            const stateTitle = UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado;
            const capital = STATE_CAPITALS[sessionCtx.estado] || "";
            const capitalPrompt = capital
              ? ` ou responda 1️⃣ para a capital (*${capital}/${sessionCtx.estado}*)`
              : "";
            return (
              `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n\n` +
              `Identifiquei o estado de *${stateTitle} (${sessionCtx.estado})* 📍.\n\n` +
              `Para qual cidade de ${stateTitle} será a instalação?\n` +
              `> Responda com a cidade (ex: \`${capital || "Maceió"}\`)${capitalPrompt}.`
            );
          }
          return (
            `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
          );
        }

        if (
          sessionCtx.inverterType === "hybrid" &&
          sessionCtx.hasBattery === undefined &&
          sessionCtx.batteryKwh === undefined &&
          sessionCtx.batteryQty === undefined
        ) {
          await setStep("AWAITING_BATTERY_STORAGE", {
            gridType: chosenGrid,
            inverterType: "hybrid",
          });
          return (
            `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n\n` +
            this.BATTERY_STORAGE_OPTIONS_TEXT
          );
        }

        if (sessionCtx.roofType) {
          if (sessionCtx.inverterType) {
            const quotes = await kitsFor({ roofType: sessionCtx.roofType });
            if (quotes.length > 0) {
              await setStep("AWAITING_KIT_SELECTION", {
                gridType: chosenGrid,
                roofType: sessionCtx.roofType,
              });
              return (
                `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n` +
                `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
                this.formatQuotesListText(quotes, sessionCtx)
              );
            }
          }

          await setStep("AWAITING_INVERTER_TYPE", {
            gridType: chosenGrid,
            roofType: sessionCtx.roofType,
          });
          return (
            `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n` +
            `> 🏠 Estrutura: *${sessionCtx.roofType}*\n\n` +
            this.INVERTER_TYPE_OPTIONS_TEXT
          );
        }

        await setStep("AWAITING_ROOF_TYPE", { gridType: chosenGrid });
        return `*_Padrão Elétrico Registrado:_* \`${chosenGrid}\` ⚡\n\n` + this.ROOF_OPTIONS_TEXT;
      }

      const gridCorrection = await handleDimensioningCorrection();
      if (gridCorrection) return gridCorrection;

      const fallbackPrompt = isTrifasicoSpecificPrompt
        ? this.TRIFASICO_VOLTAGE_QUESTION_TEXT
        : this.GRID_OPTIONS_TEXT;

      return (
        `Opção não reconhecida. Por favor, responda com o número da opção desejada ou envie 0️⃣ para voltar:\n\n` +
        fallbackPrompt
      );
    }

    const invalidWordsCommon = new Set([
      "nenhuma",
      "nenhum",
      "nada",
      "nao",
      "não",
      "sei nao",
      "sei não",
      "nao sei",
      "não sei",
      "sei la",
      "sei lá",
      "ok",
      "sim",
      "teste",
      "cancelar",
      "voltar",
    ]);

    // ESTADO G-2: O Bot perguntou qual é o estado de uma cidade que tem múltiplos homônimos no Brasil (ex: Belém -> PA, AL, PB)
    const isAskingCityState =
      currentStep === "AWAITING_CITY_STATE" ||
      Boolean(sessionCtx.pendingCityCandidates && sessionCtx.pendingCityCandidates.length > 0) ||
      lastBotMsg.includes("Encontrei mais de um município chamado") ||
      lastBotMsg.includes("Para qual estado será a instalação?") ||
      lastBotMsg.includes("Em qual estado será a instalação?");

    if (isAskingCityState) {
      const candidates = (sessionCtx.pendingCityCandidates || []) as MunicipalityCandidate[];
      const cityName = sessionCtx.pendingCityName || "informada";

      // 1. Se o usuário digitou 0 ou voltar:
      if (isBackCommand(incomingText)) {
        delete sessionCtx.pendingCityCandidates;
        delete sessionCtx.pendingCityName;
        await setStep("AWAITING_CITY");
        return (
          `Certo! Vamos alterar a localização. 📍\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: \`Cuiabá/MT\`, \`Maringá/PR\`, \`São Paulo/SP\`)`
        );
      }

      // 2. Tenta selecionar por número da opção (1, 2, 3...)
      const cleanNum = incomingText.trim().replace(/[️⃣.]/g, "");
      const selectedIndex = parseInt(cleanNum, 10) - 1;
      let matchedCandidate: MunicipalityCandidate | null =
        !isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < candidates.length
          ? candidates[selectedIndex] || null
          : null;

      // 3. Tenta selecionar por sigla do estado (ex: "PA", "AL", "PB") ou nome do estado (ex: "Pará", "Alagoas")
      if (!matchedCandidate) {
        const inputNorm = normalizeTextSimple(incomingText);
        matchedCandidate =
          candidates.find(
            (c) =>
              c.uf.toUpperCase() === inputNorm ||
              (c.stateName && normalizeTextSimple(c.stateName) === inputNorm) ||
              inputNorm === c.uf.toUpperCase() ||
              new RegExp(`\\b${c.uf}\\b`, "i").test(incomingText)
          ) || null;
      }

      // 4. Se o usuário enviou uma nova cidade diferente (ex: mudou de ideia e digitou "Maringá" ou "Curitiba"):
      if (!matchedCandidate) {
        const newHsp = getHsp(incomingText);
        if (
          !invalidWordsCommon.has(lower) &&
          (isLocationInput(incomingText) || newHsp.exact) &&
          normalizeTextSimple(newHsp.city) !== normalizeTextSimple(cityName)
        ) {
          delete sessionCtx.pendingCityCandidates;
          delete sessionCtx.pendingCityName;
          if (newHsp.ambiguous && newHsp.candidates && newHsp.candidates.length > 1) {
            await setStep("AWAITING_CITY_STATE", {
              pendingCityCandidates: newHsp.candidates,
              pendingCityName: newHsp.city,
            });
            return this.buildAmbiguousCityPrompt(newHsp.city, newHsp.candidates);
          }
          return this.finalizeLocationSelection(newHsp, sessionCtx, setStep, kitsFor);
        }
      }

      // 5. Se selecionou com sucesso um dos candidatos:
      if (matchedCandidate) {
        delete sessionCtx.pendingCityCandidates;
        delete sessionCtx.pendingCityName;
        const finalizedHsp: HspLookupResult = {
          city: matchedCandidate.city,
          uf: matchedCandidate.uf,
          hsp: matchedCandidate.hsp,
          exact: true,
          ambiguous: false,
        };
        return this.finalizeLocationSelection(finalizedHsp, sessionCtx, setStep, kitsFor);
      }

      // 6. Resposta não reconhecida: reapresenta as opções
      return (
        `Não identifiquei a opção para *${cityName}*. 📍\n\n` +
        `Por favor, escolha o estado da instalação:\n` +
        this.buildAmbiguousCityPrompt(cityName, candidates)
      );
    }

    // ESTADO G: O Bot perguntou a cidade da instalação
    const isAskingCity =
      currentStep === "AWAITING_CITY" ||
      lastBotMsg.includes("Para qual cidade e estado será a instalação") ||
      lastBotMsg.includes("Para qual cidade de") ||
      lastBotMsg.includes("Estado Identificado:") ||
      lastBotMsg.includes("Vamos alterar a localização") ||
      lastBotMsg.includes("Vamos corrigir a localização") ||
      lastBotMsg.includes("Não identifiquei o município") ||
      lastBotMsg.includes("Não identifiquei a cidade") ||
      lastBotMsg.includes("informe a cidade e a sigla do estado") ||
      lastBotMsg.includes("informe a cidade e estado") ||
      lastBotMsg.includes("cidade e a sigla do estado onde será a instalação") ||
      lastBotMsg.includes("cidade e estado da instalação solar");

    if (isAskingCity) {
      // Se o usuário enviou uma correção ou novo dado de consumo/potência em vez de cidade (ex: "não, é 450 kwh", "450 kw hora", "450kw mes", "mudar para 600 kwh"):
      const correctedConsumption = parseConsumptionInput(incomingText);
      const correctedPower = parsePowerInput(incomingText);
      if (correctedConsumption !== null && correctedPower === null) {
        sessionCtx.consumptionKwh = correctedConsumption;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        await setStep("AWAITING_CITY", {
          consumptionKwh: correctedConsumption,
          kwp: undefined,
          moduleCount: undefined,
          uf: sessionCtx.estado,
        });
        const prompt = sessionCtx.estado
          ? `Identifiquei o estado de *${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} (${sessionCtx.estado})* 📍.\n\nPara qual cidade de ${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} será a instalação?\n> Responda com a cidade (ex: \`${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}\`) ou responda 1️⃣ para a capital (*${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}/${sessionCtx.estado}*).`
          : `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`;
        return `*_Consumo Registrado:_* \`${correctedConsumption} kWh/mês\` ☀️\n\n${prompt}`;
      }
      if (correctedPower !== null && correctedPower >= 0.5) {
        sessionCtx.targetKWp = correctedPower;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        const formattedPower = this.formatPowerBadge(correctedPower);
        await setStep("AWAITING_CITY", {
          kwp: correctedPower,
          consumptionKwh: undefined,
          moduleCount: undefined,
          uf: sessionCtx.estado,
        });
        const prompt = sessionCtx.estado
          ? `Identifiquei o estado de *${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} (${sessionCtx.estado})* 📍.\n\nPara qual cidade de ${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} será a instalação?\n> Responda com a cidade (ex: \`${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}\`) ou responda 1️⃣ para a capital (*${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}/${sessionCtx.estado}*).`
          : `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`;
        return `*_Potência Solicitada:_* \`${formattedPower}\` ☀️\n\n${prompt}`;
      }

      // 0. Se já tínhamos um estado pendente e o usuário respondeu "1" ou "capital" para usar a capital daquele estado:
      const currentKnownUf = sessionCtx.estado || storedSessionData.uf;
      const isSelectingCapital =
        (lower === "1" ||
          lower === "1." ||
          lower.includes("1️⃣") ||
          lower === "capital" ||
          lower.includes("capital")) &&
        Boolean(currentKnownUf && STATE_CAPITALS[currentKnownUf]);

      if (isSelectingCapital && currentKnownUf && STATE_CAPITALS[currentKnownUf]) {
        const capitalName = STATE_CAPITALS[currentKnownUf];
        const capitalHsp = getHsp(capitalName, currentKnownUf);
        return this.finalizeLocationSelection(capitalHsp, sessionCtx, setStep, kitsFor);
      }

      // Se o usuário digitou "nenhuma", "manter", "mesma", etc. e já tinha uma cidade registrada:
      const keepExistingCity =
        (lower === "nenhuma" ||
          lower === "nenhum" ||
          lower === "manter" ||
          lower === "mesma" ||
          lower === "não" ||
          lower === "nao" ||
          lower.includes("manter") ||
          lower.includes("nao mudar") ||
          lower.includes("não mudar") ||
          lower.includes("deixar como")) &&
        Boolean(sessionCtx.cidade && sessionCtx.estado);

      if (keepExistingCity && sessionCtx.cidade && sessionCtx.estado) {
        const hspRes = getHsp(sessionCtx.cidade, sessionCtx.estado);
        await setStep("AWAITING_GRID_TYPE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          hsp: hspRes.hsp,
        });
        return (
          `*_Localização Mantida:_* \`${sessionCtx.cidade}/${sessionCtx.estado}\` 📍☀️\n\n` +
          `> Irradiação Solar: \`${hspRes.hsp.toFixed(2)} kWh/m²/dia\`\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }

      const lookupUf = currentKnownUf || undefined;
      const hspRes = getHsp(incomingText, lookupUf);

      // Se a resposta for exclusivamente um Estado (ex: usuário digitou "Alagoas" ou "AL" na pergunta de cidade):
      if (hspRes.isStateOnly && hspRes.uf) {
        const stateUf = hspRes.uf;
        const stateTitle = UF_TO_STATE_TITLE[stateUf] || stateUf;
        const capital = STATE_CAPITALS[stateUf] || "";
        sessionCtx.estado = stateUf;
        delete sessionCtx.cidade;
        await setStep("AWAITING_CITY", {
          ...storedSessionData,
          uf: stateUf,
        });
        return (
          `*_Estado Identificado:_* *${stateTitle} (${stateUf})* 📍\n\n` +
          `Para qual cidade de ${stateTitle} será a instalação?\n` +
          `> Responda com a cidade (ex: \`${capital}\`) ou responda 1️⃣ para utilizar a capital (*${capital}/${stateUf}*).\n\n` +
          `_(Ou envie 0️⃣ para voltar ao menu inicial)_`
        );
      }

      const isRecognizedLocation =
        !invalidWordsCommon.has(lower) &&
        (isLocationInput(incomingText) || hspRes.exact) &&
        Boolean(hspRes.city) &&
        !invalidWordsCommon.has(hspRes.city.toLowerCase());

      if (isRecognizedLocation) {
        // Se a cidade existe em mais de um estado no Brasil e o usuário não especificou a UF:
        if (hspRes.ambiguous && hspRes.candidates && hspRes.candidates.length > 1) {
          await setStep("AWAITING_CITY_STATE", {
            pendingCityCandidates: hspRes.candidates,
            pendingCityName: hspRes.city,
          });
          return this.buildAmbiguousCityPrompt(hspRes.city, hspRes.candidates);
        }

        return this.finalizeLocationSelection(hspRes, sessionCtx, setStep, kitsFor);
      }

      return (
        `Não identifiquei o município "*${incomingText.trim()}*". 📍\n\n` +
        `Por favor, informe a cidade e a sigla do estado onde será a instalação:\n` +
        `> Exemplo: \`Cuiabá/MT\`, \`Maringá/PR\` ou \`São Paulo/SP\`\n\n` +
        `_(Ou envie 0️⃣ para voltar ao menu inicial)_`
      );
    }

    const isMainMenu =
      lastBotMsg.includes("Como posso ajudar você a gerar orçamentos hoje") ||
      lastBotMsg.includes("escolha como deseja iniciar") ||
      lastBotMsg.includes("Não compreendi sua mensagem") ||
      lastBotMsg.includes("Sou seu assistente de vendas") ||
      lastBotMsg.includes("encerramos este atendimento") ||
      lastBotMsg.includes("Quando quiser iniciar uma nova cotação") ||
      (lastBotMsg.includes("Simular por consumo mensal") &&
        lastBotMsg.includes("Simular por potência de pico"));

    // ESTADO: O Bot perguntou o consumo médio mensal em kWh
    const isAskingConsumption =
      !isMainMenu &&
      (lastBotMsg.includes("Simulação por Consumo Mensal") ||
        lastBotMsg.includes("consumo médio mensal") ||
        lastBotMsg.includes("consumo em kWh") ||
        lastBotMsg.includes("informe seu consumo (kWh)") ||
        lastBotMsg.includes("qual é o consumo") ||
        lastBotMsg.includes("qual o consumo"));

    if (isAskingConsumption) {
      let consumo: number | null = parseConsumptionInput(incomingText);
      if (consumo === null) {
        const kwhMatch = incomingText.match(/(\d+[\d.,]*)\s*(?:kwh|kw)?(?:\/m[eê]s)?/i);
        if (kwhMatch && kwhMatch[1]) {
          const rawKwh = parsePtBrNumber(kwhMatch[1]);
          if (Number.isFinite(rawKwh) && rawKwh >= 20 && rawKwh <= 500000) {
            consumo = Math.round(rawKwh);
          }
        }
      }
      if (consumo !== null) {
        sessionCtx.consumptionKwh = consumo;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;

        const cityInSameMsg = incomingText.match(
          /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );
        if (cityInSameMsg && cityInSameMsg[1]) {
          const cand = (
            cityInSameMsg[1] +
            (cityInSameMsg[2]
              ? `/${cityInSameMsg[2]}`
              : cityInSameMsg[3]
                ? `/${cityInSameMsg[3]}`
                : "")
          ).trim();
          const hspRes = getHsp(cand);
          if (hspRes.isStateOnly && hspRes.uf) {
            const stateTitle = UF_TO_STATE_TITLE[hspRes.uf] || hspRes.uf;
            const capital = STATE_CAPITALS[hspRes.uf] || "";
            sessionCtx.estado = hspRes.uf;
            delete sessionCtx.cidade;
            await setStep("AWAITING_CITY", {
              consumptionKwh: consumo,
              kwp: undefined,
              moduleCount: undefined,
              uf: hspRes.uf,
            });
            return (
              `*_Consumo Registrado:_* \`${consumo} kWh/mês\` ☀️\n` +
              `> 📍 Estado: *${stateTitle} (${hspRes.uf})*\n\n` +
              `Para qual cidade de ${stateTitle} será a instalação?\n` +
              `> Responda com a cidade (ex: \`${capital}\`) ou responda 1️⃣ para utilizar a capital (*${capital}/${hspRes.uf}*).`
            );
          }
          if (hspRes.ambiguous && hspRes.candidates && hspRes.candidates.length > 1) {
            await setStep("AWAITING_CITY_STATE", {
              consumptionKwh: consumo,
              kwp: undefined,
              moduleCount: undefined,
              pendingCityCandidates: hspRes.candidates,
              pendingCityName: hspRes.city,
            });
            return (
              `*_Consumo Registrado:_* \`${consumo} kWh/mês\` ☀️\n\n` +
              this.buildAmbiguousCityPrompt(hspRes.city, hspRes.candidates)
            );
          }
          delete sessionCtx.pendingCityCandidates;
          delete sessionCtx.pendingCityName;
          sessionCtx.cidade = hspRes.city;
          sessionCtx.estado = hspRes.uf;
          sessionCtx.hsp = hspRes.hsp;
          await setStep("AWAITING_GRID_TYPE", {
            consumptionKwh: consumo,
            kwp: undefined,
            moduleCount: undefined,
            cidade: hspRes.city,
            uf: hspRes.uf,
            hsp: hspRes.hsp,
          });
          return (
            `*_Consumo Registrado:_* \`${consumo} kWh/mês\` em \`${hspRes.city}/${hspRes.uf}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        if (sessionCtx.cidade && sessionCtx.estado) {
          await setStep("AWAITING_GRID_TYPE", {
            consumptionKwh: consumo,
            kwp: undefined,
            moduleCount: undefined,
          });
          return (
            `*_Consumo Registrado:_* \`${consumo} kWh/mês\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        await setStep("AWAITING_CITY", {
          consumptionKwh: consumo,
          kwp: undefined,
          moduleCount: undefined,
          uf: sessionCtx.estado,
        });
        const cityPrompt = sessionCtx.estado
          ? `Identifiquei o estado de *${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} (${sessionCtx.estado})* 📍.\n\nPara qual cidade de ${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} será a instalação?\n> Responda com a cidade (ex: \`${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}\`) ou responda 1️⃣ para a capital (*${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}/${sessionCtx.estado}*).`
          : `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`;
        return `*_Consumo Registrado:_* \`${consumo} kWh/mês\` ☀️\n\n${cityPrompt}`;
      }

      return (
        `Não consegui identificar o consumo em kWh.\n\n` +
        `Por favor, informe o consumo médio mensal do seu cliente em kWh (ex: \`450\` ou \`450 kWh\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // ESTADO: O Bot perguntou a potência de pico (kWp)
    const isAskingKwp =
      !isMainMenu &&
      (lastBotMsg.includes("Simulação por Potência de Pico") ||
        lastBotMsg.includes("potência de pico") ||
        lastBotMsg.includes("potência desejada") ||
        lastBotMsg.includes("potência (kWp)"));

    if (isAskingKwp) {
      // Se na verdade o usuário enviou consumo em kWh / kwhora (ex: "450 kwhora" ou "450 kw"):
      const consumoRedirecionado = parseConsumptionInput(incomingText);
      if (consumoRedirecionado !== null) {
        sessionCtx.consumptionKwh = consumoRedirecionado;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;

        await setStep("AWAITING_CITY", {
          consumptionKwh: consumoRedirecionado,
          kwp: undefined,
          moduleCount: undefined,
          uf: sessionCtx.estado,
        });
        const cityPrompt = sessionCtx.estado
          ? `Identifiquei o estado de *${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} (${sessionCtx.estado})* 📍.\n\nPara qual cidade de ${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} será a instalação?\n> Responda com a cidade (ex: \`${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}\`) ou responda 1️⃣ para a capital (*${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}/${sessionCtx.estado}*).`
          : `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`;
        return `*_Consumo Registrado:_* \`${consumoRedirecionado} kWh/mês\` ☀️\n\n${cityPrompt}`;
      }

      let targetKWp = this.parsePowerInput(incomingText);
      if (targetKWp === null && parseConsumptionInput(incomingText) === null) {
        const kwpMatch = incomingText.match(/(\d+(?:[.,]\d+)?)\s*(?:kwp|kw)?/i);
        if (kwpMatch && kwpMatch[1]) {
          const val = parsePtBrNumber(kwpMatch[1]);
          if (Number.isFinite(val) && val >= 0.5 && val <= 5_000_000) {
            targetKWp = val;
          }
        }
      }

      if (targetKWp !== null && targetKWp >= 0.5 && targetKWp <= 5_000_000) {
        sessionCtx.targetKWp = targetKWp;
        sessionCtx.consumptionKwh = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        const formattedPower = this.formatPowerBadge(targetKWp);
        const cityInSameMsg = incomingText.match(
          /(?:em|para|na cidade de|no munic[íi]pio de)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s'-]{2,35}?)(?:\s*[\/\-]\s*([A-Za-z]{2})|\s+([A-Za-z]{2}))?(?:\s*\(|$|\.|\n|,)/i
        );
        if (cityInSameMsg && cityInSameMsg[1]) {
          const cand = (
            cityInSameMsg[1] +
            (cityInSameMsg[2]
              ? `/${cityInSameMsg[2]}`
              : cityInSameMsg[3]
                ? `/${cityInSameMsg[3]}`
                : "")
          ).trim();
          const hspRes = getHsp(cand);
          if (hspRes.isStateOnly && hspRes.uf) {
            const stateTitle = UF_TO_STATE_TITLE[hspRes.uf] || hspRes.uf;
            const capital = STATE_CAPITALS[hspRes.uf] || "";
            sessionCtx.estado = hspRes.uf;
            delete sessionCtx.cidade;
            await setStep("AWAITING_CITY", {
              kwp: targetKWp,
              uf: hspRes.uf,
            });
            return (
              `*_Potência Solicitada:_* \`${formattedPower}\` ☀️\n` +
              `> 📍 Estado: *${stateTitle} (${hspRes.uf})*\n\n` +
              `Para qual cidade de ${stateTitle} será a instalação?\n` +
              `> Responda com a cidade (ex: \`${capital}\`) ou responda 1️⃣ para utilizar a capital (*${capital}/${hspRes.uf}*).`
            );
          }
          if (hspRes.ambiguous && hspRes.candidates && hspRes.candidates.length > 1) {
            await setStep("AWAITING_CITY_STATE", {
              kwp: targetKWp,
              pendingCityCandidates: hspRes.candidates,
              pendingCityName: hspRes.city,
            });
            return (
              `*_Potência Solicitada:_* \`${formattedPower}\` ☀️\n\n` +
              this.buildAmbiguousCityPrompt(hspRes.city, hspRes.candidates)
            );
          }
          delete sessionCtx.pendingCityCandidates;
          delete sessionCtx.pendingCityName;
          sessionCtx.cidade = hspRes.city;
          sessionCtx.estado = hspRes.uf;
          sessionCtx.hsp = hspRes.hsp;
          await setStep("AWAITING_GRID_TYPE", {
            kwp: targetKWp,
            cidade: hspRes.city,
            uf: hspRes.uf,
            hsp: hspRes.hsp,
          });
          return (
            `*_Potência Solicitada:_* \`${formattedPower}\` em \`${hspRes.city}/${hspRes.uf}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        if (sessionCtx.cidade && sessionCtx.estado) {
          await setStep("AWAITING_GRID_TYPE", {
            kwp: targetKWp,
          });
          return (
            `*_Potência Solicitada:_* \`${formattedPower}\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }

        await setStep("AWAITING_CITY", {
          kwp: targetKWp,
          uf: sessionCtx.estado,
        });
        const kwpCityPrompt = sessionCtx.estado
          ? `Identifiquei o estado de *${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} (${sessionCtx.estado})* 📍.\n\nPara qual cidade de ${UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado} será a instalação?\n> Responda com a cidade (ex: \`${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}\`) ou responda 1️⃣ para a capital (*${STATE_CAPITALS[sessionCtx.estado] || "Maceió"}/${sessionCtx.estado}*).`
          : `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`;
        return `*_Potência Solicitada:_* \`${formattedPower}\` ☀️\n\n${kwpCityPrompt}`;
      }

      return (
        `Não consegui identificar a potência desejada.\n\n` +
        `Por favor, informe a potência de pico desejada (ex: \`5 kWp\`, \`3000 kWp\`, \`3 MWp\` ou \`1.5 GWp\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // ESTADO: O Bot perguntou a quantidade de placas/módulos
    const isAskingModules =
      !isMainMenu &&
      (lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
        lastBotMsg.includes("placas solares você deseja no kit") ||
        lastBotMsg.includes("quantidade de placas"));

    if (isAskingModules) {
      const modMatch = incomingText.match(/(\d+)\s*(?:placas?|m[oó]dulos?|paineis?|pain[eé]is)?/i);
      if (modMatch && modMatch[1]) {
        const modCount = parseInt(modMatch[1], 10);
        if (modCount >= 1 && modCount <= 10000) {
          const modPowerMatch = incomingText.match(/(\d{3,4})\s*w/i);
          const modPower =
            modPowerMatch && modPowerMatch[1] ? parseInt(modPowerMatch[1], 10) : undefined;
          const kwpCalculado = modPower ? ((modCount * modPower) / 1000).toFixed(2) : undefined;
          const extraInfo = modPower ? ` de \`${modPower}W\` (\`${kwpCalculado} kWp\`)` : "";

          sessionCtx.targetModules = modCount;
          if (modPower) sessionCtx.modPowerWUser = modPower;

          if (sessionCtx.cidade && sessionCtx.estado) {
            await setStep("AWAITING_GRID_TYPE", {
              moduleCount: modCount,
            });
            return (
              `*_Quantidade Solicitada:_* \`${modCount} placas\`${extraInfo} em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
              this.GRID_OPTIONS_TEXT
            );
          }

          await setStep("AWAITING_CITY", {
            moduleCount: modCount,
          });
          return (
            `*_Quantidade Solicitada:_* \`${modCount} placas\`${extraInfo} ☀️\n\n` +
            `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
          );
        }
      }

      return (
        `Não consegui identificar a quantidade de módulos.\n\n` +
        `Por favor, informe a quantidade de placas (ex: \`10 placas de 590W\` ou \`12\`) ou envie 0️⃣ para voltar ao menu inicial:`
      );
    }

    // Opções do menu inicial (1 a 5) quando não estiver em fluxos específicos
    const isChoosingOtherOption =
      !isMainMenu &&
      (lastBotMsg.includes("Qual opção você prefere para o seu cliente") ||
        lastBotMsg.includes("Qual o padrão de entrada da instalação") ||
        lastBotMsg.includes("Qual a estrutura do telhado") ||
        lastBotMsg.includes("estrutura do telhado") ||
        lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar") ||
        lastBotMsg.includes("cliente final") ||
        lastBotMsg.includes("taxa padrão configurada") ||
        lastBotMsg.includes("preço padrão") ||
        lastBotMsg.includes("Preço aplicado") ||
        lastBotMsg.includes("Qual preço você deseja utilizar") ||
        lastBotMsg.includes("Qual valor por kWp") ||
        lastBotMsg.includes("Qual valor você deseja utilizar") ||
        lastBotMsg.includes("Como deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("Como você deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("WhatsApp") ||
        lastBotMsg.includes("whatsapp") ||
        lastBotMsg.includes("Simulação por Consumo Mensal") ||
        lastBotMsg.includes("consumo médio mensal") ||
        lastBotMsg.includes("Simulação por Potência de Pico") ||
        lastBotMsg.includes("potência de pico") ||
        lastBotMsg.includes("potência desejada") ||
        lastBotMsg.includes("Simulação por Quantidade de Módulos") ||
        lastBotMsg.includes("placas solares você deseja no kit") ||
        lastBotMsg.includes("Para qual cidade e estado será a instalação") ||
        lastBotMsg.includes("Não identifiquei o município") ||
        lastBotMsg.includes("Não identifiquei a cidade") ||
        lastBotMsg.includes("informe a cidade e a sigla do estado") ||
        lastBotMsg.includes("informe a cidade e estado"));

    if (!isChoosingOtherOption) {
      if (lower === "1" || lower === "1." || lower === "opcao 1" || lower === "opção 1") {
        await setStep("IDLE");
        return (
          `*_Envio de Fatura de Energia_* 📄⚡\n\n` +
          `Envie o arquivo em *PDF* ou a *foto da conta de luz* do seu cliente por aqui mesmo.\n\n` +
          `> Nossa inteligência artificial vai extrair automaticamente todos os dados de consumo, histórico e padrão de rede!`
        );
      }
      if (lower === "2" || lower === "2." || lower === "opcao 2" || lower === "opção 2") {
        await setStep("IDLE");
        return (
          `*_Simulação por Consumo Mensal_* ⚡\n\n` +
          `Qual é o *consumo médio mensal* do seu cliente em kWh?\n\n` +
          `> Exemplo: digite \`450 kWh\` ou \`600 kWh\``
        );
      }
      if (lower === "3" || lower === "3." || lower === "opcao 3" || lower === "opção 3") {
        await setStep("IDLE");
        return (
          `*_Simulação por Potência de Pico_* ☀️\n\n` +
          `Qual a *potência de pico* desejada para o sistema solar?\n\n` +
          `> Exemplo: digite \`5 kWp\` ou \`7.5 kWp\``
        );
      }
      if (lower === "4" || lower === "4." || lower === "opcao 4" || lower === "opção 4") {
        await setStep("IDLE");
        return (
          `*_Simulação por Quantidade de Módulos_* 🔌\n\n` +
          `Quantas *placas solares* você deseja no kit e qual a potência delas?\n\n` +
          `> Exemplo: digite \`10 placas de 590W\` ou \`12 módulos\``
        );
      }
      if (lower === "5" || lower === "5." || lower === "opcao 5" || lower === "opção 5") {
        await setStep("IDLE");
        return getGreetingMenu();
      }
    }

    // ESTADO H: Saudação inicial / Iniciar fluxo de proposta
    const greetingTriggers = [
      "oi",
      "olá",
      "ola",
      "opa",
      "eai",
      "e aí",
      "eaí",
      "bom dia",
      "boa tarde",
      "boa noite",
      "boa",
      "start",
      "ajuda",
      "help",
      "menu",
      "inicio",
      "início",
      "comecar",
      "começar",
      "opcoes",
      "opções",
      "novo",
      "nova",
      "reiniciar",
      "reset",
      "voltar",
      "gerar",
      "orçamento",
      "orcamento",
      "proposta",
      "cotar",
      "cotação",
      "cotacao",
      "simular",
      "simulação",
      "simulacao",
    ];

    const isStartOrGreeting =
      greetingTriggers.includes(lower) ||
      lower.startsWith("bom dia") ||
      lower.startsWith("boa tarde") ||
      lower.startsWith("boa noite") ||
      lower.startsWith("opa") ||
      lower.startsWith("olá") ||
      lower.startsWith("ola") ||
      lower.startsWith("oi") ||
      lower.startsWith("gerar") ||
      lower.startsWith("novo") ||
      lower.startsWith("quero gerar") ||
      lower.startsWith("quero fazer") ||
      lower.startsWith("fazer orcamento") ||
      lower.startsWith("fazer orçamento") ||
      lower.startsWith("fazer proposta") ||
      lower.startsWith("criar proposta") ||
      lower.startsWith("simular");

    const isMainMenuAlreadyShown =
      lastBotMsg.includes("Como posso ajudar você a gerar orçamentos hoje") ||
      lastBotMsg.includes("Sou seu assistente de vendas e dimensionamento");

    const isPureGreeting =
      /^(oi|ola|olá|oii|oie|opa|bom dia|boa tarde|boa noite|boa|eai|e aí|eaí|tudo bem|tudo bom|salve|fala|hello|hi)[!?.,\s]*$/i.test(
        lower
      );

    if (isStartOrGreeting && !quoteEntities.isQuoteRequest) {
      if (isMainMenuAlreadyShown && isPureGreeting) {
        return (
          `Olá, *${resolvedContactName}*! ☀️\n\n` +
          `Pode responder com o número da opção desejada acima *(1 a 4)* ou me enviar a conta de luz (PDF ou foto) diretamente aqui pelo chat.`
        );
      }

      await setStep("IDLE");
      return getGreetingMenu();
    }

    // ESTADO I/J/K: Entrada Direta de Cotação de Integrador (Potência, Módulos, Consumo, Telhado, Rede, Cidade)
    if (quoteEntities.isQuoteRequest) {
      const isStartingNewQuote =
        currentStep === "IDLE" ||
        currentStep === "PROPOSAL_COMPLETED" ||
        isAtMenuOrCompleted ||
        (!sessionCtx.targetKWp && !sessionCtx.targetModules && !sessionCtx.consumptionKwh);

      if (isStartingNewQuote) {
        sessionCtx.cidade = quoteEntities.cidade || undefined;
        sessionCtx.estado = quoteEntities.estado || undefined;
        sessionCtx.roofType = quoteEntities.roofType || undefined;
        sessionCtx.gridVoltage = quoteEntities.gridVoltage || undefined;
        sessionCtx.inverterType = quoteEntities.inverterType || undefined;
        sessionCtx.inverterDescription = quoteEntities.inverterDescription || undefined;
        sessionCtx.batteryKwh =
          quoteEntities.batteryKwh !== undefined ? quoteEntities.batteryKwh : undefined;
        sessionCtx.batteryQty =
          quoteEntities.batteryQty !== undefined ? quoteEntities.batteryQty : undefined;
        sessionCtx.hasBattery =
          quoteEntities.hasBattery !== undefined ? quoteEntities.hasBattery : undefined;
        sessionCtx.customRatePerKwp = undefined;
        sessionCtx.clientName = undefined;
        sessionCtx.clientWhatsapp = undefined;
        sessionCtx.chosenQuoteIndex = 0;
      }

      if (quoteEntities.targetKWp) {
        sessionCtx.targetKWp = quoteEntities.targetKWp;
        if (!quoteEntities.consumptionKwh) {
          sessionCtx.consumptionKwh = undefined;
        }
      }
      if (quoteEntities.targetModules) {
        sessionCtx.targetModules = quoteEntities.targetModules;
        if (!quoteEntities.consumptionKwh) {
          sessionCtx.consumptionKwh = undefined;
        }
      }
      if (quoteEntities.modPowerWUser) sessionCtx.modPowerWUser = quoteEntities.modPowerWUser;
      if (quoteEntities.consumptionKwh) {
        sessionCtx.consumptionKwh = quoteEntities.consumptionKwh;
        // CRUCIAL: Se a mensagem informou consumo e não especificou kWp na mesma mensagem,
        // limpa qualquer potência ou quantidade residual herdada de mensagens antigas da conversa!
        if (!quoteEntities.targetKWp) {
          sessionCtx.targetKWp = undefined;
        }
        if (!quoteEntities.targetModules) {
          sessionCtx.targetModules = undefined;
          sessionCtx.modPowerWUser = undefined;
        }
      }
      if (quoteEntities.roofType) sessionCtx.roofType = quoteEntities.roofType;
      if (quoteEntities.gridVoltage) sessionCtx.gridVoltage = quoteEntities.gridVoltage;
      if (quoteEntities.inverterType) sessionCtx.inverterType = quoteEntities.inverterType;
      if (quoteEntities.inverterDescription)
        sessionCtx.inverterDescription = quoteEntities.inverterDescription;
      if (quoteEntities.batteryKwh !== undefined) sessionCtx.batteryKwh = quoteEntities.batteryKwh;
      if (quoteEntities.batteryQty !== undefined) sessionCtx.batteryQty = quoteEntities.batteryQty;
      if (quoteEntities.hasBattery !== undefined) sessionCtx.hasBattery = quoteEntities.hasBattery;
      if (quoteEntities.cidade) {
        sessionCtx.cidade = quoteEntities.cidade;
        if (quoteEntities.estado) sessionCtx.estado = quoteEntities.estado;
      } else if (quoteEntities.estado) {
        sessionCtx.estado = quoteEntities.estado;
      }

      // Monta cabeçalho informativo com base no que foi identificado
      let headerText = "";
      if (sessionCtx.targetKWp) {
        const formattedPower = this.formatPowerBadge(sessionCtx.targetKWp);
        if (sessionCtx.targetModules && sessionCtx.modPowerWUser) {
          headerText = `*_Cotação Solicitada:_* \`${sessionCtx.targetModules} painéis de ${sessionCtx.modPowerWUser}W\` (\`${formattedPower}\`) ☀️`;
        } else if (sessionCtx.targetModules) {
          headerText = `*_Cotação Solicitada:_* \`${sessionCtx.targetModules} placas\` (\`${formattedPower}\`) ☀️`;
        } else {
          headerText = `*_Potência Solicitada:_* \`${formattedPower}\` ☀️`;
        }
      } else if (sessionCtx.targetModules) {
        headerText = `*_Quantidade Solicitada:_* \`${sessionCtx.targetModules} placas\` ☀️`;
      } else if (sessionCtx.consumptionKwh) {
        headerText = `*_Consumo Registrado:_* \`${sessionCtx.consumptionKwh} kWh/mês\` ☀️`;
      }

      const extraDetails: string[] = [];
      if (sessionCtx.cidade && sessionCtx.estado) {
        extraDetails.push(`> 📍 Localidade: \`${sessionCtx.cidade}/${sessionCtx.estado}\``);
      } else if (sessionCtx.estado) {
        const stateTitle = UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado;
        extraDetails.push(`> 📍 Estado: *${stateTitle} (${sessionCtx.estado})*`);
      }
      if (sessionCtx.roofType) {
        extraDetails.push(`> 🏠 Estrutura: *${sessionCtx.roofType}*`);
      }
      if (sessionCtx.gridVoltage) {
        extraDetails.push(`> ⚡ Padrão Elétrico: *${sessionCtx.gridVoltage}*`);
      }
      if (sessionCtx.inverterType === "microinverter") {
        extraDetails.push(`> ⚡ Tecnologia: *Microinversor*`);
      } else if (sessionCtx.inverterType === "hybrid") {
        extraDetails.push(`> ⚡ Tecnologia: *Inversor Híbrido*`);
      }
      if (sessionCtx.batteryKwh) {
        extraDetails.push(`> 🔋 Bateria: *${sessionCtx.batteryKwh} kWh*`);
      } else if (sessionCtx.batteryQty) {
        extraDetails.push(`> 🔋 Bateria: *${sessionCtx.batteryQty} baterias*`);
      } else if (sessionCtx.hasBattery === false) {
        extraDetails.push(`> 🔋 Bateria: *Sem bateria (somente inversor híbrido)*`);
      }

      const detailsBlock = extraDetails.length > 0 ? `\n${extraDetails.join("\n")}\n\n` : "\n\n";

      // 1. Falta a Cidade
      if (!sessionCtx.cidade) {
        await setStep("AWAITING_CITY", {
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          roofType: sessionCtx.roofType,
          gridType: sessionCtx.gridVoltage,
          inverterType: sessionCtx.inverterType,
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          hasBattery: sessionCtx.hasBattery,
          uf: sessionCtx.estado,
        });

        if (sessionCtx.estado) {
          const stateTitle = UF_TO_STATE_TITLE[sessionCtx.estado] || sessionCtx.estado;
          const capital = STATE_CAPITALS[sessionCtx.estado] || "";
          const capitalPrompt = capital
            ? ` ou responda 1️⃣ para a capital (*${capital}/${sessionCtx.estado}*)`
            : "";
          return (
            `${headerText}${detailsBlock}` +
            `Identifiquei o estado de *${stateTitle} (${sessionCtx.estado})* 📍.\n\n` +
            `Para qual cidade de ${stateTitle} será a instalação?\n` +
            `> Responda com a cidade (ex: \`${capital || "Maceió"}\`)${capitalPrompt}.`
          );
        }

        return (
          `${headerText}${detailsBlock}` +
          `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
        );
      }

      const isLargeKit = Boolean(
        (sessionCtx.targetKWp && sessionCtx.targetKWp >= 15) ||
        (sessionCtx.targetModules && sessionCtx.targetModules >= 26) ||
        (sessionCtx.consumptionKwh && sessionCtx.consumptionKwh >= 2500) ||
        quoteEntities.isTrifasicoGeneric
      );

      const hasCompleteVoltage = Boolean(sessionCtx.gridVoltage?.includes("V"));

      // 2. Tem a Cidade, mas Falta o Padrão Elétrico ou tensão 220V/380V não especificada
      if (!hasCompleteVoltage || quoteEntities.isTrifasicoGeneric) {
        await setStep("AWAITING_GRID_TYPE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          roofType: sessionCtx.roofType,
          inverterType: sessionCtx.inverterType,
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          hasBattery: sessionCtx.hasBattery,
        });
        const gridPrompt = isLargeKit
          ? this.buildLargeKitGridQuestionText(
              sessionCtx.targetKWp
                ? this.formatPowerBadge(sessionCtx.targetKWp)
                : sessionCtx.consumptionKwh
                  ? `${sessionCtx.consumptionKwh} kWh/mês`
                  : "grande porte"
            )
          : this.GRID_OPTIONS_TEXT;
        return `${headerText}${detailsBlock}` + gridPrompt;
      }

      // 3. Sistema híbrido sem especificação de bateria -> Pergunta o armazenamento
      if (
        sessionCtx.inverterType === "hybrid" &&
        sessionCtx.hasBattery === undefined &&
        sessionCtx.batteryKwh === undefined &&
        sessionCtx.batteryQty === undefined
      ) {
        await setStep("AWAITING_BATTERY_STORAGE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          gridType: sessionCtx.gridVoltage,
          roofType: sessionCtx.roofType,
          inverterType: "hybrid",
        });
        return `${headerText}${detailsBlock}` + this.BATTERY_STORAGE_OPTIONS_TEXT;
      }

      // 4. Tem Cidade e Padrão Elétrico (e Bateria se híbrido), mas Falta o Telhado
      if (!sessionCtx.roofType) {
        await setStep("AWAITING_ROOF_TYPE", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          gridType: sessionCtx.gridVoltage,
          inverterType: sessionCtx.inverterType,
          batteryKwh: sessionCtx.batteryKwh,
          batteryQty: sessionCtx.batteryQty,
          hasBattery: sessionCtx.hasBattery,
        });
        return `${headerText}${detailsBlock}` + this.ROOF_OPTIONS_TEXT;
      }

      // 4. Tem TUDO (Cidade + Padrão + Telhado) -> Fast Forward direto pros kits!
      const quotes = await kitsFor({ roofType: sessionCtx.roofType });
      if (quotes.length > 0) {
        await setStep("AWAITING_KIT_SELECTION", {
          cidade: sessionCtx.cidade,
          uf: sessionCtx.estado,
          kwp: sessionCtx.targetKWp,
          moduleCount: sessionCtx.targetModules,
          consumptionKwh: sessionCtx.consumptionKwh,
          gridType: sessionCtx.gridVoltage,
          roofType: sessionCtx.roofType,
        });
        return `${headerText}${detailsBlock}` + this.formatQuotesListText(quotes, sessionCtx);
      }
      return `${headerText}${detailsBlock}` + NO_KITS_TEXT;
    }

    // Se o usuário digitou apenas um número avulso (ex: 450, 600, 1000) e não foi capturado acima
    const pureNumMatch = incomingText.trim().match(/^(\d{2,5})$/);
    if (pureNumMatch && pureNumMatch[1]) {
      const pureVal = parseInt(pureNumMatch[1], 10);
      if (pureVal >= 30 && pureVal <= 50000) {
        sessionCtx.consumptionKwh = pureVal;
        sessionCtx.targetKWp = undefined;
        sessionCtx.targetModules = undefined;
        sessionCtx.modPowerWUser = undefined;
        if (sessionCtx.cidade && sessionCtx.estado) {
          await setStep("AWAITING_GRID_TYPE", {
            consumptionKwh: pureVal,
            kwp: undefined,
            moduleCount: undefined,
          });
          return (
            `*_Consumo Registrado:_* \`${pureVal} kWh/mês\` em \`${sessionCtx.cidade}/${sessionCtx.estado}\` ☀️📍\n\n` +
            this.GRID_OPTIONS_TEXT
          );
        }
        await setStep("AWAITING_CITY", {
          consumptionKwh: pureVal,
          kwp: undefined,
          moduleCount: undefined,
        });
        return (
          `*_Consumo Registrado:_* \`${pureVal} kWh/mês\` ☀️\n\n` +
          `Para qual cidade e estado será a instalação? (Ex: \`Maringá/PR\`, \`Presidente Prudente/SP\`)`
        );
      }
    }

    // Fallback Estruturado: Sem IA conversacional aleatória. Sempre orienta o integrador no fluxo do bot!
    if (isChoosingOtherOption) {
      if (
        lastBotMsg.includes("Para qual cidade e estado será a instalação") ||
        lastBotMsg.includes("Não identifiquei o município") ||
        lastBotMsg.includes("Não identifiquei a cidade") ||
        lastBotMsg.includes("informe a cidade e a sigla do estado") ||
        lastBotMsg.includes("informe a cidade e estado")
      ) {
        return (
          `Não identifiquei o município "*${incomingText.trim()}*". 📍\n\n` +
          `Por favor, informe a cidade e a sigla do estado onde será a instalação:\n` +
          `> Exemplo: \`Cuiabá/MT\`, \`Maringá/PR\` ou \`São Paulo/SP\`\n\n` +
          `_(Ou envie 0️⃣ para voltar ao menu inicial)_`
        );
      }
      if (lastBotMsg.includes("Qual o padrão de entrada da instalação")) {
        return (
          `Opção não reconhecida. Por favor, selecione o *padrão de entrada* da instalação:\n\n` +
          this.GRID_OPTIONS_TEXT
        );
      }
      if (
        lastBotMsg.includes("Qual a estrutura do telhado") ||
        lastBotMsg.includes("estrutura do telhado")
      ) {
        return (
          `Opção não reconhecida. Por favor, selecione a *estrutura do telhado* (1 a 7):\n\n` +
          this.ROOF_OPTIONS_TEXT
        );
      }
      if (lastBotMsg.includes("Qual opção você prefere para o seu cliente")) {
        return (
          `Opção não reconhecida. Por favor, escolha qual kit você deseja para o cliente:\n\n` +
          `> 1️⃣ *Standard*\n` +
          `> 2️⃣ *Elite*\n` +
          `> 3️⃣ *Premium*\n\n` +
          `_(Envie 1, 2 ou 3, ou digite 0️⃣ para voltar)_`
        );
      }
      if (
        lastBotMsg.includes("Qual preço você deseja utilizar") ||
        lastBotMsg.includes("preço padrão") ||
        lastBotMsg.includes("Como deseja prosseguir para esta cotação") ||
        lastBotMsg.includes("Como você deseja prosseguir para esta cotação")
      ) {
        return (
          `Preço não reconhecido. Por favor, informe o preço por kWp desejado:\n\n` +
          `> Exemplo: digite \`2500\`, \`R$ 3.200,00\` ou \`4000\`\n` +
          `> 1️⃣ Para usar o preço padrão da sua conta\n` +
          `> 0️⃣ Para voltar à seleção de kits`
        );
      }
      if (
        lastBotMsg.includes("cliente final") &&
        (lastBotMsg.includes("nome") || lastBotMsg.includes("Nome"))
      ) {
        return (
          `Por favor, informe o *nome do cliente final* para registrarmos na proposta comercial:\n\n` +
          `> Exemplo: \`João da Silva\`\n` +
          `_(Ou digite 0️⃣ para voltar e alterar o preço)_`
        );
      }
      if (
        lastBotMsg.includes("WhatsApp") ||
        lastBotMsg.includes("whatsapp") ||
        lastBotMsg.includes("qual o WhatsApp") ||
        lastBotMsg.includes("E qual o WhatsApp dele")
      ) {
        return (
          `Por favor, informe o número de *WhatsApp com DDD* do cliente final:\n\n` +
          `> Exemplo: \`44 99999-8888\`\n` +
          `_(Ou digite 0️⃣ para corrigir o nome do cliente)_`
        );
      }
      if (lastBotMsg.includes("Qual modelo de proposta comercial você deseja usar")) {
        const isHybridQuote =
          sessionCtx.inverterType === "hybrid" ||
          sessionCtx.inverterType === "off_grid" ||
          (typeof (sessionCtx as any).batteryCapacityKwh === "number" &&
            (sessionCtx as any).batteryCapacityKwh > 0) ||
          (typeof (sessionCtx as any).batteryQuantity === "number" &&
            (sessionCtx as any).batteryQuantity > 0);

        const templates = await this.getAvailableTemplates(conversation.organizationId, {
          isHybrid: isHybridQuote,
        });
        const { text: templateListText } = formatTemplateSelectionList(templates, isHybridQuote);

        return (
          `Opção não reconhecida. Por favor, selecione o *modelo de proposta*:\n\n` +
          templateListText +
          `\n_(Responda com o número do modelo desejado)_`
        );
      }
    }

    return (
      `Não compreendi sua mensagem. Para gerar uma proposta solar, escolha como deseja iniciar:\n\n` +
      `> 1️⃣ *Enviar fatura de energia* (PDF ou foto da conta de luz)\n` +
      `> 2️⃣ *Simular por consumo mensal* (ex: digite \`450 kWh\`)\n` +
      `> 3️⃣ *Simular por potência de pico* (ex: \`5 kWp\`)\n` +
      `> 4️⃣ *Simular por quantidade de placas* (ex: \`10 módulos\`)\n\n` +
      `_(Responda com o número da opção desejada ou envie os dados diretamente)_`
    );
  }
}
