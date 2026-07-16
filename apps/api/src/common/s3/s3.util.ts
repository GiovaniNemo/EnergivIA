import { S3Client } from "@aws-sdk/client-s3";
import { extname } from "node:path";
import { randomUUID } from "node:crypto";

export const ALLOWED_IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const ALLOWED_DOCUMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function createS3ClientForPresign(region: string | undefined): S3Client {
  return new S3Client({
    region: region || undefined,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}

export function presignedPutObjectUrlOptions(expiresInSeconds: number) {
  return {
    expiresIn: expiresInSeconds,
    signableHeaders: new Set(["content-type"]),
  };
}

const PRODUCT_CATEGORY_TO_FOLDER: Record<string, string> = {
  module: "modules",
  inverter: "inverters",
  microinverter: "inverters",
  structure_kit: "structures",
  dc_cable: "accessories",
  connector: "accessories",
};

function slugifyBaseName(fileName: string): string {
  const base = fileName.replace(extname(fileName), "");
  const slug = base
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "file";
}

export function resolveUploadPrefix(
  folder:
    | "products"
    | "brands"
    | "distributors"
    | "organizations"
    | "proposal_templates"
    | "financing_documents",
  productCategory?: string
): string {
  if (folder === "brands") return "brands";
  if (folder === "distributors") return "distributors";
  if (folder === "organizations") return "organizations";
  if (folder === "proposal_templates") return "proposal-templates";
  if (folder === "financing_documents") return "financing/documents";
  const categoryFolder =
    PRODUCT_CATEGORY_TO_FOLDER[(productCategory ?? "").toLowerCase()] ?? "accessories";
  return `products/${categoryFolder}`;
}

export function buildS3ObjectKey(input: {
  folder:
    | "products"
    | "brands"
    | "distributors"
    | "organizations"
    | "proposal_templates"
    | "financing_documents";
  fileName: string;
  productCategory?: string;
}): string {
  const prefix = resolveUploadPrefix(input.folder, input.productCategory);
  const extension = extname(input.fileName).toLowerCase() || ".jpg";
  const allowedExts =
    input.folder === "financing_documents"
      ? [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
      : [".jpg", ".jpeg", ".png", ".webp"];
  const fallback = input.folder === "financing_documents" ? ".pdf" : ".jpg";
  const safeExt = allowedExts.includes(extension) ? extension : fallback;
  const slug = slugifyBaseName(input.fileName);
  const uid = randomUUID();
  return `${prefix}/${slug}-${uid}${safeExt}`;
}
