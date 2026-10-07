/**
 * Otimiza e comprime imagens no navegador antes do upload para o S3.
 * Evita uploads gigantescos (ex: fotos de celulares de 8MB-12MB) que deixam
 * a renderização de propostas e geração de PDFs com tamanho excessivo (>20MB).
 */
export async function compressImageForUpload(
  file: File,
  maxDimension = 1920,
  quality = 0.82
): Promise<File> {
  // Arquivos já compactos (<= 500KB) não precisam de processamento
  if (file.size <= 500 * 1024) {
    return file;
  }

  // Apenas imagens raster padrão
  const lowerType = file.type.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(lowerType)) {
    return file;
  }

  // Em ambientes SSR sem window/document, retorna o original defensivamente
  if (typeof window === "undefined" || typeof document === "undefined") {
    return file;
  }

  return new Promise<File>((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Se a imagem for maior que a dimensão máxima (ex: 1920px), redimensiona proporcionalmente
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(file);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Se a imagem for PNG (pode ter transparência), WebP preserva transparência com alta compressão
        const outputMime = lowerType === "image/png" ? "image/webp" : lowerType;
        const outputExt =
          outputMime === "image/webp"
            ? ".webp"
            : file.name.substring(file.name.lastIndexOf(".")) || ".jpg";
        const baseName = file.name.replace(/\.[^/.]+$/, "");
        const newFileName = `${baseName}${outputExt}`;

        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              return resolve(file);
            }
            const compressedFile = new File([blob], newFileName, {
              type: outputMime,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          outputMime,
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
