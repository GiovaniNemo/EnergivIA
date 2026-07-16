"use client";

import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";

export interface TemplateBlueprintFormValues {
  name: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  documentJson: string;
  published: boolean;
  sortOrder: number;
}

const defaultValues: TemplateBlueprintFormValues = {
  name: "",
  slug: "",
  description: "",
  thumbnailUrl: "",
  documentJson: "",
  published: false,
  sortOrder: 0,
};

export interface TemplateBlueprintFormProps {
  initial?: Partial<TemplateBlueprintFormValues>;
  submitLabel: string;
  disabled?: boolean;
  onSubmit: (payload: {
    name: string;
    slug?: string;
    description?: string;
    thumbnailUrl?: string;
    document: Record<string, unknown>;
    published: boolean;
    sortOrder: number;
  }) => void;
}

export function TemplateBlueprintForm({
  initial,
  submitLabel,
  disabled,
  onSubmit,
}: TemplateBlueprintFormProps): JSX.Element {
  const merged = { ...defaultValues, ...initial };
  const [name, setName] = useState(merged.name);
  const [slug, setSlug] = useState(merged.slug);
  const [description, setDescription] = useState(merged.description);
  const [thumbnailUrl, setThumbnailUrl] = useState(merged.thumbnailUrl);
  const [documentJson, setDocumentJson] = useState(merged.documentJson);
  const [published, setPublished] = useState(merged.published);
  const [sortOrder, setSortOrder] = useState(merged.sortOrder);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError(null);
    let document: unknown;
    try {
      document = JSON.parse(documentJson) as unknown;
    } catch {
      setJsonError("JSON inválido no documento.");
      return;
    }
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      setJsonError("O documento deve ser um objeto JSON.");
      return;
    }
    onSubmit({
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      thumbnailUrl: thumbnailUrl.trim() || undefined,
      document: document as Record<string, unknown>,
      published,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    });
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{ display: "flex", flexDirection: "column", gap: 2 }}
    >
      <TextField
        label="Nome"
        value={name}
        onChange={(ev) => setName(ev.target.value)}
        required
        fullWidth
        disabled={disabled}
      />
      <TextField
        label="Slug (opcional)"
        value={slug}
        onChange={(ev) => setSlug(ev.target.value)}
        fullWidth
        disabled={disabled}
        helperText="Identificador único opcional para URLs estáveis."
      />
      <TextField
        label="Descrição"
        value={description}
        onChange={(ev) => setDescription(ev.target.value)}
        fullWidth
        multiline
        minRows={2}
        disabled={disabled}
      />
      <TextField
        label="URL da miniatura (opcional)"
        value={thumbnailUrl}
        onChange={(ev) => setThumbnailUrl(ev.target.value)}
        fullWidth
        disabled={disabled}
      />
      <TextField
        label="Ordem de exibição"
        type="number"
        value={sortOrder}
        onChange={(ev) => setSortOrder(Number(ev.target.value))}
        fullWidth
        disabled={disabled}
        inputProps={{ step: 1 }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={published}
            onChange={(ev) => setPublished(ev.target.checked)}
            disabled={disabled}
          />
        }
        label="Publicado (visível no catálogo de importação)"
      />
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Documento (JSON)
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Cole o export do editor: objeto com <code>sections</code>, <code>styles</code> e{" "}
          <code>variables</code>.
        </Typography>
        <TextField
          value={documentJson}
          onChange={(ev) => setDocumentJson(ev.target.value)}
          fullWidth
          multiline
          minRows={16}
          disabled={disabled}
          error={Boolean(jsonError)}
          helperText={jsonError ?? " "}
          sx={{ fontFamily: "ui-monospace, monospace" }}
        />
      </Box>
      <Box>
        <Button type="submit" variant="contained" disabled={disabled || !name.trim()}>
          {submitLabel}
        </Button>
      </Box>
    </Box>
  );
}
