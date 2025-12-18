import { extname } from "node:path";

export type UpscaleMode = "factor" | "target";
export type UpscaleAlgorithm = "lanczos" | "bicubic" | "bilinear" | "nearest";
export type OutputFormat = "png" | "jpg" | "webp";

export interface UpscaleParams {
  mode: UpscaleMode;
  factor?: number;
  width?: number;
  height?: number;
  algorithm: UpscaleAlgorithm;
  format: OutputFormat;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 8000;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const allowedFormats: OutputFormat[] = ["png", "jpg", "webp"];
const defaultFormat: OutputFormat = "png";
const defaultAlgorithm: UpscaleAlgorithm = "lanczos";

const normalizeMime = (mime: string | null) => (mime ? mime.toLowerCase() : "");

const safeParseNumber = (value: FormDataEntryValue | null) => {
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const clampFormat = (format: string | null): OutputFormat => {
  const normalized = (format || "").toLowerCase();
  return allowedFormats.includes(normalized as OutputFormat)
    ? (normalized as OutputFormat)
    : defaultFormat;
};

export const mimeToExtension = (mime: string) => {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
};

export const contentTypeForFormat = (format: OutputFormat) => {
  switch (format) {
    case "jpg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
};

const isSaneDimension = (value: number) =>
  (value === -1 || (value >= 1 && value <= MAX_DIMENSION)) && Number.isInteger(value);

export const validateFormData = (formData: FormData) => {
  const fileField = formData.get("file");
  if (!(fileField instanceof Blob)) {
    return { error: "No image file provided." } as const;
  }

  const mime = normalizeMime(fileField.type);
  if (!allowedMimeTypes.has(mime)) {
    return { error: "Only PNG, JPG, and WebP images are allowed." } as const;
  }

  if (fileField.size === 0 || fileField.size > MAX_FILE_SIZE) {
    return { error: "File must be smaller than 10MB and not empty." } as const;
  }

  const mode = (formData.get("mode") as UpscaleMode) || "factor";
  if (mode !== "factor" && mode !== "target") {
    return { error: "Invalid upscale mode." } as const;
  }

  const algorithm =
    ((formData.get("algorithm") as UpscaleAlgorithm) as UpscaleAlgorithm) || defaultAlgorithm;
  const normalizedAlgorithm: UpscaleAlgorithm = ["lanczos", "bicubic", "bilinear", "nearest"].includes(
    algorithm
  )
    ? algorithm
    : defaultAlgorithm;

  const format = clampFormat((formData.get("format") as string | null) ?? defaultFormat);

  if (mode === "factor") {
    const factor = safeParseNumber(formData.get("factor"));
    if (factor === null || factor <= 0 || factor > 10) {
      return { error: "Scale factor must be a positive number up to 10x." } as const;
    }
    return {
      file: fileField,
      params: { mode, factor, algorithm: normalizedAlgorithm, format },
    } as const;
  }

  const width = safeParseNumber(formData.get("width"));
  const height = safeParseNumber(formData.get("height"));

  if (width === null || height === null) {
    return { error: "Width and height are required for target mode." } as const;
  }

  if (!isSaneDimension(width) || !isSaneDimension(height)) {
    return {
      error: "Width/height must be integers between 1 and 8000, or -1 to preserve aspect.",
    } as const;
  }

  if (width === -1 && height === -1) {
    return { error: "Width and height cannot both be -1." } as const;
  }

  return {
    file: fileField,
    params: { mode, width, height, algorithm: normalizedAlgorithm, format },
  } as const;
};

export const deriveExtension = (fileName: string | undefined | null, mime: string) => {
  const normalizedName = (fileName || "").toLowerCase();
  const ext = extname(normalizedName).replace(".", "");
  if (ext && ["png", "jpg", "jpeg", "webp"].includes(ext)) {
    return ext === "jpeg" ? "jpg" : ext;
  }
  return mimeToExtension(mime);
};

export const constants = {
  MAX_FILE_SIZE,
  MAX_DIMENSION,
  defaultFormat,
};
