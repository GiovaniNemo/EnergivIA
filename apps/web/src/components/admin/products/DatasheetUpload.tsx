"use client";

import { useState, useMemo } from "react";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { createPresignedUploadUrl, extractDatasheet } from "@/lib/admin-api";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB para PDFs

interface DatasheetUploadProps {
  value?: string;
  onChange: (url: string) => void;
  productCategory?: string;
  productName?: string;
  onExtractedSpecs: (specs: Record<string, unknown>) => void;
}

export function DatasheetUpload({
  value,
  onChange,
  productCategory,
  productName,
  onExtractedSpecs,
}: DatasheetUploadProps): JSX.Element {
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const accept = useMemo(() => ".pdf", []);

  const handleExtractFromExistingPdf = async () => {
    if (!value) return;
    setError("");
    setSuccessMsg("");
    setIsExtracting(true);
    try {
      const { specs } = await extractDatasheet(value, productName);
      onExtractedSpecs(specs);
      setSuccessMsg("Ficha técnica preenchida com sucesso pela IA a partir do PDF anexado!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao extrair dados do PDF com IA.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) return;
    setError("");
    setSuccessMsg("");

    if (file.type !== "application/pdf") {
      setError("Formato inválido. Envie apenas arquivos PDF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Arquivo muito grande. Tamanho máximo: 50MB.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Faz o upload do PDF para o S3
      const { uploadUrl, fileUrl } = await createPresignedUploadUrl({
        fileName: file.name,
        contentType: file.type,
        folder: "datasheets",
        productCategory,
      });

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Falha no upload do datasheet para o S3.");
      }

      onChange(fileUrl);
      setIsUploading(false);
      setIsExtracting(true);

      // 2. Extrai as especificações usando IA
      const { specs } = await extractDatasheet(fileUrl, productName);
      onExtractedSpecs(specs);
      setSuccessMsg("PDF enviado e especificações extraídas com sucesso pela IA!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar datasheet.");
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
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
        📄 Datasheet do Equipamento (PDF)
      </Typography>

      <Box
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragActive(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragActive(false);
        }}
        onDrop={handleDrop}
        sx={{
          position: "relative",
          width: "100%",
          p: 3,
          border: "2px dashed",
          borderColor: isDragActive ? "primary.main" : "var(--color-border)",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
          bgcolor: isDragActive ? "primary.50" : "var(--color-background)",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "primary.50",
          },
        }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 32, color: "text.secondary" }} />

        {value ? (
          <Box display="flex" flexDirection="column" alignItems="center" gap={0.5}>
            <Typography variant="body2" color="success.main" fontWeight={600}>
              PDF anexado com sucesso!
            </Typography>
            <Typography variant="caption" color="text.secondary">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--color-primary, #0ea5e9)", textDecoration: "underline" }}
              >
                Ver arquivo anexado
              </a>
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Arraste e solte o Datasheet em PDF aqui ou clique abaixo
          </Typography>
        )}

        <Box display="flex" gap={1.5} flexWrap="wrap" justifyContent="center" alignItems="center">
          {value ? (
            <Button
              variant="contained"
              disabled={isUploading || isExtracting}
              onClick={handleExtractFromExistingPdf}
              startIcon={
                isExtracting ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />
              }
              sx={{
                bgcolor: "#059669",
                "&:hover": { bgcolor: "#047857" },
                color: "#fff",
                fontWeight: 700,
                textTransform: "none",
                px: 2.5,
                py: 1,
              }}
            >
              {isExtracting ? "✨ Lendo PDF com IA..." : "✨ Ler PDF Anexado com IA"}
            </Button>
          ) : null}

          <Button
            variant={value ? "outlined" : "contained"}
            component="label"
            disabled={isUploading || isExtracting}
            startIcon={
              isUploading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />
            }
            sx={{
              textTransform: "none",
              fontWeight: 600,
              ...(value
                ? {
                    borderColor: "var(--color-border, #4b5563)",
                    color: "text.primary",
                    "&:hover": { borderColor: "primary.main" },
                  }
                : {}),
            }}
          >
            {isUploading
              ? "Enviando arquivo..."
              : value
                ? "Substituir PDF (Novo Upload)"
                : "Preencher com IA (Upload Datasheet)"}
            <input
              type="file"
              hidden
              accept={accept}
              onChange={(e) => {
                void handleFileChange(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </Button>
        </Box>
      </Box>

      {successMsg ? <Alert severity="success">{successMsg}</Alert> : null}
      {error ? <Alert severity="error">{error}</Alert> : null}
    </Box>
  );
}
