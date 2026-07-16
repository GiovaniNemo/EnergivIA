"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from "react";
import { Expand, FileText, Loader2, Minimize2, Monitor, Smartphone } from "lucide-react";
import { PreviewDocument } from "./preview-document";
import type { ProposalDocumentJson } from "./types";
import type { SectionRenderOptions } from "./section-render/types";

const PREVIEW_LOAD_DELAY_MS = 1000;
const SCALE_ROUND = 10000;
function roundScale(s: number): number {
  return Math.round(s * SCALE_ROUND) / SCALE_ROUND;
}

function PreviewLoadingPlaceholder(): JSX.Element {
  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 px-6 py-12"
      role="status"
      aria-live="polite"
      aria-label="Carregando preview"
    >
      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-muted-foreground)]" aria-hidden />
      <p className="text-sm font-medium text-[var(--color-foreground)]">Carregando preview</p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <div className="h-2.5 w-full animate-pulse rounded-md bg-[var(--color-foreground)]/10" />
        <div className="h-2.5 w-4/5 animate-pulse rounded-md bg-[var(--color-foreground)]/10" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-[var(--color-foreground)]/8" />
      </div>
    </div>
  );
}

interface PreviewPanelProps {
  title: string;
  documentState: ProposalDocumentJson;
  containerRef?: Ref<HTMLElement>;
  selectedSectionId?: string;
  onSelectSection?: (sectionId: string, fieldName?: string) => void;
  onSectionHeightChange?: (sectionId: string, heightPercent: number) => void;
  sectionRenderOptions?: SectionRenderOptions;
}

export function PreviewPanel({
  title,
  documentState,
  containerRef,
  selectedSectionId,
  onSelectSection,
  onSectionHeightChange,
  sectionRenderOptions,
}: PreviewPanelProps): JSX.Element {
  const DESKTOP_PREVIEW_MIN_WIDTH = 980;
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile" | "pdf">("desktop");
  const [isMaximized, setIsMaximized] = useState(false);
  const desktopMeasureRef = useRef<HTMLDivElement>(null);
  const desktopContentRef = useRef<HTMLDivElement>(null);
  const desktopScaleRef = useRef(1);
  const mobileFrameRef = useRef<HTMLDivElement>(null);
  const [desktopScale, setDesktopScale] = useState(1);
  const [desktopScaledHeight, setDesktopScaledHeight] = useState(0);
  const [mobileScale, setMobileScale] = useState(1);
  const [previewReady, setPreviewReady] = useState(false);
  const renderMode = previewViewport === "pdf" ? "pdf" : "web";
  const desktopCanvasWidth = useMemo(() => {
    const pageWidth = documentState.styles.layout.pageWidth;
    const baseWidth = pageWidth === "narrow" ? 720 : pageWidth === "wide" ? 1180 : 920;
    return Math.max(DESKTOP_PREVIEW_MIN_WIDTH, baseWidth);
  }, [documentState.styles.layout.pageWidth]);

  useEffect(() => {
    const id = window.setTimeout(() => setPreviewReady(true), PREVIEW_LOAD_DELAY_MS);
    return () => window.clearTimeout(id);
  }, []);

  const viewOptions: Array<{
    id: "desktop" | "mobile" | "pdf";
    label: string;
    icon: typeof Monitor;
  }> = [
    { id: "desktop", label: "Desktop", icon: Monitor },
    { id: "mobile", label: "Mobile", icon: Smartphone },
    { id: "pdf", label: "PDF", icon: FileText },
  ];

  useLayoutEffect(() => {
    if (previewViewport !== "desktop" || !previewReady) return;
    const measure = desktopMeasureRef.current;
    const content = desktopContentRef.current;
    if (!measure || !content) return;

    const applyFromMeasure = () => {
      const available = Math.max(0, measure.clientWidth - 8);
      const scale = roundScale(Math.min(1, Math.max(0.35, available / desktopCanvasWidth)));
      desktopScaleRef.current = scale;
      const scaledH = Math.max(1, Math.round(content.scrollHeight * scale));
      setDesktopScale((prev) => (prev === scale ? prev : scale));
      setDesktopScaledHeight(scaledH);
    };

    const applyHeightOnly = () => {
      const scale = desktopScaleRef.current;
      const scaledH = Math.max(1, Math.round(content.scrollHeight * scale));
      setDesktopScaledHeight((prev) => (prev === scaledH ? prev : scaledH));
    };

    applyFromMeasure();
    const roMeasure = new ResizeObserver(applyFromMeasure);
    roMeasure.observe(measure);
    const roContent = new ResizeObserver(() => {
      applyHeightOnly();
    });
    roContent.observe(content);
    return () => {
      roMeasure.disconnect();
      roContent.disconnect();
    };
  }, [previewViewport, previewReady, desktopCanvasWidth, title, documentState, selectedSectionId]);

  useLayoutEffect(() => {
    if (previewViewport !== "mobile" || !previewReady) return;
    const frame = mobileFrameRef.current;
    if (!frame) return;
    const mobileViewportWidth = 390;
    const mobileViewportHeight = 844;
    const updateScale = () => {
      const availableWidth = frame.clientWidth - 8;
      const availableHeight = frame.clientHeight - 8;
      const next = Math.min(
        1,
        Math.max(
          0.28,
          Math.min(availableWidth / mobileViewportWidth, availableHeight / mobileViewportHeight)
        )
      );
      setMobileScale(next);
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [previewViewport, previewReady]);

  return (
    <section
      ref={containerRef}
      className={
        isMaximized
          ? "fixed inset-4 z-50 flex min-h-0 flex-col rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_82%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_96%,white_4%)] p-3 shadow-[0_18px_42px_rgba(2,6,23,0.28)]"
          : "flex h-[calc(100vh-190px)] min-h-[520px] w-full min-w-0 flex-col rounded-2xl border border-[color:color-mix(in_srgb,var(--color-border)_82%,transparent)] bg-[color:color-mix(in_srgb,var(--color-card)_96%,white_4%)] p-3 shadow-[0_18px_42px_rgba(2,6,23,0.14)] lg:h-[calc(100vh-160px)] lg:min-h-[640px] lg:flex-1"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--color-foreground)]">Preview</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-1">
            {viewOptions.map((option) => {
              const active = previewViewport === option.id;
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPreviewViewport(option.id)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? "bg-emerald-500 text-zinc-950"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setIsMaximized((prev) => !prev)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-xs font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-accent)]"
          >
            {isMaximized ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Expand className="h-3.5 w-3.5" />
            )}
            {isMaximized ? "Restaurar" : "Maximizar"}
          </button>
        </div>
      </div>
      {previewViewport === "desktop" ? (
        previewReady ? (
          <div
            ref={desktopMeasureRef}
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              <div
                style={{
                  width: `${desktopCanvasWidth * desktopScale}px`,
                  height: `${desktopScaledHeight}px`,
                  overflow: "hidden",
                }}
              >
                <div
                  ref={desktopContentRef}
                  style={{
                    width: `${desktopCanvasWidth}px`,
                    transform: `scale(${desktopScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <PreviewDocument
                    title={title}
                    documentState={documentState}
                    selectedSectionId={selectedSectionId}
                    onSelectSection={onSelectSection}
                    onSectionHeightChange={onSectionHeightChange}
                    interactionScale={desktopScale}
                    sectionRenderOptions={{ ...sectionRenderOptions, mode: renderMode }}
                    mode={renderMode}
                    viewport={previewViewport}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PreviewLoadingPlaceholder />
        )
      ) : previewViewport === "mobile" ? (
        previewReady ? (
          <div ref={mobileFrameRef} className="min-h-0 flex-1 overflow-hidden">
            <div className="flex h-full items-center justify-center">
              <div style={{ width: `${390 * mobileScale}px`, height: `${844 * mobileScale}px` }}>
                <div
                  className="overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[var(--color-background)] shadow-[0_14px_34px_rgba(2,6,23,0.22)]"
                  style={{
                    width: "390px",
                    height: "844px",
                    transform: `scale(${mobileScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <PreviewDocument
                    title={title}
                    documentState={documentState}
                    selectedSectionId={selectedSectionId}
                    onSelectSection={onSelectSection}
                    onSectionHeightChange={onSectionHeightChange}
                    interactionScale={mobileScale}
                    sectionRenderOptions={{ ...sectionRenderOptions, mode: renderMode }}
                    mode={renderMode}
                    viewport="mobile"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <PreviewLoadingPlaceholder />
        )
      ) : previewReady ? (
        <PreviewDocument
          title={title}
          documentState={documentState}
          selectedSectionId={selectedSectionId}
          onSelectSection={onSelectSection}
          onSectionHeightChange={onSectionHeightChange}
          interactionScale={1}
          sectionRenderOptions={{ ...sectionRenderOptions, mode: renderMode }}
          mode={renderMode}
          viewport={previewViewport}
        />
      ) : (
        <PreviewLoadingPlaceholder />
      )}
    </section>
  );
}
