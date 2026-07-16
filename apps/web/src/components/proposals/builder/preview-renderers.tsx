"use client";

import type { ReactNode } from "react";
import type { ProposalBuilderSection } from "./types";

interface PreviewContent {
  backgroundImage?: string;
  overlayOpacity?: number | string;
  title?: string;
  subtitle?: string;
  text?: string;
  sectionSubtitle?: string;
  table?: unknown;
  images?: string[];
  total?: number | string;
  discount?: number | string;
  paymentConditions?: string;
  monthlyInstallment?: number | string;
  currentBill?: number | string;
  items?: unknown;
  steps?: unknown;
  buttonText?: string;
  proposalUrl?: string;
  buttonAction?: string;
  beforeValue?: number | string;
  afterValue?: number | string;
  url?: string;
  signerName?: string;
  signerTitle?: string;
}

interface PreviewTableRow {
  item?: string;
  description?: string;
  title?: string;
  estimatedTime?: string;
  name?: string;
  subtitle?: string;
  text?: string;
  question?: string;
  answer?: string;
}

function asList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function asTable(value: unknown): PreviewTableRow[] {
  return Array.isArray(value) ? (value as PreviewTableRow[]) : [];
}

function sectionCard(title: string, children: ReactNode): JSX.Element {
  return (
    <section className="rounded-xl border border-zinc-700/70 bg-zinc-900/35 p-4">
      <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
      <div className="mt-2 text-sm text-zinc-300">{children}</div>
    </section>
  );
}

export function renderSection(section: ProposalBuilderSection): JSX.Element {
  const c = section.content as PreviewContent;
  switch (section.type) {
    case "cover":
      return (
        <section
          className="relative overflow-hidden rounded-xl p-5 text-white"
          style={{
            backgroundImage: c.backgroundImage
              ? `linear-gradient(140deg, rgba(2,6,23,${Number(c.overlayOpacity ?? 0.4)}), rgba(2,6,23,0.7)), url(${String(c.backgroundImage)})`
              : "linear-gradient(135deg, #0f172a, #16a34a)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <h2 className="text-2xl font-bold">{String(c.title ?? "Solar Proposal")}</h2>
          <p className="mt-1 text-sm text-zinc-100">{String(c.subtitle ?? "")}</p>
        </section>
      );
    case "introduction":
    case "about_company":
    case "diagnostic_energy":
    case "solution":
    case "custom":
      return sectionCard(
        section.title,
        <div dangerouslySetInnerHTML={{ __html: String(c.text ?? "") }} />
      );
    case "generation_consumption":
      return sectionCard(
        section.title,
        <div className="space-y-2 text-xs text-zinc-300">
          <p className="font-semibold text-zinc-100">
            {String((c as { potencia?: number }).potencia ?? "—")} kWp
          </p>
          <p className="text-zinc-500">Chart: use the full template editor (Recharts preview).</p>
          <div dangerouslySetInnerHTML={{ __html: String(c.text ?? "") }} />
        </div>
      );
    case "proposal_equipment":
      return sectionCard(
        section.title,
        <div className="space-y-2 text-xs">
          {c.sectionSubtitle ? <p className="text-zinc-400">{String(c.sectionSubtitle)}</p> : null}
          <div dangerouslySetInnerHTML={{ __html: String(c.text ?? "") }} />
          <p className="text-zinc-500">Configure equipment in the template editor.</p>
        </div>
      );
    case "gallery":
      return sectionCard(
        section.title,
        <div className="grid grid-cols-3 gap-2">
          {(c.images as string[] | undefined)?.slice(0, 6).map((url, idx) => (
            <img key={idx} src={url} alt="" className="h-20 w-full rounded object-cover" />
          ))}
        </div>
      );
    case "economy_purchases": {
      const horizon = Number((c as { horizonYears?: string | number }).horizonYears) === 5 ? 5 : 10;
      const items = Array.isArray((c as { purchaseItems?: unknown }).purchaseItems)
        ? ((c as { purchaseItems?: Array<{ name?: string; unitPrice?: string | number }> })
            .purchaseItems ?? [])
        : [];
      return sectionCard(
        section.title,
        <div className="space-y-2 text-xs">
          <p>Horizon: {horizon} years</p>
          <p>Items configured: {items.length}</p>
          <div dangerouslySetInnerHTML={{ __html: String(c.text ?? "") }} />
        </div>
      );
    }
    case "pricing":
      return sectionCard(
        section.title,
        <div>
          <p>Total: ${Number(c.total ?? 0).toFixed(2)}</p>
          <p>Discount: ${Number(c.discount ?? 0).toFixed(2)}</p>
          <p className="text-xs text-zinc-400">{String(c.paymentConditions ?? "")}</p>
        </div>
      );
    case "financing": {
      const installment = Number(c.monthlyInstallment ?? 0);
      const bill = Number(c.currentBill ?? 0);
      return sectionCard(
        section.title,
        <div>
          <p>{installment.toFixed(2)} / month</p>
          <p className="text-xs text-zinc-400">Delta vs bill: {(bill - installment).toFixed(2)}</p>
        </div>
      );
    }
    case "testimonials":
      return sectionCard(
        section.title,
        <div className="space-y-2">
          {asTable(c.items).map((row, idx) => (
            <div key={idx} className="rounded border border-zinc-700/70 p-2">
              <p className="font-medium">{row.name}</p>
              {row.subtitle ? <p className="text-xs text-zinc-500">{row.subtitle}</p> : null}
              <p className="text-xs text-zinc-400">{row.text}</p>
            </div>
          ))}
        </div>
      );
    case "faq":
      return sectionCard(
        section.title,
        <div className="space-y-2">
          {asTable(c.items).map((row, idx) => (
            <div key={idx}>
              <p className="font-medium">{row.question}</p>
              <p className="text-xs text-zinc-400">{row.answer}</p>
            </div>
          ))}
        </div>
      );
    case "cta":
      return sectionCard(
        section.title,
        <div className="space-y-2 text-xs">
          <p className="truncate text-zinc-400">{String(c.proposalUrl ?? c.buttonAction ?? "")}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-emerald-600 px-2 py-1 font-semibold text-zinc-950">
              Accept
            </span>
            <span className="rounded-md border border-zinc-500 px-2 py-1">Request changes</span>
            <span className="rounded-md border border-red-500/70 px-2 py-1 text-red-200">
              Reject
            </span>
          </div>
        </div>
      );
    case "comparison":
      return sectionCard(
        section.title,
        <div className="flex gap-2 text-xs">
          <p>Before: ${Number(c.beforeValue ?? 0).toFixed(2)}</p>
          <p>After: ${Number(c.afterValue ?? 0).toFixed(2)}</p>
        </div>
      );
    case "video":
      return sectionCard(section.title, <p className="truncate">{String(c.url ?? "")}</p>);
    case "social_proof":
    case "guarantees":
      return sectionCard(
        section.title,
        <ul className="list-disc space-y-1 pl-4 text-xs">
          {asList(c.items).map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );
    case "process_steps":
      return sectionCard(
        section.title,
        <div className="space-y-2 text-xs">
          {asTable(c.items).map((row, idx) => (
            <div key={idx} className="rounded border border-zinc-700/70 p-2">
              <p className="font-medium">{row.title}</p>
              {row.estimatedTime ? (
                <p className="text-[10px] text-zinc-500">{row.estimatedTime}</p>
              ) : null}
              {row.description ? <p className="text-zinc-400">{row.description}</p> : null}
            </div>
          ))}
        </div>
      );
    case "signature":
      return sectionCard(
        section.title,
        <div className="text-xs">
          <p>{String(c.signerName ?? "")}</p>
          <p className="text-zinc-400">{String(c.signerTitle ?? "")}</p>
        </div>
      );
    default:
      return sectionCard(section.title, <p>Unsupported section</p>);
  }
}
