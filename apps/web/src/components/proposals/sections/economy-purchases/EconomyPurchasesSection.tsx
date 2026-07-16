"use client";

import type { CSSProperties } from "react";
import type { ProposalSection } from "../../editor/types";
import { parseMoneyLike, replaceVariables } from "../../editor/utils";
import type { PreviewRenderVariables } from "../../editor/section-render/types";
import { resolveLucideIconFromName } from "./resolve-lucide-icon";

type PurchaseRow = {
  id?: string;
  name?: string;
  unitPrice?: string;
  icon?: string;
};

type ResolvedItem = {
  row: PurchaseRow;
  qty: number;
  price: number;
  total: number;
  index: number;
};

type Variant = "vertical_stack" | "split" | "inverted" | "narrative";

type Texts = {
  eyebrow: string;
  amountLabel: string;
  descriptionHtml: string;
  dividerLabel: string;
  listTitle: string;
  title: string;
  anchorLabel: string;
  narrativeQuoteHtml: string;
  narrativeAction: string;
  narrativeFooterHtml: string;
};

const VALUE_PLACEHOLDER = "__ECONOMIA_TOTAL_PLACEHOLDER__";

function asPurchaseRows(value: unknown): PurchaseRow[] {
  if (!Array.isArray(value)) return [];
  return value as PurchaseRow[];
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function splitCurrencyParts(formatted: string): { currency: string; int: string; dec: string } {
  const trimmed = formatted.trim();
  const match = trimmed.match(/^(R\$)\s?([\d.]+)(?:,(\d{2}))?$/);
  if (!match) return { currency: "R$", int: trimmed, dec: "00" };
  return { currency: match[1] ?? "R$", int: match[2] ?? "0", dec: match[3] ?? "00" };
}

function resolveVariant(value: unknown): Variant {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (raw === "vertical_stack" || raw === "split" || raw === "inverted" || raw === "narrative")
    return raw;
  return "vertical_stack";
}

interface EconomyPurchasesSectionProps {
  section: ProposalSection;
  vars: PreviewRenderVariables;
}

const surfaceSoftBg: CSSProperties["background"] =
  "color-mix(in srgb, var(--preview-primary-color, currentColor) 6%, transparent)";

const dividerColor = "color-mix(in srgb, currentColor 16%, transparent)";

export function EconomyPurchasesSection({
  section,
  vars,
}: EconomyPurchasesSectionProps): JSX.Element {
  const f = section.fields as Record<string, unknown>;
  const variant = resolveVariant(section.variant);
  const years = Number(f["horizonYears"]) === 5 ? 5 : 10;
  const items = asPurchaseRows(f["purchaseItems"]);

  const annual = parseMoneyLike(vars.economia_anual, NaN);
  const monthly = parseMoneyLike(vars.economia_mensal, NaN);
  let totalSavings = 0;
  if (Number.isFinite(annual) && annual > 0) totalSavings = annual * years;
  else if (Number.isFinite(monthly) && monthly > 0) totalSavings = monthly * 12 * years;

  const formattedTotal = formatBRL(totalSavings);
  const { currency, int: intPart, dec: decPart } = splitCurrencyParts(formattedTotal);

  const visibleItems: ResolvedItem[] = items
    .map((row, index) => {
      const price = parseMoneyLike(row.unitPrice, NaN);
      if (!Number.isFinite(price) || price <= 0) return null;
      const qty = Math.floor(totalSavings / price);
      if (qty < 1) return null;
      return { row, qty, price, total: qty * price, index };
    })
    .filter(Boolean) as ResolvedItem[];

  const localVars: Record<string, string | number> = {
    ...(vars as unknown as Record<string, string | number>),
    anos: years,
    economia_total: formattedTotal,
  };
  const tpl = (raw: unknown): string =>
    replaceVariables(String(raw ?? ""), localVars as Record<string, string>).trim();

  const texts: Texts = {
    eyebrow: tpl(f["eyebrow"] || "em {{anos}} anos de economia"),
    amountLabel: tpl(f["amountLabel"] || "Total que você deixa de pagar"),
    descriptionHtml: tpl(f["description"] || ""),
    dividerLabel: tpl(f["dividerLabel"] || "O que você poderia adquirir"),
    listTitle: tpl(f["listTitle"] || "Equivalente a"),
    title: tpl(f["title"] || "No que essa economia se transforma:"),
    anchorLabel: tpl(f["anchorLabel"] || "Valor que sua economia representa em {{anos}} anos:"),
    narrativeQuoteHtml: replaceVariables(String(f["narrativeQuote"] ?? ""), {
      ...localVars,
      economia_total: VALUE_PLACEHOLDER,
    } as Record<string, string>).trim(),
    narrativeAction: tpl(f["narrativeAction"] || "trocar a sua conta de luz por:"),
    narrativeFooterHtml: tpl(f["narrativeFooter"] || ""),
  };

  const textHtml = tpl(f["text"]);

  if (variant === "split")
    return renderSplit(textHtml, texts, currency, intPart, decPart, visibleItems);
  if (variant === "inverted") return renderInverted(textHtml, texts, formattedTotal, visibleItems);
  if (variant === "narrative")
    return renderNarrative(textHtml, texts, currency, intPart, decPart, visibleItems);
  return renderVerticalStack(textHtml, texts, currency, intPart, decPart, visibleItems);
}

function ValueDisplay({
  currency,
  intPart,
  decPart,
  fontSize,
  currencyEm,
  centsEm,
  centsAlign,
  currencyAlign,
}: {
  currency: string;
  intPart: string;
  decPart: string;
  fontSize: string;
  currencyEm: string;
  centsEm: string;
  centsAlign: string;
  currencyAlign: string;
}): JSX.Element {
  return (
    <div className="font-extrabold leading-none tracking-[-0.05em]" style={{ fontSize }}>
      <span
        className={`mr-2 ${currencyEm} font-semibold opacity-65`}
        style={{ verticalAlign: currencyAlign }}
      >
        {currency}
      </span>
      {intPart}
      <span
        className={`ml-1 ${centsEm} font-semibold opacity-65`}
        style={{ verticalAlign: centsAlign }}
      >
        ,{decPart}
      </span>
    </div>
  );
}

function renderVerticalStack(
  textHtml: string,
  texts: Texts,
  currency: string,
  intPart: string,
  decPart: string,
  items: ResolvedItem[]
): JSX.Element {
  return (
    <div className="economy-purchases-root w-full">
      {textHtml ? (
        <div
          data-editor-field-path="text"
          className="preview-rich-content mb-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      ) : null}
      <section
        className="rounded-2xl px-6 py-10 text-center md:px-12 md:py-14"
        style={{ background: surfaceSoftBg }}
      >
        {texts.eyebrow ? (
          <div
            data-editor-field-path="eyebrow"
            className="mb-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.22em]"
            style={{ color: "var(--preview-primary-color, currentColor)" }}
          >
            <span
              aria-hidden
              style={{
                width: 24,
                height: 1,
                background: "var(--preview-primary-color, currentColor)",
              }}
            />
            {texts.eyebrow}
            <span
              aria-hidden
              style={{
                width: 24,
                height: 1,
                background: "var(--preview-primary-color, currentColor)",
              }}
            />
          </div>
        ) : null}
        <ValueDisplay
          currency={currency}
          intPart={intPart}
          decPart={decPart}
          fontSize="clamp(48px, 11vw, 96px)"
          currencyEm="text-[0.46em] align-top"
          centsEm="text-[0.27em]"
          currencyAlign="0.18em"
          centsAlign="0.55em"
        />
        {texts.descriptionHtml ? (
          <div
            data-editor-field-path="description"
            className="preview-rich-content mx-auto mt-3 text-[15px] leading-[1.6] opacity-70"
            style={{ maxWidth: 540 }}
            dangerouslySetInnerHTML={{ __html: texts.descriptionHtml }}
          />
        ) : null}
        {items.length > 0 ? (
          <>
            <div className="relative my-8 text-center">
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 0,
                  right: 0,
                  height: 1,
                  background: dividerColor,
                }}
              />
              {texts.dividerLabel ? (
                <span
                  data-editor-field-path="dividerLabel"
                  className="relative z-10 px-4 text-[11px] font-semibold uppercase tracking-[.22em]"
                  style={{
                    background: surfaceSoftBg,
                    color: "var(--preview-primary-color, currentColor)",
                  }}
                >
                  {texts.dividerLabel}
                </span>
              ) : null}
            </div>
            <div
              data-editor-field-path="purchaseItems"
              className="flex flex-col gap-4 text-left md:flex-row md:flex-wrap"
            >
              {items.map((item) => {
                const Icon = resolveLucideIconFromName(item.row.icon);
                return (
                  <div
                    key={String(item.row.id ?? `${item.row.name}-${item.index}`)}
                    className="flex-1 rounded-xl border p-5 md:min-w-[240px]"
                    style={{
                      background: "color-mix(in srgb, currentColor 4%, transparent)",
                      borderColor: dividerColor,
                    }}
                  >
                    <div
                      data-editor-field-path={`purchaseItems[${item.index}].icon`}
                      className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ background: "color-mix(in srgb, currentColor 8%, transparent)" }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div
                      data-editor-field-path={`purchaseItems[${item.index}].name`}
                      className="text-base font-semibold tracking-[-0.01em]"
                    >
                      {String(item.row.name ?? "Item")}
                    </div>
                    <div
                      className="mb-4 mt-1 text-xs font-semibold tracking-[.04em]"
                      style={{ color: "var(--preview-primary-color, currentColor)" }}
                    >
                      {item.qty} {item.qty === 1 ? "unidade" : "unidades"}
                    </div>
                    <div
                      data-editor-field-path={`purchaseItems[${item.index}].unitPrice`}
                      className="border-t pt-4 text-lg font-bold tracking-[-0.02em]"
                      style={{ borderColor: dividerColor }}
                    >
                      {formatBRL(item.total)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function renderSplit(
  textHtml: string,
  texts: Texts,
  currency: string,
  intPart: string,
  decPart: string,
  items: ResolvedItem[]
): JSX.Element {
  return (
    <div className="economy-purchases-root w-full">
      {textHtml ? (
        <div
          data-editor-field-path="text"
          className="preview-rich-content mb-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      ) : null}
      <section
        className="grid grid-cols-1 overflow-hidden rounded-2xl border md:grid-cols-[1fr_1.1fr]"
        style={{ borderColor: dividerColor }}
      >
        <div
          className="flex flex-col justify-center px-7 py-10 md:px-10"
          style={{ background: surfaceSoftBg }}
        >
          {texts.eyebrow ? (
            <div
              data-editor-field-path="eyebrow"
              className="mb-5 text-[11px] font-semibold uppercase tracking-[.22em]"
              style={{ color: "var(--preview-primary-color, currentColor)" }}
            >
              {texts.eyebrow}
            </div>
          ) : null}
          {texts.amountLabel ? (
            <p
              data-editor-field-path="amountLabel"
              className="mb-3 text-[13px] tracking-[.04em] opacity-70"
            >
              {texts.amountLabel}
            </p>
          ) : null}
          <ValueDisplay
            currency={currency}
            intPart={intPart}
            decPart={decPart}
            fontSize="clamp(40px, 8vw, 76px)"
            currencyEm="text-[0.42em]"
            centsEm="text-[0.29em]"
            currencyAlign="0.18em"
            centsAlign="0.6em"
          />
          {texts.descriptionHtml ? (
            <div
              data-editor-field-path="description"
              className="preview-rich-content mt-5 text-[15px] leading-[1.7] opacity-70"
              style={{ maxWidth: 380 }}
              dangerouslySetInnerHTML={{ __html: texts.descriptionHtml }}
            />
          ) : null}
        </div>
        <div className="flex flex-col px-7 py-7 md:px-9">
          {texts.listTitle ? (
            <div
              data-editor-field-path="listTitle"
              className="mb-3 text-[11px] font-semibold uppercase tracking-[.22em]"
              style={{ color: "var(--preview-primary-color, currentColor)" }}
            >
              {texts.listTitle}
            </div>
          ) : null}
          <div data-editor-field-path="purchaseItems" className="flex flex-col">
            {items.map((item, idx) => {
              const Icon = resolveLucideIconFromName(item.row.icon);
              return (
                <div
                  key={String(item.row.id ?? `${item.row.name}-${item.index}`)}
                  className="grid items-center gap-4 py-4"
                  style={{
                    gridTemplateColumns: "36px 1fr auto",
                    borderBottom: idx < items.length - 1 ? `1px solid ${dividerColor}` : undefined,
                  }}
                >
                  <div
                    data-editor-field-path={`purchaseItems[${item.index}].icon`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: "color-mix(in srgb, currentColor 8%, transparent)" }}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div
                      data-editor-field-path={`purchaseItems[${item.index}].name`}
                      className="text-[15px] font-semibold tracking-[-0.01em]"
                    >
                      {String(item.row.name ?? "Item")}
                    </div>
                    <div className="text-xs opacity-70">
                      {item.qty} {item.qty === 1 ? "unidade" : "unidades"}
                    </div>
                  </div>
                  <div
                    data-editor-field-path={`purchaseItems[${item.index}].unitPrice`}
                    className="text-right text-[16px] font-bold tracking-[-0.02em]"
                  >
                    {formatBRL(item.total)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function renderInverted(
  textHtml: string,
  texts: Texts,
  formattedTotal: string,
  items: ResolvedItem[]
): JSX.Element {
  return (
    <div className="economy-purchases-root w-full">
      {textHtml ? (
        <div
          data-editor-field-path="text"
          className="preview-rich-content mb-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      ) : null}
      <section className="py-2">
        <header className="mb-7" style={{ maxWidth: 640 }}>
          {texts.eyebrow ? (
            <div
              data-editor-field-path="eyebrow"
              className="mb-3 text-[11px] font-semibold uppercase tracking-[.22em]"
              style={{ color: "var(--preview-primary-color, currentColor)" }}
            >
              {texts.eyebrow}
            </div>
          ) : null}
          {texts.title ? (
            <h2
              data-editor-field-path="title"
              className="text-[26px] font-bold leading-[1.2] tracking-[-0.025em] md:text-[28px]"
            >
              {texts.title}
            </h2>
          ) : null}
        </header>
        <div
          data-editor-field-path="purchaseItems"
          className="mb-7 flex flex-col gap-4 md:flex-row md:flex-wrap"
        >
          {items.map((item) => {
            const Icon = resolveLucideIconFromName(item.row.icon);
            return (
              <div
                key={String(item.row.id ?? `${item.row.name}-${item.index}`)}
                className="relative flex-1 overflow-hidden rounded-2xl px-6 pb-6 pt-9 md:min-w-[240px]"
                style={{ background: surfaceSoftBg }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background:
                      "linear-gradient(90deg, var(--preview-primary-color, currentColor), color-mix(in srgb, var(--preview-primary-color, currentColor) 60%, transparent))",
                    opacity: 0.7,
                  }}
                />
                <div
                  className="absolute right-4 top-4 rounded-full border px-3 py-1 text-[13px] font-extrabold tracking-[-0.01em]"
                  style={{
                    background: "color-mix(in srgb, currentColor 4%, transparent)",
                    borderColor: dividerColor,
                    color: "var(--preview-primary-color, currentColor)",
                  }}
                >
                  ×{item.qty}
                </div>
                <div
                  data-editor-field-path={`purchaseItems[${item.index}].icon`}
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border"
                  style={{
                    background: "color-mix(in srgb, currentColor 4%, transparent)",
                    borderColor: dividerColor,
                  }}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div
                  data-editor-field-path={`purchaseItems[${item.index}].name`}
                  className="mb-3 text-[20px] font-bold leading-[1.15] tracking-[-0.025em]"
                >
                  {String(item.row.name ?? "Item")}
                </div>
                <div
                  data-editor-field-path={`purchaseItems[${item.index}].unitPrice`}
                  className="border-t pt-3 text-[18px] font-bold tracking-[-0.025em]"
                  style={{ borderColor: dividerColor }}
                >
                  {formatBRL(item.total)}
                </div>
              </div>
            );
          })}
        </div>
        <div
          className="flex flex-col items-center gap-2 rounded-xl px-6 py-5 text-center md:flex-row md:justify-center md:gap-3"
          style={{
            background: "var(--preview-secondary-color, #0b1b2b)",
            color: "color-mix(in srgb, white 78%, transparent)",
          }}
        >
          {texts.anchorLabel ? (
            <span data-editor-field-path="anchorLabel" className="text-sm">
              {texts.anchorLabel}
            </span>
          ) : null}
          <span
            aria-hidden
            className="hidden h-1 w-1 rounded-full md:inline-block"
            style={{ background: "color-mix(in srgb, white 30%, transparent)" }}
          />
          <span
            className="text-[18px] font-bold tracking-[-0.015em]"
            style={{ color: "var(--preview-primary-color, white)" }}
          >
            {formattedTotal}
          </span>
        </div>
      </section>
    </div>
  );
}

function renderNarrative(
  textHtml: string,
  texts: Texts,
  currency: string,
  intPart: string,
  decPart: string,
  items: ResolvedItem[]
): JSX.Element {
  const valueMarkup = `<span class="font-extrabold tracking-[-0.04em]" style="color: var(--preview-primary-color, currentColor)"><span class="mr-0.5 text-[0.6em] font-semibold" style="vertical-align: 0.2em">${currency}</span>${intPart}<span class="ml-0.5 text-[0.4em] font-semibold" style="vertical-align: 0.7em">,${decPart}</span></span>`;
  const quoteHtml = texts.narrativeQuoteHtml
    ? texts.narrativeQuoteHtml.split(VALUE_PLACEHOLDER).join(valueMarkup)
    : "";

  return (
    <div className="economy-purchases-root w-full">
      {textHtml ? (
        <div
          data-editor-field-path="text"
          className="preview-rich-content mb-4 max-w-none"
          dangerouslySetInnerHTML={{ __html: textHtml }}
        />
      ) : null}
      <section className="py-3">
        {quoteHtml ? (
          <div
            data-editor-field-path="narrativeQuote"
            className="preview-rich-content mb-2 text-[26px] font-medium leading-[1.25] tracking-[-0.025em] md:text-[34px]"
            style={{ maxWidth: 880 }}
            dangerouslySetInnerHTML={{ __html: quoteHtml }}
          />
        ) : null}
        {texts.narrativeAction ? (
          <span
            data-editor-field-path="narrativeAction"
            className="mb-7 block text-[22px] font-bold tracking-[-0.02em] md:text-[26px]"
          >
            {texts.narrativeAction}
          </span>
        ) : null}
        <div
          data-editor-field-path="purchaseItems"
          className="flex flex-col md:flex-row"
          style={{
            borderTop: `1px solid ${dividerColor}`,
            borderBottom: `1px solid ${dividerColor}`,
          }}
        >
          {items.map((item) => {
            const Icon = resolveLucideIconFromName(item.row.icon);
            return (
              <div
                key={String(item.row.id ?? `${item.row.name}-${item.index}`)}
                className="min-w-0 flex-1 border-b px-6 py-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
                style={{ borderColor: dividerColor }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div
                    data-editor-field-path={`purchaseItems[${item.index}].icon`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: "color-mix(in srgb, currentColor 8%, transparent)" }}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </div>
                  <div
                    className="text-[11px] font-bold uppercase tracking-[.14em]"
                    style={{ color: "var(--preview-primary-color, currentColor)" }}
                  >
                    {item.qty} {item.qty === 1 ? "unidade" : "unidades"}
                  </div>
                </div>
                <div
                  data-editor-field-path={`purchaseItems[${item.index}].name`}
                  className="mb-1 text-[20px] font-bold leading-[1.2] tracking-[-0.025em]"
                >
                  {String(item.row.name ?? "Item")}
                </div>
                <div
                  data-editor-field-path={`purchaseItems[${item.index}].unitPrice`}
                  className="text-sm opacity-70"
                >
                  {formatBRL(item.total)}
                </div>
              </div>
            );
          })}
        </div>
        {texts.narrativeFooterHtml ? (
          <div
            data-editor-field-path="narrativeFooter"
            className="preview-rich-content mt-5 text-right text-xs tracking-[.04em] opacity-70"
            dangerouslySetInnerHTML={{ __html: texts.narrativeFooterHtml }}
          />
        ) : null}
      </section>
    </div>
  );
}
