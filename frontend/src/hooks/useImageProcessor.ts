"use client";

import { useState, useCallback } from "react";
import {
  processImage,
  createPreviewUrl,
  isHeicFile,
  isSupportedImageFormat,
  type ImageProcessingOptions,
} from "@/lib/utils/image-processing";

export interface UseImageProcessorOptions extends ImageProcessingOptions {
  /** Maximum number of files allowed (default: 10) */
  maxFiles?: number;
  /** Maximum file size before rejection in MB (default: 50) */
  maxFileSizeMB?: number;
  /** Callback when processing starts */
  onProcessingStart?: () => void;
  /** Callback when processing ends */
  onProcessingEnd?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
}

export interface ProcessedFile {
  file: File;
  previewUrl: string;
  originalName: string;
  originalSize: number;
  processedSize: number;
  wasConverted: boolean;
  wasCompressed: boolean;
}

export interface UseImageProcessorReturn {
  /** Currently processed files with previews */
  files: ProcessedFile[];
  /** Preview URLs for display */
  previewUrls: string[];
  /** Whether processing is in progress */
  isProcessing: boolean;
  /** Current error message if any */
  error: string | null;
  /** Process and add new files */
  addFiles: (newFiles: File[]) => Promise<void>;
  /** Remove a file by index */
  removeFile: (index: number) => void;
  /** Clear all files */
  clearFiles: () => void;
  /** Check if we have any files */
  hasFiles: boolean;
  /** Total count of files */
  fileCount: number;
}

/**
 * Hook for processing images with HEIC conversion and compression support.
 * Provides state management for multiple files with previews.
 */
export function useImageProcessor(
  options: UseImageProcessorOptions = {}
): UseImageProcessorReturn {
  const {
    maxFiles = 10,
    maxFileSizeMB = 50,
    onProcessingStart,
    onProcessingEnd,
    onError,
    ...processingOptions
  } = options;

  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    async (newFiles: File[]) => {
      setError(null);

      // Check max files limit
      if (files.length + newFiles.length > maxFiles) {
        const errorMsg = `Too many files. Maximum is ${maxFiles}`;
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Filter out files that are too large
      const validFiles: File[] = [];
      for (const file of newFiles) {
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          const errorMsg = `File ${file.name} is too large. Maximum is ${maxFileSizeMB}MB`;
          setError(errorMsg);
          onError?.(errorMsg);
          continue;
        }
        if (!isSupportedImageFormat(file)) {
          const errorMsg = `File ${file.name} is not a supported image format`;
          setError(errorMsg);
          onError?.(errorMsg);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length === 0) {
        return;
      }

      setIsProcessing(true);
      onProcessingStart?.();

      try {
        const processedFiles: ProcessedFile[] = [];

        for (const file of validFiles) {
          const wasHeic = isHeicFile(file);
          const originalSize = file.size;

          const processedFile = await processImage(file, processingOptions);
          const previewUrl = await createPreviewUrl(processedFile);

          processedFiles.push({
            file: processedFile,
            previewUrl,
            originalName: file.name,
            originalSize,
            processedSize: processedFile.size,
            wasConverted: wasHeic,
            wasCompressed: processedFile.size < originalSize,
          });
        }

        setFiles((prev) => [...prev, ...processedFiles]);
      } catch (err) {
        console.error("[useImageProcessor] Error processing files:", err);
        const errorMsg = "Failed to process images";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsProcessing(false);
        onProcessingEnd?.();
      }
    },
    [files.length, maxFiles, maxFileSizeMB, processingOptions, onProcessingStart, onProcessingEnd, onError]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const newFiles = [...prev];
      // Revoke the preview URL to free memory
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
    setError(null);
  }, []);

  const clearFiles = useCallback(() => {
    // Revoke all preview URLs
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setError(null);
  }, [files]);

  return {
    files,
    previewUrls: files.map((f) => f.previewUrl),
    isProcessing,
    error,
    addFiles,
    removeFile,
    clearFiles,
    hasFiles: files.length > 0,
    fileCount: files.length,
  };
}

export { isHeicFile, isSupportedImageFormat };
