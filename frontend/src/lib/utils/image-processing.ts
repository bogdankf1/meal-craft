/**
 * Image processing utilities for handling large images, HEIC conversion, and compression.
 * These utilities are designed to be reusable across the application.
 */

import imageCompression from "browser-image-compression";
import heic2any from "heic2any";

// Default compression options
export const DEFAULT_COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
};

export interface ImageProcessingOptions {
  /** Maximum file size in MB after compression (default: 2) */
  maxSizeMB?: number;
  /** Maximum width or height in pixels (default: 2048) */
  maxWidthOrHeight?: number;
  /** Use web worker for compression (default: true) */
  useWebWorker?: boolean;
  /** Output file type (default: "image/jpeg") */
  fileType?: "image/jpeg" | "image/png" | "image/webp";
  /** JPEG quality for HEIC conversion (default: 0.9) */
  heicQuality?: number;
}

/**
 * Check if a file is in HEIC/HEIF format
 */
export function isHeicFile(file: File): boolean {
  const heicTypes = [
    "image/heic",
    "image/heif",
    "image/heic-sequence",
    "image/heif-sequence",
  ];

  if (heicTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // Also check by extension since some browsers don't recognize HEIC mime type
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "heic" || ext === "heif";
}

/**
 * Check if a file is a supported image format for OpenAI Vision API
 */
export function isSupportedImageFormat(file: File): boolean {
  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (supportedTypes.includes(file.type.toLowerCase())) {
    return true;
  }

  // HEIC will be converted, so it's supported
  if (isHeicFile(file)) {
    return true;
  }

  return false;
}

/**
 * Convert HEIC/HEIF image to JPEG
 */
export async function convertHeicToJpeg(
  file: File,
  quality: number = 0.9
): Promise<File> {
  console.log(
    `[ImageProcessing] Converting HEIC to JPEG: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
  );

  try {
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality,
    });

    // heic2any can return a single blob or array of blobs
    const resultBlob = Array.isArray(blob) ? blob[0] : blob;

    // Create a new File object with .jpg extension
    const newFileName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    const convertedFile = new File([resultBlob], newFileName, {
      type: "image/jpeg",
    });

    console.log(
      `[ImageProcessing] HEIC converted: ${(convertedFile.size / 1024 / 1024).toFixed(2)}MB`
    );
    return convertedFile;
  } catch (err) {
    console.error("[ImageProcessing] HEIC conversion failed:", err);
    throw new Error("Failed to convert HEIC image");
  }
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> {
  const compressionOptions = {
    maxSizeMB: options.maxSizeMB ?? DEFAULT_COMPRESSION_OPTIONS.maxSizeMB,
    maxWidthOrHeight:
      options.maxWidthOrHeight ?? DEFAULT_COMPRESSION_OPTIONS.maxWidthOrHeight,
    useWebWorker:
      options.useWebWorker ?? DEFAULT_COMPRESSION_OPTIONS.useWebWorker,
    fileType: options.fileType ?? DEFAULT_COMPRESSION_OPTIONS.fileType,
  };

  console.log(
    `[ImageProcessing] Compressing: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`
  );

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    console.log(
      `[ImageProcessing] Compressed to: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
    );
    return compressedFile;
  } catch (err) {
    console.error("[ImageProcessing] Compression failed:", err);
    throw new Error("Failed to compress image");
  }
}

/**
 * Process an image file: convert HEIC if needed, then compress if too large
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<File> {
  let processedFile = file;

  // Convert HEIC to JPEG first
  if (isHeicFile(file)) {
    processedFile = await convertHeicToJpeg(
      file,
      options.heicQuality ?? 0.9
    );
  }

  // Compress if still too large
  const maxSizeMB = options.maxSizeMB ?? DEFAULT_COMPRESSION_OPTIONS.maxSizeMB;
  if (processedFile.size > maxSizeMB * 1024 * 1024) {
    try {
      processedFile = await compressImage(processedFile, options);
    } catch (err) {
      console.error("[ImageProcessing] Compression failed, using converted file:", err);
      // Return the converted file even if compression fails
    }
  }

  return processedFile;
}

/**
 * Process multiple image files in parallel
 */
export async function processImages(
  files: File[],
  options: ImageProcessingOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => processImage(file, options)));
}

/**
 * Create a data URL preview from a file
 */
export function createPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Create preview URLs for multiple files
 */
export async function createPreviewUrls(files: File[]): Promise<string[]> {
  return Promise.all(files.map(createPreviewUrl));
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
