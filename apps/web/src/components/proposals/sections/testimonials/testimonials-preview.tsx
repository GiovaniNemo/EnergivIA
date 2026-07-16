"use client";

import type { ReactNode } from "react";
import { Quote, Star } from "lucide-react";
import type { ProposalSection } from "@/components/proposals/editor/types";
import { resolveSectionVariant } from "@/components/proposals/editor/section-fields";
import { replaceVariables } from "@/components/proposals/editor/utils";
import type { PreviewRenderVariables } from "@/components/proposals/editor/section-render/types";
import { brandingToStepsTheme, withAlpha } from "@/components/proposals/sections/steps/steps-theme";

export type TestimonialItem = {
  name?: string;
  subtitle?: string;
  text?: string;
  photo?: string;
};

function resolvePhotoUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const raw = value.trim();
  try {
    const parsed = new URL(raw);
    const isPresignedPutUrl =
      parsed.searchParams.has("X-Amz-Algorithm") && parsed.searchParams.get("x-id") === "PutObject";
    if (!isPresignedPutUrl) return raw;
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return raw;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) {
    const w = parts[0] ?? "";
    return w.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return (first + last).toUpperCase() || "?";
}

function tpl(value: unknown, vars: PreviewRenderVariables): string {
  return replaceVariables(String(value ?? ""), vars as unknown as Record<string, string>);
}

function asItems(value: unknown): TestimonialItem[] {
  if (!Array.isArray(value)) return [];
  return value as TestimonialItem[];
}

const TESTIMONIAL_ITEMS_FIELD = "items";

function testimonialItemPath(index: number, key: "name" | "subtitle" | "text" | "photo"): string {
  return `${TESTIMONIAL_ITEMS_FIELD}[${index}].${key}`;
}

export interface TestimonialsSectionPreviewProps {
  section: ProposalSection;
  vars: PreviewRenderVariables;
  branding?: {
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    backgroundColor: string;
  };
  intro: ReactNode;
}

function testimonialCardChrome(theme: ReturnType<typeof brandingToStepsTheme>): {
  backgroundColor: string;
  borderColor: string;
  boxShadow: string;
  color: string;
} {
  return {
    backgroundColor: withAlpha(theme.background, 0.55),
    borderColor: withAlpha(theme.primary, 0.2),
    boxShadow: `0 10px 36px ${withAlpha(theme.primary, 0.1)}`,
    color: theme.text,
  };
}

export function TestimonialsSectionPreview({
  section,
  vars,
  branding,
  intro,
}: TestimonialsSectionPreviewProps): JSX.Element {
  const theme = brandingToStepsTheme(branding);
  const muted = withAlpha(theme.text, 0.72);
  const subtle = withAlpha(theme.text, 0.78);
  const avatarRing = withAlpha(theme.text, 0.14);
  const avatarOverlapBorder = withAlpha(theme.background, 0.82);

  const fields = section.fields as Record<string, unknown>;
  const rawItems = asItems(fields["items"]);
  const items =
    rawItems.length > 0
      ? rawItems
      : [{ name: "Cliente", subtitle: "", text: "Texto do depoimento.", photo: "" }];
  const layout = resolveSectionVariant("testimonials", String(section.variant ?? "overlap"));
  const card = testimonialCardChrome(theme);

  if (layout === "quote_header") {
    return (
      <div className="space-y-4">
        {intro}
        <div
          className="rounded-2xl px-1 pb-1"
          style={{
            background: `linear-gradient(to bottom, ${withAlpha(theme.primary, 0.08)}, transparent)`,
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => {
              const name = tpl(item.name ?? "Cliente", vars);
              const subtitle = tpl(item.subtitle ?? "", vars);
              const text = tpl(item.text ?? "", vars);
              const photo = resolvePhotoUrl(item.photo);
              return (
                <div
                  key={`testimonial-qh-${index}`}
                  className="relative overflow-hidden rounded-2xl p-5 text-left shadow-lg"
                  style={{
                    ...card,
                    borderWidth: 1,
                    borderStyle: "solid",
                  }}
                >
                  <Quote
                    className="pointer-events-none absolute right-3 top-3 h-11 w-11"
                    strokeWidth={1.25}
                    style={{ color: withAlpha(theme.primary, 0.35) }}
                    aria-hidden
                  />
                  <div className="relative flex items-start gap-3 pr-12">
                    {photo ? (
                      <img
                        src={photo}
                        alt=""
                        data-editor-field-path={testimonialItemPath(index, "photo")}
                        className="preview-editable-target h-12 w-12 shrink-0 cursor-pointer rounded-full object-cover"
                        style={{ boxShadow: `0 0 0 2px ${avatarRing}` }}
                      />
                    ) : (
                      <div
                        data-editor-field-path={testimonialItemPath(index, "photo")}
                        className="preview-editable-target flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-semibold"
                        style={{
                          backgroundColor: withAlpha(theme.primary, 0.22),
                          color: theme.primary,
                          boxShadow: `0 0 0 2px ${avatarRing}`,
                        }}
                      >
                        {initialsFromName(name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p
                        data-editor-field-path={testimonialItemPath(index, "name")}
                        className="preview-editable-target cursor-pointer font-semibold"
                        style={{ color: theme.text }}
                      >
                        {name}
                      </p>
                      {subtitle ? (
                        <p
                          data-editor-field-path={testimonialItemPath(index, "subtitle")}
                          className="preview-editable-target cursor-pointer text-sm"
                          style={{ color: muted }}
                        >
                          {subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p
                    data-editor-field-path={testimonialItemPath(index, "text")}
                    className="preview-editable-target relative mt-4 cursor-pointer text-sm leading-relaxed"
                    style={{ color: subtle }}
                  >
                    {text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {intro}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => {
          const name = tpl(item.name ?? "Cliente", vars);
          const subtitle = tpl(item.subtitle ?? "", vars);
          const text = tpl(item.text ?? "", vars);
          const photo = resolvePhotoUrl(item.photo);
          return (
            <div key={`testimonial-ov-${index}`} className="pt-9">
              <div
                className="relative rounded-2xl px-4 pb-5 pt-9 text-center shadow-lg"
                style={{
                  ...card,
                  borderWidth: 1,
                  borderStyle: "solid",
                }}
              >
                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                  {photo ? (
                    <img
                      src={photo}
                      alt=""
                      data-editor-field-path={testimonialItemPath(index, "photo")}
                      className="preview-editable-target h-[4.25rem] w-[4.25rem] cursor-pointer rounded-full object-cover shadow-md"
                      style={{
                        borderWidth: 4,
                        borderStyle: "solid",
                        borderColor: avatarOverlapBorder,
                      }}
                    />
                  ) : (
                    <div
                      data-editor-field-path={testimonialItemPath(index, "photo")}
                      className="preview-editable-target flex h-[4.25rem] w-[4.25rem] cursor-pointer items-center justify-center rounded-full text-sm font-semibold shadow-md"
                      style={{
                        backgroundColor: withAlpha(theme.primary, 0.2),
                        color: theme.primary,
                        borderWidth: 4,
                        borderStyle: "solid",
                        borderColor: avatarOverlapBorder,
                      }}
                    >
                      {initialsFromName(name)}
                    </div>
                  )}
                </div>
                <p
                  data-editor-field-path={testimonialItemPath(index, "name")}
                  className="preview-editable-target cursor-pointer font-semibold"
                  style={{ color: theme.text }}
                >
                  {name}
                </p>
                {subtitle ? (
                  <p
                    data-editor-field-path={testimonialItemPath(index, "subtitle")}
                    className="preview-editable-target cursor-pointer text-sm"
                    style={{ color: muted }}
                  >
                    {subtitle}
                  </p>
                ) : null}
                <p
                  data-editor-field-path={testimonialItemPath(index, "text")}
                  className="preview-editable-target mt-3 cursor-pointer text-sm leading-relaxed"
                  style={{ color: subtle }}
                >
                  {text}
                </p>
                <div
                  className="pointer-events-none mt-4 flex justify-center gap-0.5"
                  style={{ color: theme.primary }}
                  aria-hidden
                >
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star key={starIndex} className="h-4 w-4 fill-current text-current" />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
