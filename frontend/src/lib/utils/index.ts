// Image processing utilities
export {
  processImage,
  processImages,
  compressImage,
  convertHeicToJpeg,
  createPreviewUrl,
  createPreviewUrls,
  isHeicFile,
  isSupportedImageFormat,
  formatFileSize,
  type ImageProcessingOptions,
  DEFAULT_COMPRESSION_OPTIONS,
} from "./image-processing";

// Unit conversion utilities
export {
  normalizeUnit,
  getUnitCategory,
  canCompare,
  convertQuantity,
  formatQuantity,
  getDisplayUnit,
  smartUnitSuggestion,
  formatSmartQuantity,
  getUnitsForCategory,
  COMMON_UNITS,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  COUNT_UNITS,
  type UnitCategory,
} from "./unit-conversion";
