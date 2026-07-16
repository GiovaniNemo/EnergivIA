"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { FileUp, X } from "lucide-react";
import { cn } from "@energivia/utils";

interface ImageDropzoneProps {
  label?: string;
  value?: string;
  onSelectFile: (file: File) => void | Promise<void>;
  onClear?: () => void;
  isUploading?: boolean;
  disabled?: boolean;
  accept?: string;
  helperText?: string;
  errorMessage?: string | null;
  variant?: "default" | "embedded";
  hideLabel?: boolean;
  emptyPlaceholder?: string;
  emptyDescription?: ReactNode;
  size?: "default" | "large";
  fillHeight?: boolean;
  className?: string;
  editorHighlight?: boolean;
}

export function ImageDropzone({
  label = "",
  value = "",
  onSelectFile,
  onClear,
  isUploading = false,
  disabled = false,
  accept = "image/*",
  helperText,
  errorMessage,
  variant = "default",
  hideLabel = false,
  emptyPlaceholder = "Arraste ou clique para adicionar uma imagem",
  emptyDescription,
  size = "default",
  fillHeight = false,
  className = "",
  editorHighlight = false,
}: ImageDropzoneProps): JSX.Element {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [localError, setLocalError] = useState("");
  const hasImage = Boolean(value);
  const embedded = variant === "embedded";
  const large = size === "large" && !embedded;
  const previewHeight = embedded ? "h-20" : large ? "h-40" : "h-28";
  const labelClass = embedded
    ? "text-xs font-medium text-[var(--color-foreground)]"
    : "text-sm font-medium text-[var(--color-foreground)]";
  const dashedPad = embedded ? "px-2 py-1.5" : large ? "p-4" : "p-3";

  function handleFile(file: File | undefined): void {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLocalError("Arquivo inválido. Envie uma imagem.");
      return;
    }
    setLocalError("");
    void onSelectFile(file);
  }

  function openFilePicker(): void {
    if (disabled) return;
    inputRef.current?.click();
  }

  const showLabel = !hideLabel && label.trim().length > 0;
  const imageAlt = label.trim() || "Imagem";

  return (
    <div
      className={cn(
        "w-full",
        fillHeight ? "flex h-full min-h-0 flex-col" : "space-y-1.5",
        className
      )}
    >
      {showLabel ? <p className={labelClass}>{label}</p> : null}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        className={cn(
          `rounded-md border-2 border-dashed ${dashedPad} transition`,
          isDragActive
            ? "border-emerald-500/70 bg-emerald-500/10"
            : editorHighlight
              ? "border-emerald-400/80 bg-emerald-500/[0.14] shadow-[0_0_0_2px_rgba(16,185,129,0.35)]"
              : "border-[var(--color-border)] bg-[var(--color-card)]",
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          fillHeight && "flex min-h-0 flex-1 flex-col"
        )}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) return;
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) return;
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(false);
          if (disabled) return;
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        {hasImage ? (
          <div className={cn("space-y-2", fillHeight && "flex min-h-0 flex-1 flex-col")}>
            <img
              src={value}
              alt={imageAlt}
              referrerPolicy="no-referrer"
              className={cn(
                "w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] object-contain",
                fillHeight ? "min-h-0 max-h-full flex-1" : previewHeight
              )}
            />
            <p className="text-center text-[11px] text-[var(--color-muted-foreground)]">
              Arraste ou clique para trocar a imagem
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-md border border-[var(--color-border)]/70 bg-[var(--color-background)]/70 text-[var(--color-muted-foreground)]",
              fillHeight ? "min-h-24 flex-1" : previewHeight
            )}
          >
            <FileUp className={embedded ? "h-4 w-4" : "h-5 w-5"} />
            <p className="px-1 text-center text-[11px] leading-snug">{emptyPlaceholder}</p>
            {emptyDescription ? (
              <p className="max-w-[260px] px-2 text-center text-[10px] leading-snug text-[var(--color-muted-foreground)]">
                {emptyDescription}
              </p>
            ) : null}
          </div>
        )}

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />

        {hasImage && onClear ? (
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              disabled={disabled}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 text-[11px] text-[var(--color-foreground)] hover:bg-[var(--color-accent)]"
            >
              <X className="h-3.5 w-3.5" />
              Remover
            </button>
          </div>
        ) : null}
      </div>
      {isUploading ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Enviando imagem...</p>
      ) : null}
      {helperText ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">{helperText}</p>
      ) : null}
      {localError ? <p className="text-xs text-red-400">{localError}</p> : null}
      {errorMessage ? <p className="text-xs text-red-400">{errorMessage}</p> : null}
    </div>
  );
}
