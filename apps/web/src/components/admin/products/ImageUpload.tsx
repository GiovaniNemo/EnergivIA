"use client";

import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { createPresignedUploadUrl, type UploadFolder } from "@/lib/admin-api";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder: UploadFolder;
  productCategory?: string;
  label?: string;
}

export function ImageUpload({
  value,
  onChange,
  folder,
  productCategory,
  label = "Imagem do produto",
}: ImageUploadProps): JSX.Element {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    setPreviewUrl(value ?? "");
  }, [value]);

  const accept = useMemo(() => ".jpg,.jpeg,.png,.webp", []);

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setError("");

    if (!ALLOWED_CONTENT_TYPES.has(file.type.toLowerCase())) {
      setError("Formato inválido. Use JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Arquivo muito grande. Tamanho máximo: 5MB.");
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setIsUploading(true);

    try {
      const { uploadUrl, fileUrl } = await createPresignedUploadUrl({
        fileName: file.name,
        contentType: file.type,
        folder,
        productCategory,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Falha no upload da imagem para o storage.");
      }

      onChange(fileUrl);
      setPreviewUrl(fileUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar imagem.");
      setPreviewUrl(value ?? "");
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    void handleFileChange(file);
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>

      <Box
        sx={{
          border: "1px dashed",
          borderColor: isDragActive ? "primary.main" : "divider",
          borderRadius: 2,
          p: 3,
          minHeight: 240,
          backgroundColor: "background.default",
          transition: "border-color 0.15s ease, background-color 0.15s ease",
          ...(isDragActive && { backgroundColor: "action.hover" }),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsDragActive(false);
        }}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <Box sx={{ mb: 1.5, display: "flex", justifyContent: "center" }}>
            <Box
              component="img"
              src={previewUrl}
              alt="Preview da imagem"
              sx={{
                width: 220,
                height: 220,
                objectFit: "contain",
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "rgba(148, 163, 184, 0.08)",
              }}
            />
          </Box>
        ) : (
          <Box
            sx={{
              mb: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              color: "text.secondary",
            }}
          >
            <CloudUploadOutlinedIcon sx={{ fontSize: 42, opacity: 0.8 }} />
            <Typography variant="body2">Arraste a imagem para esta area</Typography>
          </Box>
        )}
        {!previewUrl ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ alignSelf: "center", mb: 1.5, letterSpacing: "0.03em" }}
          >
            ----- ou -----
          </Typography>
        ) : null}

        <Button
          variant="outlined"
          component="label"
          disabled={isUploading}
          sx={{ alignSelf: "center" }}
        >
          Selecionar imagem
          <input
            type="file"
            hidden
            accept={accept}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              void handleFileChange(file);
              event.currentTarget.value = "";
            }}
          />
        </Button>
        {previewUrl ? (
          <Button
            variant="text"
            color="inherit"
            disabled={isUploading}
            onClick={() => {
              onChange("");
              setPreviewUrl("");
            }}
            sx={{ alignSelf: "center" }}
          >
            Remover imagem
          </Button>
        ) : null}

        {isUploading && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Enviando imagem...
            </Typography>
          </Box>
        )}
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      <Typography variant="caption" color="text.secondary">
        Formatos aceitos: JPG, PNG, WEBP. Tamanho máximo: 5MB.
      </Typography>
    </Box>
  );
}
